import type { CSSProperties } from "react";
import type { Ghost } from "../lib/rally";
import { GhostImage } from "./GhostDialog";
import { CelebrationEffects } from "./RallyDecorations";

export function StampCelebration({ ghost, collected, total }: {
  ghost: Ghost;
  collected: number;
  total: number;
}) {
  return (
    <>
      <CelebrationEffects />
      <p className="earned-count">{collected} 体のおばけと なかよし！</p>
      <div className="earned-art">
        <div className="dialog-ghost stamp-pop">
          <GhostImage ghost={ghost} variant="stamp" />
        </div>
        <span className="earned-plus" aria-hidden="true">+1</span>
      </div>
      <p className="earned-wordmark" aria-hidden="true">
        {Array.from("みつけた！").map((letter, index) => (
          <span key={index} style={{ "--letter-delay": `${index * .08}s` } as CSSProperties}>{letter}</span>
        ))}
      </p>
      <div className="earned-progress" aria-label={`スタンプ ${collected} / ${total}`}>
        <div><span>スタンプ ゲット</span><strong>{collected} / {total}</strong></div>
        <div className="earned-dots" aria-hidden="true">
          {Array.from({ length: total }, (_, index) => (
            <span key={index} className={`${index < collected ? "filled" : ""} ${index === collected - 1 ? "latest" : ""}`} />
          ))}
        </div>
      </div>
    </>
  );
}
