import { expect, test } from "@playwright/test";
import { createClient } from "@libsql/client";
import { schema, weatherResponse } from "../../src/server/weather.server";
test("admin login writes shared SQL weather and another participant picks it up without losing stamps",async({page,context},testInfo)=>{
 const db=createClient({url:":memory:"});
 process.env.ADMIN_USER="test-operator"; process.env.ADMIN_PASSWORD="test-only-password";
 await db.batch(schema,"write");
 await context.route("**/api/**",async route=>{
  const r=route.request();
  const req=new Request(r.url(),{method:r.method(),headers:r.headers(),...(r.postData()?{body:r.postData()!}:{})});
  const response=await weatherResponse(req,new URL(req.url).pathname==="/api/admin/weather",db);
  await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
 });
 try{
  await page.goto("/admin");
  await page.getByLabel("管理用ID",{exact:true}).fill("test-operator");
  await page.getByLabel("パスワード",{exact:true}).fill("wrong");
  await page.getByRole("button",{name:"ログイン",exact:true}).click();
  await expect(page.getByRole("alert")).toContainText("確認してください");
  await expect(page.getByRole("button",{name:"この配置を公開する"})).toHaveCount(0);
  await page.getByLabel("パスワード",{exact:true}).fill("test-only-password");
  await page.getByRole("button",{name:"ログイン",exact:true}).click();
  await expect(page.getByRole("radio",{name:"晴天",exact:true})).toBeChecked();
  const participant=await context.newPage();
  await participant.goto("/?id=good-01");
  await participant.getByRole("button",{name:"会話を終えてスタンプを獲得",exact:true}).click();
  await participant.getByRole("button",{name:"マップにもどる",exact:true}).click();
  await expect(participant.locator(".venue-weather-help")).toContainText("晴天");
  await page.getByRole("radio",{name:"雨天",exact:true}).check();
  await page.getByRole("button",{name:"この配置を公開する"}).click();
  await expect(page.getByRole("status")).toContainText("保存しました");
  expect((await db.execute("SELECT weather FROM iufes2026_weather")).rows[0].weather).toBe("rainy");
  await participant.evaluate(()=>window.dispatchEvent(new Event("focus")));
  await expect(participant.locator(".venue-base")).toHaveAttribute("src","/maps/rally-map-1f-rainy-final-20261008.png");
  await expect(participant.getByRole("progressbar")).toHaveAttribute("aria-valuenow","1");
  for(const width of [390,1024]){
   await page.setViewportSize({width,height:844});
   await page.screenshot({path:testInfo.outputPath(`admin-${width}.png`),fullPage:true});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  expect(await page.evaluate(()=>Object.values(localStorage).some(value=>value.includes("test-only-password")))).toBe(false);
  await page.getByRole("button",{name:"ログアウト"}).click();
  await expect(page.getByRole("button",{name:"ログイン",exact:true})).toBeVisible();
  await participant.close();
 }finally{db.close();delete process.env.ADMIN_USER;delete process.env.ADMIN_PASSWORD;}
});
