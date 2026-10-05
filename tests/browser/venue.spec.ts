import { expect, test, type Page } from "@playwright/test";
import {
  STORAGE_KEY,
  emptyProgress,
  completeBadConversation,
  goodGhosts,
  recordGoodConversation,
  type Progress,
} from "../../src/lib/rally";
import { getGhostPlacement, prizeLocation } from "../../src/lib/venue";

const WEATHER_STORAGE_KEY = "iufes2026-system-prototype-weather";
const lastGoodGhost = goodGhosts.at(-1)!;

function venueMap(page: Page) {
  return page.getByRole("region", { name: "おばけを探そう", exact: true });
}

async function seedProgress(page: Page, progress: Progress) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "ぼうけんを はじめる！" })).toBeVisible();
  await page.evaluate(
    ({ key, progress }) => localStorage.setItem(key, JSON.stringify(progress)),
    { key: STORAGE_KEY, progress },
  );
  await page.reload();
}

async function savedProgress(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
}

test("weather selection moves the reception cats, keeps indoor locations and survives reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "ぼうけんを はじめる！" }).click();
  await page.getByRole("button", { name: "マップを みる！" }).click();
  const venue = venueMap(page);
  await expect(venue.getByRole("radio", { name: "晴天", exact: true })).toBeChecked();
  await venue.getByRole("button", { name: "屋外", exact: true }).click();
  const outdoorLocations = venue.getByRole("list", { name: "屋外のおばけの場所" });
  for (const ghost of goodGhosts.slice(0, 2)) {
    await expect(outdoorLocations).toContainText(ghost.name);
    await expect(outdoorLocations).toContainText(getGhostPlacement(ghost.id, "sunny")!.location);
  }

  await venue.getByRole("button", { name: "3F", exact: true }).click();
  const indoorLocations = venue.getByRole("list", { name: "3Fのおばけの場所" });
  const sunnyIndoorText = await indoorLocations.innerText();
  await expect(indoorLocations).toContainText("3-10 前の給湯室");
  await venue.getByRole("radio", { name: "雨天", exact: true }).check();
  await expect(indoorLocations).toHaveText(sunnyIndoorText, { useInnerText: true });
  await venue.getByRole("button", { name: "1F", exact: true }).click();
  for (const ghost of goodGhosts.slice(0, 2)) {
    const placement = getGhostPlacement(ghost.id, "rainy")!;
    await expect(venue.getByLabel(`${ghost.name}：${placement.location}`, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: `${ghost.name}は未発見` })).toContainText(`1F / ${placement.location}`);
  }
  expect(await page.evaluate((key) => localStorage.getItem(key), WEATHER_STORAGE_KEY)).toBe("rainy");
  await page.reload();
  await expect(venueMap(page).getByRole("radio", { name: "雨天", exact: true })).toBeChecked();
  await expect(venueMap(page).getByRole("list", { name: "1Fのおばけの場所" })).toContainText("受付・入口のiUロゴの壁");

  await page.goto("/?id=good-01");
  await expect(page.getByRole("dialog")).toContainText(getGhostPlacement("good-01", "rainy")!.location);
  await page.keyboard.press("Escape");
  await venueMap(page).getByRole("radio", { name: "晴天", exact: true }).check();
  await page.reload();
  await expect(venueMap(page).getByRole("radio", { name: "晴天", exact: true })).toBeChecked();
  await expect(venueMap(page).getByRole("list", { name: "1Fのおばけの場所" })).not.toContainText("黒猫");
});

