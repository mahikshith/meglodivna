import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, retryWorld, stepWorld, STEP, weaponOrigin, projectileAim, beamHit, spawnProjectile, rewardPlayer, equipItem, castSpell, interact, advanceStory } from '../src/combat.js';
import { defaultProgress, switchWorldProgress, validateProgress, restartWorldProgress, newCampaignProgress } from '../src/progress.js';
import { getLevel } from '../src/legacy-level.js';

const floor = { id: 'fixture-floor', x: 0, y: 610, w: 2000, h: 110 };
function isolated(id = 'soulforge') {
  const world = createWorld(0, { worldId: id, level: getLevel(id) });
  world.level = { ...world.level, solids: [floor], hazards: [], currents: [], portals: [] };
  world.staticSolids = [{ ...floor }]; world.enemies = []; world.pickups = []; world.props = []; world.gates = [];
  world.movingPlatforms = []; world.crumble = []; world.enemyPortals = [];
  return world;
}
function tick(world, frames, input = {}) { for (let frame = 0; frame < frames; frame++) { stepWorld(world, input, STEP); world.events.length = 0; } }
const foe = (id, x, hp = 200) => ({ id, type: 'turret', x, y: 566, w: 30, h: 44, hp, maxHp: hp, facing: -1, cooldown: 100, minX: 0, maxX: 1500, weakened: 0 });

test('authoritative muzzle/core points mirror correctly and directional shots start there', () => {
  const world = isolated(), p = world.player;
  const right = weaponOrigin(p); p.facing = -1; const left = weaponOrigin(p);
  assert.ok(Math.abs((right.x - p.x - p.w / 2) - (p.x + p.w / 2 - left.x)) < 0.001);
  assert.ok(right.y < p.y + p.h / 2);
  const aim = projectileAim(p, { x: 0, y: 300, w: 20, h: 40 });
  assert.deepEqual({ x: aim.x, y: aim.y }, left);
  assert.ok(aim.vx < 0 && aim.vy < 0);
  assert.ok(Math.abs(Math.hypot(aim.vx, aim.vy) - 340) < 0.001);
  stepWorld(world, { shoot: true }, STEP);
  const shot = world.projectiles.find(projectile => projectile.active);
  assert.ok(Math.abs(shot.x - (weaponOrigin(p).x + shot.vx * STEP)) < 0.001);
});

test('diagonal beams hit their segment rather than empty corners of a bounding rectangle', () => {
  const beam = { x0: 0, y0: 0, x1: 200, y1: 200, width: 10, heavy: true };
  assert.equal(beamHit(beam, { x: 90, y: 90, w: 10, h: 10 }), true);
  assert.equal(beamHit(beam, { x: 190, y: 0, w: 10, h: 10 }), false);
  assert.equal(beamHit({ x: 0, y: 0, w: 200, h: 200 }, { x: 90, y: 90, w: 10, h: 10 }), false);
});

test('light parries are bounded while heavy boss rockets cannot be erased by a sword', () => {
  const world = isolated(); tick(world, 10);
  const p = world.player;
  const lights = Array.from({ length: 3 }, () => spawnProjectile(world, p.x + 45, p.y + 20, -200, 0, 'enemy'));
  const heavy = spawnProjectile(world, p.x + 48, p.y + 20, -200, 0, 'enemy', true);
  heavy.heavy = true; heavy.reflectable = false;
  stepWorld(world, { slashPressed: true }, STEP);
  assert.equal(lights.filter(projectile => projectile.owner === 'player').length, 2);
  assert.equal(heavy.owner, 'enemy');
  assert.equal(p.parries, 2);
  tick(world, 14);
  assert.equal(p.parryTime, 0);
});

test('horizontal/vertical/finisher combos alternate and boost never performs a sword cut', () => {
  const world = isolated(); tick(world, 10);
  const modes = [];
  for (let index = 0; index < 3; index++) { stepWorld(world, { slashPressed: true }, STEP); modes.push(world.player.slashMode); tick(world, 35); }
  assert.deepEqual(modes, ['horizontal', 'vertical', 'finisher']);
  const target = foe('dash-small', world.player.x + 80, 30); world.enemies = [target];
  stepWorld(world, { boostPressed: true, move: 1 }, STEP);
  assert.equal(world.player.boostActive, true);
  assert.equal(target.hp, 30);
  assert.equal(world.kills, 0);
  tick(world, 10, { move: 1 });
  assert.equal(world.kills, 0);
});

