import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL, LEVELS, WORLD_LIST, getLevel, createEnemies } from '../src/level.js';
import { CATALOG } from '../src/catalog.js';
import { createWorld, interact, stepWorld, STEP } from '../src/combat.js';

test('five selectable worlds have independent authored layouts and stable metadata', () => {
  assert.deepEqual(Object.keys(LEVELS), ['soulforge','tide','pyre','neon','veil']);
  assert.equal(LEVEL, LEVELS.soulforge); assert.equal(getLevel('invalid'), LEVEL);
  assert.deepEqual(WORLD_LIST.map(world => world.id), Object.keys(LEVELS));
  assert.ok(new Set(Object.values(LEVELS).map(world => world.solids)).size === 5);
  assert.ok(new Set(Object.values(LEVELS).map(world => world.route)).size === 5);
  assert.deepEqual(WORLD_LIST.map(world => world.theme.scene), ['forest','islands','castle','sky','crystal']);
  assert.deepEqual(WORLD_LIST.map(world => world.theme.foreground), ['grass','ruins','metal','metal','crystal']);
  for (const world of Object.values(LEVELS)) {
    assert.ok(world.zones.every(zone => zone.theme && ['forest','islands','castle','sky','crystal'].includes(zone.theme.scene)));
    assert.equal(WORLD_LIST.find(item => item.id === world.id).theme, world.theme);
  }
});
for (const world of Object.values(LEVELS)) test(`${world.id}: world boundaries, relays, bosses, routes, rewards and interactive references are valid`, () => {
  assert.ok(world.width >= 10000 && world.width < 25000); assert.equal(world.height, 1440);
  const ids = new Set();
  for (const object of [...world.solids, ...world.hazards, ...world.props, ...world.pickups, ...world.gates, ...world.bosses, ...world.npcs, ...world.movingPlatforms, ...world.enemyPortals, ...world.portals, ...world.enemies]) {
    assert.ok(object.id && !ids.has(object.id), `${world.id}: repeated ${object.id}`); ids.add(object.id);
    assert.ok(Number.isFinite(object.x) && Number.isFinite(object.y));
    assert.ok(object.x >= 0 && object.x + (object.w || 0) <= world.width);
    assert.ok(object.y >= 0 && object.y + (object.h || 0) <= world.height);
  }
  for (const [index, cp] of world.checkpoints.entries()) {
    const player = createWorld(index, { worldId: world.id }).player;
    assert.ok(world.solids.some(s => player.x >= s.x && player.x + player.w <= s.x + s.w && Math.abs(player.y + player.h - s.y) <= 4), `${cp.label}: unsupported relay`);
    assert.equal(player.w, 28); assert.equal(player.h, 60);
  }
  assert.equal(world.bosses.length, 3); assert.equal(world.boss, world.bosses.at(-1));
  for (const b of world.bosses) {
    assert.ok(b.triggerX < b.x && b.arenaStart < b.triggerX && b.x < b.arenaEnd);
    assert.ok(world.solids.some(s => s.y === b.floorY && s.x <= b.arenaStart && s.x + s.w >= b.arenaEnd));
    assert.ok(world.gates.some(g => g.bossId === b.id && g.y === 0 && g.h === b.floorY));
  }
  for (const [i, marker] of world.route.entries()) {
    const s = world.solids.find(s => s.id === marker.id); assert.ok(s); assert.equal(marker.y, s.y);
    assert.ok(marker.x - 12 >= s.x && marker.x + 12 <= s.x + s.w);
    if (i) assert.ok(marker.x >= world.route[i - 1].x - 100, 'route has no accidental long reversal');
    if (marker.npcId) assert.ok(world.npcs.some(n => n.id === marker.npcId));
    if (marker.leverId) assert.ok(world.props.some(p => p.id === marker.leverId && p.type === 'lever'));
  }
  const rewards = [...world.pickups, ...world.props.flatMap(p => p.contents || []), ...world.npcs.flatMap(n => n.choices.map(c => c.reward))];
  for (const reward of rewards) {
    const category = { weapon: 'gun', sword: 'sword', armor: 'armor', spell: 'spell', treasure: 'relic' }[reward.type];
    if (category) assert.ok(CATALOG[category].some(item => item.id === reward.itemId), `unknown item ${reward.itemId}`);
  }
  for (const n of world.npcs) assert.ok(world.route.some(marker => marker.npcId === n.id));
  for (const crumble of world.crumble) assert.ok(world.solids.some(s => s.id === crumble.solidId));
  for (const platform of world.movingPlatforms) assert.ok(platform.period > 0 && platform.distance > 0);
  const a = createEnemies(world), b = createEnemies(world); a[0].hp = 0; assert.ok(b[0].hp > 0);
});

test('unique world mechanics are present in actionable data rather than menu descriptions', () => {
  assert.ok(LEVELS.tide.currents.length > 0 && LEVELS.tide.movingPlatforms.some(p => p.kind === 'raft'));
  assert.ok(LEVELS.pyre.crumble.length > 0 && LEVELS.pyre.hazards.some(h => h.type === 'steam'));
  const marshal = LEVELS.pyre.bosses[0]; assert.ok(LEVELS.pyre.gates.some(g => g.id === marshal.shieldGateId && g.leverId));
  assert.ok(LEVELS.neon.movingPlatforms.some(p => p.kind === 'lift'));
  assert.ok(LEVELS.neon.solids.some(s => s.id.includes('machinery-ceiling')));
  assert.ok(LEVELS.veil.portals.length > 0);
  const witch = LEVELS.veil.npcs.find(n => n.id === 'veil-ysra'), pact = witch.choices.find(c => c.id === 'veil-pact');
  assert.equal(pact.cost.hp, 25);
  assert.ok(LEVELS.veil.enemyPortals.some(p => p.id === pact.effect.enemyPortalId && p.requiresClaim === 'choice:veil-pact'));
});

test('the lantern refuge gives a summon before the first exposed crossing', () => {
  const world = LEVELS.soulforge;
  const wolf = world.pickups.find(pickup => pickup.type === 'spell' && pickup.itemId === 'wolf');
  assert.ok(wolf && wolf.x < world.rooms[1].x);
  assert.ok(world.npcs.some(npc => npc.x < wolf.x));
  const orren = world.npcs.find(npc => npc.id === 'soulforge-orren');
  assert.ok(orren && orren.x < world.bosses[0].x);
  assert.deepEqual(orren.choices.map(choice => choice.reward.type), ['spell', 'shield']);
});

test('Mira can finish the opening conversation before distant foes attack', () => {
  const world = createWorld(0, { worldId: 'soulforge', difficulty: 'forge' });
  world.player.x = world.npcs[0].x;
  for (let frame = 0; frame < 5 / STEP; frame++) stepWorld(world, {}, STEP);
  assert.equal(world.player.hp, world.player.maxHp);
  assert.equal(world.projectiles.filter(projectile => projectile.active && projectile.owner === 'enemy').length, 0);
});

test('Mira acknowledges Orren when the courier returns', () => {
  const world = createWorld(0, { worldId: 'soulforge' });
  world.progress.claimed.push('npc:soulforge-orren');
  world.player.x = world.npcs[0].x;
  assert.equal(interact(world), true);
  assert.match(world.story.lines[0].text, /Orren is alive/);
});
