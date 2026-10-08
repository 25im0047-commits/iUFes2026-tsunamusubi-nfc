import { expect, test } from '@playwright/test';
import { mockWeather } from "./weather-helper";
test.beforeEach(async ({ page }) => { await mockWeather(page); });

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1280, height: 720 }]) {
  test(`acquisition covers the viewport throughout zoom at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/?id=good-01');
    await page.getByRole('button', { name: '会話を終えてスタンプを獲得', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(page.locator('.found-world')).toBeVisible();
    // A neon underlay makes any regression obvious in the phase screenshots.
    await page.addStyleTag({ content: 'body, main.page { background: #00ff00 !important; }' });
    for (const phase of [0, 240, 800, 1400, 2200, 3100, 4700]) {
      await page.evaluate(time => {
        for (const animation of document.getAnimations()) {
          animation.pause();
          animation.currentTime = time;
        }
      }, phase);
      const coverage = await dialog.evaluate(element => {
        const viewportRect = element.getBoundingClientRect();
        const backdrop = element.querySelector('.found-backdrop')!.getBoundingClientRect();
        const covered = (r: DOMRect) => r.left <= .5 && r.top <= .5 && r.right >= innerWidth - .5 && r.bottom >= innerHeight - .5;
        const corners = [[1, 1], [innerWidth - 2, 1], [1, innerHeight - 2], [innerWidth - 2, innerHeight - 2]];
        return getComputedStyle(element).transform === 'none' && covered(viewportRect) && covered(backdrop)
          && corners.every(([x, y]) => element.contains(document.elementFromPoint(x, y)));
      });
      expect(coverage, `full coverage at ${phase}ms`).toBe(true);
      if (phase === 0 || phase === 800 || phase === 2200) {
        await page.screenshot({ path: testInfo.outputPath(`phase-${phase}.png`) });
      }
    }
    await expect(page.locator('.friendship-meter')).toContainText('1 / 11');
  });
}
