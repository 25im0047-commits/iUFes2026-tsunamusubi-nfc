import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { readNfcUrl } from "../lib/nfc";
import {
  badGhosts,
  emptyProgress,
  getGhost,
  goodGhosts,
  hasAllGoodStamps,
  hasAllBadVisits,
  loadProgress,
  recordGhost,
  saveProgress,
  type Ghost,
  type Progress,
} from "../lib/rally";

export const Route = createFileRoute("/")({ component: RallyPage });

function RallyPage() {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [activeGhostId, setActiveGhostId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [storageIssue, setStorageIssue] = useState<StorageIssue>(null);
  const progressRef = useRef(progress);
  const initialized = useRef(false);
  const goodComplete = hasAllGoodStamps(progress);
  const allBadVisited = hasAllBadVisits(progress);
  const activeGhost = getGhost(activeGhostId);

  function persistProgress(next: Progress) {
    const result = saveProgress(next);
    progressRef.current = result.progress;
    setProgress(result.progress);
    setStorageIssue(result.ok ? null : "unsaved");
  }

  useEffect(() => {
    // Keep the initial NFC ID when development StrictMode re-runs effects.
    if (initialized.current) return;
    initialized.current = true;
    const loaded = loadProgress();
    const saved = loaded.progress;
    progressRef.current = saved;
    setProgress(saved);
    if (loaded.status === "unavailable" || loaded.status === "repaired") {
      setStorageIssue(loaded.status);
    }
    const { id, cleanPath } = readNfcUrl(window.location.href);
    if (id !== null) {
      const ghost = getGhost(id);
      if (ghost) {
        setActiveGhostId(ghost.id);
        if (ghost.type === "bad" && !saved.badVisitedIds.includes(ghost.id)) {
          persistProgress(recordGhost(saved, ghost.id));
        }
      } else {
        setMessage(`id「${id}」のおばけは登録されていません。`);
      }
      window.history.replaceState(
        window.history.state,
        "",
        cleanPath,
      );
    }
    setReady(true);
  }, []);

  function finishGood(ghost: Ghost) {
    if (!progressRef.current.goodStampIds.includes(ghost.id)) {
      persistProgress(recordGhost(progressRef.current, ghost.id));
      setMessage(`${ghost.name}のスタンプをMapに反映しました。`);
    }
    setActiveGhostId(null);
  }

  function finishBad() {
    setActiveGhostId(null);
    setMessage(
      allBadVisited
        ? "すべての悪いおばけを発見しました。受付に戻ってクイズに進んでください。"
        : "受付に戻ってクイズに進んでください。",
    );
  }

  const markers = useMemo(
    () => [...goodGhosts, ...(goodComplete ? badGhosts : [])],
    [goodComplete],
  );
  if (!ready) return <main className="loading">Mapを読み込んでいます…</main>;
  const storageNotice = storageIssue && (
    <ProgressStorageNotice
      issue={storageIssue}
      onRetry={() => persistProgress(progressRef.current)}
    />
  );

  return (
    <main className="page">
      {!activeGhost && storageNotice}
      <section className="instruction">
        <p className="label">SYSTEM FLOW</p>
        <h2>おばけの気配を探そう！</h2>
        <p>
          Mapで気配の場所を確認し、現地のおばけのコア（NFCタグ）にスマートフォンをかざしてください。
        </p>
      </section>

      <section className="progress panel">
        <div className="panel-title">
          <h2>スタンプ</h2>
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
            ? "良いおばけをすべて発見しました。新しい気配がMapに表示されています。"
            : "良いおばけとの会話を終えると、自動でスタンプがつきます。"}
        </p>
      </section>

      <section className="panel map-panel">
        <div className="panel-title">
          <h2>会場Map</h2>
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
            const done =
              ghost.type === "good"
                ? progress.goodStampIds.includes(ghost.id)
                : progress.badVisitedIds.includes(ghost.id);
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
          ※地図上のマーカーは場所の目安です。会話はNFCタグのURLから開始します。
        </p>
      </section>

      <section className="panel nfc-panel">
        <div className="nfc-symbol">NFC</div>
        <div>
          <p className="label">NEXT ACTION</p>
          <h2>おばけのコアにタッチ</h2>
          <p>
            NFCタグからこのページが開くと、URLの <code>id</code>{" "}
            でおばけを判別します。読み取り後はURLからidだけを削除します。
          </p>
        </div>
      </section>

      <section className="panel list-panel">
        <div className="stamp-heading">
          <div>
            <p className="label">STAMPS</p>
            <h2>おばけスタンプ</h2>
          </div>
          <span>
            {goodComplete
              ? "GOOD COMPLETE"
              : `${progress.goodStampIds.length} / ${goodGhosts.length}`}
          </span>
        </div>
        <p className="list-help">
          集めたカードをタッチすると、おばけがもう一度しゃべるよ。
        </p>
        <div className="ghost-list">
          {goodGhosts.map((ghost, index) => (
            <StatusRow
              key={ghost.id}
              ghost={ghost}
              number={index + 1}
              done={progress.goodStampIds.includes(ghost.id)}
              label="会話"
              onOpen={() => setActiveGhostId(ghost.id)}
            />
          ))}
          {goodComplete &&
            badGhosts.map((ghost, index) => (
              <StatusRow
                key={ghost.id}
                ghost={ghost}
                number={goodGhosts.length + index + 1}
                done={progress.badVisitedIds.includes(ghost.id)}
                label="会話"
                onOpen={() => setActiveGhostId(ghost.id)}
              />
            ))}
        </div>
        {goodComplete && (
          <div className={`reception ${allBadVisited ? "complete" : ""}`}>
            <strong>
              {allBadVisited ? "受付に戻ろう" : "悪いおばけの次の行動"}
            </strong>
            <span>
              {allBadVisited
                ? "すべて発見しました。受付でクイズへ進んでください。"
                : "悪いおばけとの会話後、受付でクイズに挑戦します。"}
            </span>
          </div>
        )}
      </section>

      {message && (
        <p className="message" role="status">
          {message}
        </p>
      )}
      <footer>iUFes2026 周遊企画システムプロトタイプ</footer>
      {activeGhost && (
        <GhostDialog
          ghost={activeGhost}
          done={
            activeGhost.type === "good"
              ? progress.goodStampIds.includes(activeGhost.id)
              : progress.badVisitedIds.includes(activeGhost.id)
          }
          onGoodDone={finishGood}
          onBadDone={finishBad}
          onClose={() => setActiveGhostId(null)}
          storageNotice={storageNotice}
        />
      )}
    </main>
  );
}

