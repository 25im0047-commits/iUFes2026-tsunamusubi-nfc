import test from "node:test";
import assert from "node:assert/strict";
import {resetLocalProgress,RESETTABLE_KEYS,RESET_STORAGE_KEY} from "../src/lib/reset-progress.ts";
test("prototype reset removes only rally progress, drafts, pending submissions, participant and prize receipt",()=>{
 const values=new Map(RESETTABLE_KEYS.map(k=>[k,"saved"]));values.set("unrelated-site-data","keep");
 const store={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 assert.equal(resetLocalProgress(store),true);
 for(const key of RESETTABLE_KEYS)assert.equal(values.has(key),false);
 assert.equal(values.get("unrelated-site-data"),"keep");assert.ok(values.get(RESET_STORAGE_KEY));
 const epoch=values.get(RESET_STORAGE_KEY);assert.equal(resetLocalProgress(store),true);assert.notEqual(values.get(RESET_STORAGE_KEY),epoch);
});
test("storage failure never reports a successful reset",()=>{
 assert.equal(resetLocalProgress({getItem:()=>"saved",setItem:()=>{},removeItem:()=>{throw Error("blocked")}}),false);
 assert.equal(resetLocalProgress({getItem:()=>"saved",setItem:()=>{},removeItem:()=>{}}),false);
});
