import { useState } from "react";
import { resetLocalProgress } from "../lib/reset-progress";
export function ProgressReset({onReset,disabled=false}:{onReset?:()=>void;disabled?:boolean}) {
  const [result,setResult]=useState<boolean|null>(null);
  return <footer className="prototype-reset">
    <p>プロトタイプの動作確認用</p>
    <button type="button" disabled={disabled} onClick={()=>{
      if(!window.confirm("この端末のスタンプ・回答の下書き・景品受取済みをリセットします。元に戻せません。DBに保存済みの回答や管理設定は削除しません。同じサイトの別タブにも反映されます。リセットしてよろしいですか？"))return;
      const ok=resetLocalProgress();setResult(ok);if(ok)onReset?.();
    }}>この端末の進捗をリセット</button>
    <p>スタンプ・下書き・受取済みを初期化します。DBの回答は残ります。</p>
    {result!==null && <p role={result?"status":"alert"}>{result?"この端末の進捗をリセットしました。":"リセットを完了できませんでした。端末の保存設定を確認して再試行してください。"}</p>}
  </footer>;
}
