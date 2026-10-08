import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Ghost } from "../lib/rally";
import type { SurveyRules } from "../lib/survey-rules";
import { pendingAnswers } from "../lib/participant";
import { PartyEffects, PartyWords } from "./PartyEffects";
import { FoundStage } from "./FoundEffects";
import {
  ARTWORK_WIDTH,
  ARTWORK_HEIGHT,
  getGhostArtwork,
  type ArtworkVariant,
} from "../lib/artwork";
import {
  isSurveyId,
  MAX_TEXT_LENGTH,
  surveys,
  type SurveyAnswers,
  type SurveyId,
} from "../lib/survey";

export function Dialog({
  title,
  onClose,
  children,
  className = "",
  busy = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement;
    if (!dialog.open) dialog.showModal();
    // React does not apply autoFocus to headings. Start long surveys at the title.
    headingRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      // React may remove the dialog before cleanup, so restore its opener explicitly.
      if (opener instanceof HTMLElement && opener.isConnected)
        opener.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${className}`}
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      {className !== "earned-dialog" && <PartyEffects contained spooky={className === "bad"} />}
      <button
        className="close"
        type="button"
        onClick={onClose}
        aria-label="閉じる"
        disabled={busy}
      >
        ×
      </button>
      <h2 ref={headingRef} id={headingId} tabIndex={-1}>
        <PartyWords text={title} />
      </h2>
      {className === "earned-dialog" ? <FoundStage>{children}</FoundStage> : children}
    </dialog>
  );
}

export function GhostImage({
  ghost,
  variant = "character",
  concealed = false,
}: {
  ghost: Ghost;
  variant?: ArtworkVariant;
  concealed?: boolean;
}) {
  const artwork = concealed ? undefined : getGhostArtwork(ghost.id, variant);
  if (artwork)
    return (
      <svg
        className="ghost-artwork"
        viewBox={artwork.viewBox}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        <image href={artwork.src} width={ARTWORK_WIDTH} height={ARTWORK_HEIGHT} />
      </svg>
    );
  if (!concealed && ghost.imageSrc) return <img src={ghost.imageSrc} alt="" />;
  return (
    <span className={`ghost-placeholder ${ghost.type}`} aria-hidden="true">
      <i />
      <i />
      <b>{ghost.type === "bad" ? "!" : "✦"}</b>
    </span>
  );
}

export function GhostDialog({
  ghost,
  done,
  draft,
  onDraft,
  onFinish,
  onClose,
  storageNotice,
  rules,
  busy,
  onReloadRules,
}: {
  ghost: Ghost;
  done: boolean;
  draft: SurveyAnswers;
  onDraft: (answers: SurveyAnswers) => void;
  onFinish: (answers: SurveyAnswers) => Promise<Record<string, string>>;
  onClose: () => void;
  storageNotice: ReactNode;
  rules: SurveyRules | null;
  busy: boolean;
  onReloadRules: () => void;
}) {
  return (
    <Dialog title={ghost.name} onClose={onClose} className={ghost.type} busy={busy}>
      {storageNotice}
      <div className="dialog-ghost">
        <GhostImage ghost={ghost} />
      </div>
      <p className="dialog-location">
        {ghost.area} / {ghost.location}
      </p>
      <div className="speech">{ghost.message}</div>
      {done ? (
        <>
          <p className="dialog-detail">
            もう なかよしだよ！スタンプは獲得済みです。
          </p>
          <button className="action" onClick={onClose}>
            マップにもどる
          </button>
        </>
      ) : isSurveyId(ghost.id) ? (
        <SurveyForm
          id={ghost.id}
          draft={draft}
          onDraft={onDraft}
          onFinish={onFinish}
          rules={rules}
          busy={busy}
          onReloadRules={onReloadRules}
        />
      ) : (
        <>
          <p className="dialog-detail">{ghost.detail}</p>
          <button className="action" onClick={() => onFinish({})}>
            会話を終えてスタンプを獲得
          </button>
          <p className="conversation-note">「×」で閉じると、スタンプはまだつかないよ。</p>
        </>
      )}
    </Dialog>
  );
}

const scoreChoices = Array.from({ length: 11 }, (_, score) => ({
  id: String(score),
  label: String(score),
}));

function SurveyForm({
  id,
  draft: initialDraft,
  onDraft,
  onFinish,
  rules,
  busy,
  onReloadRules,
}: {
  id: SurveyId;
  draft: SurveyAnswers;
  onDraft: (answers: SurveyAnswers) => void;
  onFinish: (answers: SurveyAnswers) => Promise<Record<string, string>>;
  rules: SurveyRules | null;
  busy: boolean;
  onReloadRules: () => void;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const errorRef = useRef<HTMLParagraphElement>(null);
  const definition = surveys[id];
  const pending = pendingAnswers(id) !== null;
  function update(question: string, value: SurveyAnswers[string]) {
    const nextDraft = { ...draft, [question]: value };
    setDraft(nextDraft);
    onDraft(nextDraft);
    setErrors((previous) => {
      const next = { ...previous };
      delete next[question];
      return next;
    });
  }
  return (
    <form
      className="survey"
      onSubmit={async (event) => {
        event.preventDefault();
        const nextErrors = await onFinish(draft);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length)
          requestAnimationFrame(() => errorRef.current?.focus());
      }}
    >
      <p className="survey-help">
        「必須」の質問に回答してね。回答の保存が完了するとスタンプがつくよ。
      </p>
      <p className="prototype-note">
        回答は運営のデータベースに送信・保存されます。下書きはこの端末に保持されます。
      </p>
      {!rules && <p role="alert">質問の設定を取得できていません。<button type="button" onClick={onReloadRules}>設定を再取得</button></p>}
      {pending && <p role="status">保存結果を確認中です。回答は変更せず、下のボタンから同じ内容を再送してください。</p>}
      <p className="survey-help">
        名前・連絡先など、個人がわかることは書かないでね。
      </p>
      {Object.keys(errors).length > 0 && (
        <p className="form-error" role="alert" ref={errorRef} tabIndex={-1}>
          {errors.form || "回答を確認してください。"}
        </p>
      )}
      {definition.questions.map((question, index) => {
        const errorId = `${id}-${question.id}-error`;
        const value = draft[question.id];
        const choices =
          question.kind === "score" ? scoreChoices : question.options;
        return (
          <fieldset
            key={question.id}
            disabled={busy || pending || !rules}
            aria-describedby={errors[question.id] ? errorId : undefined}
          >
            <legend>
              Q{index + 1}. {question.label}{" "}
              <small>
                {rules?.[id][question.id] !== false ? "必須" : "任意"}{question.kind === "multiple" ? "・複数選択可" : ""}
              </small>
            </legend>
            {question.kind === "text" ? (
              <>
                <textarea
                  aria-label={question.label}
                  value={typeof value === "string" ? value : ""}
                  maxLength={MAX_TEXT_LENGTH}
                  rows={3}
                  aria-invalid={!!errors[question.id]}
                  aria-describedby={errors[question.id] ? errorId : undefined}
                  onChange={(event) => update(question.id, event.target.value)}
                />
                <small>
                  {typeof value === "string" ? value.length : 0} /{" "}
                  {MAX_TEXT_LENGTH}文字
                </small>
              </>
            ) : (
              <>
                {question.kind === "score" && (
                  <p className="score-help">
                    0：おすすめしない ～ 10：とてもおすすめしたい
                  </p>
                )}
                <div
                  className={
                    question.kind === "score"
                      ? "survey-choices score-choices"
                      : "survey-choices"
                  }
                >
                  {choices?.map((option) => (
                    <label key={option.id}>
                      <input
                        type={
                          question.kind === "multiple" ? "checkbox" : "radio"
                        }
                        name={`${id}-${question.id}`}
                        value={option.id}
                        checked={
                          question.kind === "multiple"
                            ? Array.isArray(value) && value.includes(option.id)
                            : value === option.id
                        }
                        onChange={(event) => {
                          if (question.kind === "multiple") {
                            const selected = Array.isArray(value) ? value : [];
                            update(
                              question.id,
                              event.target.checked
                                ? [...selected, option.id]
                                : selected.filter((item) => item !== option.id),
                            );
                          } else update(question.id, option.id);
                        }}
                      />
                      <span>
                        {option.label}
                        {question.kind === "score" ? "点" : ""}
                      </span>
                    </label>
                  ))}
                </div>
                {question.kind !== "multiple" && rules?.[id][question.id] === false && (
                  <label className="skip-answer">
                    <input
                      type="radio"
                      name={`${id}-${question.id}`}
                      checked={value === null}
                      onChange={() => update(question.id, null)}
                    />
                    こたえない
                  </label>
                )}
              </>
            )}
            {errors[question.id] && (
              <p className="form-error" id={errorId}>
                {errors[question.id]}
              </p>
            )}
          </fieldset>
        );
      })}
      <p className="survey-help">
        下のボタンで会話を終えると、スタンプがつきます。
      </p>
      <button className="action bad-action" type="submit" disabled={busy || !rules}>
        {busy ? "回答を保存中…" : definition.button}
      </button>
    </form>
  );
}
