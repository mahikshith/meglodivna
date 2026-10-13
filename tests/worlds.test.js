import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL, LEVELS, WORLD_LIST, getLevel, createEnemies } from '../src/level.js';
import { CATALOG } from '../src/catalog.js';
import { createWorld } from '../src/combat.js';

test('five selectable worlds have independent authored layouts and stable metadata', () => {
  assert.deepEqual(Object.keys(LEVELS), ['soulforge','tide','pyre','neon','veil']);
  assert.equal(LEVEL, LEVELS.soulforge); assert.equal(getLevel('invalid'), LEVEL);
  assert.deepEqual(WORLD_LIST.map(world => world.id), Object.keys(LEVELS));
  assert.ok(new Set(Object.values(LEVELS).map(world => world.solids)).size === 5);
  assert.ok(new Set(Object.values(LEVELS).map(world => world.route)).size === 5);
  assert.deepEqual(WORLD_LIST.map(world => world.theme.scene), ['forest','islands','castle','sky','crystal']);
  assert.deepEqual(WORLD_LIST.map(world => world.theme.foreground), ['grass','ruins','stone','metal','crystal']);
  for (const world of Object.values(LEVELS)) {
    assert.ok(world.zones.every(zone => zone.theme && ['forest','islands','castle','sky','crystal'].includes(zone.theme.scene)));
    assert.equal(WORLD_LIST.find(item => item.id === world.id).theme, world.theme);
  }
});
for (const world of Object.values(LEVELS)) test(`${world.id}: world boundaries, relays, bosses, routes, rewards and interactive references are valid`, () => {
  assert.ok(world.width >= 75000 && world.width <= 90000); assert.equal(world.height, 720);
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
    assert.ok(world.solids.some(s => s.y === 610 && s.x <= b.arenaStart && s.x + s.w >= b.arenaEnd));
    assert.ok(world.gates.some(g => g.bossId === b.id && g.y === 0 && g.h === 610));
  }
  for (const [i, marker] of world.route.entries()) {
    const s = world.solids.find(s => s.id === marker.id); assert.ok(s); assert.equal(marker.y, s.y);
    assert.ok(marker.x - 12 >= s.x && marker.x + 12 <= s.x + s.w);
    if (i) assert.ok(marker.x >= world.route[i - 1].x);
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
