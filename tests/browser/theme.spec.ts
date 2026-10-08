import { expect, test, type Page } from "@playwright/test";

async function startMap(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "ぼうけんを はじめる！" }).click();
  await page.getByRole("button", { name: "マップを みる！" }).click();
}

test("design reference palette and fonts are shared across the map and collection", async ({ page }) => {
  await startMap(page);
  await expect(page.locator(".party-ticker")).toHaveCSS("background-color", "rgb(255, 79, 154)");
  await expect(page.locator(".progress.panel")).toHaveCSS("background-color", "rgba(255, 255, 255, 0.92)");
  await expect(page.locator(".list-panel")).toHaveCSS("border-radius", "30px");
  await expect(page.locator(".instruction h1")).toHaveCSS("font-family", /Dela Gothic One/);
  await expect(page.locator("main")).toHaveCSS("font-family", /Zen Maru Gothic/);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('400 20px "Dela Gothic One"', "おばけMap"))).toBe(true);
});

test.describe("reference motion", () => {
  test.use({ reducedMotion: "no-preference" });
  test("flash, light, confetti and jumping letters remain active and the action works", async ({ page, hasTouch }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await startMap(page);
    await page.screenshot({ path: testInfo.outputPath("map-motion.png") });
    await page.goto("/?id=good-01");
    await page.getByRole("button", { name: "会話を終えてスタンプを獲得", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator(".found-flash")).toHaveCSS("animation-name", "found-flash");
    await expect(dialog.locator(".found-edge")).toHaveCSS("animation-name", "found-edge");
    await expect(dialog.locator(".found-confetti")).toHaveCount(90);
    expect(await dialog.locator(".friendship-wordmark").evaluate(element => element.getAnimations({ subtree: true }).length)).toBeGreaterThan(0);
    await expect(dialog.locator(".friendship-meter")).toContainText("1 / 11");
    // A real pointer presses the center of the bouncing action, without waiting
    // for Playwright's stable-box condition (the animation intentionally loops).
    const action = dialog.getByRole("button", { name: "マップにもどる", exact: true });
    await action.evaluate(element => element.scrollIntoView({ block: "center" }));
    await expect.poll(() => dialog.locator(".found-flash").evaluate(element => Number(element.getAnimations()[0]?.currentTime || 0))).toBeGreaterThan(2400);
    await expect.poll(() => dialog.locator(".found-flash").evaluate(element => Number(getComputedStyle(element).opacity))).toBeLessThan(.05);
    await page.screenshot({ path: testInfo.outputPath("earned-motion.png") });
    const box = (await action.boundingBox())!;
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    if (hasTouch) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  });
});

test.describe("device reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("device preference stops effects without changing the earned stamp", async ({ page }) => {
    await page.goto("/?id=good-01");
    await page.getByRole("button", { name: "会話を終えてスタンプを獲得", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator(".found-flash")).toBeHidden();
    await expect(dialog.locator(".found-edge")).toBeHidden();
    await expect(dialog.locator(".found-confetti").first()).toBeHidden();
    expect(await dialog.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
    await expect(dialog.locator(".friendship-meter")).toContainText("1 / 11");
  });
});
