import { expect, test, type Locator, type Page } from "@playwright/test";
import { mockWeather } from "./weather-helper";
test.beforeEach(async ({ page }) => { await mockWeather(page); });
import {
  STORAGE_KEY,
  emptyProgress,
  getGhost,
  goodGhosts,
  recordGoodConversation,
  type Progress,
} from "../../src/lib/rally";

// Cat A/B follows the documented local assignment while the organizer confirms it.
const artworks = [
  { id: "good-01", slug: "cat-red" },
  { id: "good-02", slug: "cat-blue" },
  { id: "good-03", slug: "spider" },
  { id: "good-04", slug: "franken" },
  { id: "good-05", slug: "witch" },
  { id: "good-06", slug: "mummy" },
  { id: "good-07", slug: "reaper" },
  { id: "good-08", slug: "skeleton" },
  { id: "good-09", slug: "mermaid" },
  { id: "bad-01", slug: "medusa" },
  { id: "bad-02", slug: "vampire" },
];

type Artwork = (typeof artworks)[number];
const characterSrc = (artwork: Artwork) => `/ghosts/characters/${artwork.slug}.png`;
const stampSrc = (artwork: Artwork) => `/ghosts/stamps/${artwork.slug}.png`;

const decodedArtworks = new WeakMap<Page, Map<string, number[]>>();

async function expectArtwork(svg: Locator, src: string) {
  await expect(svg).toHaveCount(1);
  await expect(svg).toBeVisible();
  await expect(svg.locator("image")).toHaveAttribute("href", src);
  await expect(svg).toHaveAttribute("preserveAspectRatio", "xMidYMid meet");
  const page = svg.page();
  const decoded = decodedArtworks.get(page) ?? new Map<string, number[]>();
  decodedArtworks.set(page, decoded);
  if (!decoded.has(src)) {
    const artwork = await page.evaluate(async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          if (pixels[(y * canvas.width + x) * 4 + 3] === 0) continue;
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
      }
      if (maxX < 0) throw new Error(`Artwork has no visible pixels: ${src}`);
      const left = Math.max(0, minX - 8), top = Math.max(0, minY - 8);
      const right = Math.min(canvas.width, maxX + 1 + 8);
      const bottom = Math.min(canvas.height, maxY + 1 + 8);
      return {
        width: image.naturalWidth, height: image.naturalHeight,
        viewBox: [left, top, right - left, bottom - top],
      };
    }, src);
    expect([artwork.width, artwork.height]).toEqual([354, 472]);
    decoded.set(src, artwork.viewBox);
  }
  await expect(svg).toHaveAttribute("viewBox", /\S/);
  const viewBox = (await svg.getAttribute("viewBox"))!.trim().split(/\s+/).map(Number);
  expect(viewBox).toEqual(decoded.get(src));
  expect(await svg.evaluate((element) => {
    const artwork = element.getBoundingClientRect();
    const frame = element.parentElement!.getBoundingClientRect();
    return artwork.width > 0 && artwork.height > 0 &&
      artwork.left >= frame.left - 1 && artwork.right <= frame.right + 1 &&
      artwork.top >= frame.top - 1 && artwork.bottom <= frame.bottom + 1;
  })).toBe(true);
}

async function preventNetworkSubmissions(page: Page) {
  const attempts: string[] = [];
  await page.route("**/*", (route) => {
    const request = route.request();
    if (!["GET", "HEAD"].includes(request.method())) {
      attempts.push(`${request.method()} ${new URL(request.url()).pathname}`);
      return route.abort("blockedbyclient");
    }
    return route.continue();
  });
  return attempts;
}

async function seedProgress(page: Page, progress: Progress) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "ぼうけんを はじめる！" })).toBeVisible();
  await page.evaluate(
    ({ key, progress }) => localStorage.setItem(key, JSON.stringify(progress)),
    { key: STORAGE_KEY, progress },
  );
  await page.reload();
  await expect(page.getByRole("heading", { name: "おばけのかげを さがそう！", exact: true })).toBeVisible();
}

async function expectConcealedCards(page: Page) {
  const undiscovered = page.locator(".ghost-list .status-row:not(.done)");
  await expect(undiscovered.first()).toBeVisible();
  const count = await undiscovered.count();
  expect(count).toBeGreaterThan(0);
  await expect(undiscovered.locator("img, svg")).toHaveCount(0);
  await expect(undiscovered.locator(".ghost-placeholder")).toHaveCount(count);
}

