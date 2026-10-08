import { expect, test, type Page } from '@playwright/test';
import { mockWeather } from "./weather-helper";
test.beforeEach(async ({ page }) => { await mockWeather(page); });
import { STORAGE_KEY, emptyProgress, goodGhosts } from '../../src/lib/rally';

async function expectLayout(page: Page) {
  await expect(page.locator('main h1')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const dialog = page.getByRole('dialog');
  if (await dialog.count()) {
    expect(await dialog.evaluate(e => {
      const r = e.getBoundingClientRect();
      const inset = e.classList.contains('earned-dialog') ? 0 : 15;
      return e.scrollWidth <= e.clientWidth && r.left >= inset && r.right <= innerWidth - inset && r.top >= inset && r.bottom <= innerHeight - inset;
    })).toBe(true);
    const close = dialog.getByRole('button', { name: '閉じる', exact: true });
    const box = await close.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
}

for (const viewport of [
  { width: 320, height: 568 }, { width: 390, height: 844 },
  { width: 844, height: 390 }, { width: 650, height: 900 },
  { width: 651, height: 900 }, { width: 768, height: 1024 },
  { width: 1024, height: 768 },
]) {
  test(`responsive participant screens ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'ぼうけんを はじめる！' })).toBeVisible();
    await expectLayout(page);
    // Large replacement artwork must not expand the title or unlock screens.
    await page.locator('.title-ghosts').evaluate(e => {
      e.innerHTML = '<img alt="" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%222000%22 height=%221000%22%3E%3Crect width=%222000%22 height=%221000%22 fill=%22purple%22/%3E%3C/svg%3E">';
    });
    await expectLayout(page);
    expect((await page.locator('.title-ghosts img').boundingBox())!.width).toBeLessThanOrEqual(150);
    await page.getByRole('button', { name: 'ぼうけんを はじめる！' }).click();
    await expectLayout(page);
    await page.getByRole('button', { name: 'マップを みる！' }).click();
    await expectLayout(page);
    // Impact is unavailable on many phones: exercise the wider fallback font.
    await page.addStyleTag({ content: '.panel-title strong { font-family: sans-serif; }' });
    expect(await page.locator('.panel-title strong').evaluate(e => e.getBoundingClientRect().height < 45)).toBe(true);
    expect(await page.locator('.stamp-art').first().evaluate(e => {
      const art = e.getBoundingClientRect();
      const ghost = e.firstElementChild!.getBoundingClientRect();
      return ghost.top >= art.top && ghost.bottom + 9 <= art.bottom;
    })).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('map.png'), fullPage: true });
    await page.locator('.stamp-art').first().evaluate(e => {
      e.innerHTML = '<img alt="" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221000%22 height=%222000%22/%3E">';
    });
    expect((await page.locator('.stamp-art').first().boundingBox())!.height).toBeLessThan(140);
    await page.evaluate(({ key, progress }) => localStorage.setItem(key, JSON.stringify(progress)), {
      key: STORAGE_KEY, progress: { ...emptyProgress(), hasStarted: true, goodStampIds: goodGhosts.slice(0, -1).map(g => g.id) },
    });
    await page.goto(`/?id=${goodGhosts.at(-1)!.id}`);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectLayout(page);
    await page.getByRole('button', { name: '会話を終えてスタンプを獲得' }).click();
    await page.getByRole('button', { name: '新しい気配をたしかめる！' }).click();
    await expectLayout(page);
    await page.screenshot({ path: testInfo.outputPath('unlock.png'), fullPage: true });
    await page.locator('.shadow-pair').evaluate(e => {
      e.innerHTML = '<img alt="" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%222000%22 height=%221000%22/%3E">'.repeat(2);
    });
    await expectLayout(page);
    expect((await page.locator('.shadow-pair img').first().boundingBox())!.width).toBeLessThanOrEqual(92);
    await page.getByRole('button', { name: 'あやしいかげを さがす！' }).click();
    for (const [id, action] of [['bad-01', 'メデューサを げんきづける！'], ['bad-02', 'ヴァンパイアに ほうこくする！']]) {
      await page.goto(`/?id=${id}`);
      await expect(page.getByRole('dialog')).toBeVisible();
      await expectLayout(page);
      await page.screenshot({ path: testInfo.outputPath(`${id}.png`) });
      if (id === 'bad-02') {
        await page.getByRole('textbox').first().fill('楽しかった！');
        await page.setViewportSize({ width: viewport.width, height: Math.min(viewport.height, 360) });
        await expectLayout(page);
      }
      await page.getByRole('button', { name: action }).click();
      await page.setViewportSize(viewport);
      await page.getByRole('button', { name: id === 'bad-01' ? 'マップにもどる' : 'コンプリート画面へ！', exact: true }).click();
    }
    await expectLayout(page);
    await page.getByRole('button', { name: '景品受け取り場所で プレゼントをもらう' }).click();
    await expectLayout(page);
    await page.screenshot({ path: testInfo.outputPath('prize.png'), fullPage: true });
    expect(errors).toEqual([]);
  });
}
