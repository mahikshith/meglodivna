/* UI transaction fixture: seeded souls exercise purchases; this is not proof of earning them in a campaign. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sources = ['index.html', ...fs.readdirSync('src').filter(name => /\.(js|css)$/.test(name)).map(name => `src/${name}`),
  ...['public/lantern', 'public/lantern-motion', 'public/lantern-fx', 'public/fonts'].flatMap(directory => fs.readdirSync(directory).filter(name => /\.(json|png|ttf|txt)$/.test(name)).map(name => `${directory}/${name}`))];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const baseURL = process.env.GAME_URL || 'http://127.0.0.1:5173';
const output = path.resolve('artifacts/lantern-motion/qa/engine');

async function run() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
  const errors = [], report = { kind: 'isolated UI transactions with seeded souls and actual spending/save APIs', physicalDeviceTest: false, sizes: [], started: new Date().toISOString(), sourceHashes: Object.fromEntries(sources.map(file => [file, hash(file)])) };
  try {
    for (const viewport of [{ width: 740, height: 360 }, { width: 640, height: 360 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
      await context.addInitScript(() => {
        if (!localStorage.getItem('ash-signal-soulforge')) localStorage.setItem('ash-signal-soulforge', JSON.stringify({
          version: 1, layoutVersion: 2, worldId: 'soulforge', souls: 130, upgrades: { armor: 0, artifact: 0 },
        }));
      });
      const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
      await page.goto(baseURL); await page.waitForFunction(() => window.__ASH?.ui);
      await page.locator('#menu-equipment').click(); await page.locator('#catalogue-tab-engine').click();
      assert.equal(await page.locator('.engine-offer').count(), 4);
      assert.equal(await page.locator('#soul-balance-value').textContent(), '130');
      for (const id of ['lanternplate', 'raven', 'artifact']) {
        const image = page.locator('.engine-offer').filter({ has: page.locator(`[data-upgrade-id="${id}"]`) }).locator('img');
        await image.evaluate(element => element.decode());
        assert.ok(await image.evaluate(element => !element.hidden && element.naturalWidth > 0), `${id} uses a loaded artwork icon`);
      }
      let balance = 130;
      for (const [id, cost] of [['armor', 25], ['artifact', 30], ['lanternplate', 40], ['raven', 35]]) {
        const action = page.locator(`[data-upgrade-id="${id}"]`);
        assert.ok(await action.isEnabled());
        await action.click(); balance -= cost;
        assert.equal(await page.locator('#soul-balance-value').textContent(), String(balance));
        assert.equal(await page.locator('#hud-souls').textContent(), String(balance));
        assert.match(await page.locator('#engine-status').textContent(), /forged/);
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('ash-signal-soulforge')).souls), balance);
      }
      assert.ok(await page.locator('[data-upgrade-id="armor"]').isDisabled());
      assert.ok(await page.locator('[data-upgrade-id="lanternplate"]').isDisabled());
      assert.equal(await page.locator('[data-upgrade-id="lanternplate"]').textContent(), 'Forged');
      await page.locator('#catalogue-grid').evaluate(element => { element.scrollTop = 0; });
      await page.screenshot({ path: path.join(output, `${viewport.width}x${viewport.height}-forged.png`) });
      await page.locator('#catalogue-tab-armor').click();
      const plate = page.locator('.catalogue-item').filter({ has: page.getByRole('heading', { name: 'Lantern Plate', exact: true }) });
      assert.match(await plate.locator('.item-comparison').textContent(), /resistance vs worn/);
      await plate.getByRole('button', { name: 'EQUIP', exact: true }).click();
      assert.equal(await page.evaluate(() => window.__ASH.world.player.armor), 'lanternplate');
      await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.getElementById('catalogue').open);
      await page.reload(); await page.waitForFunction(() => window.__ASH?.ui);
      assert.deepEqual(await page.evaluate(() => ({ souls: window.__ASH.world.progress.souls, upgrades: window.__ASH.world.progress.upgrades, armor: window.__ASH.world.player.armor })),
        { souls: 0, upgrades: { armor: 1, artifact: 1 }, armor: 'lanternplate' });
      assert.ok(await page.evaluate(() => window.__ASH.world.unlocks.spell.includes('raven')));
      await page.locator('#menu-equipment').click(); await page.locator('#catalogue-tab-engine').click();
      assert.ok(await page.locator('[data-upgrade-id="lanternplate"]').isDisabled());
      assert.ok(await page.locator('[data-upgrade-id="raven"]').isDisabled());
      await page.keyboard.press('Escape');
      report.sizes.push({ viewport, passed: true }); await context.close();
    }
    assert.deepEqual(errors, []);
    report.finished = new Date().toISOString();
    report.sourceUnchanged = sources.every(file => hash(file) === report.sourceHashes[file]);
    assert.ok(report.sourceUnchanged, 'Sources changed during engine checks; rerun the finished revision');
    report.passed = true; report.runtimeErrors = errors;
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: report.passed, sizes: report.sizes, runtimeErrors: errors, sourceUnchanged: report.sourceUnchanged, output }, null, 2));
  } finally { await browser.close(); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
