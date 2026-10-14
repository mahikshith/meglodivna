import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PHYSICS, createPlayer, stepPlayer, overlaps } from '../src/physics.js';
import { LEVELS } from '../src/level.js';
import { LEVEL as LEGACY_LEVEL } from '../src/legacy-level.js';
import { createWorld, retryWorld, stepWorld, weaponOrigin, projectileAim, interact, spawnProjectile, damagePlayer, rewardPlayer, castSpell, STEP } from '../src/combat.js';

function fixture() {
  const world = createWorld(0, { level: LEGACY_LEVEL });
  world.level = { ...world.level, solids: [{ id: 'floor', x: 0, y: 610, w: 2000, h: 110 }], hazards: [], currents: [], portals: [] };
  world.staticSolids = world.level.solids.map(s => ({ ...s })); world.props = []; world.gates = []; world.enemies = []; world.pickups = []; world.npcs = [];
  world.movingPlatforms = []; world.crumble = []; world.enemyPortals = [];
  return world;
}
function tick(world, frames, input = {}) { for (let index = 0; index < frames; index++) { stepWorld(world, input, STEP); world.events.length = 0; } }

test('Aether has a real28×60 body while every authored relay preserves its center and feet', () => {
  assert.equal(PHYSICS.playerWidth, 28); assert.equal(PHYSICS.playerHeight, 60);
  for (const level of Object.values(LEVELS)) for (let index = 0; index < level.checkpoints.length; index++) {
    const world = createWorld(index, { worldId: level.id }), p = world.player, cp = level.checkpoints[index];
    assert.deepEqual([p.w, p.h], [28, 60]);
    assert.equal(p.x + p.w / 2, cp.x + 12); assert.equal(p.y + p.h, cp.y + 46);
    assert.ok(!world.solids.some(s => !s.oneWay && overlaps(p, s)), `${level.id} relay${index} must not embed`);
    const retry = retryWorld(world);
    assert.equal(retry.player.x, p.x); assert.equal(retry.player.y, p.y);
  }
});

test('the taller body stops at a tight ceiling and still uses the same finite jet and dash rules', () => {
  const p = createPlayer(100, 550), floor = { x: 0, y: 610, w: 500, h: 100 }, ceiling = { x: 0, y: 480, w: 500, h: 70 };
  stepPlayer(p, {}, [floor, ceiling], STEP); stepPlayer(p, { jumpPressed: true, jumpHeld: true }, [floor, ceiling], STEP);
  assert.equal(p.y, 550); assert.equal(p.vy, 0); assert.ok(!overlaps(p, ceiling));
  for (let frame = 0; frame < 320; frame++) stepPlayer(p, { jet: true, dashPressed: frame === 0 }, [], STEP);
  assert.equal(p.fuel, 0); assert.equal(p.jetActive, false); assert.equal(p.dashTime, 0); assert.ok(p.vy > 0);
});

test('revamped attacks start on their first simulation tick with body-based muzzle and melee bounds', () => {
  const world = fixture(); tick(world, 12); const p = world.player;
  const expected = weaponOrigin(p, 'gun');
  stepWorld(world, { slashPressed: true, shoot: true }, STEP);
  assert.ok(p.slashTime > 0); assert.equal(p.slashId, 1);
  assert.ok(Math.abs(p.slashBox.y + p.slashBox.h - (p.y + p.h)) < 8);
  assert.equal(p.slashActive, false, 'first tick shows anticipation before blade contact');
  const shot = world.projectiles.find(projectile => projectile.active);
  assert.ok(Math.abs(shot.x - expected.x - shot.vx * STEP) < 0.001);
  assert.ok(Math.abs(shot.y - expected.y - shot.vy * STEP) < 0.001);
  tick(world, 100, { shoot: true }); assert.equal(p.slashId, 1, 'Holding fire must not repeat a tap slash');
  p.facing = -1; p.aimAngle = Math.PI;
  const left = weaponOrigin(p, 'gun'), hand = weaponOrigin(p, 'hand');
  assert.ok(left.x < hand.x); assert.ok(Math.abs(left.y - hand.y) < 0.001);
  assert.equal(hand.x, p.x + p.w / 2 - 16); assert.equal(hand.y, p.y + p.h - 41);
  assert.equal(left.x, p.x + p.w / 2 - 29);
});

