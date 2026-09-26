import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Dialog, GhostDialog, GhostImage } from "../components/GhostDialog";
import { readNfcUrl } from "../lib/nfc";
import {
  badGhosts,
  canOpenGhost,
  completeBadConversation,
  emptyProgress,
  getGhost,
  goodGhosts,
  hasAllGoodStamps,
  isGhostComplete,
  isRallyComplete,
  loadProgress,
  recordGoodConversation,
  saveProgress,
  type Ghost,
  type Progress,
} from "../lib/rally";
import { isSurveyId, surveys, type SurveyAnswers } from "../lib/survey";

export const Route = createFileRoute("/")({ component: RallyPage });
type Screen = "title" | "help" | "map" | "unlock" | "ending" | "reception";
type StorageIssue = "unavailable" | "repaired" | "migrated" | "unsaved" | null;
const emptyDraft: SurveyAnswers = {};

function RallyPage() {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const progressRef = useRef(progress);
  const initialized = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("title");
  const focusedScreen = useRef<Screen | null>(null);
  const [activeGhostId, setActiveGhostId] = useState<string | null>(null);
  const [earned, setEarned] = useState<{
    ghost: Ghost;
    nextScreen: Screen;
  } | null>(null);
  const drafts = useRef<Record<string, SurveyAnswers>>({});
  const [message, setMessage] = useState("");
  const [storageIssue, setStorageIssue] = useState<StorageIssue>(null);
  const goodComplete = hasAllGoodStamps(progress);
  const complete = isRallyComplete(progress);
  const activeGhost = getGhost(activeGhostId);

  function persistProgress(next: Progress) {
    const result = saveProgress(next);
    progressRef.current = result.progress;
    setProgress(result.progress);
    setStorageIssue(result.ok ? null : "unsaved");
    return result.progress;
  }

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const loaded = loadProgress();
    const saved = loaded.progress;
    progressRef.current = saved;
    setProgress(saved);
    if (
      loaded.status === "unavailable" ||
      loaded.status === "repaired" ||
      loaded.status === "migrated"
    )
      setStorageIssue(loaded.status);
    setScreen(
      isRallyComplete(saved) ? "ending" : saved.hasStarted ? "map" : "title",
    );
    const { id, cleanPath } = readNfcUrl(window.location.href);
    if (id !== null) {
      setScreen("map");
      if (!getGhost(id))
        setMessage("このおばけは見つかりませんでした。タグを確認してね。");
      else if (!canOpenGhost(saved, id))
        setMessage(
          "まずは いいおばけ全員と なかよくなろう！そのあと、もう一度ここでタッチしてね。",
        );
      else setActiveGhostId(id);
      window.history.replaceState(window.history.state, "", cleanPath);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || activeGhostId || earned) return;
    // Dialog restores its opener. Preserve that focus on the same screen.
    if (
      focusedScreen.current !== screen ||
      document.activeElement === document.body
    )
      headingRef.current?.focus();
    focusedScreen.current = screen;
  }, [screen, ready, activeGhostId, earned]);

  function finishConversation(
    ghost: Ghost,
    answers: SurveyAnswers,
  ): Record<string, string> {
    const current = progressRef.current;
    if (!canOpenGhost(current, ghost.id))
      return { form: "まずは いいおばけと なかよくなろう！" };
    if (isGhostComplete(current, ghost.id)) {
      setActiveGhostId(null);
      return {};
    }
    let next: Progress;
    if (ghost.type === "good") next = recordGoodConversation(current, ghost.id);
    else {
      const result = completeBadConversation(current, ghost.id, answers);
      if (Object.keys(result.errors).length) return result.errors;
      next = result.progress;
    }
    const saved = persistProgress(next);
    const nextScreen = isRallyComplete(saved)
      ? "ending"
      : !hasAllGoodStamps(current) && hasAllGoodStamps(saved)
        ? "unlock"
        : "map";
    setActiveGhostId(null);
    setEarned({ ghost, nextScreen });
    delete drafts.current[ghost.id];
    return {};
  }

  function dismissEarned() {
    if (earned) setScreen(earned.nextScreen);
    setEarned(null);
  }

  if (!ready) return <main className="loading">マップを読み込んでいます…</main>;
  const storageNotice = storageIssue ? (
    <ProgressStorageNotice
      issue={storageIssue}
      onRetry={() => persistProgress(progressRef.current)}
    />
  ) : null;
  const markers = [...goodGhosts, ...(goodComplete ? badGhosts : [])];
  const heading = (text: string) => (
    <h1 ref={headingRef} tabIndex={-1}>
      {text}
    </h1>
  );

  return (
    <main className={`page flow-${screen}`}>
      {!activeGhost && !earned && storageNotice}
      {screen === "title" && (
        <section className="flow-panel title-panel">
          <p className="label">iU Fes 2026</p>
          {heading("おばけさがし スタンプラリー！")}
          <div className="title-ghosts" aria-hidden="true">
            <GhostImage ghost={goodGhosts[0]} />
          </div>
          <p>おばけたちと タッチして なかよくなろう！</p>
          <button className="action" onClick={() => setScreen("help")}>
            ぼうけんを はじめる！
          </button>
        </section>
      )}

      {screen === "help" && (
        <section className="flow-panel">
          <p className="label">あそびかた</p>
          {heading("iUFesを楽しんでいる おばけをさがそう！")}
          <ol className="how-to">
            <li>マップにうつる「おばけのかげ」をめざして 探検しよう！</li>
            <li>
              おばけを見つけたら、持っているものに スマホをピタッとタッチ！
            </li>
            <li>会話を終えると、ずかんに登録されて 友達になるよ！</li>
          </ol>
          <p>いいおばけ全員と なかよくなると、あやしいかげが現れるよ。</p>
          <button
            className="action"
            onClick={() => {
              persistProgress({ ...progressRef.current, hasStarted: true });
              setScreen("map");
            }}
          >
            マップを みる！
          </button>
        </section>
      )}

      {screen === "unlock" && (
        <section className="flow-panel unlock-panel">
          <p className="label">あたらしい気配</p>
          {heading("あやしい おばけのかげを 発見…！？")}
          <div className="shadow-pair" aria-hidden="true">
            {badGhosts.map((ghost) => (
              <GhostImage key={ghost.id} ghost={ghost} />
            ))}
          </div>
          <p>おばけのいる場所で タッチして たしかめてみよう！</p>
          <p>どちらのおばけからでも だいじょうぶ。</p>
          <button className="action" onClick={() => setScreen("map")}>
            あやしいかげを さがす！
          </button>
        </section>
      )}

      {screen === "map" && (
        <>
          <section className="instruction">
            <p className="label">おばけマップ</p>
            {heading("おばけのかげを さがそう！")}
            <p>
              かげがある場所に行って、おばけの持っているものに
              スマホをタッチしてね。
            </p>
            <button className="text-button" onClick={() => setScreen("help")}>
              あそびかたをみる
            </button>
          </section>
          {message && (
            <p className="message" role="status">
              {message}
            </p>
          )}
          <section className="progress panel">
            <div className="panel-title">
              <h2>いいおばけのスタンプ</h2>
              <strong>
                {progress.goodStampIds.length} / {goodGhosts.length}
              </strong>
            </div>
            <div className="progress-bar">
              <span
                style={{
                  width: `${goodGhosts.length ? (progress.goodStampIds.length / goodGhosts.length) * 100 : 0}%`,
                }}
              />
            </div>
            <p>
              {goodComplete
                ? "あやしいかげが2つ出現！どちらからでも会いにいけるよ。"
                : "会話を終えると スタンプがつくよ。"}
            </p>
          </section>
          <section className="panel map-panel">
            <div className="panel-title">
              <h2>会場マップ</h2>
              <span>仮の会場図</span>
            </div>
            <div className="map">
              <div className="road road-a" />
              <div className="road road-b" />
              <div className="building main-building">
                本館
                <br />
                <small>1F / 2F / 3F</small>
              </div>
              <div className="building side-building">体育館</div>
              <div className="building yard-building">中庭</div>
              {markers.map((ghost) => {
                const done = isGhostComplete(progress, ghost.id);
                return (
                  <div
                    className={`marker ${ghost.type} ${done ? "done" : ""}`}
                    key={ghost.id}
                    style={ghost.position}
                    title={`${ghost.name} / ${ghost.location}`}
                  >
                    <span>{done ? "✓" : "!"}</span>
                    <small>{done ? "済" : ghost.area}</small>
                  </div>
                );
              })}
              <span className="map-label gate">正門</span>
              <span className="map-label west">西門</span>
            </div>
            <p className="map-help">
              場所は仮表示です。会話は現地のタグにタッチすると始まります。
            </p>
          </section>
          <section className="panel list-panel">
            <div className="stamp-heading">
              <div>
                <p className="label">ともだちコレクション</p>
                <h2>おばけずかん</h2>
              </div>
              <span>{complete ? "コンプリート！" : "あつめよう！"}</span>
            </div>
            <p className="list-help">
              集めたカードをタッチすると、もう一度お話しできるよ。
            </p>
            <div className="ghost-list">
              {markers.map((ghost, index) => (
                <StatusRow
                  key={ghost.id}
                  ghost={ghost}
                  number={index + 1}
                  done={isGhostComplete(progress, ghost.id)}
                  onOpen={() => {
                    if (canOpenGhost(progressRef.current, ghost.id))
                      setActiveGhostId(ghost.id);
                  }}
                />
              ))}
            </div>
            {goodComplete && (
              <div className={`reception ${complete ? "complete" : ""}`}>
                <strong>
                  {complete
                    ? "全部のおばけと なかよくなったよ！"
                    : "メデューサと ヴァンパイアに 会いにいこう！"}
                </strong>
                <span>
                  {complete
                    ? "受付でコンプリート画面をみせてね。"
                    : "会話を終えると、それぞれスタンプがもらえるよ。"}
                </span>
                {complete && (
                  <button
                    className="action"
                    onClick={() => setScreen("ending")}
                  >
                    コンプリート画面をみる
                  </button>
                )}
              </div>
            )}
          </section>
        </>
      )}

      {(screen === "ending" || screen === "reception") && complete && (
        <section className="flow-panel ending-panel">
          <p className="label">コンプリート！</p>
          {heading(
            screen === "ending"
              ? "全部のおばけと なかよくなれたよ！"
              : "この画面を 受付でみせてね！",
          )}
          <div className="completion-seal" aria-hidden="true">
            ✦
          </div>
          <p>
            {screen === "ending"
              ? "コンプリート おめでとう！うけつけに行って、この画面をみせてね！"
              : "プレゼントは受付の人から受け取ってね。"}
          </p>
          <p>
            いいおばけ {goodGhosts.length} / {goodGhosts.length} ・
            あやしいおばけ {badGhosts.length} / {badGhosts.length}
          </p>
          {screen === "ending" && (
            <button className="action" onClick={() => setScreen("reception")}>
              うけつけで プレゼントをもらう
            </button>
          )}
          <button className="text-button" onClick={() => setScreen("map")}>
            マップ・ずかんにもどる
          </button>
        </section>
      )}
      <footer>iUFes2026 周遊企画システムプロトタイプ</footer>
      {activeGhost && (
        <GhostDialog
          key={activeGhost.id}
          ghost={activeGhost}
          done={isGhostComplete(progress, activeGhost.id)}
          draft={drafts.current[activeGhost.id] || emptyDraft}
          onDraft={(answers) => {
            drafts.current[activeGhost.id] = answers;
          }}
          onFinish={(answers) => finishConversation(activeGhost, answers)}
          onClose={() => setActiveGhostId(null)}
          storageNotice={storageNotice}
        />
      )}
      {earned && (
        <Dialog
          title={`${earned.ghost.name}と 仲よくなった！`}
          onClose={dismissEarned}
          className="earned-dialog"
        >
          {storageNotice}
          <div className="dialog-ghost stamp-pop">
            <GhostImage ghost={earned.ghost} />
          </div>
          <p className="speech">
            {isSurveyId(earned.ghost.id)
              ? surveys[earned.ghost.id].thanks
              : "またいつでも お話ししにきてね！"}
          </p>
          <p className="dialog-detail">スタンプを獲得したよ！</p>
          <button className="action" onClick={dismissEarned}>
            {earned.nextScreen === "ending"
              ? "コンプリート画面へ！"
              : earned.nextScreen === "unlock"
                ? "新しい気配をたしかめる！"
                : "マップにもどる"}
          </button>
        </Dialog>
      )}
    </main>
  );
}

