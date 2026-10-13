const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');

async function main() {
  const directory = 'artifacts/revamp-actions';
  fs.mkdirSync(directory, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [], captures = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:5173/');
    await page.waitForFunction(() => window.__ASH?.scene?.referenceArt);
    await page.locator('#start').click();
    await page.evaluate(async () => {
      const g = window.__ASH, s = g.scene;
      s.game.loop.sleep();
      const { damagePlayer } = await import('/src/combat.js');
      const label = document.createElement('div'); label.id = 'action-fixture-label';
      label.style.cssText = 'position:absolute;bottom:9px;left:14px;padding:6px 10px;background:#071018dd;color:#dce9ff;font:11px Arial;letter-spacing:1px;z-index:50;pointer-events:none';
      document.querySelector('#stage').append(label);
      const evidence = { events: [], steps: 0 };
      const overlayCalls = [], fillRect = s.dynamic.fillRect, strokeEllipse = s.dynamic.strokeEllipse;
      s.dynamic.fillRect = function (x, y, w, h) { if (w === 9 && h === 11) overlayCalls.push('standing armor plate'); return fillRect.call(this, x, y, w, h); };
      s.dynamic.strokeEllipse = function (x, y, w, h) { if (w === 37 && h === 55) overlayCalls.push('standing wraith halo'); return strokeEllipse.call(this, x, y, w, h); };
      const settle = () => {
        const w = g.world; s.previousPlayer = { x: w.player.x, y: w.player.y }; s.accumulator = 0;
        const actor = window.__actor, focus = actor ? (Math.min(w.player.x, actor.x) + Math.max(w.player.x + w.player.w, actor.x + actor.w)) / 2 - 480 : w.player.x - 250;
        s.cameraX = Math.max(0, Math.min(w.level.width - 960, focus));
        s.cameraY = Math.max(0, Math.min(w.level.height - s.viewportH, w.player.y - 310));
      };
      const feed = () => { for (const event of g.world.events) { evidence.events.push({ ...event }); s.feedback(event); } g.world.events.length = 0; };
      const step = (input = {}, frames = 1) => {
        for (let i = 0; i < frames; i++) { g.stepWorld(g.world, input, 1 / 120); evidence.steps++; feed(); s.visualTime = g.world.time; settle(); s.drawWorld(1 / 120); }
      };
      const fixture = (config = {}) => {
        const progress = { version: 1, worldId: 'soulforge', unlocked: Object.fromEntries(['sword', 'gun', 'armor', 'spell'].map(kind => [kind, g.catalog.CATALOG[kind].map(item => item.id)])), equipped: { sword: 'rustfang', gun: 'carbine', armor: 'courier', spell: 'cinder' }, charges: { cannon: 2, nova: 2 } };
        const w = g.createWorld(0, { difficulty: 'forge', worldId: 'soulforge', progress });
        const authoredEnemies = w.enemies; w.enemies = []; w.props = [];
        w.solids = w.staticSolids.filter(solid => !solid.missing).concat(w.movingPlatforms, w.gates.filter(gate => !gate.open));
        w.pickups.forEach(pickup => { pickup.taken = true; });
        w.player.x = 260; w.player.y = 610 - w.player.h; w.player.invincible = 0;
        let actor = null;
        if (config.family) {
          actor = authoredEnemies.find(enemy => enemy.visualFamily === config.family);
          if (!actor) throw Error(`No authored enemy with family ${config.family}`);
          Object.assign(actor, { dead: false, x: 625, y: actor.type === 'drone' ? 400 : 610 - actor.h, minX: 560, maxX: 740, cooldown: 5, vx: 0, vy: 0, facing: -1 }); actor.baseY = actor.y;
          w.enemies.push(actor);
        }
        if (config.boss) {
          actor = w.bosses.find(boss => boss.type === config.boss);
          if (!actor) throw Error('No authored Regent');
          actor.active = true; w.activeBoss = actor; w.player.x = actor.x - 350;
          actor.timer = 5;
        }
        g.setWorld(w); g.start(); if (g.world !== w) g.setWorld(w); s.game.loop.sleep();
        evidence.events = []; evidence.steps = 0; s.visualTime = 0; s.heroHurtUntil = 0; s.cinematic = null; s.shake = 0; s.flash = 0; s.impact = 0; s.rings.length = 0; s.particles.forEach(particle => { particle.life = 0; });
        for (const map of [s.referenceEffects, s.enemySprites, s.bossSprites, s.propSprites, s.pickupSprites, s.pickupLabels, s.npcSprites, s.weaponSprites, s.shieldSprites, s.allySprites, s.portalSprites, s.trapSprites]) for (const sprite of map.values()) sprite.setVisible(false);
        s.deathViews.clear();
        window.__actor = actor; step({}, 2); evidence.events = [];
        return w;
      };
      const render = (text, visualTime = g.world.time) => {
        feed(); settle(); s.visualTime = visualTime; overlayCalls.length = 0; s.update(0, 0);
        document.querySelector('#menu').hidden = true;
        document.querySelector('#hud').hidden = false;
        label.textContent = `ACTION FIXTURE / ${text} / 120 Hz simulation`;
        s.children.depthSort(); const renderer = s.sys.game.renderer; renderer.preRender(); s.cameras.render(renderer, s.children); renderer.postRender();
      };
      const snapshot = () => {
        const w = g.world, p = w.player, actor = window.__actor, sprite = actor ? (w.bosses.includes(actor) ? s.bossSprites : s.enemySprites).get(actor.id) : s.playerSprite;
        const alignments = [];
        if (actor && sprite?.texture.key === s.referenceArt.atlasKey) {
          const meta = s.referenceArt.frames[sprite.frame.name], marker = actor.visualFamily === 'wyrm' ? meta.mouth || [228, 128] : meta.muzzle;
          if (marker) {
            const physical = g.weaponOrigin(actor, actor.visualFamily === 'wyrm' ? 'core' : 'gun');
            const origin = sprite.originX * meta.width;
            const point = { x: sprite.x + (sprite.flipX ? meta.width - marker[0] - origin : marker[0] - origin) * sprite.scaleX, y: sprite.y + (marker[1] - sprite.originY * meta.height) * sprite.scaleY };
            alignments.push({ kind: 'atlas muzzle', physical, rendered: point, error: Math.hypot(point.x - physical.x, point.y - physical.y) });
          }
          if (actor.beam) { const physical = g.weaponOrigin(actor, actor.weaponSlot || (w.bosses.includes(actor) ? 'core' : 'gun')); alignments.push({ kind: 'beam origin', physical, rendered: { x: actor.beam.x0, y: actor.beam.y0 }, error: Math.hypot(actor.beam.x0 - physical.x, actor.beam.y0 - physical.y) }); }
          const shot = evidence.events.filter(event => event.type === 'enemyshot').at(-1);
          if (shot) { const physical = g.weaponOrigin(actor, shot.weaponSlot || actor.weaponSlot || 'gun'); alignments.push({ kind: 'emitted shot', physical, rendered: { x: shot.x, y: shot.y }, error: Math.hypot(shot.x - physical.x, shot.y - physical.y) }); }
        }
        for (const ally of w.allies.filter(ally => ally.type === 'clone' && ally.phase === 'attack')) {
          const image = s.allySprites.get(ally.id), meta = s.referenceArt.frames[image?.frame.name];
          if (!meta?.muzzle) throw Error('Active Echo must use the supplied Aether firearm pose');
          const origin = image.originX * meta.width, marker = meta.muzzle, physical = g.weaponOrigin(ally, 'gun');
          const point = { x: image.x + (image.flipX ? meta.width - marker[0] - origin : marker[0] - origin) * image.scaleX, y: image.y + (marker[1] - image.originY * meta.height) * image.scaleY };
          alignments.push({ kind: 'Echo muzzle', physical, rendered: point, error: Math.hypot(point.x - physical.x, point.y - physical.y) });
        }
        return { steps: evidence.steps, time: w.time, status: w.status, kills: w.kills, player: { x: p.x, y: p.y, w: p.w, h: p.h, vx: p.vx, vy: p.vy, grounded: p.grounded, jumps: p.jumps, jet: p.jetActive, fuel: p.fuel, mana: p.mana, hp: p.hp, armor: p.armor, invincible: p.invincible, slashMode: p.slashMode, slashTime: p.slashTime, dashTime: p.dashTime, stealth: p.stealth, siphon: p.siphon, charges: { ...p.charges } }, actor: actor ? { id: actor.id, family: actor.visualFamily, phase: actor.phase, form: actor.form, windup: actor.windup, beamTime: actor.beamTime, slot: actor.weaponSlot, facing: actor.facing } : null, sprite: { texture: sprite?.texture.key, frame: sprite?.frame.name, alpha: sprite?.alpha }, heroFrame: s.playerSprite.frame.name, projectiles: w.projectiles.filter(shot => shot.active).map(shot => ({ owner: shot.owner, kind: shot.kind, missile: shot.missile, x: shot.x, y: shot.y })), allies: w.allies.map(ally => ({ type: ally.type, phase: ally.phase, life: ally.life })), terminalEffects: [...s.referenceEffects.entries()].filter(([id, sprite]) => id.startsWith('hero-') && sprite.visible).map(([id]) => id), heroGunVisible: !!s.weaponSprites.get('hero')?.visible, standingArmorOverlays: [...overlayCalls], alignments, events: evidence.events.map(event => event.type) };
      };
      window.__artTest = { fixture, step, render, snapshot, evidence, damagePlayer };
    });
    const capture = async (id, label, verify) => {
      await page.evaluate(text => window.__artTest.render(text), label);
      const snapshot = await page.evaluate(() => window.__artTest.snapshot());
      verify?.(snapshot);
      const filename = `${directory}/${id}.png`;
      await page.locator('#stage').screenshot({ path: filename });
      captures.push({ id, label, filename, ...snapshot });
      return snapshot;
    };
    const fresh = config => page.evaluate(config => window.__artTest.fixture(config), config || {});
    const step = (input, frames = 1) => page.evaluate(({ input, frames }) => window.__artTest.step(input, frames), { input, frames });
    const hero = family => snapshot => { assert.equal(snapshot.sprite.texture, 'reference-art'); assert.ok(snapshot.heroFrame.startsWith(`ref-aether-${family}-`), `${family}: ${snapshot.heroFrame}`); };
    await fresh(); await capture('01-idle', 'Aether / Idle', hero('idle'));
    await fresh(); await step({ move: 1 }, 30); await capture('02-run', 'Aether / Run right', hero('run'));
    await fresh(); await step({ move: -1 }, 30); await capture('02-run-left', 'Aether / Run left', hero('run'));
    await fresh(); await step({ jumpPressed: true, jumpHeld: true }); await step({ jumpHeld: true }, 15); await capture('03-jump', 'Aether / Jump', s => { hero('jump')(s); assert.ok(s.player.vy < 0 && !s.player.grounded); });
    await fresh(); await step({ jumpPressed: true, jumpHeld: true }); await step({ jumpHeld: true }, 16); await step({ jumpPressed: true, jumpHeld: true }); await step({ jumpHeld: true }, 9); await capture('04-double-jump', 'Aether / Double jump', s => { hero('doublejump')(s); assert.equal(s.player.jumps, 0); });
    await fresh(); await step({ jumpPressed: true, jumpHeld: true }); await step({ jumpHeld: true, jet: true }, 32); await capture('05-jetpack', 'Aether / Jet thrust', s => { hero('jet')(s); assert.ok(s.player.jet && s.player.fuel < 100); });
    await fresh(); await step({ dashPressed: true, move: 1 }); await step({ move: 1 }, 8); await capture('06-dash', 'Aether / Sword dash', s => { hero('dash')(s); assert.ok(s.player.dashTime > 0 && s.player.slashTime > 0); });
    await fresh();
    for (const [index, mode] of ['horizontal', 'vertical', 'finisher'].entries()) { await step({ slashPressed: true }); await step({}, 10); await capture(`07-combo-${index + 1}`, `Aether / ${mode} slash`, s => { assert.equal(s.player.slashMode, mode); assert.ok(s.player.slashTime > 0); }); await step({}, 25); }
    for (const gun of await page.evaluate(() => window.__ASH.catalog.GUNS)) {
      await fresh(); assert.ok(await page.evaluate(id => window.__ASH.equipItem(window.__ASH.world, 'gun', id), gun.id));
      await step({ shoot: true }); await step({}, 8);
      await capture(`08-gun-${gun.id}`, `Firepower / ${gun.name}`, s => { if (gun.id === 'cannon') assert.equal(s.player.charges.cannon, 1); else assert.ok(s.projectiles.some(shot => shot.owner === 'player' && shot.kind === gun.id)); });
      await fresh(); await page.evaluate(id => { const g = window.__ASH; if (!g.equipItem(g.world, 'gun', id)) throw Error('Gun is locked'); g.world.player.facing = -1; }, gun.id);
      await step({ shoot: true }); await step({}, 8);
      await capture(`08-gun-${gun.id}-left`, `Firepower left / ${gun.name}`, s => { if (gun.id === 'cannon') assert.equal(s.player.charges.cannon, 1); else assert.ok(s.projectiles.some(shot => shot.owner === 'player' && shot.kind === gun.id)); });
    }
    for (const spell of await page.evaluate(() => window.__ASH.catalog.SPELLS)) {
      await fresh({ family: 'riftcrawler' }); assert.ok(await page.evaluate(id => window.__ASH.equipItem(window.__ASH.world, 'spell', id), spell.id));
      const before = await page.evaluate(() => ({ mana: window.__ASH.world.player.mana, nova: window.__ASH.world.player.charges.nova }));
      await step({ spellPressed: true }); await step({}, 10);
      await capture(`09-spell-${spell.id}`, `Sorcery / ${spell.name}`, s => { assert.ok(s.events.includes('spell')); if (spell.charge) assert.equal(s.player.charges.nova, before.nova - 1); else assert.ok(s.player.mana <= before.mana - spell.cost + 1 + s.kills * 6, `${spell.id}: cost minus actual kill rewards`); if (spell.id === 'veil') assert.ok(s.player.stealth > 0); if (spell.id === 'siphon') assert.ok(s.player.siphon > 0); if (['clone', 'wolf', 'dragon'].includes(spell.id)) assert.ok(s.allies.some(ally => ally.type === spell.id && ally.phase === 'arrive')); });
      if (['clone', 'wolf', 'dragon'].includes(spell.id)) { await step({}, 100); await capture(`10-summon-${spell.id}`, `Summoned ally / ${spell.name}`, s => { assert.ok(s.allies.some(ally => ally.type === spell.id && ally.phase === 'attack' && ally.life > 0)); for (const alignment of s.alignments) assert.ok(alignment.error < 1.5, `${spell.id}: ${alignment.kind} error ${alignment.error}`); }); }
    }
    await fresh(); await page.evaluate(() => { const t = window.__artTest, w = window.__ASH.world; if (!t.damagePlayer(w, 18, w.player.x + 150)) throw Error('Hurt fixture damage rejected'); }); await capture('11-hurt', 'Aether / Actual damage reaction', s => { assert.ok(s.player.hp < 100); hero('hurt')(s); });
    for (const armor of ['courier', 'bulwark', 'wraith']) {
      await fresh(); await page.evaluate(armor => { const g = window.__ASH; if (!g.equipItem(g.world, 'armor', armor)) throw Error('Death fixture armor locked'); g.world.player.hp = g.world.player.maxHp; }, armor);
      await step({ jumpPressed: true, jumpHeld: true }); await step({ jumpHeld: true, jet: true }, 16);
      await page.evaluate(() => { const g = window.__ASH; if (!g.equipItem(g.world, 'gun', 'cannon')) throw Error('Death fixture cannon locked'); }); await step({ shoot: true, slashPressed: true, jet: true, jumpHeld: true });
      await page.evaluate(() => { const t = window.__artTest, g = window.__ASH, w = g.world, armor = g.catalog.ARMORS.find(armor => armor.id === w.player.armor); if (!w.player.jetActive || w.player.slashTime <= 0 || w.player.laserTime <= 0) throw Error('Death fixture must interrupt live thrust, slash and cannon'); if (!t.damagePlayer(w, w.player.hp / armor.damageTaken + 1, w.player.x + 150)) throw Error('Death fixture damage rejected'); });
      const deathChecks = await page.evaluate(() => {
        const t = window.__artTest, w = window.__ASH.world, checks = [];
        // Positive terminal stealth is a regression fixture; lethal-hit invincibility is supplied by damagePlayer.
        for (const stealth of [0, 1]) for (const offset of [0, 1 / 16]) { w.player.stealth = stealth; t.render('Frozen death timers / armor regression', w.time + offset); const pose = t.snapshot(); checks.push({ visualTime: w.time + offset, invincible: w.player.invincible, stealth, alpha: pose.sprite.alpha, frame: pose.heroFrame, standingArmorOverlays: pose.standingArmorOverlays }); }
        return checks;
      });
      assert.ok(deathChecks.every(check => check.alpha === 1 && check.invincible > 0 && check.standingArmorOverlays.length === 0 && check.frame.startsWith('ref-aether-death-')), `${armor}: frozen timers cannot blink or overlay the prone corpse`);
      const id = armor === 'courier' ? '12-death' : `12-death-${armor}`;
      await capture(id, `Aether ${armor} / Fully opaque death interrupts live actions`, s => { assert.equal(s.status, 'dead'); hero('death')(s); assert.equal(s.sprite.alpha, 1); assert.deepEqual(s.standingArmorOverlays, []); assert.deepEqual(s.terminalEffects, []); assert.equal(s.heroGunVisible, false); s.deathChecks = deathChecks; });
    }
    for (const family of ['riftcrawler', 'hexwing', 'crimsonmecha']) {
      for (const facing of [-1, 1]) {
        await fresh({ family }); await page.evaluate(facing => { const w = window.__ASH.world, e = window.__actor; w.player.x = facing < 0 ? 260 : 980; w.player.y = 610 - w.player.h; e.facing = facing; e.cooldown = 0.5; }, facing);
        await step({}, 10); await capture(`13-${family}-${facing < 0 ? 'left' : 'right'}-windup`, `${family} / ${facing < 0 ? 'Left' : 'Right'} attack windup`, s => { assert.equal(s.sprite.texture, 'reference-art'); assert.ok(s.actor.windup > 0); for (const alignment of s.alignments) assert.ok(alignment.error < 1.5, `${family}: ${alignment.kind} error ${alignment.error}`); });
        await page.evaluate(() => { window.__actor.cooldown = 0.005; }); await step({});
        await capture(`14-${family}-${facing < 0 ? 'left' : 'right'}-fire`, `${family} / Directional discharge`, s => { assert.ok(s.actor.beamTime > 0 || s.events.includes('enemyshot')); for (const alignment of s.alignments) assert.ok(alignment.error < 1.5, `${family}: ${alignment.kind} error ${alignment.error}`); });
      }
    }
    for (const form of ['ground', 'flying']) {
      for (const attack of [0, 2]) {
        await fresh({ boss: 'regent' });
        if (form === 'flying') {
          await page.evaluate(() => { const b = window.__actor; b.hp = Math.floor(b.maxHp * 0.34); b.enraged = false; }); await step({}, 1);
          if (attack === 0) await capture('15-regent-transform-warning', 'Regent / Wyrm transformation warning', s => assert.equal(s.actor.form, 'transforming'));
          for (let frame = 0; frame < 160 && !(await page.evaluate(() => window.__actor.form === 'flying')); frame++) await step({});
          assert.equal(await page.evaluate(() => window.__actor.form), 'flying');
          if (attack === 0) await capture('16-regent-wyrm-flight', 'Regent / Physical Wyrm flight', s => { assert.equal(s.actor.family, 'wyrm'); assert.ok(s.sprite.frame.startsWith('ref-wyrm-')); });
        }
        await page.evaluate(attack => { const b = window.__actor; b.phase = 'idle'; b.attack = (attack + 2) % 3; b.timer = 0.001; b.arrivalGrace = 0; }, attack);
        let reached = false;
        for (let frame = 0; frame < 450; frame++) { await step({}); reached = await page.evaluate(() => !!window.__actor.beam || window.__artTest.evidence.events.some(event => event.type === 'enemyshot' && event.bossId === window.__actor.id)); if (reached) break; }
        assert.ok(reached, `Regent ${form}/${attack} reaches actual discharge`);
        await capture(`17-regent-${form}-${attack === 0 ? 'rockets' : 'beam'}`, `Regent ${form} / ${attack === 0 ? 'Shoulder rockets' : 'Aimed core beam'}`, s => { assert.equal(s.sprite.texture, 'reference-art'); assert.equal(s.actor.form, form); for (const alignment of s.alignments) assert.ok(alignment.error < 1.5, `Regent ${form}: ${alignment.kind} error ${alignment.error}`); });
      }
    }
    assert.deepEqual(errors, []);
    const preview = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const cards = captures.map(c => `<figure><img src="data:image/png;base64,${fs.readFileSync(c.filename).toString('base64')}"/><figcaption>${c.label}</figcaption></figure>`).join('');
    await preview.setContent(`<html><head><style>body{margin:0;padding:20px;background:#09121a;color:#e2eaff;font:14px Arial}h1{font-size:25px;margin:0 0 8px}p{color:#b6c2cd;margin:0 0 20px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}figure{margin:0;background:#14202c;border:1px solid #3c4d5d}img{width:100%;display:block;image-rendering:pixelated}figcaption{padding:10px;font-size:12px;min-height:28px}</style></head><body><h1>AETHER // REVAMP — ACTION FIXTURES</h1><p>Supplied artwork in the actual game renderer. Valid equipment/resource fixtures with120Hz simulation; these are separate from legal campaign proofs.</p><div class="grid">${cards}</div></body></html>`);
    await preview.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    await preview.screenshot({ path: `${directory}/contact-sheet.png`, fullPage: true });
    const report = { method: 'Isolated render and combat fixtures. Known catalog unlocks, valid charges and relocated authored actors; unrelated actors/cover disabled. Actual120Hz stepWorld inputs; only hurt/death use exported damagePlayer. Regent transformation begins from a valid wounded-health fixture. Death menu suppressed only for corpse inspection. Terminal stealth is seeded for a frozen-timer regression; lethal-hit invincibility is actual simulation state. Not a legal campaign or difficulty proof.', counts: { captures: captures.length, guns: 5, spells: 9, deathArmors: 3, deathVisualChecks: 12 }, captures, runtimeErrors: errors, contactSheet: `${directory}/contact-sheet.png`, limitations: 'Physical Android feel, audio mix, legal-route balance and source-art ownership are not verified here. Creature emission origins and atlas markers are checked within1.5px render rounding.' };
    fs.writeFileSync('artifacts/revamp-actions-report.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ captures: captures.length, guns: 5, spells: 9, runtimeErrors: errors, contactSheet: report.contactSheet }, null, 2));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exit(1); });
