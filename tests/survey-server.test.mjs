import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@libsql/client";
import { schema } from "../src/server/weather.server.ts";
import { surveySchema, surveyResponse } from "../src/server/surveys.server.ts";
import { defaultSurveyRules, validateRequiredAnswers } from "../src/lib/survey-rules.ts";
import { surveys } from "../src/lib/survey.ts";
import { defaultSurveyTexts } from "../src/lib/survey-texts.ts";
import { randomUUID } from "node:crypto";

test("required defaults, DB acknowledgements, retry, admin rules and deletion isolation", async () => {
 const db = createClient({url:":memory:"});
 const previous = { user:process.env.ADMIN_USER, password:process.env.ADMIN_PASSWORD };
 process.env.ADMIN_USER="test"; process.env.ADMIN_PASSWORD="test-password";
 const token="Basic " + Buffer.from("test:test-password").toString("base64");
 const req=(method="GET",data,auth=true,origin="https://rally.example") => new Request("https://rally.example/api/survey",{method,headers:{origin,"content-type":"application/json",...(auth?{authorization:token}:{})},...(data?{body:JSON.stringify(data)}:{})});
 try {
  await db.batch(schema,"write"); await db.batch(surveySchema,"write"); await db.batch(surveySchema,"write");
  const rules=defaultSurveyRules();
  assert.equal(Object.keys(validateRequiredAnswers("bad-01",{},rules).errors).length,4);
  const payload={participantId:"12345678-1234-1234-1234-123456789abc",ghostId:"bad-01",version:2,answers:{}};
  assert.equal((await surveyResponse(req("POST",payload),"submit",db)).status,400);
  assert.equal((await surveyResponse(req("POST",payload,true,"https://evil.example"),"submit",db)).status,403);
  assert.equal((await surveyResponse(req("GET",undefined,false),"admin-answers",db)).status,401);
  for(const q of surveys["bad-01"].questions)payload.answers[q.id]=q.kind==="multiple"?[q.options[0].id]:q.kind==="score"?"0":q.options[0].id;
  const saved=await surveyResponse(req("POST",payload),"submit",db);assert.equal(saved.status,201);
  const receipt=await saved.json();
  assert.equal((await surveyResponse(req("POST",payload),"submit",db)).status,200);
  assert.equal((await db.execute("SELECT COUNT(*) AS n FROM iufes2026_survey_answers")).rows[0].n,1);
  assert.equal((await surveyResponse(req("POST",{...payload,answers:{...payload.answers,recommendation:"10"}}),"submit",db)).status,409);
  const list=await (await surveyResponse(req(),"admin-answers",db)).json();
  assert.equal(list.items[0].answers.recommendation,"0");assert.equal(list.total,1);
  rules["bad-01"].visitor=false;
  const texts=defaultSurveyTexts();texts["bad-01"].visitor="あなたのことを教えてね！";
  assert.equal((await surveyResponse(req("PUT",{rules,texts}),"admin-rules",db)).status,200);
  assert.equal((await (await surveyResponse(req(),"rules",db)).json()).texts["bad-01"].visitor,texts["bad-01"].visitor);
  assert.equal((await surveyResponse(req("PUT",{rules,texts:{...texts,"bad-01":{...texts["bad-01"],visitor:" "}}}),"admin-rules",db)).status,400);
  assert.equal((await (await surveyResponse(req(),"rules",db)).json()).rules["bad-01"].visitor,false);
  assert.equal((await surveyResponse(req("DELETE",{id:receipt.id}),"admin-answers",db)).status,200);
  assert.equal((await surveyResponse(req("POST",payload),"submit",db)).status,200);
  assert.equal((await db.execute("SELECT COUNT(*) AS n FROM iufes2026_survey_answers")).rows[0].n,0);
  assert.equal((await db.execute("SELECT COUNT(*) AS n FROM iufes2026_survey_receipts")).rows[0].n,1);
 } finally {
  db.close();
  for(const [key,value] of [["ADMIN_USER",previous.user],["ADMIN_PASSWORD",previous.password]]) {if(value===undefined)delete process.env[key];else process.env[key]=value;}
 }
});
test("authenticated CSV includes all pages, respects ghost filter and excludes deleted answers",async()=>{
 const db=createClient({url:":memory:"});const previous={user:process.env.ADMIN_USER,password:process.env.ADMIN_PASSWORD};
 process.env.ADMIN_USER="export-test";process.env.ADMIN_PASSWORD="export-password";
 const authorization="Basic "+Buffer.from("export-test:export-password").toString("base64");
 const req=(filter="",auth=true)=>new Request("https://rally.example/api/admin/survey-export?ghost="+filter,{headers:auth?{authorization}:{}});
 try{
  await db.batch(schema,"write");await db.batch(surveySchema,"write");
  const commands=[];let removed;
  for(let i=0;i<260;i++){
   const id=randomUUID();if(i===0)removed=id;
   commands.push({sql:"INSERT INTO iufes2026_survey_receipts VALUES (?,?,?,?,?)",args:[id,randomUUID(),i%2?"bad-01":"bad-02","hash","2026-10-09T00:00:00Z"]});
   commands.push({sql:"INSERT INTO iufes2026_survey_answers VALUES (?,?,?,?)",args:[id,2,"{}","2026-10-09T00:00:00Z"]});
  }
  await db.batch(commands,"write");
  assert.equal((await surveyResponse(req("",false),"admin-export",db)).status,401);
  let response=await surveyResponse(req(),"admin-export",db);
  assert.equal(response.status,200);assert.match(response.headers.get("content-type"),/text\/csv/);assert.equal(response.headers.get("cache-control"),"no-store");
  assert.equal((await response.text()).split("\r\n").length,262);
  assert.equal((await (await surveyResponse(req("bad-01"),"admin-export",db)).text()).split("\r\n").length,132);
  await db.execute({sql:"DELETE FROM iufes2026_survey_answers WHERE id = ?",args:[removed]});
  response=await surveyResponse(req(),"admin-export",db);assert.equal((await response.text()).split("\r\n").length,261);
  assert.equal((await surveyResponse(req("bad-03"),"admin-export",db)).status,400);
 }finally{db.close();for(const [key,value]of[["ADMIN_USER",previous.user],["ADMIN_PASSWORD",previous.password]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
test("unavailable DB does not acknowledge or award a submission",async()=>{
 const db=createClient({url:":memory:"});
 try { const response=await surveyResponse(new Request("https://rally.example/api/survey",{method:"POST",headers:{origin:"https://rally.example","content-type":"application/json"},body:JSON.stringify({participantId:"12345678-1234-1234-1234-123456789abc",ghostId:"bad-01",version:2,answers:{}})}),"submit",db);assert.equal(response.status,503);assert.equal((await response.json()).saved,undefined); }
 finally{db.close();}
});