test('allied clone/wolf/dragon announce, arrive, attack real foes, expire, and stay bounded', () => {
  for (const id of ['clone', 'wolf', 'dragon']) {
    const world = isolated(); tick(world, 10);
    rewardPlayer(world, { type: 'spell', itemId: id });
    const target = foe(`target-${id}`, world.player.x + 170, 1000); world.enemies = [target];
    const mana = world.player.mana;
    assert.equal(castSpell(world, id), true);
    assert.ok(world.player.mana < mana);
    assert.equal(world.allies[0].phase, 'arrive');
    tick(world, 40); assert.equal(target.hp, 1000);
    tick(world, 250); assert.ok(target.hp < 1000, `${id} must actually attack`);
    tick(world, 1300); assert.equal(world.allies.length, 0);
  }
});

test('enemy portals expose a warning then delayed arrival and bounded expiring attackers', () => {
  const world = isolated(); world.enemyPortals = [{ id: 'test-rift', x: 500, y: 566, type: 'shade', period: 100, lifetime: 1, timer: 0, phase: 'idle' }];
  stepWorld(world, {}, STEP);
  assert.equal(world.enemyPortals[0].phase, 'warning'); assert.equal(world.enemySummons.length, 0);
  tick(world, 140); assert.equal(world.enemySummons[0].phase, 'arrive');
  tick(world, 90); assert.ok(world.enemySummons.every(summon => ['attack', 'expire'].includes(summon.phase)));
  tick(world, 170); assert.equal(world.enemySummons.length, 0);
});

test('currents change movement, moving platforms carry riders, and crumbling floors disappear/recover', () => {
  const flow = isolated(); flow.level.currents = [{ x: 0, y: 0, w: 800, h: 610, vx: 80, vy: 0 }];
  const start = flow.player.x; tick(flow, 120); assert.ok(flow.player.x > start + 70);
  const raft = isolated(); raft.movingPlatforms = [{ id: 'raft', x: 100, y: 500, baseX: 100, baseY: 500, w: 180, h: 20, axis: 'x', distance: 50, period: 4 }];
  Object.assign(raft.player, { x: 140, y: 500 - raft.player.h, grounded: true });
  const offset = raft.player.x - raft.movingPlatforms[0].x; tick(raft, 60);
  assert.ok(Math.abs(raft.player.x - raft.movingPlatforms[0].x - offset) < 0.01);
  const crumble = isolated(); crumble.crumble = [{ solidId: floor.id, delay: 0.1, restore: 0.4, timer: 0, missing: 0 }];
  tick(crumble, 24); assert.equal(crumble.staticSolids[0].missing, true); assert.ok(crumble.player.y > 610 - crumble.player.h);
  crumble.player.x = 2200; tick(crumble, 70); assert.equal(crumble.staticSolids[0].missing, false);
});

test('world switching isolates claimed encounters and keeps globally consumed charges', () => {
  const first = defaultProgress(); first.claimed.push('cache:same-id:0'); first.defeatedBosses.push('warden'); first.checkpoint = 4; first.charges.nova = 0;
  const tide = switchWorldProgress(first, 'tide');
  assert.deepEqual(tide.claimed, []); assert.deepEqual(tide.defeatedBosses, []);
  tide.claimed.push('npc:tide'); tide.checkpoint = 2;
  const restored = switchWorldProgress(tide, 'soulforge');
  assert.deepEqual(restored.claimed, ['cache:same-id:0']); assert.equal(restored.checkpoint, 4);
  assert.equal(restored.charges.nova, 0);
  const world = createWorld(0, { worldId: 'tide', progress: tide });
  assert.equal(world.worldId, 'tide'); assert.equal(world.level.id, 'tide'); assert.equal(retryWorld(world).worldId, 'tide');
  assert.equal(validateProgress({ ...restored, worldId: '__proto__' }).worldId, 'soulforge');
});

