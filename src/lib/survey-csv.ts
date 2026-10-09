import { surveys, type SurveyId } from "./survey.ts";
import type { SurveyTexts } from "./survey-texts.ts";
import type { StoredSurveyAnswer } from "./survey-rules.ts";
function cell(value: string) {
  // Prevent spreadsheet formula execution, including whitespace-prefixed formulas.
  const safe=/^[\s\uFEFF]*[=+@-]/u.test(value) ? "'"+value : value;
  return '"'+safe.replaceAll('"','""')+'"';
}
export function surveyCsvHeader(texts: SurveyTexts) {
  return "\uFEFF"+[
    "回答ID","匿名参加者ID","おばけID","おばけ名","回答日時（UTC）","回答版",
    ...Object.entries(surveys).flatMap(([id,s])=>s.questions.map(q=>`[${id}.${q.id}] ${texts[id as SurveyId][q.id]}`)),
  ].map(cell).join(",")+"\r\n";
}
export function surveyCsvRow(item: StoredSurveyAnswer) {
  const columns=[item.id,item.participantId,item.ghostId,item.ghostId==="bad-01"?"メデューサ":"ヴァンパイア",item.createdAt,String(item.version)];
  for(const [id,s] of Object.entries(surveys))for(const q of s.questions){
    const value=id===item.ghostId ? item.answers[q.id] : null;
    const label=(v:string)=>q.options?.find(o=>o.id===v)?.label ?? v;
    columns.push(Array.isArray(value)?value.map(label).join(" / "):value==null?"":label(String(value)));
  }
  return columns.map(cell).join(",")+"\r\n";
}