async function earnStamp(page: Page, artwork: Artwork) {
  const ghost = getGhost(artwork.id)!;
  await page.goto(`/?id=${artwork.id}`);
  const conversation = page.getByRole("dialog");
  await expect(conversation).toHaveAccessibleName(ghost.name);
  await expectArtwork(conversation.locator(".dialog-ghost .ghost-artwork"), characterSrc(artwork));
  const action = artwork.id === "bad-01" ? "メデューサを げんきづける！"
    : artwork.id === "bad-02" ? "ヴァンパイアに ほうこくする！"
    : "会話を終えてスタンプを獲得";
  // Leave optional surveys blank; no questionnaire write may reach a server.
  await conversation.getByRole("button", { name: action, exact: true }).click();
  const earned = page.getByRole("dialog");
  await expect(earned).toHaveAccessibleName(`${ghost.name}と 仲よくなった！`);
  await expectArtwork(earned.locator(".dialog-ghost .ghost-artwork"), stampSrc(artwork));
  await earned.getByRole("button", { name: "閉じる", exact: true }).click();
  if (artwork.id === "good-09") {
    await expect(page.getByRole("heading", { name: "あやしい おばけのかげを 発見…！？" })).toBeVisible();
    for (const [index, badGhost] of artworks.slice(9).entries()) {
      await expectArtwork(page.locator(".shadow-pair .ghost-artwork").nth(index), characterSrc(badGhost));
      await expect(page.locator(".shadow-pair .ghost-artwork").nth(index)).toHaveCSS("filter", /brightness\(0(?:\.0+)?\)/);
    }
    await page.getByRole("button", { name: "あやしいかげを さがす！" }).click();
  } else if (artwork.id === "bad-02") {
    await expect(page.getByRole("heading", { name: "全部のおばけと なかよくなれたよ！" })).toBeVisible();
    await page.getByRole("button", { name: "マップ・ずかんにもどる" }).click();
  }
  const card = page.getByRole("button", { name: `${ghost.name}ともう一度話す`, exact: true });
  await expectArtwork(card.locator(".stamp-art .ghost-artwork"), stampSrc(artwork));
}

async function reopenConversation(page: Page, artwork: Artwork, repetitions = 1) {
  const ghost = getGhost(artwork.id)!;
  const card = page.getByRole("button", { name: `${ghost.name}ともう一度話す`, exact: true });
  const saved = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  for (let repetition = 0; repetition < repetitions; repetition++) {
    await card.click();
    const conversation = page.getByRole("dialog");
    await expect(conversation).toHaveAccessibleName(ghost.name);
    await expectArtwork(conversation.locator(".dialog-ghost .ghost-artwork"), characterSrc(artwork));
    await expect(conversation.locator("form")).toHaveCount(0);
    await conversation.getByRole("button", { name: "閉じる", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expectArtwork(card.locator(".stamp-art .ghost-artwork"), stampSrc(artwork));
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(saved);
  }
}

test("all eleven characters use normal art for conversations and their own stamp art after acquisition", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  const submissions = await preventNetworkSubmissions(page);
  await page.goto("/");
  await expectArtwork(page.locator(".title-ghosts .ghost-artwork"), characterSrc(artworks[0]));
  await page.getByRole("button", { name: "ぼうけんを はじめる！" }).click();
  await page.getByRole("button", { name: "マップを みる！" }).click();
  await expect(page.locator(".ghost-list .status-row")).toHaveCount(9);
  await expectConcealedCards(page);
  for (const artwork of artworks) {
    await test.step(artwork.slug, async () => {
      await page.goto(`/?id=${artwork.id}`);
      await expectArtwork(page.getByRole("dialog").locator(".dialog-ghost .ghost-artwork"), characterSrc(artwork));
      await page.getByRole("dialog").getByRole("button", { name: "閉じる", exact: true }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expectConcealedCards(page);
      await earnStamp(page, artwork);
      await reopenConversation(page, artwork, 2);
    });
  }
  await expect(page.locator(".ghost-list .status-row.done .ghost-artwork")).toHaveCount(11);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(submissions).toEqual([]);
});

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
  test(`portrait artwork fits mobile dialogs and stamp cards at ${viewport.width}px`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    const submissions = await preventNetworkSubmissions(page);
    const partial = goodGhosts.slice(0, -1).reduce(
      (progress, ghost) => recordGoodConversation(progress, ghost.id),
      emptyProgress(),
    );
    await seedProgress(page, partial);
    await expectConcealedCards(page);
    for (const artwork of artworks.slice(0, 8)) {
      const ghost = getGhost(artwork.id)!;
      await expectArtwork(page.getByRole("button", { name: `${ghost.name}ともう一度話す`, exact: true }).locator(".stamp-art .ghost-artwork"), stampSrc(artwork));
    }
    for (const artwork of artworks.slice(8)) {
      await earnStamp(page, artwork);
      if (artwork.id !== "bad-02") await expectConcealedCards(page);
    }
    await expect(page.locator(".ghost-list .status-row.done .ghost-artwork")).toHaveCount(11);
    for (const artwork of artworks) await reopenConversation(page, artwork);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(submissions).toEqual([]);
  });
}
