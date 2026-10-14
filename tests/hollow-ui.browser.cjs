/* Actual menu/settings integration. Browser emulation is not a device comfort test. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const output = path.resolve('artifacts/lantern/ui');
const baseURL = process.env.GAME_URL || 'http://127.0.0.1:5173';
const sizes = [{ width: 740, height: 360 }, { width: 640, height: 360 }, { width: 390, height: 844 }, { width: 1280, height: 720 }];

async function run() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
  const errors = [], report = { kind: 'browser UI integration', physicalDeviceTest: false, sizes: [] };
  try {
    for (const viewport of sizes) {
      const context = await browser.newContext({ viewport, isMobile: viewport.width < 1000, hasTouch: viewport.width < 1000, deviceScaleFactor: 1 });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(baseURL); await page.waitForFunction(() => window.__ASH?.ui);
      assert.equal(await page.locator('#world-select option').count(), 1);
      const capture = label => page.screenshot({ path: path.join(output, `${viewport.width}x${viewport.height}-${label}.png`) });
      const within = async selector => {
        const box = await page.locator(selector).boundingBox();
        assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1, `${selector} inside ${viewport.width}x${viewport.height}`);
      };
      for (const selector of ['#start', '#difficulty', '#world-select']) await within(selector);
      await capture('home');
      await page.locator('#controls summary').click();
      await page.waitForFunction(() => document.activeElement?.id === 'manual-close');
      await within('#manual-close');
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('.manual-body').evaluate(element => element === document.activeElement), true);
      await page.keyboard.press('Tab');
      assert.equal(await page.locator('#manual-close').evaluate(element => element === document.activeElement), true);
      await capture('guide');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#controls').evaluate(element => element.open), false);
      assert.equal(await page.locator('#controls summary').evaluate(element => element === document.activeElement), true);

      await page.locator('#menu-settings').click();
      assert.equal(await page.locator('#settings-close').textContent(), 'Back to the lantern');
      await within('#settings-close');
      await within('#settings-control-opacity');
      assert.ok((await page.locator('#motion').boundingBox()).height >= 48);
      await page.locator('#settings-control-opacity').fill('65');
      assert.equal(await page.locator('#control-opacity').inputValue(), '65');
      assert.equal(await page.locator('#settings-control-opacity-value').textContent(), '65%');
      assert.equal(await page.evaluate(() => localStorage.getItem('runeheart-touch-opacity')), '65');
      await capture('settings');
      await page.locator('#settings-close').click();
      await page.waitForFunction(() => document.activeElement?.id === 'menu-settings');
      assert.equal(await page.locator('#menu-settings').evaluate(element => element === document.activeElement), true);
      await page.locator('#start').click(); await page.waitForFunction(() => window.__ASH.mode === 'playing');
      await page.evaluate(() => window.__ASH.pause());
      await page.waitForFunction(() => window.__ASH.mode === 'paused');
      assert.equal(await page.locator('#world-select').isVisible(), false);
      assert.equal(await page.locator('#difficulty').isVisible(), false);
      const time = await page.evaluate(() => window.__ASH.world.time);
      await page.locator('#menu-settings').click();
      assert.equal(await page.locator('#settings-close').textContent(), 'Back to pause');
      await page.waitForTimeout(120);
      assert.equal(await page.evaluate(() => window.__ASH.world.time), time);
      await page.locator('#settings-close').click();
      assert.equal(await page.evaluate(() => window.__ASH.mode), 'paused');
      await within('#start'); await capture('pause');
      await page.locator('#menu-equipment').click();
      assert.equal(await page.locator('#catalogue').evaluate(element => element.open), true);
      await page.locator('#catalogue-close').click();
      await page.waitForFunction(() => window.__ASH.mode === 'paused');
      assert.equal(await page.evaluate(() => window.__ASH.mode), 'paused');
      await page.locator('#start').click(); await page.waitForFunction(() => window.__ASH.mode === 'playing');
      await capture('play');
      report.sizes.push({ viewport, passed: true });
      await context.close();
    }
    assert.deepEqual(errors, []);
    report.passed = true; report.runtimeErrors = errors;
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
