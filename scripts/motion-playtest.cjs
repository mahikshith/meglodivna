/* Actual inputs only: no injected progress, health or position. Browser emulation, not a physical-device test. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const output = path.resolve('artifacts/lantern-motion/qa/input');
const baseURL = process.env.GAME_URL || 'http://127.0.0.1:5173';
const executablePath = process.env.CHROMIUM_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sources = ['index.html', ...fs.readdirSync('src').filter(name => /\.(js|css)$/.test(name)).map(name => `src/${name}`),
  ...['public/lantern', 'public/lantern-motion', 'public/lantern-fx', 'public/fonts'].flatMap(directory =>
    fs.readdirSync(directory).filter(name => /\.(json|png|ttf|txt)$/.test(name)).map(name => `${directory}/${name}`))];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const report = { kind: 'Integrated Chromium keyboard and independent-finger input smoke', physicalDevice: false,
  campaignCompletion: false, started: new Date().toISOString(), sourceHashes: Object.fromEntries(sources.map(file => [file, hash(file)])),
  realInput: [], fixtures: [], captures: [], runtimeErrors: [], failedResources: [] };

async function snapshot(page) {
  return page.evaluate(() => {
    const g = window.__ASH, p = g.world.player, fx = g.scene.lanternFX;
    return { mode: g.mode, time: g.world.time, player: { x: p.x, y: p.y, state: p.state, grounded: p.grounded,
      hp: p.hp, fuel: p.fuel, slashId: p.slashId, slashMode: p.slashMode, spell: p.spell, jet: p.jetActive, dash: p.dashTime },
      frame: g.scene.playerSprite.frame.name, texture: g.scene.playerSprite.texture.key,
      particles: fx.particles.filter(p => p.life > 0).length, capacity: fx.particles.length, ghosts: fx.ghosts.length };
  });
}
async function capture(page, name, kind) {
  await page.screenshot({ path: path.join(output, `${name}.png`) });
  report.captures.push({ name, kind, ...(await snapshot(page)) });
}
async function observe(page) {
  await page.evaluate(() => {
    const observations = window.__LANTERN_QA = { frames: {}, maxParticles: 0, maxGhosts: 0, samples: 0 };
    function sample() {
      const g = window.__ASH, p = g?.world?.player, fx = g?.scene?.lanternFX;
      if (p && fx) {
        const state = g.mode !== 'playing' ? g.mode : p.slashTime > 0 ? `slash-${p.slashMode}` : p.state;
        const entry = observations.frames[state] ||= { samples: 0, atlasFrames: [] };
        entry.samples++; observations.samples++;
        const frame = g.scene.playerSprite.frame.name;
        if (!entry.atlasFrames.includes(frame)) entry.atlasFrames.push(frame);
        observations.maxParticles = Math.max(observations.maxParticles, fx.particles.filter(q => q.life > 0).length);
        observations.maxGhosts = Math.max(observations.maxGhosts, fx.ghosts.length);
      }
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
}
async function ready(page) {
  await page.waitForFunction(() => window.__ASH?.scene?.lanternFX && !document.getElementById('start').disabled);
}
async function waitPlaying(page) {
  await page.waitForFunction(() => window.__ASH.mode === 'playing');
}
async function settle(page) {
  await page.waitForFunction(() => window.__ASH.mode === 'playing' && window.__ASH.world.player.grounded, null, { timeout: 6000 });
}
async function frozen(page, label) {
  const take = () => page.evaluate(() => {
    const g = window.__ASH, fx = g.scene.lanternFX;
    return { time: g.world.time, clock: fx.clock, seed: fx.seed,
      particles: fx.particles.map(p => ({ life: p.life, x: p.x, y: p.y })), ghosts: fx.ghosts.map(g => g.life) };
  });
  const before = await take(); await page.waitForTimeout(150);
  assert.deepEqual(await take(), before, `${label} freezes simulation, existing effects and emission`);
}
async function touchDriver(context, page) {
  const cdp = await context.newCDPSession(page), active = new Map();
  const send = type => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [...active.values()] });
  return {
    async center(selector, id) {
      const box = await page.locator(selector).boundingBox(); assert.ok(box, `${selector} visible`);
      return { id, x: box.x + box.width / 2, y: box.y + box.height / 2 };
    },
    async start(point) { active.set(point.id, { ...point }); await send('touchStart'); },
    async move(point) { active.set(point.id, { ...point }); await send('touchMove'); },
    // Chromium uses the supplied changed point for a partial release; empty ends all contacts.
    async end(point) { active.delete(point.id); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [point] }); },
    async tap(selector, id) { const p = await this.center(selector, id); await this.start(p); await this.end(p); },
    async cancel() { active.clear(); await send('touchCancel'); },
  };
}
function watch(page, label) {
  page.on('pageerror', error => report.runtimeErrors.push({ label, error: error.message }));
  page.on('console', message => { if (message.type() === 'error') report.runtimeErrors.push({ label, error: message.text(), location: message.location() }); });
  page.on('response', response => { if (response.status() >= 400) report.failedResources.push({ label, status: response.status(), url: response.url() }); });
  page.on('requestfailed', request => report.failedResources.push({ label, url: request.url(), error: request.failure()?.errorText }));
}

async function realInput(browser, viewport) {
  const label = `${viewport.width}x${viewport.height}`, checks = [];
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage(); page.setDefaultTimeout(6000); watch(page, label);
  const result = { viewport, kind: 'Actual keyboard/CDP touch inputs; no injected progress, health or coordinates', checks };
  report.realInput.push(result);
  try {
    await page.goto(baseURL); await ready(page); await observe(page);
    assert.equal(await page.locator('#world-select option').count(), 1, 'Only the developed chapter is offered');
    if (viewport.width === 740) await capture(page, '01-real-home', 'real input');
    await page.locator('#controls summary').click();
    assert.equal(await page.locator('#controls').getAttribute('open'), '');
    await page.locator('#manual-close').click();
    assert.equal(await page.locator('#controls').getAttribute('open'), null);
    await page.locator('#start').click(); await settle(page);
    const baseline = await snapshot(page);
    await page.keyboard.down('KeyD');
    await page.waitForFunction(x => window.__ASH.world.player.x > x + 25, baseline.player.x);
    await page.keyboard.up('KeyD');
    await page.keyboard.down('Space');
    await page.waitForFunction(y => window.__ASH.world.player.y < y - 25, baseline.player.y);
    await page.keyboard.up('Space'); await page.waitForTimeout(50);
    await page.keyboard.down('Space');
    await page.waitForFunction(() => window.__ASH.world.player.lastJumpKind === 'air');
    await page.keyboard.up('Space'); await page.keyboard.down('KeyL');
    await page.waitForFunction(() => window.__ASH.world.player.jetActive && window.__ASH.world.player.fuel < 90);
    assert.ok(await page.evaluate(() => window.__ASH.scene.lanternFX.particles.some(p => p.life > 0 && p.kind === 'smoke')), 'Jet emits smoke in actual play');
    await page.keyboard.up('KeyL'); await settle(page);
    const forms = [];
    for (let i = 0; i < 3; i++) {
      await page.waitForFunction(() => window.__ASH.world.player.slashCooldown <= 0);
      const previous = await page.evaluate(() => window.__ASH.world.player.slashId);
      await page.keyboard.press('KeyJ');
      await page.waitForFunction(id => window.__ASH.world.player.slashId > id, previous);
      forms.push(await page.evaluate(() => window.__ASH.world.player.slashMode));
    }
    assert.deepEqual(forms, ['horizontal', 'vertical', 'finisher']);
    await page.keyboard.down('KeyK');
    await page.waitForFunction(() => window.__ASH.world.projectiles.some(p => p.active && p.owner === 'player'));
    await page.keyboard.up('KeyK');
    const beforeDash = (await snapshot(page)).player.x;
    await page.keyboard.press('ShiftLeft');
    await page.waitForFunction(x => window.__ASH.world.player.x > x + 50, beforeDash);
    checks.push('keyboard movement, variable/air jump, jet smoke, three slash modes, fire and dash');

    // Learn and equip a real reward rather than injecting an unlocked inventory.
    const miraX = await page.evaluate(() => window.__ASH.world.npcs[0].x);
    if ((await snapshot(page)).player.x < miraX - 70) {
      await page.keyboard.down('KeyD');
      await page.waitForFunction(x => window.__ASH.world.player.x >= x - 70, miraX);
      await page.keyboard.up('KeyD');
    }
    await settle(page); await page.keyboard.press('KeyF');
    await page.waitForFunction(() => window.__ASH.mode === 'story');
    if (viewport.width === 740) await capture(page, 'real-story-edge', 'real input');
    await frozen(page, 'Story');
    const storyBeforePause = await page.evaluate(() => ({ npc: window.__ASH.world.story.npcId, index: window.__ASH.world.story.index }));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__ASH.mode === 'paused' && !document.getElementById('story-panel').open);
    await frozen(page, 'Story paused with Escape');
    await page.locator('#start').click();
    await page.waitForFunction(() => window.__ASH.mode === 'story' && document.getElementById('story-panel').open);
    assert.deepEqual(await page.evaluate(() => ({ npc: window.__ASH.world.story.npcId, index: window.__ASH.world.story.index })), storyBeforePause);
    checks.push('Escape pauses conversation; resume restores the same speaker and line without choosing a reward');
    for (let i = 0; i < 8 && await page.locator('#story-next').isVisible(); i++) await page.locator('#story-next').click();
    const choice = await page.evaluate(() => window.__ASH.world.story.choices.find(c => c.reward?.itemId === 'siphon').label);
    await page.getByRole('button', { name: choice, exact: true }).click(); await waitPlaying(page);
    const touch = await touchDriver(context, page);
    await touch.tap('#touch-gear', 20);
    await page.waitForFunction(() => document.getElementById('catalogue').open);
    for (const category of ['engine', 'sword', 'gun', 'armor', 'spell', 'relic']) {
      const tab = page.locator(`#catalogue-tab-${category}`); await tab.click();
      assert.equal(await tab.getAttribute('aria-selected'), 'true');
      assert.ok(await page.locator('#catalogue-grid .catalogue-item').count() > 0, `${category} inventory renders`);
    }
    await page.locator('#catalogue-tab-spell').click();
    const spellCard = page.locator('.catalogue-item').filter({ has: page.getByRole('heading', { name: 'Soul Siphon', exact: true }) });
    const equip = spellCard.getByRole('button', { name: 'EQUIP', exact: true });
    if (await equip.count()) await equip.click();
    assert.equal(await page.evaluate(() => window.__ASH.world.player.spell), 'siphon');
    await frozen(page, 'Equipment');
    await page.locator('#catalogue-close').click(); await waitPlaying(page);
    checks.push('real Mira conversation/reward, every equipment tab, legal spell equip, modal freeze');

    // Multiple independent fingers: releasing the action must preserve the movement finger.
    const bounds = await page.locator('#touch button').evaluateAll(buttons => buttons.map(button => {
      const r = button.getBoundingClientRect(); return { id: button.id, x: r.x, y: r.y, w: r.width, h: r.height };
    }));
    for (const b of bounds) {
      assert.ok(b.w >= 48 && b.h >= 48, `${b.id} usable target bounds`);
      assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= viewport.width + 1 && b.y + b.h <= viewport.height + 1, `${b.id} is inside viewport`);
    }
    result.controlBounds = bounds;
    for (const id of ['touch-pause', 'touch-settings', 'touch-gear']) {
      assert.ok(bounds.find(button => button.id === id).y < 64, `${id} is in the top utility cluster`);
    }
    for (let i = 0; i < bounds.length; i++) for (let j = i + 1; j < bounds.length; j++) {
      const a = bounds[i], b = bounds[j];
      const dx = Math.max(b.x - a.x - a.w, a.x - b.x - b.w, 0);
      const dy = Math.max(b.y - a.y - a.h, a.y - b.y - b.h, 0);
      assert.ok(Math.hypot(dx, dy) >= 7.9, `${a.id}/${b.id} have 8px separation`);
    }
    const stick = { id: 1, x: 90, y: 155 };
    await touch.start(stick); stick.x += 62; await touch.move(stick);
    await page.waitForFunction(() => window.__ASH.controls.read(false).move > 0.8);
    const jump = await touch.center('#touch-jump', 2); await touch.start(jump);
    await page.waitForFunction(() => window.__ASH.world.player.jetActive);
    assert.equal(await page.locator('#touch-jump').getAttribute('data-phase'), 'hold');
    await touch.end(jump);
    await page.waitForFunction(() => !window.__ASH.controls.read(false).jet);
    assert.ok(await page.evaluate(() => window.__ASH.controls.read(false).move > 0.8));
    const attack = await touch.center('#touch-attack', 3); await touch.start(attack);
    await page.waitForFunction(() => window.__ASH.controls.read(false).shoot);
    assert.equal(await page.locator('#touch-attack').getAttribute('data-phase'), 'hold');
    await touch.end(attack);
    assert.equal(await page.evaluate(() => window.__ASH.controls.read(false).shoot), false);
    assert.ok(await page.evaluate(() => window.__ASH.controls.read(false).move > 0.8));
    await touch.end(stick); await settle(page);
    await capture(page, `${viewport.width === 740 ? '02' : '04'}-real-${label}`, 'real input');
    checks.push('simultaneous movement/jump/thrust/fire, independent action release, visible held modes');

    // Settings must respond to its own pointer while another finger is still firing.
    await touch.start(attack); await page.waitForFunction(() => window.__ASH.controls.read(false).shoot);
    await touch.tap('#touch-settings', 22);
    await page.waitForFunction(() => document.getElementById('settings-panel').open);
    await touch.cancel();
    assert.equal(await page.evaluate(() => window.__ASH.controls.read(false).shoot), false);
    assert.equal(await page.evaluate(() => window.__ASH.mode), 'paused');
    await frozen(page, 'Second-finger settings');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('settings-panel').open);
    assert.equal(await page.evaluate(() => window.__ASH.mode), 'paused');
    await page.locator('#start').click(); await waitPlaying(page);
    checks.push('second-finger Settings interrupts held fire; Escape closes it while preserving pause');

    // Pause with held fire: observe both input cleanup and no continued FX creation.
    await touch.start(attack); await page.waitForFunction(() => window.__ASH.controls.read(false).shoot);
    await touch.tap('#touch-pause', 4); await page.waitForFunction(() => window.__ASH.mode === 'paused');
    await touch.cancel(); await frozen(page, 'Pause');
    assert.equal(await page.evaluate(() => window.__ASH.controls.read(false).shoot), false);
    await page.locator('#menu-settings').click();
    await page.waitForFunction(() => document.getElementById('settings-panel').open);
    await page.locator('#music-volume').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
    const volume = await page.locator('#music-volume').inputValue();
    await page.locator('#motion').click();
    const effects = await page.locator('#motion').getAttribute('aria-pressed');
    if (viewport.width === 740) await capture(page, '03-real-settings', 'real input');
    await frozen(page, 'Settings');
    await page.locator('#settings-close').click();
    assert.equal(await page.evaluate(() => window.__ASH.mode), 'paused');
    await page.locator('#menu-settings').click();
    assert.equal(await page.locator('#music-volume').inputValue(), volume);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('settings-panel').open);
    assert.equal(await page.evaluate(() => window.__ASH.mode), 'paused', 'Escape closes settings without resuming behind it');
    await page.locator('#start').click(); await waitPlaying(page);
    checks.push('held-input pause cleanup, no new/moving paused FX, settings close/reopen/Escape return context');

    await touch.start(attack); await page.waitForFunction(() => window.__ASH.controls.read(false).shoot);
    await touch.tap('#touch-gear', 21);
    await page.waitForFunction(() => document.getElementById('catalogue').open);
    await touch.cancel(); assert.equal(await page.evaluate(() => window.__ASH.controls.read(false).shoot), false);
    await frozen(page, 'Second-finger equipment');
    await page.locator('#catalogue-close').click(); await waitPlaying(page);
    checks.push('second-finger Pause and Gear interrupt held fire without duplicate activation');

    await page.keyboard.press('Escape'); await page.waitForFunction(() => window.__ASH.mode === 'paused');
    const save = await page.evaluate(() => JSON.parse(localStorage.getItem('ash-signal-soulforge')));
    assert.ok(save.claimed.includes('npc:soulforge-mira')); assert.equal(save.equipped.spell, 'siphon');
    result.observedMotion = await page.evaluate(() => window.__LANTERN_QA);
    assert.ok(result.observedMotion.maxParticles <= 240 && result.observedMotion.maxGhosts <= 6);
    for (const state of ['run', 'jump', 'jet', 'slash-horizontal', 'slash-vertical', 'slash-finisher']) {
      assert.ok(result.observedMotion.frames[state]?.samples > 0, `${state} displayed during real play`);
    }
    await page.reload(); await ready(page);
    await page.locator('#menu-settings').click();
    assert.equal(await page.locator('#music-volume').inputValue(), volume, 'Audio preference persists across reload');
    assert.equal(await page.locator('#motion').getAttribute('aria-pressed'), effects, 'FX preference persists across reload');
    await page.locator('#settings-close').click(); await page.locator('#start').click(); await settle(page);
    assert.equal(await page.evaluate(() => window.__ASH.world.player.spell), 'siphon');
    assert.ok(await page.evaluate(() => window.__ASH.world.progress.claimed.includes('npc:soulforge-mira')));
    checks.push('save and learned/equipped reward reload, audio and FX preference persistence, bounded FX pools');
    result.passed = true;
  } catch (error) {
    result.passed = false; result.failure = error.message;
    await page.screenshot({ path: path.join(output, `failure-${label}.png`) }).catch(() => {});
    throw error;
  } finally { await context.close(); }
}

async function run() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    for (const viewport of [{ width: 740, height: 360 }, { width: 844, height: 390 }]) await realInput(browser, viewport);

    assert.deepEqual(report.runtimeErrors, [], 'No runtime/console errors');
    assert.deepEqual(report.failedResources, [], 'No failed assets or HTTP errors');
    report.sourceUnchanged = sources.every(file => hash(file) === report.sourceHashes[file]);
    assert.equal(report.sourceUnchanged, true, 'Sources changed during QA; rerun the finished revision');
    report.passed = true;
  } catch (error) { report.passed = false; report.failure = error.stack; throw error; }
  finally {
    report.finished = new Date().toISOString();
    report.sourceUnchanged = sources.every(file => hash(file) === report.sourceHashes[file]);
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    await browser.close();
    console.log(JSON.stringify({ passed: report.passed, captures: report.captures.length, output, failure: report.failure?.split('\n')[0] }));
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