function ProgressStorageNotice({
  issue,
  onRetry,
}: {
  issue: Exclude<StorageIssue, null>;
  onRetry: () => void;
}) {
  const text = {
    unavailable:
      "この端末の進捗を読み込めませんでした。保存を再試行すると、読み込めた進捗とこの画面の進捗を合わせて保存します。",
    repaired:
      "保存データの一部を読み込めませんでした。確認できたスタンプを表示しています。取得状況を確認してください。",
    migrated:
      "前のプロトタイプのスタンプを引き継ぎました。悪いおばけは、会話を終えると新しくスタンプがつきます。",
    unsaved:
      "進捗と回答を保存できませんでした。この画面には反映されていますが、画面を閉じると失われる可能性があります。",
  }[issue];
  return (
    <section className="storage-notice" aria-label="進捗の保存状況">
      <p role={issue === "migrated" ? "status" : "alert"}>{text}</p>
      <button type="button" onClick={onRetry}>
        進捗の保存を再試行
      </button>
    </section>
  );
}

function StatusRow({
  ghost,
  number,
  done,
  onOpen,
}: {
  ghost: Ghost;
  number: number;
  done: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      className={`status-row ${ghost.type} ${done ? "done is-actionable" : ""}`}
      type="button"
      disabled={!done}
      onClick={(event) => {
        // WebKit does not focus buttons on pointer activation. Give the dialog
        // a reliable opener so closing it preserves the card and scroll position.
        event.currentTarget.focus({ preventScroll: true });
        onOpen();
      }}
      aria-label={
        done ? `${ghost.name}ともう一度話す` : `${ghost.name}は未発見`
      }
    >
      <div className="stamp-art">
        <GhostImage ghost={ghost} />
      </div>
      <div className="stamp-meta">
        <strong>NO.{String(number).padStart(3, "0")}</strong>
        <span>{done ? ghost.name : "？？？"}</span>
        <small>
          {ghost.area} / {ghost.location}
        </small>
      </div>
      <em>{done ? "タッチして会話" : "未発見"}</em>
    </button>
  );
}
