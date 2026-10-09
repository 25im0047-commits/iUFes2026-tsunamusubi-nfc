import test from "node:test";
import assert from "node:assert/strict";
import { surveyCsvHeader,surveyCsvRow } from "../src/lib/survey-csv.ts";
import {defaultSurveyTexts,readSurveyTexts} from "../src/lib/survey-texts.ts";
test("question text accepts plain text, trims it, and rejects missing, blank or oversized fields",()=>{
 const texts=defaultSurveyTexts();texts["bad-01"].visitor="  新しい質問  ";
 assert.equal(readSurveyTexts(texts)["bad-01"].visitor,"新しい質問");
 texts["bad-01"].visitor=" ";assert.equal(readSurveyTexts(texts),null);
 texts["bad-01"].visitor="あ".repeat(301);assert.equal(readSurveyTexts(texts),null);
 assert.equal(readSurveyTexts({}),null);
});
test("CSV preserves zero, quoted multiline content and Japanese choices; prevents formula execution",()=>{
 const header=surveyCsvHeader(defaultSurveyTexts());assert.ok(header.startsWith("\uFEFF"));assert.ok(header.includes("[bad-01.visitor]"));
 const base={id:"id",participantId:"participant",ghostId:"bad-02",createdAt:"2026-10-09T00:00:00Z",version:2};
 const row=surveyCsvRow({...base,answers:{favorite:'工作,"楽しい"\nです',improvement:"=HYPERLINK(\"bad\")"}});
 assert.ok(row.includes('"工作,""楽しい""\nです"'));assert.ok(row.includes('"\'=HYPERLINK'));
 for(const text of ["=1+1","+SUM(A1)","-1+2","@SUM(A1)","\t=1+1","\n=1+1"]){assert.ok(surveyCsvRow({...base,answers:{favorite:text}}).includes('"\''+text));}
 assert.ok(surveyCsvRow({...base,ghostId:"bad-01",answers:{visitor:["elementary","family"],recommendation:"0"}}).includes('"小学生 / 親子"'));
 assert.ok(surveyCsvRow({...base,ghostId:"bad-01",answers:{recommendation:"0"}}).includes('"0"'));
});