test("nine good stamps reveal both survey ghosts and eleven stamps reveal the prize in either weather", async ({ page }) => {
  const partial = goodGhosts.slice(0, -1).reduce(
    (progress, ghost) => recordGoodConversation(progress, ghost.id),
    emptyProgress(),
  );
  await seedProgress(page, partial);
  const venue = venueMap(page);
  await venue.getByRole("radio", { name: "雨天", exact: true }).check();
  await expect(venue.locator(".venue-marker.bad")).toHaveCount(0);
  await expect(venue.locator(".venue-prize, .venue-prize-location")).toHaveCount(0);
  await expect(venue.getByRole("list", { name: "1Fのおばけの場所" })).not.toContainText("メデューサ");
  await expect(venue.getByRole("list", { name: "1Fのおばけの場所" })).not.toContainText("ヴァンパイア");

  await page.goto(`/?id=${lastGoodGhost.id}`);
  await page.getByRole("button", { name: "会話を終えてスタンプを獲得" }).click();
  await page.getByRole("button", { name: "新しい気配をたしかめる！" }).click();
  await page.getByRole("button", { name: "あやしいかげを さがす！" }).click();
  await expect(venueMap(page).locator(".venue-marker.bad")).toHaveCount(2);
  for (const [id, name] of [["bad-01", "メデューサ"], ["bad-02", "ヴァンパイア"]]) {
    await expect(venueMap(page).getByLabel(`${name}：${getGhostPlacement(id, "rainy")!.location}`, { exact: true })).toBeVisible();
  }
  await expect(venueMap(page).locator(".venue-prize, .venue-prize-location")).toHaveCount(0);

  await page.goto("/?id=bad-01");
  await page.getByRole("radio", { name: "0点", exact: true }).check();
  await page.getByRole("button", { name: "メデューサを げんきづける！" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "マップにもどる", exact: true }).click();
  const afterFirstSurvey = await savedProgress(page);
  const firstSaved = JSON.parse(afterFirstSurvey!);
  expect(firstSaved.goodStampIds).toHaveLength(9);
  expect(firstSaved.badStampIds).toEqual(["bad-01"]);
  expect(firstSaved.surveyResponses["bad-01"].answers.recommendation).toBe("0");
  await venueMap(page).getByRole("radio", { name: "晴天", exact: true }).check();
  await venueMap(page).getByRole("button", { name: "屋外", exact: true }).click();
  await expect(venueMap(page).getByRole("list", { name: "屋外のおばけの場所" })).toContainText("メデューサ");
  await expect(venueMap(page).getByRole("list", { name: "屋外のおばけの場所" })).toContainText("ヴァンパイア");
  expect(await savedProgress(page)).toBe(afterFirstSurvey);
  await venueMap(page).getByRole("radio", { name: "雨天", exact: true }).check();
  await page.reload();
  await expect(venueMap(page).getByRole("radio", { name: "雨天", exact: true })).toBeChecked();
  expect(await savedProgress(page)).toBe(afterFirstSurvey);
  await expect(venueMap(page).locator(".venue-marker.bad.done")).toHaveCount(1);
  await expect(venueMap(page).locator(".venue-prize, .venue-prize-location")).toHaveCount(0);

  await page.goto("/?id=bad-02");
  await page.getByRole("textbox").first().fill("会場の体験が楽しかった");
  await page.getByRole("button", { name: "ヴァンパイアに ほうこくする！" }).click();
  await page.getByRole("button", { name: "コンプリート画面へ！" }).click();
  await expect(page.getByRole("heading", { name: "全部のおばけと なかよくなれたよ！" })).toBeVisible();
  await page.getByRole("button", { name: "マップ・ずかんにもどる" }).click();
  const allSaved = await savedProgress(page);
  const completed = JSON.parse(allSaved!);
  expect(completed.goodStampIds).toHaveLength(9);
  expect(completed.badStampIds).toEqual(["bad-01", "bad-02"]);
  expect(completed.surveyResponses["bad-02"].answers.favorite).toBe("会場の体験が楽しかった");
  for (const weather of ["晴天", "雨天"]) {
    await venueMap(page).getByRole("radio", { name: weather, exact: true }).check();
    await expect(venueMap(page).getByLabel(`景品受け取り場所：${prizeLocation.location}`, { exact: true })).toBeVisible();
    await expect(venueMap(page).getByRole("list", { name: "1Fのおばけの場所" })).toContainText(prizeLocation.location);
    expect(await savedProgress(page)).toBe(allSaved);
  }
  await page.reload();
  await expect(page.getByRole("heading", { name: "全部のおばけと なかよくなれたよ！" })).toBeVisible();
  await page.getByRole("button", { name: "マップ・ずかんにもどる" }).click();
  await expect(venueMap(page).getByRole("radio", { name: "雨天", exact: true })).toBeChecked();
  await expect(venueMap(page).getByLabel(`景品受け取り場所：${prizeLocation.location}`, { exact: true })).toBeVisible();
  expect(await savedProgress(page)).toBe(allSaved);
});

test("venue floorplans render with corrected labels at desktop and mobile widths", async ({ page }, testInfo) => {
  let completed = goodGhosts.reduce(
    (progress, ghost) => recordGoodConversation(progress, ghost.id),
    emptyProgress(),
  );
  completed = completeBadConversation(completed, "bad-01", {}).progress;
  completed = completeBadConversation(completed, "bad-02", {}).progress;
  await seedProgress(page, completed);
  await page.getByRole("button", { name: "マップ・ずかんにもどる" }).click();
  await venueMap(page).getByRole("radio", { name: "雨天", exact: true }).check();
  for (const viewport of [{ width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const floor of ["1F", "2F", "3F"]) {
      await venueMap(page).getByRole("button", { name: floor, exact: true }).click();
      const floorplan = venueMap(page).locator(".venue-scroll");
      await expect(floorplan).toBeVisible();
      await expect.poll(() => floorplan.locator("img").evaluate(
        (image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0,
      )).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await floorplan.screenshot({ path: testInfo.outputPath(`venue-rainy-${floor}-${viewport.width}.png`) });
    }
  }
});
