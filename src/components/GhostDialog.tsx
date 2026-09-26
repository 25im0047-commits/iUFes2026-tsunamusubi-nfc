import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Ghost } from "../lib/rally";
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
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    if (!dialog.open) dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${className}`}
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <button
        className="close"
        type="button"
        onClick={onClose}
        aria-label="閉じる"
      >
        ×
      </button>
      <h2 id={headingId} tabIndex={-1} autoFocus>
        {title}
      </h2>
      {children}
    </dialog>
  );
}

export function GhostImage({ ghost }: { ghost: Ghost }) {
  if (ghost.imageSrc) return <img src={ghost.imageSrc} alt="" />;
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
}: {
  ghost: Ghost;
  done: boolean;
  draft: SurveyAnswers;
  onDraft: (answers: SurveyAnswers) => void;
  onFinish: (answers: SurveyAnswers) => Record<string, string>;
  onClose: () => void;
  storageNotice: ReactNode;
}) {
  return (
    <Dialog title={ghost.name} onClose={onClose} className={ghost.type}>
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
        />
      ) : (
        <>
          <p className="dialog-detail">{ghost.detail}</p>
          <button className="action" onClick={() => onFinish({})}>
            会話を終えてスタンプを獲得
          </button>
        </>
      )}
    </Dialog>
  );
}

function SurveyForm({
  id,
  draft,
  onDraft,
  onFinish,
}: {
  id: SurveyId;
  draft: SurveyAnswers;
  onDraft: (answers: SurveyAnswers) => void;
  onFinish: (answers: SurveyAnswers) => Record<string, string>;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const errorRef = useRef<HTMLParagraphElement>(null);
  const definition = surveys[id];
  function update(question: string, value: SurveyAnswers[string]) {
    onDraft({ ...draft, [question]: value });
    setErrors((previous) => {
      const next = { ...previous };
      delete next[question];
      return next;
    });
  }
  return (
    <form
      className="survey"
      onSubmit={(event) => {
        event.preventDefault();
        const nextErrors = onFinish(draft);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length)
          requestAnimationFrame(() => errorRef.current?.focus());
      }}
    >
      <p className="survey-help">
        ぜんぶ任意です。こたえたいものだけで
        だいじょうぶ。空らんでもスタンプはもらえるよ！
      </p>
      <p className="prototype-note">
        動作確認用：回答はこの端末に保存されます。運営には送信されません。
      </p>
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
          question.kind === "score"
            ? Array.from({ length: 11 }, (_, score) => String(score))
            : question.options;
        return (
          <fieldset
            key={question.id}
            aria-describedby={errors[question.id] ? errorId : undefined}
          >
            <legend>
              Q{index + 1}. {question.label}{" "}
              <small>
                任意{question.kind === "multiple" ? "・複数選択可" : ""}
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
                    <label key={option}>
                      <input
                        type={
                          question.kind === "multiple" ? "checkbox" : "radio"
                        }
                        name={`${id}-${question.id}`}
                        value={option}
                        checked={
                          question.kind === "multiple"
                            ? Array.isArray(value) && value.includes(option)
                            : value === option
                        }
                        onChange={(event) => {
                          if (question.kind === "multiple") {
                            const selected = Array.isArray(value) ? value : [];
                            update(
                              question.id,
                              event.target.checked
                                ? [...selected, option]
                                : selected.filter((item) => item !== option),
                            );
                          } else update(question.id, option);
                        }}
                      />
                      <span>
                        {option}
                        {question.kind === "score" ? "点" : ""}
                      </span>
                    </label>
                  ))}
                </div>
                {question.kind !== "multiple" && (
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
      <button className="action bad-action" type="submit">
        {definition.button}
      </button>
    </form>
  );
}
