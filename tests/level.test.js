import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL, createEnemies } from '../src/level.js';
import { PHYSICS, overlaps } from '../src/physics.js';
import { GUNS, SWORDS, ARMORS, SPELLS, RELICS } from '../src/catalog.js';

const pickupTypes = ['health', 'fuel', 'rapid', 'shield', 'boost', 'mana', 'weapon', 'sword', 'armor', 'spell', 'treasure', 'cannon', 'nova'];
const catalogs = { weapon: GUNS, sword: SWORDS, armor: ARMORS, spell: SPELLS, treasure: RELICS };
function checkReward(reward) {
  assert.ok(pickupTypes.includes(reward.type), `unknown reward ${reward.type}`);
  if (catalogs[reward.type]) assert.ok(catalogs[reward.type].some(item => item.id === reward.itemId), `unknown item ${reward.itemId}`);
  if ('value' in reward) assert.ok(reward.value > 0 && Number.isFinite(reward.value));
}

test('six authored biomes and every object have unique IDs and finite world bounds', () => {
  assert.equal(LEVEL.width, 84400); assert.equal(LEVEL.height, 720);
  assert.deepEqual(LEVEL.zones.map(zone => zone.biome), ['snow', 'ruins', 'furnace', 'storm', 'eclipse', 'reactor']);
  const ids = new Set();
  for (const object of [...LEVEL.solids, ...LEVEL.hazards, ...LEVEL.pickups, ...LEVEL.props, ...LEVEL.gates, ...LEVEL.bosses, ...LEVEL.npcs, ...createEnemies()]) {
    assert.ok(object.id && !ids.has(object.id), `duplicate ID: ${object.id}`); ids.add(object.id);
    assert.ok(Number.isFinite(object.x) && Number.isFinite(object.y));
    assert.ok(object.x >= 0 && object.y >= 0);
    assert.ok(object.x + (object.w ?? 0) <= LEVEL.width, `${object.id}: horizontal bounds`);
    assert.ok(object.y + (object.h ?? 0) <= LEVEL.height, `${object.id}: vertical bounds`);
    if ('w' in object) assert.ok(object.w > 0 && object.h > 0);
    if ('period' in object) {
      assert.ok(object.onTime > 0 && object.onTime < object.period);
      assert.ok(object.phase >= 0 && object.phase < object.period);
      assert.ok(object.period - object.onTime > 1, `${object.id}: readable crossing window`);
    }
  }
  for (const s of LEVEL.solids) assert.ok(['snow', 'steel'].includes(s.material));
  for (const h of LEVEL.hazards) assert.ok(['laser', 'fire', 'steam', 'spikes', 'emp'].includes(h.type));
  for (const item of LEVEL.pickups) checkReward(item);
  for (let i = 1; i < LEVEL.zones.length; i++) assert.ok(LEVEL.zones[i].x > LEVEL.zones[i - 1].x);
});

test('spawn and relays provide safe standing and recovery clearance', () => {
  for (const point of [LEVEL.spawn, ...LEVEL.checkpoints]) {
    const p = { ...point, w: 24, h: 46 };
    assert.ok(LEVEL.solids.some(s => p.x >= s.x && p.x + p.w <= s.x + s.w && Math.abs(p.y + p.h - s.y) <= 4), `relay ${point.label}: support`);
    for (const s of LEVEL.solids) assert.ok(!overlaps(p, s), 'recovery starts outside walls');
    const room = { x: p.x - 28, y: p.y, w: p.w + 56, h: p.h };
    for (const hazard of [...LEVEL.hazards, ...LEVEL.gates, ...LEVEL.props.filter(prop => prop.collidable)]) assert.ok(!overlaps(room, hazard), 'relay has clearance');
    for (const enemy of createEnemies()) assert.ok(!overlaps(room, enemy), 'relay has enemy clearance');
  }
});

