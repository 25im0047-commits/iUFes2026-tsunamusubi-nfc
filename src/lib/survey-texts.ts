import { surveys, type SurveyId } from "./survey.ts";
export type SurveyTexts = Record<SurveyId, Record<string, string>>;
export const MAX_QUESTION_LENGTH = 300;
export function defaultSurveyTexts(): SurveyTexts {
  return Object.fromEntries(Object.entries(surveys).map(([id,s])=>[id,Object.fromEntries(s.questions.map(q=>[q.id,q.label]))])) as SurveyTexts;
}
export function readSurveyTexts(value: unknown): SurveyTexts | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result=defaultSurveyTexts();
  for(const id of ["bad-01","bad-02"] as const){
    const questions=(value as Record<string,unknown>)[id];
    if(!questions || typeof questions!=="object" || Array.isArray(questions))return null;
    for(const q of surveys[id].questions){
      const text=(questions as Record<string,unknown>)[q.id];
      if(typeof text!=="string" || !text.trim() || text.trim().length>MAX_QUESTION_LENGTH)return null;
      result[id][q.id]=text.trim();
    }
  }
  return result;
}