test('authored mirror exits translate to the larger body without embedding at ground level', () => {
  const world = fixture(), p = world.player;
  world.portals = [{ id: 'door', x: p.x, y: p.y, w: 30, h: 60, to: { x: 400, y: 564 } }];
  stepWorld(world, {}, STEP); assert.equal(p.x + p.w / 2, 412); assert.equal(p.y + p.h, 610);
  assert.ok(!overlaps(p, world.staticSolids[0]));
});

test('new creature families preserve their distinct ground, hover and shield powers', () => {
  const world = createWorld();
  assert.ok(world.enemies.filter(e => e.type === 'guard').every(e => e.visualFamily === 'riftcrawler'));
  assert.ok(world.enemies.filter(e => e.type === 'drone').every(e => e.visualFamily === 'hexwing'));
  assert.ok(world.enemies.filter(e => e.type === 'sentinel').every(e => e.visualFamily === 'crimsonmecha' && e.shield > 0));
  assert.equal(world.boss.visualFamily, 'crimsonmecha');
});

test('NPC interaction and incoming damage use the larger player center while NPC positions stay authored', () => {
  const world = fixture(), p = world.player;
  const npc = { id: 'guide', x: p.x - 70, y: 564, name: 'GUIDE', lines: [{ speaker: 'GUIDE', text: 'Keep moving.' }] };
  world.npcs = [npc]; assert.equal(interact(world), true);
  assert.equal(p.facing, -1); assert.equal(npc.facing, 1); assert.equal(npc.y, 564);
  world.story = null; p.invincible = 0;
  damagePlayer(world, 5, p.x + p.w / 2 - 2); assert.equal(p.vx, 230);
  p.invincible = 0; damagePlayer(world, 5, p.x + p.w / 2 + 2); assert.equal(p.vx, -230);
});

test('Regent announces transformation before actual Wyrm flight and retains bounded mouth/launcher attacks', () => {
  const world = fixture(); tick(world, 12); const boss = world.boss;
  Object.assign(boss, { active: true, x: 500, y: 478, baseX: 500, baseY: 478, arenaStart: 0, arenaEnd: 1800, hp: boss.maxHp * 0.34 });
  const oldY = boss.y, oldFeet = boss.y + boss.h;
  stepWorld(world, {}, STEP); assert.equal(boss.phase, 'transform'); assert.equal(boss.visualFamily, 'crimsonmecha');
  tick(world, 90); assert.equal(boss.y, oldY); assert.equal(boss.visualFamily, 'crimsonmecha');
  tick(world, 20); assert.equal(boss.form, 'flying'); assert.equal(boss.visualFamily, 'wyrm');
  assert.deepEqual([boss.w, boss.h], [112, 86]); assert.equal(boss.baseY, 524);
  assert.ok(boss.arrivalGrace > 0);
  tick(world, 45); assert.ok(boss.y + boss.h < oldFeet - 20); assert.ok(Math.abs(boss.vy) <= 130); assert.equal(boss.grounded, false);
  const mouth = weaponOrigin(boss, 'mouth'); assert.deepEqual(weaponOrigin(boss, 'core'), mouth);
  assert.equal(mouth.x, boss.x + boss.w / 2 + boss.facing * 100); assert.equal(mouth.y, boss.y + boss.h - 72);
  const aim = projectileAim(boss, world.player, 'core'); assert.equal(aim.x, mouth.x); assert.equal(aim.y, mouth.y);
  assert.equal(Math.sign(aim.vx), boss.facing);
  assert.notDeepEqual(weaponOrigin(boss, 'rocket'), mouth);
  const light = spawnProjectile(world, world.player.x + 45, world.player.y + 20, -200, 0, 'enemy');
  const heavy = spawnProjectile(world, world.player.x + 48, world.player.y + 20, -200, 0, 'enemy', true); heavy.heavy = true; heavy.reflectable = false;
  world.player.slashCooldown = 0; stepWorld(world, { slashPressed: true }, STEP);
  assert.equal(light.owner, 'player'); assert.equal(heavy.owner, 'enemy');
  assert.ok(boss.x >= boss.arenaStart && boss.x + boss.w <= boss.arenaEnd);
  Object.assign(boss, { phase: 'idle', timer: STEP / 2, attack: 1 });
  stepWorld(world, {}, STEP); const locked = { x: boss.aimX, y: boss.aimY };
  tick(world, 20);
  assert.deepEqual({ x: boss.telegraph.x0, y: boss.telegraph.y0 }, weaponOrigin(boss, 'mouth'));
  assert.equal(boss.aimX, locked.x); assert.equal(boss.aimY, locked.y);
});

