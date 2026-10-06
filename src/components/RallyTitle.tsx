import type { Ref } from "react";
import { goodGhosts } from "../lib/rally";
import { GhostImage } from "./GhostDialog";
import { PartyWords } from "./PartyEffects";

export function RallyTitle({
  headingRef,
  onStart,
}: {
  headingRef?: Ref<HTMLHeadingElement>;
  onStart: () => void;
}) {
  return (
    <section className="flow-panel title-panel">
      <p className="label">iU Fes 2026</p>
      <p className="title-tagline">会場にかくれた ともだちを見つけよう。</p>
      <h1 ref={headingRef} tabIndex={-1}>
        <span><PartyWords text="おばけさがし" /></span>{" "}<span><PartyWords text="スタンプラリー！" /></span>
      </h1>
      <div className="title-artwork" aria-hidden="true">
        <div className="title-side-ghost title-side-left"><GhostImage ghost={goodGhosts[4]} /></div>
        <div className="title-ghosts"><GhostImage ghost={goodGhosts[0]} /></div>
        <div className="title-side-ghost title-side-right"><GhostImage ghost={goodGhosts[7]} /></div>
        <span className="title-sticker">タッチで<br />ともだち！</span>
      </div>
      <p>おばけたちと タッチして なかよくなろう！</p>
      <button className="action" type="button" onClick={onStart}>ぼうけんを はじめる！</button>
      <p className="title-footnote">スマホを持って、会場をめぐろう。</p>
    </section>
  );
}
