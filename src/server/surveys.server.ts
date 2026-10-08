import type { Client } from "@libsql/client/web";
import { createHash, randomUUID } from "node:crypto";
import { getDatabase, json, requireAdmin } from "./weather.server.ts";
import { isSurveyId, surveys, type SurveyId } from "../lib/survey.ts";
import { defaultSurveyRules, readSurveyRules, validateRequiredAnswers, type SurveyRules, type StoredSurveyAnswer } from "../lib/survey-rules.ts";

export const surveySchema = [
  "CREATE TABLE IF NOT EXISTS iufes2026_question_rules (key TEXT PRIMARY KEY, required INTEGER NOT NULL CHECK (required IN (0,1)))",
  "CREATE TABLE IF NOT EXISTS iufes2026_survey_receipts (id TEXT PRIMARY KEY, participant_id TEXT NOT NULL, ghost_id TEXT NOT NULL CHECK (ghost_id IN ('bad-01','bad-02')), payload_hash TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(participant_id, ghost_id))",
  "CREATE TABLE IF NOT EXISTS iufes2026_survey_answers (id TEXT PRIMARY KEY, answer_version INTEGER NOT NULL, answers_json TEXT NOT NULL CHECK (json_valid(answers_json)), created_at TEXT NOT NULL)",
  ...Object.entries(surveys).flatMap(([id, survey]) => survey.questions.map(q => ({
    sql: "INSERT OR IGNORE INTO iufes2026_question_rules (key, required) VALUES (?, 1)", args: [id + "." + q.id],
  }))),
];
export async function getSurveyRules(db: Pick<Client, "execute">): Promise<SurveyRules> {
  const result = await db.execute("SELECT key, required FROM iufes2026_question_rules");
  const rules = defaultSurveyRules();
  for (const id of ["bad-01", "bad-02"] as const) for (const q of surveys[id].questions) {
    const row = result.rows.find(r => r.key === id + "." + q.id);
    if (!row || ![0,1].includes(Number(row.required))) throw new Error("Question rules are missing");
    rules[id][q.id] = Boolean(Number(row.required));
  }
  return rules;
}
function sameOrigin(request: Request) { return request.headers.get("origin") === new URL(request.url).origin; }
async function body(request: Request) {
  if (!sameOrigin(request)) throw new ApiError(403, "許可されていないアクセスです。");
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ApiError(415, "JSONで送信してください。");
  const raw = await request.text();
  if (raw.length > 12000) throw new ApiError(413, "送信内容が大きすぎます。");
  try { return JSON.parse(raw); } catch { throw new ApiError(400, "送信内容を確認してください。"); }
}
class ApiError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
function uuid(value: unknown) { return typeof value === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value); }

