/* Real browser input QA. No actor coordinates, progress, resources or simulation state are injected. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const output = path.resolve(process.env.CONTROL_OUTPUT || 'artifacts/playtest-correction/controls');
const report = { kind: 'Real keyboard and Chromium multitouch inputs on the running game', physicalDevice: false,
  injectedSimulation: false, campaignCompletion: false, started: new Date().toISOString(), checks: [], errors: [], resources: [],
  sourceHashes: Object.fromEntries(['src/input.js', 'src/physics.js', 'src/combat.js', 'src/main.js', 'src/ui.js', 'index.html',
    'src/character-motion.js', 'src/character-geometry.js', 'public/character-revision/manifest.json', 'public/character-revision/atlas.json'].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')])) };
const check = (name, evidence) => report.checks.push({ name, evidence });
const snapshot = page => page.evaluate(() => {
  const g = window.__ASH, p = g.world.player;
  return { mode: g.mode, time: g.world.time, x: p.x, y: p.y, vx: p.vx, vy: p.vy, fuel: p.fuel,
    grounded: p.grounded, crouching: p.crouching, jet: p.jetActive, boost: p.boostActive, facing: p.facing,
    aim: p.aimAngle, shooting: p.shooting, slashId: p.slashId, pointers: g.controls.pointers.size,
    move: g.controls.read(false).move, inputJet: g.controls.read(false).jet, inputShoot: g.controls.read(false).shoot,
    sprite: g.scene.playerSprite.frame.name, savedCampaign: localStorage.getItem('ash-signal-soulforge'),
    savedTest: localStorage.getItem('ash-signal-soulforge-test-armory') };
});

async function run() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const context = await browser.newContext({ viewport: { width: 740, height: 360 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const page = await context.newPage(); page.setDefaultTimeout(12000);
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) report.resources.push({ status: response.status(), url: response.url() }); });
    const cdp = await context.newCDPSession(page), fingers = new Map();
    const dispatch = type => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [...fingers.values()] });
    const down = async p => { fingers.set(p.id, { ...p }); await dispatch('touchStart'); };
    const move = async p => { fingers.set(p.id, { ...p }); await dispatch('touchMove'); };
    const up = async id => { fingers.delete(id); await dispatch('touchEnd'); };
    const cancel = async () => { if (!fingers.size) return; fingers.clear(); await dispatch('touchCancel'); };
    const point = async (selector, id) => { const b = await page.locator(selector).boundingBox(); assert.ok(b, `${selector} visible`); return { id, x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
    const settle = () => page.waitForFunction(() => window.__ASH.mode === 'playing' && window.__ASH.world.player.grounded);
    const screenshot = async name => { await page.screenshot({ path: path.join(output, `${name}.png`) }); };
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:5173', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.__ASH?.scene?.lanternFX && !document.getElementById('start').disabled, null, { timeout: 60000 });
    const originalCampaign = (await snapshot(page)).savedCampaign;
    await page.locator('#start').click(); await page.waitForFunction(() => window.__ASH.mode === 'intro');
    assert.equal(await page.locator('#intro-skip').isVisible(), true);
    await page.locator('#intro-pause').click(); const pausedProgress = await page.locator('#intro-progress').evaluate(el => el.value);
    await page.waitForTimeout(180); assert.equal(await page.locator('#intro-progress').evaluate(el => el.value), pausedProgress);
    await page.locator('#intro-skip').click(); await settle();
    const testStart = await page.evaluate(() => ({ charges: window.__ASH.world.progress.charges, souls: window.__ASH.world.progress.souls }));
    assert.deepEqual(testStart.charges, { cannon: 9, nova: 9 }); assert.ok(testStart.souls >= 9999);
    assert.equal(await page.locator('#touch-boost').count(), 1); assert.equal(await page.locator('[data-action="dash"]').count(), 0);
    check('Real start, intro pause and skip reach playable scene with Boost control', await snapshot(page));

    await page.evaluate(() => { window.__boostTrace=[]; const b=document.getElementById('touch-boost');
      for(const name of ['pointerdown','pointerup','pointercancel','lostpointercapture'])
        b.addEventListener(name,e=>window.__boostTrace.push({name,at:performance.now(),id:e.pointerId}),{capture:true}); });

    // Jump through the actual key so the fuel measurement excludes grounded regeneration.
    await page.keyboard.down('Space'); await page.waitForTimeout(70); await page.keyboard.up('Space');
    await page.waitForFunction(() => !window.__ASH.world.player.grounded);
    const before = await snapshot(page); await down(await point('#touch-boost', 1));
    await up(1);
    report.boostTapDebug = await page.evaluate(() => ({mode:window.__ASH.mode,trace:window.__boostTrace,
      edges:[...window.__ASH.controls.edges], pointers:[...window.__ASH.controls.pointers],
      boostTouchStarted:window.__ASH.controls.boostTouchStarted,
      fuel:window.__ASH.world.player.fuel, dashTime:window.__ASH.world.player.dashTime,
      boostActive:window.__ASH.world.player.boostActive}));
    await page.waitForFunction(() => window.__ASH.world.player.boostActive);
    const boosted = await snapshot(page); assert.ok(Math.abs(before.fuel - boosted.fuel - 18) < .01);
    assert.equal(boosted.vx, 620); assert.equal(boosted.vy, 0); assert.equal(boosted.slashId, before.slashId);
    await cancel(); check('Airborne touch boost spends exactly18 fuel and creates no sword attack', { before, boosted });
    await settle(); await page.waitForTimeout(400);

    await page.keyboard.down('Space'); await page.waitForTimeout(70); await page.keyboard.up('Space');
    const beforeHold = await snapshot(page); await down(await point('#touch-boost', 8));
    await page.waitForFunction(() => window.__ASH.world.player.jetActive && window.__ASH.world.player.vy < 0);
    const heldBoost = await snapshot(page);
    assert.equal(heldBoost.boost, false); assert.equal(heldBoost.jet, true); assert.ok(heldBoost.vy < 0);
    assert.ok(Math.abs(heldBoost.x - beforeHold.x) < 1, 'Holding must never kick the courier sideways');
    assert.ok(beforeHold.fuel - heldBoost.fuel < 15, 'Held flight consumes elapsed thrust fuel, not an18fuel tap fee');
    await screenshot('real-held-flight'); await up(8); await page.waitForTimeout(50);
    const releasedHold = await snapshot(page); assert.equal(releasedHold.boost, false); assert.equal(releasedHold.jet, false);
    check('Held Boost gives clean sustained ascent with no sideways burst, extra fuel fee or release surge', { beforeHold, heldBoost, releasedHold });
    await settle(); await page.waitForTimeout(300);

    // The walking thumb and gun thumb are separate physical touches.
    const stick = { id: 2, x: 110, y: 205 }; await down(stick); await move({ ...stick, x: 150 });
    const attack = await point('#touch-attack', 3); await down(attack); await page.waitForTimeout(180);
    await move({ ...attack, x: attack.x - 45, y: attack.y }); await page.waitForTimeout(60);
    const backwardsAim = await snapshot(page); assert.ok(backwardsAim.vx > 0); assert.equal(backwardsAim.facing, -1); assert.ok(Math.abs(Math.abs(backwardsAim.aim) - Math.PI) < .01);
    check('Walking right while the attack finger aims left preserves travel and turns the gun', backwardsAim);
    await cancel(); await page.waitForTimeout(80);

    await page.keyboard.down('Space'); await page.waitForTimeout(60);
    await down(stick); await move({ ...stick, x: 150 });
    const airAttack = await point('#touch-attack', 4); await down(airAttack);
    await move({ ...airAttack, y: airAttack.y + 40 });
    const boostFinger = await point('#touch-boost', 5); await down(boostFinger);
    await page.waitForFunction(() => window.__ASH.world.player.shooting && window.__ASH.world.player.jetActive && window.__ASH.world.player.vy < 0);
    const flight = await snapshot(page); assert.equal(flight.shooting, true); assert.equal(flight.jet, true);
    assert.ok(flight.vx > 0); assert.ok(flight.vy < 0); assert.ok(Math.abs(flight.aim - Math.PI / 2) < .01);
    assert.equal(flight.sprite, 'cr-couriergunair-2', 'downward firing cannot silently fall back to a horizontal planted pose');
    await screenshot('real-air-shoot-down'); check('Three actual fingers sustain movement, downward shooting and booster ascent together', flight);
    await page.keyboard.up('Space'); await cancel(); await settle();

    await page.keyboard.down('KeyD'); await page.waitForTimeout(80); await page.keyboard.down('KeyS'); await page.keyboard.down('KeyK');
    await page.waitForTimeout(70); const crouched = await snapshot(page); await page.waitForTimeout(120); const stillCrouched = await snapshot(page);
    assert.equal(crouched.crouching, true); assert.equal(crouched.vx, 0); assert.equal(stillCrouched.x, crouched.x); assert.equal(stillCrouched.shooting, true);
    assert.match(crouched.sprite, /^cr-courierguncrouch-[01]$/);
    await screenshot('real-crouch-fire'); check('Down plus forward and shooting holds a planted crouch without drift', { crouched, stillCrouched });
    for (const key of ['KeyD', 'KeyS', 'KeyK']) await page.keyboard.up(key);

    const menuAttack = await point('#touch-attack', 6); await down(menuAttack); await page.waitForTimeout(150);
    await down(await point('#touch-gear', 7)); await page.waitForFunction(() => document.querySelector('#catalogue').open);
    const menu = await snapshot(page); assert.equal(menu.pointers, 0); assert.equal(menu.inputShoot, false); assert.equal(menu.inputJet, false);
    await cancel(); const frozenAt = menu.time; await page.waitForTimeout(100); assert.equal((await snapshot(page)).time, frozenAt);
    const equipped = {};
    for (const category of ['sword', 'gun', 'armor', 'spell']) {
      await page.locator(`#catalogue-tab-${category}`).click();
      const cards = page.locator('#catalogue-grid .catalogue-item'); const count = await cards.count(); equipped[category] = [];
      for (let i = 0; i < count; i++) {
        const card = cards.nth(i), label = await card.locator('h3').innerText(), button = card.locator('button');
        assert.equal(await card.evaluate(el => el.classList.contains('locked')), false);
        if (await button.isEnabled()) await button.click();
        assert.equal(await cards.nth(i).locator('button').getAttribute('data-equipped'), 'true'); equipped[category].push(label);
      }
    }
    await screenshot('real-test-armory');
    await page.locator('#catalogue-tab-engine').click();
    const upgrades = [];
    for (const id of ['armor', 'artifact']) for (let rank = 1; rank <= 3; rank++) {
      const forge = page.locator(`[data-upgrade-id="${id}"]`);
      assert.equal(await forge.isEnabled(), true); await forge.click();
      const actual = await page.evaluate(key => window.__ASH.world.progress.upgrades[key], id);
      assert.equal(actual, rank); upgrades.push({ id, rank });
    }
    for (const id of ['armor', 'artifact']) assert.equal(await page.locator(`[data-upgrade-id="${id}"]`).isEnabled(), false);
    const engine = await page.evaluate(() => ({ souls: window.__ASH.world.progress.souls, upgrades: window.__ASH.world.progress.upgrades,
      collections: window.__ASH.world.collections, gates: window.__ASH.world.progress.openedGates }));
    assert.ok(engine.souls >= 9999 - 285); assert.deepEqual(engine.collections, []); assert.deepEqual(engine.gates, []);
    await screenshot('real-test-engine');
    check('Test save starts charged and all six engine upgrade ranks purchase through real buttons without granting relics or opening gates', { testStart, upgrades, engine });
    await page.locator('#catalogue-close').click();
    await page.waitForFunction(() => window.__ASH.mode === 'playing');
    assert.equal((await snapshot(page)).savedCampaign, originalCampaign); assert.ok((await snapshot(page)).savedTest);
    check('Opening gear clears held fingers and freezes simulation; every gear item equips without touching campaign save', { equipped, originalCampaign, menu });
    await page.keyboard.press('Escape'); await page.waitForFunction(() => window.__ASH.mode === 'paused');
    assert.equal((await snapshot(page)).pointers, 0);
    await screenshot('real-pause'); check('Keyboard pause closes active gameplay cleanly', await snapshot(page));
    assert.deepEqual(report.errors, []); report.ok = true;
    await context.close();
  } catch (error) { report.ok = false; report.failure = error.stack; throw error; }
  finally { report.finished = new Date().toISOString(); fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
}
run().then(() => console.log(`Passed ${report.checks.length} actual-input checks; ${output}`)).catch(error => { console.error(error); process.exitCode = 1; });
