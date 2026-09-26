import { expect, test, type Page } from "@playwright/test";
import { STORAGE_KEY, emptyProgress, goodGhosts } from "../../src/lib/rally";

async function seedUnlocked(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "ぼうけんを はじめる！" }),
  ).toBeVisible();
  await page.evaluate(
    ({ key, progress }) => {
      localStorage.setItem(key, JSON.stringify(progress));
    },
    {
      key: STORAGE_KEY,
      progress: {
        ...emptyProgress(),
        hasStarted: true,
        goodStampIds: goodGhosts.map((ghost) => ghost.id),
      },
    },
  );
}

async function expectCenteredDialog(page: Page) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect
    .poll(async () =>
      dialog.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return Math.max(
          Math.abs(rect.x + rect.width / 2 - innerWidth / 2),
          Math.abs(rect.y + rect.height / 2 - innerHeight / 2),
        );
      }),
    )
    .toBeLessThan(2);
  const bounds = await dialog.boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds!.x).toBeGreaterThanOrEqual(15);
  expect(bounds!.y).toBeGreaterThanOrEqual(15);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width - 15);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height - 15);
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
}

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
  { width: 844, height: 390 },
]) {
  test(`dialogs stay centered after scrolling at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await seedUnlocked(page);
    await page.goto("/?id=bad-02");
    await expectCenteredDialog(page);
    await page.evaluate(() => window.scrollTo(0, 600));
    await expectCenteredDialog(page);
    await page
      .getByRole("button", { name: "ヴァンパイアに ほうこくする！" })
      .click();
    await expect(page.getByRole("dialog")).toHaveAccessibleName(
      "ヴァンパイアと 仲よくなった！",
    );
    await expectCenteredDialog(page);
    await page
      .getByRole("button", { name: "マップにもどる", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "ヴァンパイアともう一度話す" }),
    ).toBeEnabled();
  });
}

test("dialog focus starts at its heading and returns to the triggering card", async ({
  page,
}) => {
  await seedUnlocked(page);
  await page.reload();
  const card = page.getByRole("button", {
    name: "良いおばけ 05ともう一度話す",
  });
  await card.click();
  await expect(
    page.getByRole("heading", { name: "良いおばけ 05", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "閉じる", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "マップにもどる", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card).toBeFocused();
  await expect(card).toBeInViewport();
});

test("resizing a long survey keeps the dialog and completion action usable", async ({
  page,
}) => {
  await seedUnlocked(page);
  await page.goto("/?id=bad-01");
  await page.setViewportSize({ width: 390, height: 480 });
  await expectCenteredDialog(page);
  await page
    .getByRole("button", { name: "メデューサを げんきづける！" })
    .click();
  await expect(page.getByRole("dialog")).toHaveAccessibleName(
    "メデューサと 仲よくなった！",
  );
  await expectCenteredDialog(page);
});

test("participant flow preserves NFC parameters, gates surveys and completes without duplicate stamps", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "ぼうけんを はじめる！" }).click();
  await page.getByRole("button", { name: "マップを みる！" }).click();
  await page.goto("/?id=bad-01");
  await expect(page.getByRole("status")).toContainText("まずは いいおばけ全員");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/?id=unknown");
  await expect(page.getByRole("status")).toContainText(
    "このおばけは見つかりませんでした",
  );
  await page.goto("/?id=good-01&source=test#map");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/\/\?source=test#map$/);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "良いおばけ 01は未発見" }),
  ).toBeDisabled();
  for (const ghost of goodGhosts) {
    await page.goto(`/?id=${ghost.id}`);
    await page
      .getByRole("button", { name: "会話を終えてスタンプを獲得" })
      .click();
    await expect(page.getByRole("dialog")).toHaveAccessibleName(
      `${ghost.name}と 仲よくなった！`,
    );
    await page.getByRole("button", { name: "閉じる", exact: true }).click();
  }
  await expect(
    page.getByRole("heading", { name: "あやしい おばけのかげを 発見…！？" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "あやしいかげを さがす！" }).click();
  await page.goto("/?id=bad-01");
  await page.getByRole("checkbox", { name: "小学生", exact: true }).check();
  await page.getByRole("checkbox", { name: "親子", exact: true }).check();
  await page.getByRole("radio", { name: "0点", exact: true }).check();
  await page
    .getByRole("button", { name: "メデューサを げんきづける！" })
    .click();
  await page
    .getByRole("button", { name: "マップにもどる", exact: true })
    .click();
  await page.goto("/?id=bad-02");
  await page
    .getByRole("button", { name: "ヴァンパイアに ほうこくする！" })
    .click();
  await page.getByRole("button", { name: "コンプリート画面へ！" }).click();
  await page
    .getByRole("button", { name: "うけつけで プレゼントをもらう" })
    .click();
  await expect(
    page.getByRole("heading", { name: "この画面を 受付でみせてね！" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "全部のおばけと なかよくなれたよ！" }),
  ).toBeVisible();
  const saved = await page.evaluate(
    (key) => localStorage.getItem(key),
    STORAGE_KEY,
  );
  expect(
    JSON.parse(saved!).surveyResponses["bad-01"].answers.recommendation,
  ).toBe("0");
  await page.goto("/?id=bad-01");
  await expect(page.getByRole("dialog")).toContainText("スタンプは獲得済み");
  await expect(page.locator("form")).toHaveCount(0);
  await page
    .getByRole("button", { name: "マップにもどる", exact: true })
    .click();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  ).toBe(saved);
  expect(errors).toEqual([]);
});

test("failed survey writes keep answers until storage retry succeeds", async ({
  page,
}) => {
  await seedUnlocked(page);
  await page.goto("/?id=bad-02");
  await page.getByRole("textbox").first().fill("工作が楽しかった");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Object.assign(window, {
      restoreRallyStorage: () => {
        Storage.prototype.setItem = original;
      },
    });
    Storage.prototype.setItem = () => {
      throw new DOMException("Test failure", "QuotaExceededError");
    };
  });
  await page
    .getByRole("button", { name: "ヴァンパイアに ほうこくする！" })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "保存できませんでした",
  );
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).surveyResponses["bad-02"],
      STORAGE_KEY,
    ),
  ).toBeUndefined();
  await page.evaluate(() =>
    (
      window as typeof window & { restoreRallyStorage: () => void }
    ).restoreRallyStorage(),
  );
  await page.getByRole("button", { name: "進捗の保存を再試行" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "ヴァンパイアともう一度話す" }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      (key) =>
        JSON.parse(localStorage.getItem(key)!).surveyResponses["bad-02"].answers
          .favorite,
      STORAGE_KEY,
    ),
  ).toBe("工作が楽しかった");
});