type StorageIssue = "unavailable" | "repaired" | "unsaved" | null;

function ProgressStorageNotice({ issue, onRetry }: {
  issue: Exclude<StorageIssue, null>;
  onRetry: () => void;
}) {
  const text = {
    unavailable: "この端末の進捗を読み込めませんでした。保存を再試行すると、読み込めた進捗とこの画面の進捗を合わせて保存します。",
    repaired: "保存データの一部を読み込めませんでした。確認できたスタンプを表示しています。取得状況を確認してください。",
    unsaved: "進捗を保存できませんでした。この画面には反映されていますが、画面を閉じると失われる可能性があります。",
  }[issue];
  return (
    <section className="storage-notice" aria-label="進捗の保存状況">
      <p role="alert">{text}</p>
      <button type="button" onClick={onRetry}>進捗の保存を再試行</button>
    </section>
  );
}

function StatusRow({
  ghost,
  number,
  done,
  label,
  onOpen,
}: {
  ghost: Ghost;
  number: number;
  done: boolean;
  label: string;
  onOpen: () => void;
}) {
  return (
    <button
      className={`status-row ${ghost.type} ${done ? "done is-actionable" : ""}`}
      type="button"
      disabled={!done}
      onClick={onOpen}
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
      <em>{done ? `タッチして${label}` : "未発見"}</em>
    </button>
  );
}

function GhostImage({ ghost }: { ghost: Ghost }) {
  if (ghost.imageSrc) return <img src={ghost.imageSrc} alt="" />;
  return (
    <span className={`ghost-placeholder ${ghost.type}`} aria-hidden="true">
      <i />
      <i />
      <b>{ghost.type === "bad" ? "!" : "✦"}</b>
    </span>
  );
}

function GhostDialog({
  ghost,
  done,
  onGoodDone,
  onBadDone,
  onClose,
  storageNotice,
}: {
  ghost: Ghost;
  done: boolean;
  onGoodDone: (ghost: Ghost) => void;
  onBadDone: () => void;
  onClose: () => void;
  storageNotice: ReactNode;
}) {
  return (
    <div className="backdrop" onClick={onClose}>
      <section
        className={`dialog ${ghost.type}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="close"
          type="button"
          onClick={onClose}
          aria-label="閉じる"
        >
          ×
        </button>
        {storageNotice}
        <div className="dialog-ghost">
          <GhostImage ghost={ghost} />
        </div>
        <p className="label">
          {ghost.type === "good" ? "GOOD OBAKE" : "BAD OBAKE"}
        </p>
        <h2 id="dialog-title">{ghost.name}</h2>
        <p className="dialog-location">
          {ghost.area} / {ghost.location}
        </p>
        <div className="speech">{ghost.message}</div>
        <p className="dialog-detail">{ghost.detail}</p>
        {ghost.type === "good" ? (
          <button
            className="action"
            type="button"
            onClick={() => onGoodDone(ghost)}
            disabled={done}
          >
            {done ? "スタンプ獲得済み" : "会話を終えてスタンプを獲得"}
          </button>
        ) : (
          <button
            className="action bad-action"
            type="button"
            onClick={onBadDone}
          >
            受付でクイズへ進む
          </button>
        )}
      </section>
    </div>
  );
}