test('shared physical origins match all published actor-family anatomy in both directions', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/reference/manifest.json', import.meta.url), 'utf8'));
  const frames = Object.values(manifest.frames);
  const fire = frames.find(frame => frame.family === 'aether' && frame.action === 'fire');
  const wyrm = frames.find(frame => frame.family === 'wyrm' && frame.mouth && frame.launcher);
  const crawler = frames.find(frame => frame.family === 'crawler' && frame.muzzle);
  const raider = frames.find(frame => frame.family === 'raider' && frame.muzzle);
  const mecha = frames.find(frame => frame.family === 'mecha' && frame.action === 'fire' && frame.muzzle);
  assert.ok(fire?.hand && fire?.muzzle, 'Aether fire anatomy must be published');
  assert.ok(wyrm, 'Wyrm mouth and launcher anatomy must be published');
  assert.ok(crawler && raider && mecha, 'Every new creature family must publish its weapon origin');
  const p = createWorld().player, boss = { x: 500, y: 479, w: 112, h: 86, visualFamily: 'wyrm' };
  const actors = [
    { x: 500, y: 569, w: 60, h: 41, visualFamily: 'riftcrawler' },
    { x: 500, y: 385, w: 34, h: 45, visualFamily: 'hexwing' },
    { x: 500, y: 556, w: 38, h: 54, visualFamily: 'crimsonmecha' },
  ];
  const point = (entity, frame, anchor) => ({
    x: entity.x + entity.w / 2 + entity.facing * (anchor[0] - frame.body.x - frame.body.w / 2) * entity.h / frame.body.h,
    y: entity.y + (anchor[1] - frame.body.y) * entity.h / frame.body.h,
  });
  for (const facing of [-1, 1]) {
    p.facing = facing; p.aimAngle = facing > 0 ? 0 : Math.PI; p.aimUp = false; boss.facing = facing;
    actors.forEach(actor => { actor.facing = facing; });
    for (const [entity, frame, anchor, slot] of [[p, fire, fire.hand, 'hand'], [p, fire, fire.muzzle, 'gun'], [boss, wyrm, wyrm.mouth, 'mouth'], [boss, wyrm, wyrm.launcher, 'rocket'],
      [actors[0], crawler, crawler.muzzle, 'gun'], [actors[1], raider, raider.muzzle, 'gun'], [actors[2], mecha, mecha.muzzle, 'gun']]) {
      const expected = point(entity, frame, anchor), actual = weaponOrigin(entity, slot);
      assert.ok(Math.abs(actual.x - expected.x) < 0.001 && Math.abs(actual.y - expected.y) < 0.001, `${frame.key} ${slot} must align with the source pixels`);
    }
  }
});

