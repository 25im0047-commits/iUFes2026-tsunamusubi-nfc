import { expect, test, type Page } from "@playwright/test";
import { mockWeather } from "./weather-helper";
import { STORAGE_KEY, emptyProgress, completeBadConversation, goodGhosts, recordGoodConversation, type Progress } from "../../src/lib/rally";
import { getFloorplan, getGhostPlacement, getPrizeLocation } from "../../src/lib/venue";
function venue(page: Page) { return page.getByRole("region", { name: "おばけを探そう", exact: true }); }
async function start(page: Page) {
 await page.goto("/");
 await page.getByRole("button",{name:"ぼうけんを はじめる！"}).click();
 await page.getByRole("button",{name:"マップを みる！"}).click();
}
async function seed(page: Page, progress: Progress) {
 await page.goto("/");
 await page.evaluate(({key,progress})=>localStorage.setItem(key,JSON.stringify(progress)),{key:STORAGE_KEY,progress});
 await page.reload();
}
test("shared weather overrides old local settings and leaves progress intact",async({page})=>{
 const change=await mockWeather(page);
 await page.addInitScript(()=>localStorage.setItem("iufes2026-system-prototype-weather","rainy"));
 await start(page);
 await expect(venue(page).locator(".venue-weather-help")).toContainText("晴天");
 await expect(venue(page).getByRole("radio")).toHaveCount(0);
 const saved=await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY);
 await change("rainy");
 await expect(venue(page).locator(".venue-base")).toHaveAttribute("src",getFloorplan("1F","rainy").src);
 await expect(venue(page).getByRole("list")).toContainText("Cafe内");
 for(const ghost of goodGhosts.slice(0,4))await expect(venue(page).getByLabel(ghost.name+"："+getGhostPlacement(ghost.id,"rainy")!.location,{exact:true})).toBeVisible();
 await venue(page).getByRole("button",{name:"3F",exact:true}).click();
 await expect(venue(page).locator(".venue-base")).toHaveAttribute("src",getFloorplan("3F","sunny").src);
 await change("sunny");
 await expect(venue(page).locator(".venue-base")).toHaveAttribute("src",getFloorplan("3F","rainy").src);
 expect(await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY)).toBe(saved);
});
test("embedded survey ghost and prize stickers stay hidden until their existing unlock conditions",async({page})=>{
 const change=await mockWeather(page);
 await start(page);
 for(const weather of ["sunny","rainy"] as const){
  await change(weather);
  await expect(venue(page).locator("[data-hidden-ghost]")).toHaveCount(2);
  await expect(venue(page).locator("[data-hidden-prize]")).toHaveCount(1);
  await expect(venue(page).locator(".venue-marker.bad")).toHaveCount(0);
  await expect(venue(page).getByRole("list")).not.toContainText("メデューサ");
 }
 let progress=goodGhosts.reduce((p,g)=>recordGoodConversation(p,g.id),emptyProgress());
 await seed(page,progress);
 await expect(venue(page).locator(".venue-marker.bad")).toHaveCount(2);
 await expect(venue(page).locator("[data-hidden-ghost]")).toHaveCount(0);
 await expect(venue(page).locator("[data-hidden-prize]")).toHaveCount(1);
 progress=completeBadConversation(progress,"bad-01",{}).progress;
 progress=completeBadConversation(progress,"bad-02",{}).progress;
 await seed(page,progress);
 await page.getByRole("button",{name:"マップ・ずかんにもどる"}).click();
 for(const weather of ["sunny","rainy"] as const){
  await change(weather);
  await expect(venue(page).locator("[data-hidden-prize]")).toHaveCount(0);
  await expect(venue(page).getByLabel("景品受け取り場所："+getPrizeLocation(weather).location,{exact:true})).toBeVisible();
 }
});
test("both full-size supplied 1F maps and unchanged upper floors render on desktop and mobile",async({page},testInfo)=>{
 const change=await mockWeather(page);
 await start(page);
 for(const weather of ["sunny","rainy"] as const){
  await change(weather);
  for(const floor of ["1F","2F","3F"] as const){
   await venue(page).getByRole("button",{name:floor,exact:true}).click();
   await expect(venue(page).locator(".venue-base")).toHaveAttribute("src",getFloorplan(floor,weather).src);
   await expect.poll(()=>venue(page).locator(".venue-base").evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBe(2000);
   for(const width of [1024,390]){
    await page.setViewportSize({width,height:844});
    await venue(page).locator(".venue-scroll").screenshot({path:testInfo.outputPath(`map-${weather}-${floor}-${width}.png`)});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   }
  }
 }
});
test("weather failure never fabricates an initial map and retry recovers",async({page})=>{
 await page.route("**/api/weather",r=>r.fulfill({status:503,json:{error:"unavailable"}}));
 await start(page);
 await expect(venue(page).getByRole("alert")).toBeVisible();
 await expect(venue(page).locator(".venue-base")).toHaveCount(0);
 await mockWeather(page,"rainy");
 await venue(page).getByRole("button",{name:"配置を再確認"}).click();
 await expect(venue(page).locator(".venue-base")).toHaveAttribute("src",getFloorplan("1F","rainy").src);
 await page.route("**/api/weather",r=>r.fulfill({status:503,json:{error:"unavailable"}}));
 await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
 await expect(venue(page).getByRole("alert")).toContainText("最後に取得した配置");
 await expect(venue(page).locator(".venue-base")).toHaveAttribute("src",getFloorplan("1F","rainy").src);
});