test('a warned pact charges health once, claims its choice, and starts its enemy portal warning', () => {
  const world = isolated();
  world.npcs = [{ id: 'fixture-witch', name: 'Witch', x: world.player.x, y: world.player.y,
    lines: [{ speaker: 'Witch', text: 'The dragon costs25life and wakes a shade.' }],
    choices: [{ id: 'fixture-pact', cost: { hp: 25 }, reward: { type: 'spell', itemId: 'dragon' }, effect: { type: 'ambush', enemyPortalId: 'pact-rift' } }] }];
  world.enemyPortals = [{ id: 'pact-rift', x: 500, y: 566, type: 'shade', period: 10, lifetime: 3, timer: 10, phase: 'idle', requiresClaim: 'choice:fixture-pact' }];
  assert.equal(interact(world), true); assert.equal(advanceStory(world, 'fixture-pact'), true);
  assert.equal(world.player.hp, 75); assert.ok(world.progress.claimed.includes('choice:fixture-pact'));
  stepWorld(world, {}, STEP); assert.equal(world.enemyPortals[0].phase, 'warning');
});

test('restarting one completed world preserves every other encounter save and clears replay charges', () => {
  const raw = defaultProgress(); raw.worldId = 'tide'; raw.claimed = ['npc:tide']; raw.checkpoint = 3;
  raw.worlds.soulforge = { claimed: ['cache:old'], defeatedBosses: ['warden'], openedGates: [], destroyedProps: [], checkpoint: 7 };
  raw.completedWorlds = ['soulforge', 'tide']; raw.charges.cannon = 3; raw.unlocked.spell.push('wolf');
  const replay = restartWorldProgress(raw, 'soulforge');
  assert.equal(replay.worldId, 'soulforge'); assert.deepEqual(replay.claimed, []);
  assert.equal(replay.checkpoint, 0); assert.deepEqual(replay.worlds.tide.claimed, ['npc:tide']);
  assert.equal(replay.worlds.tide.checkpoint, 3); assert.deepEqual(replay.completedWorlds, ['tide']);
  assert.deepEqual(replay.charges, { cannon: 0, nova: 0 }); assert.ok(replay.unlocked.spell.includes('wolf'));
  assert.deepEqual(newCampaignProgress(raw).completedWorlds, []);
});

test('finite analogue aim fires diagonal rockets from the rotated authoritative muzzle', () => {
  const world = isolated(); rewardPlayer(world, { type: 'weapon', itemId: 'rocket' });
  const mana = world.player.mana;
  stepWorld(world, { shoot: true, aimX: 1, aimY: -1 }, STEP);
  const rocket = world.projectiles.find(projectile => projectile.active);
  assert.equal(rocket.kind, 'rocket'); assert.equal(rocket.heavy, true);
  assert.ok(rocket.vx > 0 && rocket.vy < 0);
  assert.ok(Math.abs(world.player.aimAngle + Math.PI / 4) < 0.001);
  const origin = weaponOrigin(world.player);
  assert.ok(Math.abs(rocket.x - rocket.vx * STEP - origin.x) < 0.001);
  assert.ok(world.player.mana < mana - 3.9);
});

test('bosses pursue through physics and visibly enrage with a bounded taunt', () => {
  const world = isolated(); tick(world, 10); const boss = world.bosses[0];
  Object.assign(boss, { active: true, x: 500, y: 490, baseX: 500, baseY: 490, arenaStart: 0, arenaEnd: 1800, timer: 2, hp: 100, maxHp: 1000 });
  tick(world, 60);
  assert.ok(boss.x < 500); assert.ok(boss.x >= boss.arenaStart);
  assert.equal(boss.enraged, true); assert.equal(boss.emotion, 'enraged'); assert.ok(boss.tauntTime > 0);
});

