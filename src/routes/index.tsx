import { createFileRoute, useLocation, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Dialog, GhostDialog, GhostImage } from "../components/GhostDialog";
import { readNfcUrl } from "../lib/nfc";
import { VenueMap } from "../components/VenueMap";
import { RallyTitle } from "../components/RallyTitle";
import { getGhostPlacement, prizeLocation, type WeatherMode } from "../lib/venue";
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
  mergeProgress,
  STORAGE_KEY,
  PREVIOUS_STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  recordGoodConversation,
  saveProgress,
  type Ghost,
  type Progress,
} from "../lib/rally";
import { isSurveyId, surveys, type SurveyAnswers } from "../lib/survey";

export const Route = createFileRoute("/")({ component: RallyPage });
type Screen = "title" | "help" | "map" | "unlock" | "ending" | "prize";
type StorageIssue =
  "unavailable" | "repaired" | "migrated" | "unsaved" | "unsupported" | null;
const emptyDraft: SurveyAnswers = {};
const WEATHER_STORAGE_KEY = "iufes2026-system-prototype-weather";

function RallyPage() {
  const router = useRouter();
  const href = useLocation({ select: (location) => location.href });
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const progressRef = useRef(progress);
  const initialized = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [ready, setReady] = useState(false);
  const [weather, setWeather] = useState<WeatherMode>("sunny");
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
  const foundGhost = getGhost(activeGhostId);
  const activeGhost = foundGhost ? ghostForWeather(foundGhost) : undefined;
  const earnedNextScreen = complete ? "ending" : earned?.nextScreen;

  function ghostForWeather(ghost: Ghost): Ghost {
    const placement = getGhostPlacement(ghost.id, weather);
    return placement
      ? { ...ghost, area: placement.floor, location: placement.location }
      : ghost;
  }

  function changeWeather(next: WeatherMode) {
    setWeather(next);
    try {
      window.localStorage.setItem(WEATHER_STORAGE_KEY, next);
    } catch {
      // The selected map remains usable when storage is unavailable.
    }
  }

  function persistProgress(next: Progress) {
    const result = saveProgress(next);
    progressRef.current = result.progress;
    setProgress(result.progress);
    setStorageIssue(
      result.ok
        ? null
        : result.reason === "unsupported"
          ? "unsupported"
          : "unsaved",
    );
    return result.progress;
  }

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      if (window.localStorage.getItem(WEATHER_STORAGE_KEY) === "rainy")
        setWeather("rainy");
    } catch {
      // Default to the sunny map when storage is unavailable.
    }
    const loaded = loadProgress();
    const saved = loaded.progress;
    progressRef.current = saved;
    setProgress(saved);
    if (
      loaded.status === "unavailable" ||
      loaded.status === "repaired" ||
      loaded.status === "migrated" ||
      loaded.status === "unsupported"
    )
      setStorageIssue(loaded.status);
    setScreen(
      isRallyComplete(saved) ? "ending" : saved.hasStarted ? "map" : "title",
    );
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const { id, cleanPath } = readNfcUrl(new URL(href, window.location.origin).href);
    if (id === null) return;
    // Observe router navigation as well as first loads; cleanup also uses its history.
    setScreen("map");
    setEarned(null);
    setActiveGhostId(null);
    setMessage("");
    if (!getGhost(id))
      setMessage("このおばけは見つかりませんでした。タグを確認してね。");
    else if (!canOpenGhost(progressRef.current, id))
      setMessage(
        "まずは いいおばけ全員と なかよくなろう！そのあと、もう一度ここでタッチしてね。",
      );
    else setActiveGhostId(id);
    router.history.replace(cleanPath, router.history.location.state);
  }, [ready, href, router]);

  useEffect(() => {
    function syncProgress() {
      const loaded = loadProgress();
      if (loaded.status === "unsupported" || loaded.status === "unavailable") {
        const status = loaded.status;
        setStorageIssue((previous) =>
          previous === "unsaved" && status === "unavailable"
            ? previous
            : status,
        );
        return;
      }
      // Saved answers win conflicts; unsaved local stamps/answers remain available for retry.
      const previousProgress = progressRef.current;
      const next = mergeProgress(loaded.progress, previousProgress);
      const becameComplete =
        !isRallyComplete(previousProgress) && isRallyComplete(next);
      const becameStarted = !previousProgress.hasStarted && next.hasStarted;
      progressRef.current = next;
      setProgress(next);
      setStorageIssue((previous) => {
        if (previous === "unsaved") return previous;
        if (loaded.status === "migrated" || loaded.status === "repaired")
          return loaded.status;
        return JSON.stringify(next) === JSON.stringify(loaded.progress)
          ? null
          : "unsaved";
      });
      setScreen((previous) => {
        // Sync only causes navigation when progress crosses a boundary.
        // Refocusing an unchanged page must preserve the screen chosen by the user.
        if (becameComplete)
          return previous === "prize" ? previous : "ending";
        if (becameStarted && (previous === "title" || previous === "help"))
          return "map";
        return previous;
      });
    }
    function onStorage(event: StorageEvent) {
      if (
        event.key === STORAGE_KEY ||
        event.key === PREVIOUS_STORAGE_KEY ||
        event.key === LEGACY_STORAGE_KEY ||
        event.key === null
      )
        syncProgress();
    }
    function onVisible() {
      if (document.visibilityState === "visible") syncProgress();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", syncProgress);
    window.addEventListener("focus", syncProgress);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", syncProgress);
      window.removeEventListener("focus", syncProgress);
      document.removeEventListener("visibilitychange", onVisible);
    };
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
    if (earned)
      setScreen(
        isRallyComplete(progressRef.current) ? "ending" : earned.nextScreen,
      );
    setEarned(null);
  }

  if (!ready) return <main className="loading">マップを読み込んでいます…</main>;
  const storageNotice = storageIssue ? (
    <ProgressStorageNotice
      issue={storageIssue}
      onRetry={() =>
        storageIssue === "unsupported"
          ? window.location.reload()
          : persistProgress(progressRef.current)
      }
    />
  ) : null;
  const markers = [...goodGhosts, ...(goodComplete ? badGhosts : [])].map(ghostForWeather);
  const heading = (text: string) => (
    <h1 ref={headingRef} tabIndex={-1}>
      {text}
    </h1>
  );

  return (
    <main className={`page flow-${screen}`}>
      {!activeGhost && !earned && storageNotice}
      {screen === "title" && (
        <RallyTitle headingRef={headingRef} onStart={() => setScreen("help")} />
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
            <p className="label">iU Fes 2026 ・ おばけマップ</p>
            {heading("おばけのかげを さがそう！")}
            <p>
              かげがある場所に行って、おばけの持っているものに
              スマホをタッチしてね。
            </p>
            <button className="text-button" onClick={() => setScreen("help")}>
              あそびかたをみる
            </button>
          </section>
          <nav className="map-shortcuts" aria-label="マップとずかん">
            <a href="#venue-heading">会場マップ</a>
            <a href="#ghost-book">おばけずかん</a>
          </nav>
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
            <div
              className="progress-bar"
              role="progressbar"
              aria-label="いいおばけのスタンプ取得数"
              aria-valuemin={0}
              aria-valuemax={goodGhosts.length}
              aria-valuenow={progress.goodStampIds.length}
            >
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
            <p className="collection-summary">
              ぜんぶで {progress.goodStampIds.length + progress.badStampIds.length} / {goodGhosts.length + badGhosts.length} 体と なかよし！
            </p>
          </section>
          <VenueMap
            ghosts={markers}
            progress={progress}
            weather={weather}
            onWeatherChange={changeWeather}
            showPrize={complete}
          />
          <section className="panel list-panel">
            <div className="stamp-heading">
              <div>
                <p className="label">ともだちコレクション</p>
                <h2 id="ghost-book">おばけずかん</h2>
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
                    ? "景品受け取り場所でコンプリート画面をみせてね。"
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

      {(screen === "ending" || screen === "prize") && complete && (
        <section className="flow-panel ending-panel">
          <p className="label">コンプリート！</p>
          {heading(
            screen === "ending"
              ? "全部のおばけと なかよくなれたよ！"
              : "景品受け取り場所に 行って、この画面を みせてね！",
          )}
          <div className="completion-seal" aria-hidden="true">
            ✦
          </div>
          <p>
            {screen === "ending"
              ? "コンプリート おめでとう！景品受け取り場所に 行って、この画面を みせてね！"
              : "プレゼントは景品受け取り場所の人から受け取ってね。"}
          </p>
          <p className="prize-location">景品受け取り場所：{prizeLocation.location}</p>
          <p>
            いいおばけ {goodGhosts.length} / {goodGhosts.length} ・
            あやしいおばけ {badGhosts.length} / {badGhosts.length}
          </p>
          {screen === "ending" && (
            <button className="action" onClick={() => setScreen("prize")}>
              景品受け取り場所で プレゼントをもらう
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
            <GhostImage ghost={earned.ghost} variant="stamp" />
          </div>
          <p className="speech">
            {isSurveyId(earned.ghost.id)
              ? surveys[earned.ghost.id].thanks
              : "またいつでも お話ししにきてね！"}
          </p>
          <p className="dialog-detail">スタンプを獲得したよ！</p>
          <button className="action" onClick={dismissEarned}>
            {earnedNextScreen === "ending"
              ? "コンプリート画面へ！"
              : earnedNextScreen === "unlock"
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
      "前の保存データからスタンプと完了した回答を引き継ぎました。旧版の訪問記録だけの場合は、もう一度会話を終えてください。",
    unsupported:
      "この画面では読み込めない新しい保存データがあります。保存済みの進捗を守るため上書きを止めています。ページを再読み込みしてください。この画面だけに残っている未保存の進捗は、再読み込みすると失われます。",
    unsaved:
      "進捗と回答を保存できませんでした。この画面には反映されていますが、画面を閉じると失われる可能性があります。",
  }[issue];
  return (
    <section className="storage-notice" aria-label="進捗の保存状況">
      <p role={issue === "migrated" ? "status" : "alert"}>{text}</p>
      <button type="button" onClick={onRetry}>
        {issue === "unsupported" ? "ページを再読み込み" : "進捗の保存を再試行"}
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
        <GhostImage ghost={ghost} variant="stamp" concealed={!done} />
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
