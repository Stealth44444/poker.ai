// Screenshots the three game-UX states: nameplates during playback, the raise
// panel open on the human's turn, and the showdown banner after a fold.
// Requires `npm run dev` on :3000. Usage: node scripts/verify-game-ux.js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (err) => console.log('[pageerror]', String(err).slice(0, 300)));

  try {
    await page.goto('http://localhost:3000/play', { waitUntil: 'load' });
    await page.waitForTimeout(8000);
    await page.screenshot({ path: 'ux-check-nameplates.png' });
    console.log('saved ux-check-nameplates.png');

    const raiseButton = page.getByRole('button', { name: /Raise|Bet/ }).first();
    const hasRaise = await raiseButton.isVisible().catch(() => false);
    if (hasRaise) {
      await raiseButton.dispatchEvent('click');
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'ux-check-raise-panel.png' });
      console.log('saved ux-check-raise-panel.png');
    } else {
      console.log('raise not offered this turn, skipping raise-panel screenshot');
    }

    const foldButton = page.getByRole('button', { name: 'Fold' });
    await foldButton.waitFor({ timeout: 120000 });
    // The constantly-animating WebGL canvas keeps Playwright's normal click()
    // from settling (its post-click "scheduled navigations" wait never
    // resolves) — dispatchEvent bypasses that actionability/navigation
    // bookkeeping and fires the click synchronously.
    await foldButton.dispatchEvent('click');
    console.log('clicked fold, waiting for showdown...');

    for (let i = 0; i < 8; i++) {
      const visible = await page.getByRole('button', { name: 'Next Hand' }).isVisible().catch(() => false);
      if (visible) break;
      const handText = await page.locator('text=/HAND #/').textContent().catch(() => '?');
      const foldStillThere = await page.getByRole('button', { name: 'Fold' }).isVisible().catch(() => false);
      console.log(`  ...still waiting (${(i + 1) * 15}s) hand=${handText} foldVisible=${foldStillThere}`);
      await page.waitForTimeout(15000);
    }
    await page.screenshot({ path: 'ux-check-showdown.png' });
    console.log('saved ux-check-showdown.png');
  } catch (err) {
    console.log('[error]', String(err).slice(0, 500));
    await page.screenshot({ path: 'ux-check-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
