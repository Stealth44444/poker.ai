// Screenshots the tournament-UX and visual-detail additions: blind
// countdown + stack leaderboard + dealer button on load, a raised bet
// showing mixed chip denominations, and the showdown card-flip glint.
// Requires `npm run dev` on :3000.
// Usage: node scripts/verify-strategy-tournament-visuals.js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (err) => console.log('[pageerror]', String(err).slice(0, 300)));

  try {
    await page.goto('http://localhost:3000/play', { waitUntil: 'load' });
    await page.waitForTimeout(8000);
    await page.screenshot({ path: 'strategy-check-hud.png' });
    console.log('saved strategy-check-hud.png (blind countdown + stack leaderboard + dealer button)');

    for (let round = 0; round < 6; round++) {
      const raiseButton = page.getByRole('button', { name: /Raise|Bet/ }).first();
      const hasRaise = await raiseButton.isVisible().catch(() => false);
      if (hasRaise) {
        await raiseButton.dispatchEvent('click');
        await page.waitForTimeout(300);
        const slider = page.locator('input[type=range]');
        const max = await slider.getAttribute('max');
        if (max) {
          await slider.evaluate((el, value) => {
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }, max);
        }
        await page.getByRole('button', { name: 'Confirm' }).dispatchEvent('click');
        console.log(`  round ${round}: raised to max`);
      } else {
        const callButton = page.getByRole('button', { name: /Call/ });
        const checkButton = page.getByRole('button', { name: 'Check' });
        if (await callButton.isVisible().catch(() => false)) {
          await callButton.dispatchEvent('click');
          console.log(`  round ${round}: called`);
        } else if (await checkButton.isVisible().catch(() => false)) {
          await checkButton.dispatchEvent('click');
          console.log(`  round ${round}: checked`);
        } else {
          console.log(`  round ${round}: no human action offered, waiting`);
        }
      }
      await page.waitForTimeout(6000);
    }
    await page.screenshot({ path: 'strategy-check-chips.png' });
    console.log('saved strategy-check-chips.png (chip denominations on a large bet)');

    const foldButton = page.getByRole('button', { name: 'Fold' });
    const hasFold = await foldButton.isVisible().catch(() => false);
    if (hasFold) {
      await foldButton.dispatchEvent('click');
      console.log('folded, watching the showdown reveal for the flip glint...');
      for (let i = 0; i < 20; i++) {
        await page.waitForTimeout(150);
        await page.screenshot({ path: `strategy-check-glint-${i}.png` });
      }
      console.log('saved strategy-check-glint-0..19.png (scan these for a bright mid-flip frame)');
    } else {
      console.log('fold not offered, skipping the showdown glint capture');
    }
  } catch (err) {
    console.log('[error]', String(err).slice(0, 500));
    await page.screenshot({ path: 'strategy-check-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
