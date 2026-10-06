import type { CSSProperties, ReactNode } from "react";
import { PartyBurst } from "./PartyEffects";

const colors = ["#FFE27A", "#7DF0C9", "#fff", "#FF9BCB", "#FF8A2B"];
const sparks = Array.from({ length: 30 }, (_, i) => {
  const angle = i * Math.PI * 2 / 30;
  const radius = 170 + (i % 4) * 70;
  return { x: Math.round(Math.cos(angle) * radius), y: Math.round(Math.sin(angle) * radius), size: 7 + (i % 4) * 5 };
});

export function FoundEffects() {
  return <>
    <div className="found-effects" aria-hidden="true">
      <div className="found-shake"><div className="found-zoom">
        <div className="found-rays" /><div className="found-rays found-rays-gold" />
        <div className="found-color-glow" /><div className="found-beat" />
        {[0, .6, 1.2].map(delay => <i className="found-ring" key={delay} style={{ animationDelay: `${delay}s` }} />)}
        {sparks.map((spark, i) => <i key={i} className="found-spark" style={{
          "--x": `${spark.x}px`, "--y": `${spark.y}px`, "--spark-color": colors[i % 5],
          width: spark.size, height: spark.size, animationDelay: `${i % 5 * .12}s`,
        } as CSSProperties} />)}
        {Array.from({ length: 24 }, (_, i) => <span className="found-streak-axis" key={i} style={{ transform: `rotate(${i * 15}deg)` }}>
          <i className="found-streak" style={{ height: 70 + i % 3 * 30, animationDuration: `${.6 + i % 3 * .15}s`, animationDelay: `${i % 6 * .1}s` }} />
        </span>)}
      </div></div>
    </div>
    <div className="found-front-confetti" aria-hidden="true">
      {Array.from({ length: 90 }, (_, i) => <i className="found-confetti" key={i} style={{
        left: `${(i * 23 % 390) / 3.9}%`, width: 6 + i % 3 * 3, height: 11 + i % 4 * 4,
        background: colors[i % 5], animationDuration: `${1.2 + i % 5 * .3}s`, animationDelay: `${i % 11 * .12}s`,
      }} />)}
    </div>
    <div className="found-edge" aria-hidden="true" />
    <div className="found-flash" aria-hidden="true" />
  </>;
}

export function FoundStage({ children }: { children: ReactNode }) {
  return <div className="found-stage">
    <div className="found-backdrop" aria-hidden="true" />
    <FoundEffects />
    <PartyBurst />
    <div className="found-world"><div className="found-content">{children}</div></div>
  </div>;
}

export function FoundOrbit() {
  return <div className="found-orbit" aria-hidden="true">
    {Array.from({ length: 6 }, (_, i) => <span className="found-orbit-ghost" key={i} style={{ transform: `rotate(${i * 60}deg) translateY(var(--orbit-radius)) rotate(${-i * 60}deg)` }}>
      <svg viewBox="0 0 40 48" focusable="false">
        <path d="M20 1C9 1 3 9 3 21v24l5.5-4 5.5 4 6-4 6 4 5.5-4 5.5 4V21C37 9 31 1 20 1z" fill="#fff" />
        <ellipse cx="14" cy="21" rx="2.4" ry="3.2" fill="#2B1060" />
        <ellipse cx="26" cy="21" rx="2.4" ry="3.2" fill="#2B1060" />
        <ellipse cx="20" cy="29" rx="2.6" ry="3.2" fill="#FF5A9E" />
      </svg>
    </span>)}
  </div>;
}
