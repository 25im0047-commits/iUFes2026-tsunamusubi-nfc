import { createClient, type Client } from "@libsql/client/web";
import { createHash, timingSafeEqual } from "node:crypto";
import type { WeatherMode } from "../lib/venue.ts";

export const schema = [
  "CREATE TABLE IF NOT EXISTS iufes2026_weather (id INTEGER PRIMARY KEY CHECK (id = 1), weather TEXT NOT NULL CHECK (weather IN ('sunny','rainy')), updated_at TEXT NOT NULL)",
  "INSERT OR IGNORE INTO iufes2026_weather (id, weather, updated_at) VALUES (1, 'sunny', strftime('%Y-%m-%dT%H:%M:%fZ','now'))",
  "CREATE TABLE IF NOT EXISTS iufes2026_admin_limits (bucket TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires INTEGER NOT NULL)",
];
export function getDatabase(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw new Error("Weather storage is not configured");
  return createClient({ url, authToken });
}
export async function readWeather(db: Client) {
  const result = await db.execute("SELECT weather, updated_at FROM iufes2026_weather WHERE id = 1");
  const row = result.rows[0];
  if (!row || (row.weather !== "sunny" && row.weather !== "rainy")) throw new Error("Invalid weather setting");
  return { weather: row.weather as WeatherMode, updatedAt: String(row.updated_at) };
}
export async function writeWeather(db: Client, weather: WeatherMode) {
  const result = await db.execute({
    sql: "UPDATE iufes2026_weather SET weather = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = 1 RETURNING weather, updated_at",
    args: [weather],
  });
  if (!result.rows[0]) throw new Error("Weather setting is missing");
  return { weather: result.rows[0].weather as WeatherMode, updatedAt: String(result.rows[0].updated_at) };
}
function digest(value: string) { return createHash("sha256").update(value).digest(); }
export function authorized(request: Request, env = process.env) {
  if (!env.ADMIN_USER || !env.ADMIN_PASSWORD) return false;
  const header = request.headers.get("authorization") || "";
  if (!/^Basic [A-Za-z0-9+/]+=*$/.test(header) || header.length > 4096) return false;
  const expected = Buffer.from(env.ADMIN_USER + ":" + env.ADMIN_PASSWORD).toString("base64");
  return timingSafeEqual(digest(header.slice(6)), digest(expected));
}
export function json(value: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra } });
}
export async function weatherResponse(request: Request, admin: boolean, suppliedDb?: Client) {
  if (request.method !== "GET" && (request.method !== "PUT" || !admin))
    return json({ error: "この操作は許可されていません。" }, 405);
  if (admin && (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD)) return json({ error: "管理者の環境変数が未設定です。" }, 503);
  if (request.method === "PUT") {
    if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "許可されていないアクセスです。" }, 403);
    if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "JSONで送信してください。" }, 415);
  }
  let db: Client | undefined;
  try {
    if (admin) {
      db = suppliedDb ?? getDatabase();
      const denied = await requireAdmin(request, db);
      if (denied) return denied;
    }
    db ??= suppliedDb ?? getDatabase();
    if (request.method === "PUT") {
      let body: unknown;
      const raw = await request.text();
      if (raw.length > 1024) return json({ error: "送信内容が大きすぎます。" }, 413);
      try { body = JSON.parse(raw); } catch { return json({ error: "送信内容を確認してください。" }, 400); }
      const weather = (body as { weather?: unknown } | null)?.weather;
      if (weather !== "sunny" && weather !== "rainy") return json({ error: "晴天か雨天を選んでください。" }, 400);
      return json(await writeWeather(db, weather));
    }
    return json(await readWeather(db));
  } catch {
    return json({ error: "配置設定を読み書きできません。時間をおいて再試行してください。" }, 503);
  } finally { if (!suppliedDb) db?.close(); }
}

export async function requireAdmin(request: Request, db: Client): Promise<Response | undefined> {
  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD) return json({ error: "管理者の環境変数が未設定です。" }, 503);
  if (request.method !== "GET" && request.headers.get("origin") !== new URL(request.url).origin)
    return json({ error: "許可されていないアクセスです。" }, 403);
  if (!request.headers.has("authorization")) return json({ error: "管理用ID・パスワードを確認してください。" }, 401);
  const now = Math.floor(Date.now() / 1000);
  // A bounded shared bucket survives Vercel function restarts; never store passwords or IPs.
  const bucket = String(Math.floor(now / 60));
  const result = await db.execute({
    sql: "INSERT INTO iufes2026_admin_limits (bucket, attempts, expires) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET attempts = attempts + 1 RETURNING attempts",
    args: [bucket, now + 120],
  });
  await db.execute({ sql: "DELETE FROM iufes2026_admin_limits WHERE expires < ?", args: [now] });
  if (Number(result.rows[0].attempts) > 20)
    return json({ error: "試行が多すぎます。1分ほど待ってください。" }, 429, { "Retry-After": "60" });
  if (!authorized(request)) return json({ error: "管理用ID・パスワードを確認してください。" }, 401);
}
