import { surveys, validateAnswers, type SurveyAnswers, type SurveyId } from "./survey.ts";
export type SurveyRules = Record<SurveyId, Record<string, boolean>>;
export function defaultSurveyRules(): SurveyRules {
  return Object.fromEntries(Object.entries(surveys).map(([id, survey]) => [id, Object.fromEntries(survey.questions.map(q => [q.id, true]))])) as SurveyRules;
}
export function readSurveyRules(value: unknown): SurveyRules | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rules = defaultSurveyRules();
  for (const id of ["bad-01", "bad-02"] as const) {
    const input = (value as Record<string, unknown>)[id];
    if (!input || typeof input !== "object" || Array.isArray(input)) return null;
    for (const q of surveys[id].questions) {
      const required = (input as Record<string, unknown>)[q.id];
      if (typeof required !== "boolean") return null;
      rules[id][q.id] = required;
    }
  }
  return rules;
}
export function validateRequiredAnswers(id: SurveyId, value: unknown, rules: SurveyRules) {
  const checked = validateAnswers(id, value);
  for (const question of surveys[id].questions) {
    const answer = checked.answers[question.id];
    if (rules[id][question.id] && (answer === null || answer === undefined || answer === "" || (Array.isArray(answer) && !answer.length)))
      checked.errors[question.id] ??= "この質問への回答は必須です。";
  }
  return checked;
}
export type StoredSurveyAnswer = {
  id: string; participantId: string; ghostId: SurveyId; createdAt: string;
  answers: SurveyAnswers; version: number;
};