test('conduit interaction actually removes a linked shield lock and creates a vulnerability window', () => {
  const world = isolated(); const boss = world.bosses[0];
  Object.assign(boss, { active: true, x: 500, y: 490, baseX: 500, baseY: 490, arenaStart: 0, arenaEnd: 1800, timer: 10, hp: 1000, maxHp: 1000, shieldGateId: 'conduit-lock' });
  world.gates = [{ id: 'conduit-lock', x: 1000, y: 0, w: 30, h: 610, open: false }];
  world.props = [{ id: 'conduit', type: 'conduit', gateId: 'conduit-lock', x: world.player.x, y: 564, w: 30, h: 46 }];
  rewardPlayer(world, { type: 'cannon', value: 2 }); equipItem(world, 'gun', 'cannon');
  stepWorld(world, { shoot: true }, STEP); const lockedDamage = 1000 - boss.hp;
  assert.ok(lockedDamage > 0 && lockedDamage < 20);
  assert.equal(interact(world), true); assert.equal(world.gates[0].open, true); assert.ok(boss.weakened > 0);
  tick(world, 110); const before = boss.hp;
  stepWorld(world, { shoot: true }, STEP);
  assert.ok(before - boss.hp > lockedDamage * 4);
});

test('Hex blink announces a safe exit before teleporting and grants arrival recovery', () => {
  const world = isolated(); tick(world, 10); const boss = world.bosses.find(candidate => candidate.type === 'hex');
  Object.assign(boss, { active: true, x: 500, y: 490, baseX: 500, baseY: 490, arenaStart: 0, arenaEnd: 1800,
    attack: 2, phase: 'idle', timer: STEP / 2 });
  world.player.invincible = 0;
  stepWorld(world, {}, STEP); const source = boss.x;
  assert.ok(boss.portalExit?.time >= 0.7); const destination = boss.portalExit.x;
  tick(world, 60); assert.equal(boss.x, source); assert.equal(world.player.hp, 100);
  tick(world, 42); assert.ok(Math.abs(boss.x - destination) < 0.01); assert.ok(boss.arrivalGrace > 0);
  assert.deepEqual({ x: boss.telegraph.x0, y: boss.telegraph.y0 }, weaponOrigin(boss, 'core'));
  assert.ok(boss.x >= boss.arenaStart && boss.x + boss.w <= boss.arenaEnd);
  assert.equal(world.player.hp, 100);
});

test('a leaping boss warning follows its current core while its target stays locked', () => {
  const world = isolated(); tick(world, 10); const boss = world.bosses[0];
  Object.assign(boss, { active: true, x: 500, y: 490, baseX: 500, baseY: 490, arenaStart: 0, arenaEnd: 1800,
    attack: 2, phase: 'idle', timer: STEP / 2, grounded: true });
  stepWorld(world, {}, STEP); const targetX = boss.aimX, targetY = boss.aimY, initialY = boss.y;
  tick(world, 20);
  assert.ok(boss.y < initialY, 'The warning must be checked during an actual leap');
  assert.deepEqual({ x: boss.telegraph.x0, y: boss.telegraph.y0 }, weaponOrigin(boss, 'core'));
  assert.equal(boss.aimX, targetX); assert.equal(boss.aimY, targetY);
});

test('Borrowed Spark refunds five mana only for each of the two legal light parries', () => {
  const world = isolated(); tick(world, 10); const p = world.player; p.mana = 10;
  const lights = Array.from({ length: 3 }, () => spawnProjectile(world, p.x + 45, p.y + 20, -200, 0, 'enemy'));
  const heavy = spawnProjectile(world, p.x + 48, p.y + 20, -200, 0, 'enemy', true);
  heavy.heavy = true; heavy.reflectable = false;
  stepWorld(world, { slashPressed: true }, STEP);
  assert.equal(lights.filter(projectile => projectile.owner === 'player').length, 2);
  assert.ok(Math.abs(p.mana - (20 + 2.5 * STEP)) < 0.001);
  assert.equal(heavy.owner, 'enemy');
  tick(world, 35); p.mana = p.maxMana - 1;
  spawnProjectile(world, p.x + 45, p.y + 20, -200, 0, 'enemy');
  stepWorld(world, { slashPressed: true }, STEP); assert.equal(p.mana, p.maxMana);
});

