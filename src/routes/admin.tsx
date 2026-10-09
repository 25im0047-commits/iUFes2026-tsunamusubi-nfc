import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import type { WeatherMode } from "../lib/venue";
import "../admin.css";
import { SurveyAdmin } from "../components/SurveyAdmin";
import { ProgressReset } from "../components/ProgressReset";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "会場配置の管理 | iUFes2026" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminPage,
});
function AdminPage() {
  const authorization = useRef("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [weather, setWeather] = useState<WeatherMode>("sunny");
  const [updatedAt, setUpdatedAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function send(method: "GET" | "PUT", header: string) {
    const response = await fetch("/api/admin/weather", {
      method, cache: "no-store", signal: AbortSignal.timeout(10000),
      headers: { Authorization: header, ...(method === "PUT" ? { "Content-Type": "application/json" } : {}) },
      ...(method === "PUT" ? { body: JSON.stringify({ weather }) } : {}),
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) { authorization.current = ""; setLoggedIn(false); }
      throw new Error(data.error || "設定を取得できませんでした。");
    }
    if (data.weather !== "sunny" && data.weather !== "rainy") throw new Error("設定の形式が不正です。");
    setWeather(data.weather);
    setUpdatedAt(data.updatedAt);
  }
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const bytes = new TextEncoder().encode(user + ":" + password);
      const header = "Basic " + btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
      await send("GET", header); authorization.current = header; setLoggedIn(true); setPassword("");
    } catch (e) { setError(e instanceof Error ? e.message : "ログインできませんでした。"); }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try { await send("PUT", authorization.current); setMessage("保存しました。参加者の画面には最大30秒ほどで反映されます。"); }
    catch (e) { setError(e instanceof Error ? e.message : "保存できませんでした。"); }
    finally { setBusy(false); }
  }
  function logout() { authorization.current = ""; setLoggedIn(false); setPassword(""); setMessage(""); setError(""); }
  return <main className="admin-page">
    <a href="/">← おばけMapへ</a>
    <section className="admin-card">
      <p className="admin-label">iU Fes 2026 / 運営用</p>
      <h1>会場配置の管理</h1>
      <p>晴天・雨天の配置を、全参加者共通で切り替えます。</p>
      {!loggedIn ? <form onSubmit={login}>
        <label>管理用ID<input autoComplete="username" value={user} onChange={(e) => setUser(e.target.value)} required disabled={busy} /></label>
        <label>パスワード<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={busy} /></label>
        <button disabled={busy}>{busy ? "確認中…" : "ログイン"}</button>
      </form> : <form onSubmit={save}>
        <fieldset disabled={busy}><legend>公開する配置</legend>
          {(["sunny", "rainy"] as const).map((mode) => <label className="admin-option" key={mode}>
            <input type="radio" name="weather" value={mode} checked={weather === mode} onChange={() => { setWeather(mode); setMessage(""); }} />
            {mode === "sunny" ? "晴天" : "雨天"}
          </label>)}
        </fieldset>
        <img className="admin-preview" src={weather === "sunny" ? "/maps/rally-map-1f-sunny-final-20261008.png" : "/maps/rally-map-1f-rainy-final-20261008.png"} alt={weather === "sunny" ? "晴天の1Fマップ確認用" : "雨天の1Fマップ確認用"} />
        <p>2F・3Fはどちらでも共通です。プレビューには未解放のおばけと景品も表示しています。</p>
        {updatedAt && <p>最終更新：{new Date(updatedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</p>}
        <button disabled={busy}>{busy ? "保存中…" : "この配置を公開する"}</button>
        <button className="admin-logout" type="button" disabled={busy} onClick={logout}>ログアウト</button>
      </form>}
      {message && <p role="status">{message}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}
    </section>
    {loggedIn && <SurveyAdmin authorization={() => authorization.current} onUnauthorized={logout} />}
    <ProgressReset disabled={busy} />
  </main>;
}
