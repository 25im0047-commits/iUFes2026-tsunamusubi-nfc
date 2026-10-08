import { readSurveyResponse, type SurveyAnswers, type SurveyId } from "./survey.ts";
export const PARTICIPANT_STORAGE_KEY = "iufes2026-survey-participant-v1";
export function participantId() {
  const stored = window.localStorage.getItem(PARTICIPANT_STORAGE_KEY);
  if (stored) {
    if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(stored)) throw new Error("参加者IDを読み取れません。");
    return stored.toLowerCase();
  }
  const id = crypto.randomUUID();
  window.localStorage.setItem(PARTICIPANT_STORAGE_KEY, id);
  if (window.localStorage.getItem(PARTICIPANT_STORAGE_KEY) !== id) throw new Error("参加者IDを保存できません。");
  return id;
}

const draftKey = (id: SurveyId) => "iufes2026-survey-draft-v1-" + id;
const pendingKey = (id: SurveyId) => "iufes2026-survey-pending-v1-" + id;
export function pendingAnswers(id: SurveyId): SurveyAnswers | null {
  try { return readSurveyResponse(id, JSON.parse(window.localStorage.getItem(pendingKey(id)) || "null"))?.answers ?? null; }
  catch { return null; }
}
export function retainSubmission(id: SurveyId, answers: SurveyAnswers) {
  window.localStorage.setItem(pendingKey(id), JSON.stringify({ version: 2, answers }));
  if (!pendingAnswers(id)) throw new Error("送信内容を保存できません。");
}
export function clearSubmission(id: SurveyId) { try { window.localStorage.removeItem(pendingKey(id)); } catch { /* Receipt makes retries idempotent. */ } }
export function readDraft(id: SurveyId): SurveyAnswers {
  try { return pendingAnswers(id) ?? readSurveyResponse(id, JSON.parse(window.localStorage.getItem(draftKey(id)) || "null"))?.answers ?? {}; }
  catch { return {}; }
}
export function storeDraft(id: SurveyId, answers: SurveyAnswers) {
  try { window.localStorage.setItem(draftKey(id), JSON.stringify({ version: 2, answers })); } catch { /* Current form still retains the draft. */ }
}
export function clearDraft(id: SurveyId) { try { window.localStorage.removeItem(draftKey(id)); } catch { /* Earned progress prevents resubmission. */ } }