test('Skybreaker suppresses and restores an ordinary ward without disabling boss shields', () => {
  const world = isolated(); tick(world, 10); const sentinel = { ...foe('ward-test', 400, 1000), type: 'sentinel', shield: 35 };
  world.enemies = [sentinel]; const boss = world.bosses[0];
  Object.assign(boss, { x: 600, y: 490, active: true, arenaStart: 0, arenaEnd: 1800, timer: 100 });
  rewardPlayer(world, { type: 'spell', itemId: 'thunder' }); assert.equal(castSpell(world, 'thunder'), true);
  assert.equal(sentinel.shield, 0); assert.equal(sentinel.wardDisabled, 3); assert.equal(sentinel.weakened, 3);
  assert.ok(boss.shield > 0); assert.equal(boss.wardDisabled, undefined);
  tick(world, 361); assert.equal(sentinel.shield, 35); assert.equal(sentinel.wardDisabled, 0);
});

function poweredBoss(power, attack = 1) {
  const world = isolated(); tick(world, 10); const boss = world.bosses[0];
  Object.assign(boss, { power, active: true, x: 500, y: 490, baseX: 500, baseY: 490,
    arenaStart: 0, arenaEnd: 1800, phase: 'attack', attack, timer: -1, shots: 0 });
  return { world, boss };
}

test('infernal boss projectiles inflict an actual timed burn on impact', () => {
  const { world, boss } = poweredBoss('infernal'); stepWorld(world, {}, STEP);
  const shot = world.projectiles.find(projectile => projectile.active && projectile.sourceId === boss.id);
  assert.equal(shot.kind, 'fire'); const p = world.player; p.invincible = 0;
  Object.assign(shot, { x: p.x + 30, y: p.y + 20, vx: -500, vy: 0, homing: false });
  boss.phase = 'idle'; boss.timer = 100; stepWorld(world, {}, STEP);
  assert.equal(p.burn, 3); assert.ok(p.hp < p.maxHp);
});

test('overload creates faster heavy rockets, an extra burst, and shorter real recovery', () => {
  const plain = poweredBoss(null), charged = poweredBoss('overload');
  stepWorld(plain.world, {}, STEP); stepWorld(charged.world, {}, STEP);
  const shots = entry => entry.world.projectiles.filter(projectile => projectile.active && projectile.sourceId === entry.boss.id);
  assert.equal(shots(plain).length, 1); assert.equal(shots(charged).length, 2);
  assert.ok(Math.hypot(shots(charged)[0].vx, shots(charged)[0].vy) > Math.hypot(shots(plain)[0].vx, shots(plain)[0].vy) * 1.4);
  assert.ok(shots(charged).every(projectile => projectile.heavy && !projectile.reflectable));
  for (const entry of [plain, charged]) { entry.boss.shots = 2; entry.boss.timer = -1; stepWorld(entry.world, {}, STEP); }
  assert.equal(charged.boss.phase, 'idle'); assert.ok(charged.boss.timer < plain.boss.timer);
});

test('undertow telegraphs its arena current before displacing the player', () => {
  const { world, boss } = poweredBoss('undertow'); Object.assign(boss, { phase: 'idle', attack: 2 });
  stepWorld(world, {}, STEP); const start = world.player.x;
  assert.equal(boss.powerPulse.phase, 'warning'); assert.equal(boss.powerPulse.vx, 80);
  tick(world, 60); assert.equal(world.player.x, start);
  tick(world, 45); assert.equal(boss.powerPulse.phase, 'active'); assert.ok(world.player.x > start + 10);
  tick(world, 150); assert.equal(boss.powerPulse, null);
});

test('mirror announces an extra portal exit before a bounded shade can arrive and attack', () => {
  const { world, boss } = poweredBoss('mirror'); Object.assign(boss, { phase: 'idle', attack: 2 });
  stepWorld(world, {}, STEP); assert.ok(boss.mirrorExit.time >= 0.8); assert.equal(world.enemySummons.length, 0);
  tick(world, 100); assert.equal(world.enemySummons.length, 0);
  tick(world, 12); assert.equal(world.enemySummons.length, 1); assert.equal(world.enemySummons[0].phase, 'arrive');
  tick(world, 90); assert.equal(world.enemySummons[0].phase, 'attack');
  assert.ok(world.enemySummons[0].x >= boss.arenaStart && world.enemySummons[0].x <= boss.arenaEnd);
});
