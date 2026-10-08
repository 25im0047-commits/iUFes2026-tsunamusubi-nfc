import type { CSSProperties } from "react";

const sparkles = [
  [8, 10], [84, 18], [51, 5], [27, 38], [92, 57], [6, 73], [63, 82], [35, 65],
];

export function RallySparkles() {
  return (
    <div className="sparkles" aria-hidden="true">
      {sparkles.map(([left, top], index) => (
        <i key={index} style={{ left: `${left}%`, top: `${top}%`, "--spark-delay": `${index * .3}s` } as CSSProperties} />
      ))}
    </div>
  );
}

export function RallyRibbon() {
  return (
    <div className="rally-ribbon" aria-hidden="true">
      <div className="rally-ribbon-track">
        {[0, 1].map((copy) => (
          <span key={copy}>みつけろ、おばけ　・　あつめろ、スタンプ　・　みつけろ、おばけ　・　あつめろ、スタンプ　・</span>
        ))}
      </div>
    </div>
  );
}

export function CelebrationEffects() {
  return (
    <>
      <div className="celebration-confetti" aria-hidden="true">
        {Array.from({ length: 36 }, (_, index) => (
          <i key={index} style={{
            left: `${(index * 23) % 100}%`,
            "--fall-duration": `${1.2 + (index % 5) * .3}s`,
            "--fall-delay": `${(index % 11) * .12}s`,
          } as CSSProperties} />
        ))}
      </div>
      <div className="celebration-sparks" aria-hidden="true">
        {[8, 76, 38, 62, 20].map((left, index) => (
          <span key={index} style={{ left: `${left}%`, "--spark-delay": `${index * .4}s` } as CSSProperties}>+1</span>
        ))}
      </div>
      <div className="celebration-edge" aria-hidden="true" />
      <div className="celebration-flash" aria-hidden="true" />
    </>
  );
}
