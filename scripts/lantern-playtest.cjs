/* Real input smoke and explicitly isolated visual fixtures; neither is a physical-device test. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const output = path.resolve('artifacts/lantern/qa');
const baseURL = process.env.GAME_URL || 'http://127.0.0.1:5173';
const executablePath = process.env.CHROMIUM_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sources = ['index.html', ...fs.readdirSync('src').filter(name => /\.(js|css)$/.test(name)).map(name => `src/${name}`),
  'public/lantern/manifest.json', 'public/lantern/atlas.json', 'public/lantern/atlas.png'];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const report = { kind: 'Integrated Chromium input smoke plus separately labelled isolated effect fixtures', physicalDevice: false,
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
    await frozen(page, 'Story');
    for (let i = 0; i < 8 && await page.locator('#story-next').isVisible(); i++) await page.locator('#story-next').click();
    const choice = await page.evaluate(() => window.__ASH.world.story.choices.find(c => c.reward?.itemId === 'siphon').label);
    await page.getByRole('button', { name: choice, exact: true }).click(); await waitPlaying(page);
    const touch = await touchDriver(context, page);
    await touch.tap('#touch-gear', 20);
    await page.waitForFunction(() => document.getElementById('catalogue').open);
    for (const category of ['sword', 'gun', 'armor', 'spell', 'relic']) {
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
      assert.ok(b.w >= 44 && b.h >= 44, `${b.id} usable target bounds`);
      assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= viewport.width + 1 && b.y + b.h <= viewport.height + 1, `${b.id} is inside viewport`);
    }
    result.controlBounds = bounds;
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

async function fixtures(browser) {
  const context = await browser.newContext({ viewport: { width: 960, height: 540 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(); watch(page, 'isolated-fixtures');
  await page.goto(baseURL); await ready(page); await page.locator('#start').click(); await settle(page);
  await page.evaluate(() => window.__ASH.scene.game.loop.sleep());
  try {
    for (const kind of ['horizontal', 'vertical', 'finisher', 'jet', 'enemy-warning', 'slam', 'companions', 'portal', 'transformation']) {
      const state = await page.evaluate(async kind => {
        const g = window.__ASH, s = g.scene, { cameraTarget } = await import('/src/camera.js');
        const { castSpell, interact } = await import('/src/combat.js');
        const world = g.createWorld(0, { worldId: 'soulforge', difficulty: 'forge' }), p = world.player;
        // These position/health/availability changes belong ONLY to labelled visual fixtures.
        world.enemies = []; world.props = []; world.pickups = []; world.npcs = []; world.enemyPortals = [];
        world.level = { ...world.level, pressureDisabled: true, hazards: [], portals: [] };
        p.x = 350; p.y = 1260 - p.h; p.invincible = 100;
        g.setWorld(world); s.lanternFX.clear(); s.visualTime = 0; s.accumulator = 0;
        const camera = cameraTarget(p, world.level, 960, s.viewportH, null);
        s.cameraX = camera.x; s.cameraY = camera.y; s.cameras.main.setZoom(camera.zoom);
        const frames = new Set(), particleKinds = new Set(), events = new Set();
        let steps = 0, peakParticles = 0;
        const tick = (input = {}) => {
          g.stepWorld(world, input, 1 / 120); steps++; s.visualTime += 1 / 120;
          s.previousPlayer = { x: p.x, y: p.y };
          for (const event of world.events) { events.add(event.type); s.feedback(event); }
          world.events.length = 0; s.drawWorld(1 / 120);
          frames.add(s.playerSprite.frame.name);
          for (const particle of s.lanternFX.particles) if (particle.life > 0) particleKinds.add(particle.kind);
          peakParticles = Math.max(peakParticles, s.lanternFX.particles.filter(q => q.life > 0).length);
        };
        tick();
        if (['horizontal', 'vertical', 'finisher'].includes(kind)) {
          p.combo = { horizontal: 2, vertical: 0, finisher: 1 }[kind]; p.comboWindow = 1;
          tick({ slashPressed: true }); for (let i = 0; i < 9; i++) tick();
        } else if (kind === 'jet') {
          tick({ jumpPressed: true, jumpHeld: true }); for (let i = 0; i < 58; i++) tick({ jet: true, jumpHeld: true });
        } else if (kind === 'enemy-warning' || kind === 'slam') {
          const type = kind === 'slam' ? 'sentinel' : 'guard';
          const original = g.createWorld().enemies.find(e => e.type === type);
          const foe = { ...original, x: 495, y: 1260 - original.h, minX: 0, maxX: 900, baseY: 1260 - original.h, cooldown: 0.7, dead: false };
          world.enemies = [foe];
          for (let i = 0; i < 180; i++) { tick(); if (kind === 'enemy-warning' ? foe.windup > 0.15 : events.has('slam')) break; }
          if (kind === 'slam') for (let i = 0; i < 5; i++) tick();
        } else if (kind === 'companions') {
          p.mana = p.maxMana = 250;
          world.progress.unlocked.spell.push('wolf', 'dragon');
          castSpell(world, 'wolf'); p.spellCooldown = 0; castSpell(world, 'dragon');
          for (let i = 0; i < 105; i++) tick();
        } else if (kind === 'portal') {
          world.level.portals = [{ id: 'qa-return', x: p.x, y: p.y, w: 32, h: 46, to: { x: 485, y: 1214 } }];
          interact(world); for (let i = 0; i < 12; i++) tick();
        } else {
          const boss = world.boss; p.x = boss.x - 210; p.y = boss.floorY - p.h;
          Object.assign(boss, { active: true, hp: boss.maxHp * 0.3 }); world.activeBoss = boss;
          const camera = cameraTarget(p, world.level, 960, s.viewportH, boss);
          s.cameraX = camera.x; s.cameraY = camera.y;
          for (let i = 0; i < 150; i++) tick();
        }
        g.render(); // Refresh DOM HUD/dialogue for this fixture without advancing simulation.
        s.children.depthSort(); const renderer = s.sys.game.renderer;
        renderer.preRender(); s.cameras.render(renderer, s.children); renderer.postRender();
        return { kind, steps, sampledFrames: [...frames], events: [...events], peakParticles, particleKinds: [...particleKinds],
          ghosts: s.lanternFX.ghosts.length, player: { state: p.state, slashMode: p.slashMode },
          enemies: world.enemies.map(e => ({ type: e.type, attack: e.attackKind, windup: e.windup, attackTime: e.attackTime })),
          allies: world.allies.map(a => ({ type: a.type, phase: a.phase })), bossForm: world.boss.form };
      }, kind);
      assert.ok(state.peakParticles <= 240 && state.ghosts <= 6);
      if (kind === 'jet') assert.ok(state.particleKinds.includes('smoke') && state.particleKinds.includes('ember'));
      if (kind === 'slam') assert.ok(state.events.includes('slam') && state.particleKinds.includes('shock'));
      if (kind === 'enemy-warning') assert.ok(state.enemies[0].windup > 0);
      if (kind === 'companions') assert.deepEqual(state.allies.map(a => a.type).sort(), ['dragon', 'wolf']);
      if (kind === 'portal') assert.ok(state.events.includes('portalarrival'));
      if (kind === 'transformation') assert.equal(state.bossForm, 'flying');
      await capture(page, `fixture-${kind}`, 'ISOLATED STATE/FX FIXTURE — not legal gameplay');
      report.fixtures.push(state);
    }
    report.rendererLifecycle = await page.evaluate(() => {
      const g = window.__ASH, s = g.scene, deaths = [];
      for (const type of ['guard', 'mage', 'sentinel', 'drone']) {
        const entity = { id: `qa-death-${type}`, type, x: 350, y: 1200, w: 40, h: 60, facing: 1, dead: true };
        const sprite = s.add.image(0, 0, 'lantern-art', 'ln-portal-0');
        s.referenceDeath(sprite, entity);
        deaths.push({ type, texture: sprite.texture.key, frame: sprite.frame.name, visible: sprite.visible });
        sprite.destroy(); s.deathViews.delete(entity.id);
      }
      const id = 'qa-lifecycle';
      s.drawPortal(id, 400, 1200, 10); const first = s.portalSprites.get(id), formed = first.frame.name;
      first.portalActive = false; s.closePortals(10.2); const closing = first.frame.name;
      s.drawPortal(id, 400, 1200, 10.3); const reopened = first.frame.name, reborn = first.born;
      first.portalActive = false; s.closePortals(10.4); s.closePortals(10.8);
      const retired = !s.portalSprites.has(id);
      s.drawPortal(id, 400, 1200, 11); const second = s.portalSprites.get(id), reusedFrame = second.frame.name;
      const freshSprite = first !== second;
      second.portalActive = false; s.closePortals(11.1); s.closePortals(11.5);
      return { kind: 'Isolated renderer lifecycle calls; no gameplay completion claim', deaths,
        portal: { formed, closing, reopened, reborn, retired, reusedFrame, freshSprite, cleaned: !s.portalSprites.has(id) } };
    });
    for (const death of report.rendererLifecycle.deaths) {
      assert.equal(death.texture, 'lantern-art', `${death.type} death retains sanctuary atlas`);
      assert.notEqual(death.frame, 'ln-portal-0', `${death.type} death selects an actor frame`);
    }
    assert.deepEqual(report.rendererLifecycle.portal, { formed: 'ln-portal-0', closing: 'ln-portal-3', reopened: 'ln-portal-0',
      reborn: 10.3, retired: true, reusedFrame: 'ln-portal-0', freshSprite: true, cleaned: true });
  } finally { await context.close(); }
}

async function run() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    for (const viewport of [{ width: 740, height: 360 }, { width: 844, height: 390 }]) await realInput(browser, viewport);
    await fixtures(browser);
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