export async function surveyResponse(request: Request, kind: "rules" | "submit" | "admin-rules" | "admin-answers", suppliedDb?: Client) {
  const allowed = kind === "rules" ? ["GET"] : kind === "submit" ? ["POST"] : kind === "admin-rules" ? ["GET", "PUT"] : ["GET", "DELETE"];
  if (!allowed.includes(request.method)) return json({ error: "この操作は許可されていません。" }, 405);
  let db: Client | undefined;
  try {
    db = suppliedDb ?? getDatabase();
    if (kind.startsWith("admin-")) {
      const denied = await requireAdmin(request, db);
      if (denied) return denied;
    }
    if (kind === "rules" || (kind === "admin-rules" && request.method === "GET")) return json({ rules: await getSurveyRules(db) });
    if (kind === "admin-rules") {
      const input = await body(request);
      const rules = readSurveyRules(input?.rules);
      if (!rules) throw new ApiError(400, "全質問の必須・任意を設定してください。");
      await db.batch(Object.entries(surveys).flatMap(([id, survey]) => survey.questions.map(q => ({
        sql: "UPDATE iufes2026_question_rules SET required = ? WHERE key = ?",
        args: [rules[id as SurveyId][q.id] ? 1 : 0, id + "." + q.id],
      }))), "write");
      return json({ rules: await getSurveyRules(db) });
    }
    if (kind === "admin-answers") {
      if (request.method === "DELETE") {
        const input = await body(request);
        if (!uuid(input?.id)) throw new ApiError(400, "回答IDを確認してください。");
        // Keep a content-free receipt so stale retries cannot resurrect deleted answers.
        const removed = await db.execute({ sql: "DELETE FROM iufes2026_survey_answers WHERE id = ?", args: [input.id] });
        return json({ deleted: removed.rowsAffected > 0 });
      }
      const url = new URL(request.url);
      const ghost = url.searchParams.get("ghost");
      if (ghost && !isSurveyId(ghost)) throw new ApiError(400, "おばけの選択を確認してください。");
      const page = Number(url.searchParams.get("page") ?? "0");
      if (!Number.isInteger(page) || page < 0 || page > 100000) throw new ApiError(400, "ページ番号を確認してください。");
      const where = ghost ? " WHERE r.ghost_id = ?" : "";
      const args = ghost ? [ghost] : [];
      const result = await db.execute({
        sql: "SELECT a.id, r.participant_id, r.ghost_id, a.answer_version, a.answers_json, a.created_at FROM iufes2026_survey_answers a JOIN iufes2026_survey_receipts r ON a.id = r.id" + where + " ORDER BY a.created_at DESC, a.id DESC LIMIT 25 OFFSET ?",
        args: [...args, page * 25],
      });
      const count = await db.execute({ sql: "SELECT COUNT(*) AS total FROM iufes2026_survey_answers a JOIN iufes2026_survey_receipts r ON a.id = r.id" + where, args });
      const items: StoredSurveyAnswer[] = result.rows.map(r => ({
        id: String(r.id), participantId: String(r.participant_id), ghostId: r.ghost_id as SurveyId,
        version: Number(r.answer_version), answers: JSON.parse(String(r.answers_json)), createdAt: String(r.created_at),
      }));
      return json({ items, total: Number(count.rows[0].total), page });
    }
    const input = await body(request);
    if (!uuid(input?.participantId) || !isSurveyId(input?.ghostId) || input?.version !== 2)
      throw new ApiError(400, "回答の送信形式を確認してください。");
    const id = input.participantId.toLowerCase(), ghostId = input.ghostId as SurveyId;
    // Type/choice normalization stays compatible with historic local progress.
    const normalized = validateRequiredAnswers(ghostId, input.answers, Object.fromEntries(Object.entries(defaultSurveyRules()).map(([id, questions]) => [id, Object.fromEntries(Object.keys(questions).map(q => [q, false]))])) as SurveyRules);
    if (Object.keys(normalized.errors).length) return json({ error: "回答を確認してください。", errors: normalized.errors }, 400);
    const hash = createHash("sha256").update(JSON.stringify(normalized.answers)).digest("hex");
    const tx = await db.transaction("write");
    try {
      const existing = (await tx.execute({ sql: "SELECT id, payload_hash FROM iufes2026_survey_receipts WHERE participant_id = ? AND ghost_id = ?", args: [id, ghostId] })).rows[0];
      if (existing) {
        if (existing.payload_hash !== hash) throw new ApiError(409, "このおばけの回答は既に送信済みです。最初に送信した回答で再試行してください。");
        await tx.commit();
        return json({ saved: true, id: String(existing.id), ghostId });
      }
      const rules = await getSurveyRules(tx);
      const checked = validateRequiredAnswers(ghostId, input.answers, rules);
      if (Object.keys(checked.errors).length) {
        await tx.rollback();
        return json({ error: "必須の質問に回答してください。", errors: checked.errors, rules }, 400);
      }
      const responseId = randomUUID(), createdAt = new Date().toISOString();
      await tx.execute({ sql: "INSERT INTO iufes2026_survey_receipts (id, participant_id, ghost_id, payload_hash, created_at) VALUES (?, ?, ?, ?, ?)", args: [responseId, id, ghostId, hash, createdAt] });
      await tx.execute({ sql: "INSERT INTO iufes2026_survey_answers (id, answer_version, answers_json, created_at) VALUES (?, 2, ?, ?)", args: [responseId, JSON.stringify(checked.answers), createdAt] });
      await tx.commit();
      return json({ saved: true, id: responseId, ghostId }, 201);
    } finally { tx.close(); }
  } catch (error) {
    return error instanceof ApiError ? json({ error: error.message }, error.status) : json({ error: "通信できません。回答を残したまま、時間をおいて再試行してください。" }, 503);
  } finally { if (!suppliedDb) db?.close(); }
}
