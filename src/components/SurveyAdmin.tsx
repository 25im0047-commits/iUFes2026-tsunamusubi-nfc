import { useEffect, useState } from "react";
import { surveys, type SurveyId } from "../lib/survey";
import { readSurveyRules, type SurveyRules, type StoredSurveyAnswer } from "../lib/survey-rules";
import { readSurveyTexts, MAX_QUESTION_LENGTH, type SurveyTexts } from "../lib/survey-texts";

export function SurveyAdmin({ authorization, onUnauthorized }: { authorization: () => string; onUnauthorized: () => void }) {
  const [rules, setRules] = useState<SurveyRules | null>(null);
  const [texts, setTexts] = useState<SurveyTexts | null>(null);
  const [items, setItems] = useState<StoredSurveyAnswer[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function request(path: string, method = "GET", body?: unknown) {
    const response = await fetch(path, { method, cache: "no-store", signal: AbortSignal.timeout(15000), headers: { Authorization: authorization(), ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) onUnauthorized();
      throw new Error(data.error || "操作できませんでした。");
    }
    return data;
  }
  useEffect(() => {
    let active = true;
    void request("/api/admin/survey-rules").then(data => {
      const parsed = readSurveyRules(data.rules);
      const parsedTexts = readSurveyTexts(data.texts);
      if (!parsed || !parsedTexts) throw new Error("質問設定を読み取れません。");
      if (active) { setRules(parsed); setTexts(parsedTexts); }
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
    // Authorization is an in-memory ref, unchanged during this authenticated mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    let active = true;
    setBusy(true); setError("");
    void request(`/api/admin/survey-responses?ghost=${filter}&page=${page}`).then(data => {
      if (active) { setItems(data.items); setTotal(data.total); }
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page, revision]);
  async function saveRules() {
    setBusy(true); setError(""); setMessage("");
    try {
      if (!readSurveyTexts(texts)) throw new Error("質問文は空欄にせず、300文字以内で入力してください。");
      const data = await request("/api/admin/survey-rules", "PUT", { rules, texts });
      setRules(readSurveyRules(data.rules)); setTexts(readSurveyTexts(data.texts)); setMessage("質問文と必須設定を保存しました。");
    }
    catch (e) { setError(e instanceof Error ? e.message : "保存できませんでした。"); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!window.confirm("この回答を削除します。取り消せません。参加者のスタンプと景品の受取済み記録は残ります。削除してよろしいですか？")) return;
    setBusy(true); setError(""); setMessage("");
    try { await request("/api/admin/survey-responses", "DELETE", { id }); setMessage("回答を削除しました。"); if (items.length === 1 && page > 0) setPage(page - 1); else setRevision(r => r + 1); }
    catch (e) { setError(e instanceof Error ? e.message : "削除できませんでした。"); setBusy(false); }
  }
  async function downloadCsv() {
    setBusy(true); setError(""); setMessage("");
    try {
      const response=await fetch(`/api/admin/survey-export?ghost=${filter}`,{cache:"no-store",headers:{Authorization:authorization()},signal:AbortSignal.timeout(30000)});
      if(!response.ok){if(response.status===401)onUnauthorized();const data=await response.json();throw new Error(data.error || "CSVを取得できませんでした。");}
      if(!response.headers.get("content-type")?.startsWith("text/csv"))throw new Error("CSVの形式が不正です。");
      const url=URL.createObjectURL(await response.blob());
      const link=document.createElement("a");link.href=url;link.download=`iufes2026-survey-answers${filter?"-"+filter:""}.csv`;
      document.body.append(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
      setMessage("CSVをダウンロードしました。");
    }catch(e){setError(e instanceof Error?e.message:"CSVを取得できませんでした。");}
    finally{setBusy(false);}
  }
  return <>
    <section className="admin-card">
      <h2>質問文・必須設定</h2>
      <p>チェックした質問は回答必須です。新しい回答の送信時に適用されます。</p>
      {rules && texts && (Object.keys(surveys) as SurveyId[]).map(id => <fieldset key={id} disabled={busy}>
        <legend>{id === "bad-01" ? "メデューサ" : "ヴァンパイア"}</legend>
        {surveys[id].questions.map((q,index) => <div className="admin-question" key={q.id}>
          <label>Q{index + 1}の質問文<textarea aria-label={`${id === "bad-01" ? "メデューサ" : "ヴァンパイア"} Q${index + 1}の質問文`} rows={3} maxLength={MAX_QUESTION_LENGTH} value={texts[id][q.id]} onChange={e => setTexts({ ...texts, [id]: { ...texts[id], [q.id]: e.target.value } })} /></label>
          <label className="admin-option"><input type="checkbox" aria-label={`${id === "bad-01" ? "メデューサ" : "ヴァンパイア"} Q${index + 1}を必須にする`} checked={rules[id][q.id]} onChange={e => setRules({ ...rules, [id]: { ...rules[id], [q.id]: e.target.checked } })} />この質問を必須にする</label>
        </div>)}
      </fieldset>)}
      <button type="button" disabled={busy || !rules || !texts} onClick={() => void saveRules()}>質問設定を保存</button>
    </section>
    <section className="admin-card">
      <h2>回答の管理</h2>
      <label>おばけで絞り込み<select value={filter} disabled={busy} onChange={e => { setFilter(e.target.value); setPage(0); }}><option value="">すべて</option><option value="bad-01">メデューサ</option><option value="bad-02">ヴァンパイア</option></select></label>
      <p>{total}件 / {page + 1}ページ</p>
      <p>CSVには絞り込み条件に一致する全ページの回答を出力します。質問の見出しは現在の質問文です。</p>
      <button type="button" disabled={busy} onClick={()=>void downloadCsv()}>回答をCSVでダウンロード</button>
      {busy && <p role="status">読み込み・処理中…</p>}
      {!busy && !items.length && <p>回答はありません。</p>}
      {items.map(item => <article key={item.id}>
        <details><summary>{item.ghostId === "bad-01" ? "メデューサ" : "ヴァンパイア"} / {new Date(item.createdAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</summary>
          <p>回答ID：{item.id}<br />匿名参加者ID：{item.participantId}</p>
          <dl>{surveys[item.ghostId].questions.map(q => {
            const value = item.answers[q.id];
            const label = (v: string) => q.options?.find(option => option.id === v)?.label ?? v;
            return <div key={q.id}><dt>{texts?.[item.ghostId][q.id] ?? q.label}</dt><dd>{Array.isArray(value) ? value.map(label).join("、") || "未回答" : value == null || value === "" ? "未回答" : label(String(value))}</dd></div>;
          })}</dl>
        </details>
        <button type="button" disabled={busy} onClick={() => void remove(item.id)}>この回答を削除</button>
      </article>)}
      <button type="button" disabled={busy || page === 0} onClick={() => setPage(page - 1)}>前のページ</button>
      <button type="button" disabled={busy || (page + 1) * 25 >= total} onClick={() => setPage(page + 1)}>次のページ</button>
      <button type="button" disabled={busy} onClick={() => setRevision(r => r + 1)}>一覧を再取得</button>
      {message && <p role="status">{message}</p>}{error && <p role="alert" className="admin-error">{error}</p>}
    </section>
  </>;
}
