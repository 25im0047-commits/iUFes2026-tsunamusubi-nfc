import { useEffect, useState } from "react";
import { surveys, type SurveyId } from "../lib/survey";
import { readSurveyRules, type SurveyRules, type StoredSurveyAnswer } from "../lib/survey-rules";

export function SurveyAdmin({ authorization, onUnauthorized }: { authorization: () => string; onUnauthorized: () => void }) {
  const [rules, setRules] = useState<SurveyRules | null>(null);
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
      if (!parsed) throw new Error("質問設定を読み取れません。");
      if (active) setRules(parsed);
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
    try { const data = await request("/api/admin/survey-rules", "PUT", { rules }); setRules(readSurveyRules(data.rules)); setMessage("質問の必須設定を保存しました。"); }
    catch (e) { setError(e instanceof Error ? e.message : "保存できませんでした。"); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!window.confirm("この回答を削除します。取り消せません。参加者のスタンプと景品の受取済み記録は残ります。削除してよろしいですか？")) return;
    setBusy(true); setError(""); setMessage("");
    try { await request("/api/admin/survey-responses", "DELETE", { id }); setMessage("回答を削除しました。"); if (items.length === 1 && page > 0) setPage(page - 1); else setRevision(r => r + 1); }
    catch (e) { setError(e instanceof Error ? e.message : "削除できませんでした。"); setBusy(false); }
  }
  return <>
    <section className="admin-card">
      <h2>質問ごとの必須設定</h2>
      <p>チェックした質問は回答必須です。新しい回答の送信時に適用されます。</p>
      {rules && (Object.keys(surveys) as SurveyId[]).map(id => <fieldset key={id} disabled={busy}>
        <legend>{id === "bad-01" ? "メデューサ" : "ヴァンパイア"}</legend>
        {surveys[id].questions.map(q => <label className="admin-option" key={q.id}><input type="checkbox" checked={rules[id][q.id]} onChange={e => setRules({ ...rules, [id]: { ...rules[id], [q.id]: e.target.checked } })} />{q.label}（必須）</label>)}
      </fieldset>)}
      <button type="button" disabled={busy || !rules} onClick={() => void saveRules()}>質問設定を保存</button>
    </section>
    <section className="admin-card">
      <h2>回答の管理</h2>
      <label>おばけで絞り込み<select value={filter} disabled={busy} onChange={e => { setFilter(e.target.value); setPage(0); }}><option value="">すべて</option><option value="bad-01">メデューサ</option><option value="bad-02">ヴァンパイア</option></select></label>
      <p>{total}件 / {page + 1}ページ</p>
      {busy && <p role="status">読み込み・処理中…</p>}
      {!busy && !items.length && <p>回答はありません。</p>}
      {items.map(item => <article key={item.id}>
        <details><summary>{item.ghostId === "bad-01" ? "メデューサ" : "ヴァンパイア"} / {new Date(item.createdAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</summary>
          <p>回答ID：{item.id}<br />匿名参加者ID：{item.participantId}</p>
          <dl>{surveys[item.ghostId].questions.map(q => {
            const value = item.answers[q.id];
            const label = (v: string) => q.options?.find(option => option.id === v)?.label ?? v;
            return <div key={q.id}><dt>{q.label}</dt><dd>{Array.isArray(value) ? value.map(label).join("、") || "未回答" : value == null || value === "" ? "未回答" : label(String(value))}</dd></div>;
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
