const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (err) => console.log('[pageerror]', String(err)));

  await page.goto('http://localhost:3000/play', { waitUntil: 'load' });
  await page.waitForTimeout(25000);

  await page.screenshot({ path: 'room-check-chairs.png', timeout: 60000 });

  // Look down more to see the table + seats from a higher angle
  await page.mouse.move(640, 300);
  await page.mouse.down();
  await page.mouse.move(640, 500, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'room-check-chairs-2.png', timeout: 60000 });

  await browser.close();
})();
