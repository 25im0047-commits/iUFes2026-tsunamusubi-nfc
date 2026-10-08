import test from "node:test";
import assert from "node:assert/strict";
import { emptyProgress, goodGhosts, recordGoodConversation, completeBadConversation } from "../src/lib/rally.ts";
import { PRIZE_STORAGE_KEY, readPrizeState, receivePrize } from "../src/lib/prize.ts";
test("receipt requires full completion, persists once and never overwrites malformed data",()=>{
 const values=new Map();const store={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 assert.deepEqual(receivePrize(emptyProgress(),store),{received:false,error:true});assert.equal(values.size,0);
 let p=goodGhosts.reduce((p,g)=>recordGoodConversation(p,g.id),emptyProgress());
 p=completeBadConversation(p,"bad-01",{}).progress;p=completeBadConversation(p,"bad-02",{}).progress;
 assert.deepEqual(receivePrize(p,store),{received:true,error:false});const saved=values.get(PRIZE_STORAGE_KEY);
 assert.deepEqual(receivePrize(p,store),{received:true,error:false});assert.equal(values.get(PRIZE_STORAGE_KEY),saved);
 values.set(PRIZE_STORAGE_KEY,"broken");assert.deepEqual(receivePrize(p,store),{received:false,error:true});assert.equal(values.get(PRIZE_STORAGE_KEY),"broken");
 assert.deepEqual(readPrizeState({getItem:()=>{throw Error("blocked")}}),{received:false,error:true});
 values.clear();assert.deepEqual(receivePrize(p,{getItem:store.getItem,setItem:()=>{throw Error("full")}}),{received:false,error:true});
});