test('native crawler/raider bodies preserve every authored placement and clamp full-width ground patrols', () => {
  for (const level of Object.values(LEVELS)) {
    const world = createWorld(0, { worldId: level.id });
    for (const enemy of world.enemies) {
      const authored = level.enemies.find(entry => entry.id === enemy.id);
      if (enemy.visualFamily === 'riftcrawler') {
        assert.deepEqual([enemy.w, enemy.h], [60, 41]);
        assert.equal(enemy.x + enemy.w / 2, authored.x + authored.w / 2); assert.equal(enemy.y + enemy.h, authored.y + authored.h);
        const support = level.solids.find(s => Math.abs(s.y - enemy.y - enemy.h) < 0.001 && enemy.x >= s.x && enemy.x + enemy.w <= s.x + s.w);
        assert.ok(support, `${enemy.id} needs full-width support`);
        assert.ok(enemy.minX >= support.x && enemy.maxX + enemy.w <= support.x + support.w);
      } else if (enemy.visualFamily === 'hexwing') {
        assert.deepEqual([enemy.w, enemy.h], [34, 45]);
        assert.equal(enemy.x + enemy.w / 2, authored.x + authored.w / 2); assert.equal(enemy.y + enemy.h / 2, authored.y + authored.h / 2);
      }
    }
  }
  const world = fixture(), crawler = world.level.enemies.find(enemy => enemy.type === 'guard');
  const runtime = createWorld(0, { level: LEGACY_LEVEL }).enemies.find(enemy => enemy.id === crawler.id);
  world.enemies = [runtime]; world.player.invincible = 100;
  for (const x of [50, 1500]) {
    world.player.x = x;
    for (let frame = 0; frame < 400; frame++) {
      stepWorld(world, {}, STEP); world.events.length = 0;
      assert.ok(runtime.x >= runtime.minX && runtime.x <= runtime.maxX);
      assert.ok(runtime.x >= 0 && runtime.x + runtime.w <= 1200 && runtime.grounded);
    }
  }
});

test('temporary crawler and raider summons receive the same native bodies before attacking', () => {
  for (const type of ['guard', 'drone']) {
    const world = fixture(); world.enemyPortals = [{ id: type, type, x: 500, y: 566, timer: 0, period: 100, lifetime: 8, phase: 'idle' }];
    tick(world, 140); const summon = world.enemySummons[0];
    assert.equal(summon.phase, 'arrive'); assert.deepEqual([summon.w, summon.h], type === 'guard' ? [60, 41] : [34, 45]);
    assert.equal(summon.x + summon.w / 2, 515);
    if (type === 'guard') assert.equal(summon.y + summon.h, 610);
    else assert.equal(summon.y + summon.h / 2, 588);
  }
});

test('Courier Echo scales published Aether hand/muzzle anatomy and fires diagonally from that exact point', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/reference/manifest.json', import.meta.url), 'utf8'));
  const frame = manifest.frames['ref-aether-fire-0'], clone = { type: 'clone', x: 200, y: 300, w: 32, h: 40 };
  const scale = clone.h / frame.body.h, length = frame.muzzle[0] - frame.hand[0];
  for (const facing of [-1, 1]) for (const angle of [facing > 0 ? 0 : Math.PI, facing > 0 ? -Math.PI / 4 : -Math.PI * 3 / 4]) {
    Object.assign(clone, { facing, aimAngle: angle });
    const hand = { x: clone.x + clone.w / 2 + facing * (frame.hand[0] - frame.body.x - frame.body.w / 2) * scale,
      y: clone.y + (frame.hand[1] - frame.body.y) * scale };
    assert.deepEqual(weaponOrigin(clone, 'hand'), hand);
    const muzzle = weaponOrigin(clone, 'gun');
    assert.ok(Math.abs(muzzle.x - hand.x - Math.cos(angle) * length * scale) < 0.001);
    assert.ok(Math.abs(muzzle.y - hand.y - Math.sin(angle) * length * scale) < 0.001);
  }
  const world = fixture(); tick(world, 12);
  world.enemies = [{ id: 'high-target', type: 'turret', x: 600, y: 250, w: 40, h: 60, hp: 1000, maxHp: 1000, cooldown: 100 }];
  rewardPlayer(world, { type: 'spell', itemId: 'clone' }); assert.equal(castSpell(world, 'clone'), true);
  let shot;
  for (let index = 0; index < 240 && !shot; index++) { stepWorld(world, {}, STEP); world.events.length = 0; shot = world.projectiles.find(projectile => projectile.active && projectile.kind === 'ally'); }
  assert.ok(shot); const echo = world.allies[0], muzzle = weaponOrigin(echo, 'gun');
  assert.equal(echo.facing, 1); assert.ok(echo.aimAngle < -0.2);
  assert.ok(Math.abs(shot.x - shot.vx * STEP - muzzle.x) < 0.001);
  assert.ok(Math.abs(shot.y - shot.vy * STEP - muzzle.y) < 0.001);
  assert.ok(Math.abs(Math.atan2(shot.vy, shot.vx) - echo.aimAngle) < 0.001);
});