test('the ordered route has real landing surfaces, jump margins, and diverse elevation', () => {
  const apex = PHYSICS.jumpSpeed ** 2 / (2 * PHYSICS.gravity);
  let climbs = 0, pits = 0;
  for (let i = 0; i < LEVEL.route.length; i++) {
    const marker = LEVEL.route[i], s = LEVEL.solids.find(solid => solid.id === marker.id);
    assert.ok(s, `unknown route surface ${marker.id}`); assert.equal(marker.y, s.y);
    assert.ok(marker.x - 12 >= s.x && marker.x + 12 <= s.x + s.w);
    if (!i) continue;
    const before = LEVEL.route[i - 1], a = LEVEL.solids.find(solid => solid.id === before.id);
    assert.ok(marker.x >= before.x, 'main route never doubles back across a locked encounter');
    if (s.id === a.id) continue;
    const gap = Math.max(0, s.x - a.x - a.w), rise = a.y - s.y;
    assert.ok(gap <= 280, `${a.id}→${s.id}: gap ${gap}`);
    assert.ok(rise <= 105, `${a.id}→${s.id}: rise ${rise}`);
    if (gap > 0) pits++;
    if (rise > 0) { climbs++; assert.ok(rise <= apex - 10); }
    const secondFlight = (PHYSICS.airJumpSpeed + Math.sqrt(PHYSICS.airJumpSpeed ** 2 + 2 * PHYSICS.gravity * (apex - rise))) / PHYSICS.gravity;
    const range = PHYSICS.runSpeed * (PHYSICS.jumpSpeed / PHYSICS.gravity + secondFlight);
    assert.ok(gap + 24 < range, `${marker.id}: held double-jump range`);
  }
  assert.ok(climbs >= 35 && pits >= 40, 'campaign includes substantial vertical traversal');
  assert.ok(LEVEL.guides.every(guide => guide.text.length <= 64));
  assert.ok((LEVEL.exit.x - LEVEL.spawn.x) / PHYSICS.runSpeed > 200);
});

test('three bosses have grounded contiguous arenas and properly linked gates', () => {
  assert.deepEqual(LEVEL.bosses.map(b => b.type), ['warden', 'hex', 'regent']);
  assert.equal(LEVEL.boss, LEVEL.bosses.at(-1));
  for (const gate of LEVEL.gates) { assert.equal(gate.y, 0); assert.equal(gate.y + gate.h, 610); }
  for (const b of LEVEL.bosses) {
    const floor = LEVEL.solids.find(s => s.kind === 'ground' && s.x <= b.arenaStart && s.x + s.w >= b.arenaEnd);
    assert.ok(floor); assert.equal(b.y + b.h, floor.y);
    assert.ok(b.triggerX > b.arenaStart && b.triggerX < b.x);
    const gate = LEVEL.gates.find(g => g.bossId === b.id);
    assert.ok(gate && gate.x >= b.arenaEnd && gate.x > b.x + b.w);
  }
  for (const gate of LEVEL.gates.filter(g => g.leverId)) {
    const lever = LEVEL.props.find(p => p.id === gate.leverId);
    assert.ok(lever && lever.type === 'lever' && lever.gateId === gate.id);
    assert.ok(lever.x < gate.x && gate.x - lever.x <= 280);
  }
});

test('friendly dialogue and destructibles have reachable, validated, distinct rewards', () => {
  assert.equal(LEVEL.npcs.length, 3);
  for (const npc of LEVEL.npcs) {
    assert.ok(npc.lines.length >= 3 && npc.lines.every(line => line.speaker && line.text));
    assert.equal(npc.choices.length, 2); assert.notEqual(npc.choices[0].id, npc.choices[1].id);
    for (const choice of npc.choices) checkReward(choice.reward);
    assert.ok(LEVEL.route.some(marker => marker.npcId === npc.id));
    assert.ok(LEVEL.solids.some(s => s.y === npc.y + 46 && npc.x >= s.x && npc.x + 24 <= s.x + s.w));
    assert.ok(createEnemies().every(enemy => Math.abs(enemy.x - npc.x) > 350), 'story occurs in recovery space');
  }
  for (const prop of LEVEL.props) {
    assert.ok(['crate', 'barrel', 'cache', 'lever'].includes(prop.type));
    if (prop.type !== 'lever') assert.ok(prop.hp > 0);
    for (const reward of prop.contents || []) checkReward(reward);
    assert.ok(LEVEL.solids.some(s => s.y === prop.y + prop.h && prop.x >= s.x && prop.x + prop.w <= s.x + s.w), `${prop.id}: placed on a surface`);
  }
});

test('enemy factories isolate state and all patrols remain on supported geometry', () => {
  const first = createEnemies(), second = createEnemies(); first[0].hp = 0; assert.equal(second[0].hp, 34);
  assert.ok(second.length >= 50);
  assert.deepEqual([...new Set(second.map(enemy => enemy.type))].sort(), ['drone', 'guard', 'mage', 'sentinel', 'shade', 'turret']);
  for (const enemy of second) {
    assert.ok(enemy.power && enemy.hp > 0); assert.ok(enemy.minX <= enemy.x && enemy.x <= enemy.maxX);
    assert.ok(enemy.minX >= 0 && enemy.maxX + enemy.w <= LEVEL.width);
    if (enemy.type === 'drone') continue;
    assert.ok(LEVEL.solids.some(s => s.y === enemy.y + enemy.h && enemy.minX >= s.x && enemy.maxX + enemy.w <= s.x + s.w), `${enemy.id}: supported patrol`);
  }
});
