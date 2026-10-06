import { expect, test, type Page } from "@playwright/test";
import { emptyProgress, goodGhosts, STORAGE_KEY } from "../../src/lib/rally";

async function snapshot(page: Page, path: string) {
  // Hold screens in human-review recordings, not as a page-readiness wait.
  if (process.env.IUFES_RECORD_PARTY === "1") await page.waitForTimeout(900);
  await expect(page.locator(".party-flash")).toHaveCount(0);
  await page.screenshot({ path });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test.describe("all-screen celebration", () => {
  test.use({ reducedMotion: "no-preference", viewport: { width: 390, height: 844 } });
  test("the friendship stage stays active across every participant screen", async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByRole("button", { name: "ぼうけんを はじめる！" })).toBeVisible();
    await snapshot(page, testInfo.outputPath("01-title.png"));
    await page.getByRole("button", { name: "ぼうけんを はじめる！" }).click();
    await snapshot(page, testInfo.outputPath("02-help.png"));
    await page.getByRole("button", { name: "マップを みる！" }).click();
    await snapshot(page, testInfo.outputPath("03-map.png"));
    await expect(page.locator("main > .party-effects .party-confetti")).toHaveCount(0);
    await page.getByRole("link", { name: "おばけずかん", exact: true }).click();
    await snapshot(page, testInfo.outputPath("04-book.png"));
    await page.goto("/?id=good-01");
    await expect(page.getByRole("dialog")).toHaveAccessibleName(goodGhosts[0].name);
    await snapshot(page, testInfo.outputPath("05-conversation.png"));
    await expect(page.locator("dialog .party-confetti")).toHaveCount(48);
    await page.getByRole("button", { name: "会話を終えてスタンプを獲得", exact: true }).click();
    await expect(page.locator(".friendship-meter")).toContainText("1 / 11");
    await snapshot(page, testInfo.outputPath("06-friendship.png"));
    await page.getByRole("button", { name: "マップにもどる", exact: true }).click();
    await expect(page.locator("main > .party-effects .party-confetti")).toHaveCount(4);
    await page.evaluate(({ key, progress }) => localStorage.setItem(key, JSON.stringify(progress)), {
      key: STORAGE_KEY,
      progress: { ...emptyProgress(), hasStarted: true, goodStampIds: goodGhosts.slice(0, -1).map(ghost => ghost.id) },
    });
    await page.goto(`/?id=${goodGhosts.at(-1)!.id}`);
    await page.getByRole("button", { name: "会話を終えてスタンプを獲得", exact: true }).click();
    await page.getByRole("button", { name: "新しい気配をたしかめる！", exact: true }).click();
    await snapshot(page, testInfo.outputPath("07-unlock.png"));
    await page.getByRole("button", { name: "あやしいかげを さがす！", exact: true }).click();
    await expect(page.locator("main > .party-effects .party-confetti")).toHaveCount(39);
    for (const [id, action] of [["bad-01", "メデューサを げんきづける！"], ["bad-02", "ヴァンパイアに ほうこくする！"]]) {
      await page.goto(`/?id=${id}`);
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.locator("dialog .party-confetti")).toHaveCount(0);
      await expect(page.locator("dialog .party-mascot")).toHaveCount(0);
      await expect(page.locator("dialog .dialog-ghost")).toHaveCSS("animation-name", "spooky-drift");
      await snapshot(page, testInfo.outputPath(`08-${id}-survey.png`));
      await page.getByRole("button", { name: action, exact: true }).click();
      await page.getByRole("button", { name: id === "bad-01" ? "マップにもどる" : "コンプリート画面へ！", exact: true }).click();
    }
    await snapshot(page, testInfo.outputPath("09-ending.png"));
    await page.getByRole("button", { name: "景品受け取り場所で プレゼントをもらう", exact: true }).click();
    await snapshot(page, testInfo.outputPath("10-prize.png"));
    const saved = JSON.parse((await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY))!);
    expect(saved.goodStampIds).toHaveLength(9);
    expect(saved.badStampIds).toHaveLength(2);
    expect(errors).toEqual([]);
  });
});

test("reduced motion keeps the stage but stops flashing and movement", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?id=good-01");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("body > .party-flash")).toBeHidden();
  await expect(page.locator("dialog .party-flash")).toBeHidden();
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  await page.getByRole("button", { name: "会話を終えてスタンプを獲得", exact: true }).click();
  await expect(page.locator(".friendship-meter")).toContainText("1 / 11");
});
