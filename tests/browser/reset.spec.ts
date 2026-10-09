import {expect,test} from "@playwright/test";
import {mockWeather} from "./weather-helper";
import {STORAGE_KEY,goodGhosts,emptyProgress,recordGoodConversation,completeBadConversation} from "../../src/lib/rally";
import {RESETTABLE_KEYS} from "../../src/lib/reset-progress";
import {PRIZE_STORAGE_KEY} from "../../src/lib/prize";
test("bottom reset cancels safely and resets stamps, receipt and drafts without clearing unrelated data",async({page})=>{
 await mockWeather(page);await page.goto("/");
 let progress=goodGhosts.reduce((p,g)=>recordGoodConversation(p,g.id),emptyProgress());
 progress=completeBadConversation(progress,"bad-01",{}).progress;progress=completeBadConversation(progress,"bad-02",{}).progress;
 await page.evaluate(({key,receipt,progress})=>{
  localStorage.setItem(key,JSON.stringify(progress));
  localStorage.setItem(receipt,JSON.stringify({version:1,received:true,receivedAt:new Date().toISOString()}));
  localStorage.setItem("iufes2026-survey-draft-v1-bad-01","draft");
  localStorage.setItem("iufes2026-survey-pending-v1-bad-02","pending");
  localStorage.setItem("iufes2026-survey-participant-v1","12345678-1234-1234-1234-123456789abc");
  localStorage.setItem("unrelated-test-data","keep");
 },{key:STORAGE_KEY,receipt:PRIZE_STORAGE_KEY,progress});
 await page.reload();await expect(page.getByRole("heading",{name:"プレゼントは受け取り済みです",exact:true})).toBeVisible();
 const reset=page.getByRole("button",{name:"この端末の進捗をリセット",exact:true});
 page.once("dialog",dialog=>dialog.dismiss());await reset.click();
 await expect(page.getByRole("heading",{name:"プレゼントは受け取り済みです",exact:true})).toBeVisible();
 page.once("dialog",dialog=>dialog.accept());await reset.click();
 await expect(page.getByRole("button",{name:"ぼうけんを はじめる！",exact:true})).toBeVisible();
 expect(await page.evaluate(keys=>keys.every(key=>localStorage.getItem(key)===null),RESETTABLE_KEYS)).toBe(true);
 expect(await page.evaluate(()=>localStorage.getItem("unrelated-test-data"))).toBe("keep");
});
