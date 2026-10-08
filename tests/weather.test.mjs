import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@libsql/client";
import { schema, readWeather, weatherResponse, authorized } from "../src/server/weather.server.ts";

test("dedicated schema is idempotent and leaves existing festival data intact", async () => {
 const db=createClient({url:":memory:"});
 try {
  await db.execute("CREATE TABLE participants (name TEXT)");
  await db.execute("INSERT INTO participants VALUES ('existing')");
  await db.batch(schema,"write"); await db.batch(schema,"write");
  assert.equal((await readWeather(db)).weather,"sunny");
  assert.equal((await db.execute("SELECT name FROM participants")).rows[0].name,"existing");
  await assert.rejects(db.execute("INSERT INTO iufes2026_weather VALUES (2, 'rainy', 'now')"));
  await assert.rejects(db.execute("UPDATE iufes2026_weather SET weather = 'storm'"));
 } finally {db.close();}
});
test("server auth is fail-closed and recognizes only exact configured credentials",()=>{
 const request=(value)=>new Request("https://rally.example/api/admin/weather",{headers:{authorization:value}});
 const env={ADMIN_USER:"operator",ADMIN_PASSWORD:"test-password"};
 assert.equal(authorized(request("Basic "+Buffer.from("operator:test-password").toString("base64")),env),true);
 for(const value of ["","Bearer fake","Basic !!!!","Basic "+Buffer.from("operator:wrong").toString("base64")]) assert.equal(authorized(request(value),env),false);
 assert.equal(authorized(request("Basic Zm9vOmJhcg=="),{}),false);
});
test("public read, authenticated update, validation, CSRF and shared throttling",async()=>{
 const db=createClient({url:":memory:"});
 const previous={user:process.env.ADMIN_USER,password:process.env.ADMIN_PASSWORD};
 process.env.ADMIN_USER="operator";process.env.ADMIN_PASSWORD="test-password";
 const token="Basic "+Buffer.from("operator:test-password").toString("base64");
 const request=(method="GET",body,header=token,origin="https://rally.example")=>new Request("https://rally.example/api/admin/weather",{method,headers:{authorization:header,origin,"content-type":"application/json"},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 try{
  await db.batch(schema,"write");
  assert.equal((await weatherResponse(request("PUT",{weather:"rainy"}),false,db)).status,405);
  assert.equal((await weatherResponse(new Request("https://rally.example/api/admin/weather"),true,db)).status,401);
  assert.equal((await weatherResponse(request("PUT",{weather:"rainy"},token,"https://evil.example"),true,db)).status,403);
  assert.equal((await weatherResponse(request("PUT",{weather:"storm"}),true,db)).status,400);
  assert.equal((await readWeather(db)).weather,"sunny");
  const save=await weatherResponse(request("PUT",{weather:"rainy"}),true,db);
  assert.equal(save.status,200);assert.equal((await save.json()).weather,"rainy");
  const publicRead=await weatherResponse(new Request("https://rally.example/api/weather"),false,db);
  assert.equal(publicRead.headers.get("cache-control"),"no-store");
  assert.equal((await publicRead.json()).weather,"rainy");
  const invalid="Basic "+Buffer.from("operator:wrong").toString("base64");
  let response;
  for(let i=0;i<21;i++)response=await weatherResponse(request("GET",undefined,invalid),true,db);
  assert.equal(response.status,429);
  assert.equal((await weatherResponse(request(),true,db)).status,429);
  assert.equal((await readWeather(db)).weather,"rainy");
 }finally{
  db.close();
  for(const [key,value] of [["ADMIN_USER",previous.user],["ADMIN_PASSWORD",previous.password]]) {if(value===undefined)delete process.env[key];else process.env[key]=value;}
 }
});
test("unavailable storage returns an explicit error rather than a fabricated sunny setting",async()=>{
 const db=createClient({url:":memory:"});
 try {assert.equal((await weatherResponse(new Request("https://rally.example/api/weather"),false,db)).status,503);}
 finally{db.close();}
});
