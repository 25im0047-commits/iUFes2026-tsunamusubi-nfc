import { useEffect, type CSSProperties } from "react";

const confetti = Array.from({ length: 48 }, (_, index) => ({
  left: (index * 37) % 100,
  duration: 1.2 + (index % 5) * .3,
  delay: (index % 11) * .12,
  color: ["#ffe27a", "#7df0c9", "#fff", "#ff9bcb", "#ff8a2b"][index % 5],
}));

export function PartyWords({ text }: { text: string }) {
  return <>
    <span className="party-words" aria-hidden="true">{Array.from(text).map((letter, index) => (
      <span className="party-letter" key={index} style={{ "--letter-delay": `${(index % 7) * .08}s` } as CSSProperties}>{letter}</span>
    ))}</span>
    <span className="party-sr">{text}</span>
  </>;
}

export function PartyEffects({ contained = false, intensity = 1, spooky = false }: { contained?: boolean; intensity?: number; spooky?: boolean }) {
  const local = contained ? " party-local" : "";
  const level = Math.max(0, Math.min(1, intensity));
  return (
    <>
      <div className={`party-effects${local}${spooky ? " party-spooky" : ""}`} aria-hidden="true" style={{ "--party-intensity": level, "--ray-time": `${120 - level * 84}s` } as CSSProperties}>
        <div className="party-rays" />
        <div className="party-halo" />
        {!spooky && <PartyOrbs />}
        {!spooky && confetti.slice(0, Math.round(48 * level)).map((piece, index) => (
          <i className="party-confetti" key={index} style={{
            left: `${piece.left}%`, background: piece.color,
            "--fall-time": `${piece.duration}s`, "--fall-delay": `${piece.delay}s`,
          } as CSSProperties} />
        ))}
        {!spooky && [8, 82, 35, 65, 16, 90].slice(0, Math.ceil(6 * level)).map((left, index) => (
          <div className="party-mascot" key={left} style={{
            left: `${left}%`, top: `${10 + index * 13}%`,
            "--float-delay": `${index * .3}s`,
          } as CSSProperties}>
            <svg viewBox="0 0 40 48" focusable="false">
              <path d="M20 1C9 1 3 9 3 21v24l5.5-4 5.5 4 6-4 6 4 5.5-4 5.5 4V21C37 9 31 1 20 1z" fill="#fff" />
              <ellipse cx="14" cy="21" rx="2.4" ry="3.2" fill="#2b1060" />
              <ellipse cx="26" cy="21" rx="2.4" ry="3.2" fill="#2b1060" />
              <ellipse cx="10" cy="28" rx="3" ry="2" fill="#ff9bcb" />
              <ellipse cx="30" cy="28" rx="3" ry="2" fill="#ff9bcb" />
              <ellipse cx="20" cy="29" rx="2.6" ry="3.2" fill="#ff5a9e" />
            </svg>
          </div>
        ))}
      </div>
      {!spooky && level > 0 && <div className={`party-edge${local}`} aria-hidden="true" style={{ opacity: level * .6 }} />}
    </>
  );
}

const orbColors = ["#ff5aaa", "#ffe27a", "#7df0c9", "#fff", "#ff8a2b"];
const orbs = Array.from({ length: 12 }, (_, index) => ({
  left: (index * 61) % 96,
  size: 16 + ((index * 13) % 44),
  time: 5 + (index % 5),
  delay: (index % 7) * .7,
  color: orbColors[index % 5],
}));
export function PartyOrbs() {
  return (
    <div className="party-orbs" aria-hidden="true">
      {orbs.map((orb, index) => (
        <i key={index} style={{
          left: `${orb.left}%`, width: orb.size, height: orb.size, background: orb.color,
          "--orb-time": `${orb.time}s`, "--orb-delay": `${orb.delay}s`,
        } as CSSProperties} />
      ))}
    </div>
  );
}

const burstColors = ["#ffe27a", "#7df0c9", "#fff", "#ff9bcb", "#ff8a2b"];
const burstDots = Array.from({ length: 30 }, (_, index) => {
  const angle = (index * 2 * Math.PI) / 30;
  const radius = 150 + (index % 4) * 45;
  return {
    x: Math.round(Math.cos(angle) * radius),
    y: Math.round(Math.sin(angle) * radius),
    size: 7 + (index % 4) * 4,
    delay: (index % 5) * .1,
    color: burstColors[index % 5],
  };
});

/** One-shot celebration for a newly earned stamp: flash, shock rings, particle burst and a short vibration. */
export function PartyBurst() {
  useEffect(() => {
    if (typeof window === "undefined" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    try { navigator.vibrate?.([40, 30, 70]); } catch { /* vibration is optional */ }
  }, []);
  return (
    <div className="party-burst" aria-hidden="true">
      <i className="pb-flash" />
      {[0, .5, 1].map((delay) => <i className="pb-ring" key={delay} style={{ "--d": `${delay}s` } as CSSProperties} />)}
      {burstDots.map((dot, index) => (
        <i className="pb-dot" key={index} style={{
          "--x": `${dot.x}px`, "--y": `${dot.y}px`, "--s": `${dot.size}px`, "--c": dot.color, "--d": `${dot.delay}s`,
        } as CSSProperties} />
      ))}
    </div>
  );
}

export function PartyTicker() {
  const line = "みつけろ、おばけ　・　あつめろ、スタンプ　・　";
  return (
    <div className="party-ticker" aria-hidden="true">
      <span>{line.repeat(4)}</span>
    </div>
  );
}
