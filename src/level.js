// Fixed, authored room modules use the measured jump metrics; nothing is randomized.
const solids = [], hazards = [], route = [], enemies = [];
function solid(id, x, y, w, h, biome, oneWay = false, kind = 'platform') {
  const s = { id, x, y, w, h, biome, oneWay, kind, material: biome === 'snow' ? 'snow' : 'steel' };
  solids.push(s); return s;
}
function mark(s, x, verb = 'run', extra = {}) { route.push({ id: s.id, x, y: s.y, verb, ...extra }); }
function flat(id, x, w, biome, stops = []) {
  const s = solid(id, x, 610, w, 110, biome, false, 'ground');
  for (const stop of stops) mark(s, stop.x, 'run', stop);
  mark(s, x + w - 70); return s;
}
function pit(id, x, w) { hazards.push({ id, type: 'spikes', x, y: 690, w, h: 30 }); }
function pulse(id, type, x, phase = 0) {
  const beam = type === 'laser';
  hazards.push({ id, type, x, y: beam ? 315 : 592, w: beam ? 12 : 90, h: beam ? 295 : 18,
    period: beam ? 3.4 : 4, onTime: beam ? 1.5 : 1.7, phase });
}
function bridge(id, x, biome, heights) {
  const entry = solid(`${id}-entry`, x, 610, 650, 110, biome, false, 'ground');
  mark(entry, x + 560);
  const decks = [[900, 200], [1340, 230], [1800, 230]].map(([offset, w], i) => {
    const s = solid(`${id}-deck-${i + 1}`, x + offset, heights[i], w, 28, biome);
    mark(s, s.x + w / 2, 'double-jump'); return s;
  });
  const exit = solid(`${id}-exit`, x + 2270, 610, 730, 110, biome, false, 'ground');
  mark(exit, exit.x + 80, 'double-jump'); mark(exit, x + 2930);
  const supports = [entry, ...decks, exit];
  for (let i = 1; i < supports.length; i++) {
    const a = supports[i - 1], b = supports[i]; pit(`${id}-pit-${i}`, a.x + a.w, b.x - a.x - a.w);
  }
  return { entry, decks, exit };
}
function ascent(id, x, biome) {
  const entry = solid(`${id}-entry`, x, 610, 1070, 110, biome, false, 'ground'); mark(entry, x + 340);
  const risers = [[450, 505, 250], [650, 400, 240], [850, 295, 220]].map(([offset, y, w], i) => {
    const s = solid(`${id}-riser-${i + 1}`, x + offset, y, w, 20, biome, true);
    mark(s, s.x + w / 2, 'jump'); return s;
  });
  const wall = solid(`${id}-wall`, x + 1070, 210, 140, 400, biome, false, 'wall'); mark(wall, wall.x + 70, 'wall-jump');
  solid(`${id}-low-floor`, x + 1210, 610, 300, 110, biome, false, 'ground');
  const descents = [[1220, 300, 240], [1510, 405, 280], [1950, 510, 200]].map(([offset, y, w], i) => {
    const s = solid(`${id}-descent-${i + 1}`, x + offset, y, w, 24, biome, true);
    mark(s, s.x + w / 2, 'jump'); return s;
  });
  const exit = solid(`${id}-exit`, x + 2100, 610, 300, 110, biome, false, 'ground'); mark(exit, x + 2320, 'drop');
  pit(`${id}-undercrypt`, x + 1510, 590); return { entry, risers, wall, descents, exit };
}
function vault(id, x, biome, heights) {
  const entry = solid(`${id}-entry`, x, 610, 520, 110, biome, false, 'ground'); mark(entry, x + 440);
  const decks = [[570, 280], [960, 260], [1320, 250], [1680, 260]].map(([offset, w], i) => {
    const s = solid(`${id}-arch-${i + 1}`, x + offset, heights[i], w, 30, biome);
    mark(s, s.x + w / 2, 'jump'); return s;
  });
  const exit = solid(`${id}-exit`, x + 2170, 610, 230, 110, biome, false, 'ground'); mark(exit, x + 2310, 'double-jump');
  const supports = [entry, ...decks, exit];
  for (let i = 1; i < supports.length; i++) {
    const a = supports[i - 1], b = supports[i]; pit(`${id}-chasm-${i}`, a.x + a.w, b.x - a.x - a.w);
  }
  return { entry, decks, exit };
}
function killwire(id, x, w, biome) {
  const s = flat(id, x, w, biome);
  pulse(`${id}-laser-a`, 'laser', x + 340, 0.4); pulse(`${id}-emp`, 'emp', x + Math.floor(w * 0.49), 1.2);
  pulse(`${id}-laser-b`, 'laser', x + w - 300, 1.9);
  solid(`${id}-overlook`, x + Math.floor(w * 0.55), 505, 250, 20, biome, true); return s;
}
function foe(id, type, support, offset, power) {
  const [w, h, hp] = { guard: [30, 44, 34], turret: [40, 46, 58], mage: [34, 50, 48], shade: [30, 48, 42], sentinel: [38, 54, 62] }[type];
  const x = support.x + offset;
  enemies.push({ id, type, power, x, y: support.y - h, w, h, hp, facing: -1,
    minX: type === 'turret' ? x : Math.max(support.x + 12, x - 55),
    maxX: type === 'turret' ? x : Math.min(support.x + support.w - w - 12, x + 55) });
}
function drone(id, x, y, power = 'rifle') {
  enemies.push({ id, type: 'drone', power, x, y, w: 40, h: 30, hp: 28, facing: -1, minX: x - 120, maxX: x + 120 });
}

// Snow border: teach movement, cross the rift, rest with refugees, and climb into the Warden's lock.
const snowStart = flat('snow-border', 0, 1200, 'snow'); route.unshift({ id: snowStart.id, x: 112, y: 610, verb: 'run' });
solid('snow-flank', 630, 505, 240, 20, 'snow', true); foe('border-rifle-a', 'guard', snowStart, 800, 'rifle');
const snowRift = bridge('snow-rift', 1200, 'snow', [565, 485, 555]);
drone('rift-drone', 2460, 385); foe('rift-rocket', 'turret', snowRift.decks[1], 95, 'missile'); foe('rift-rifle', 'guard', snowRift.exit, 360, 'rifle');
flat('snow-refuge', 4200, 1000, 'snow', [{ x: 4450, npcId: 'mira' }]);
const snowSpine = ascent('snow-spine', 5200, 'snow');
foe('spine-rifle', 'guard', snowSpine.entry, 230, 'rifle'); drone('spine-drone', 6000, 205); foe('spine-rocket', 'turret', snowSpine.descents[1], 160, 'missile');
const snowWire = killwire('snow-killwire', 7600, 1200, 'snow'); foe('snow-wire-rifle', 'guard', snowWire, 530, 'rifle');
flat('warden-arena', 8800, 2000, 'snow', [{ x: 9130, bossId: 'warden' }]); solid('warden-flank', 9970, 505, 220, 20, 'snow', true);

// Flooded ruins: rise over drowned arches and an aqueduct, then turn the ancient sluice.
flat('ruins-landing', 10800, 1200, 'ruins', [{ x: 11180, npcId: 'orren' }]);
const ruinsVault = vault('ruins-sunken', 12000, 'ruins', [535, 460, 400, 500]);
foe('sunken-shade', 'shade', ruinsVault.decks[1], 100, 'shadow'); foe('sunken-mage', 'mage', ruinsVault.decks[3], 95, 'cinder');
const aqueduct = bridge('ruins-aqueduct', 14400, 'ruins', [510, 545, 470]);
foe('aqueduct-sentinel', 'sentinel', aqueduct.decks[0], 90, 'lightning'); drone('aqueduct-drone', 15750, 370); foe('aqueduct-rocket', 'turret', aqueduct.exit, 390, 'missile');
const archive = flat('ruins-archive', 17400, 1200, 'ruins'); foe('archive-shade', 'shade', archive, 760, 'shadow');
const bellTower = ascent('ruins-belltower', 18600, 'ruins');
foe('belltower-mage', 'mage', bellTower.risers[1], 115, 'soul'); drone('belltower-drone', 19610, 140, 'lightning'); foe('belltower-rifle', 'guard', bellTower.exit, 130, 'rifle');
flat('ruins-sluice', 21000, 600, 'ruins', [{ x: 21250, leverId: 'sluice-lever' }]);

// Furnace crypt: fire sorcery and exposed steel, ending at the Matriarch's soul tether.
const cryptEntry = flat('crypt-entry', 21600, 1300, 'furnace'); foe('crypt-rifle', 'guard', cryptEntry, 740, 'rifle');
pulse('crypt-furnace-flame', 'fire', 22500, 0.3);
const cryptAscent = ascent('crypt-forge', 22900, 'furnace');
foe('forge-mage', 'mage', cryptAscent.risers[1], 110, 'cinder'); foe('forge-shade', 'shade', cryptAscent.wall, 65, 'shadow'); foe('forge-rocket', 'turret', cryptAscent.descents[1], 160, 'missile');
const cryptWire = killwire('crypt-killwire', 25300, 1400, 'furnace');
foe('crypt-wire-mage', 'mage', cryptWire, 790, 'cinder'); foe('crypt-wire-sentinel', 'sentinel', cryptWire, 1110, 'lightning');
pulse('crypt-vent-flame', 'fire', 26450, 2);
const cryptBridge = bridge('crypt-ossuary', 26700, 'furnace', [535, 465, 520]);
foe('ossuary-mage', 'mage', cryptBridge.decks[0], 90, 'cinder'); drone('ossuary-drone', 28190, 345, 'soul'); foe('ossuary-shade', 'shade', cryptBridge.exit, 330, 'shadow');
flat('crypt-anteroom', 29700, 300, 'furnace'); flat('hex-arena', 30000, 2400, 'furnace', [{ x: 30400, bossId: 'hex' }]);
solid('hex-flank', 31570, 505, 220, 20, 'furnace', true);

// Storm spire: exposed lightning batteries; a deserter offers a limited forbidden power.
flat('storm-landing', 32400, 1200, 'storm', [{ x: 32980, npcId: 'vesper' }]);
const stormBridge = bridge('storm-causeway', 33600, 'storm', [560, 485, 525]);
foe('causeway-rocket', 'turret', stormBridge.decks[0], 95, 'missile'); drone('causeway-drone', 35050, 360, 'lightning'); foe('causeway-sentinel', 'sentinel', stormBridge.exit, 370, 'lightning');
const stormTower = ascent('storm-spire', 36600, 'storm');
foe('spire-sentinel', 'sentinel', stormTower.risers[0], 120, 'lightning'); foe('spire-shade', 'shade', stormTower.wall, 65, 'shadow'); drone('spire-drone', 38400, 300, 'lightning');
const stormVault = vault('storm-batteries', 39000, 'storm', [530, 450, 420, 505]);
foe('battery-sentinel-a', 'sentinel', stormVault.decks[0], 130, 'lightning'); foe('battery-mage', 'mage', stormVault.decks[2], 110, 'soul'); foe('battery-rocket', 'turret', stormVault.decks[3], 120, 'missile');
const stormWire = killwire('storm-killwire', 41400, 1800, 'storm'); foe('storm-wire-sentinel', 'sentinel', stormWire, 740, 'lightning'); drone('storm-wire-drone', 42710, 430, 'lightning');

// Eclipse citadel: close shadow encounters, mixed attacks, and a deliberately operated final seal.
flat('eclipse-court', 43200, 1000, 'eclipse'); const eclipseVault = vault('eclipse-galleries', 44200, 'eclipse', [545, 460, 405, 500]);
foe('gallery-shade-a', 'shade', eclipseVault.decks[0], 140, 'shadow'); foe('gallery-mage', 'mage', eclipseVault.decks[2], 110, 'soul'); foe('gallery-shade-b', 'shade', eclipseVault.exit, 125, 'shadow');
const eclipseWire = killwire('eclipse-killwire', 46600, 1500, 'eclipse'); foe('eclipse-wire-rocket', 'turret', eclipseWire, 730, 'missile'); foe('eclipse-wire-shade', 'shade', eclipseWire, 1110, 'shadow');
const eclipseAscent = ascent('eclipse-rampart', 48100, 'eclipse');
foe('rampart-sentinel', 'sentinel', eclipseAscent.risers[1], 120, 'lightning'); foe('rampart-mage', 'mage', eclipseAscent.wall, 65, 'soul'); foe('rampart-rocket', 'turret', eclipseAscent.descents[1], 180, 'missile');
const eclipseBridge = bridge('eclipse-procession', 50500, 'eclipse', [515, 455, 525]);
foe('procession-shade', 'shade', eclipseBridge.decks[0], 90, 'shadow'); drone('procession-drone', 51970, 330, 'soul'); foe('procession-sentinel', 'sentinel', eclipseBridge.exit, 360, 'lightning');
flat('eclipse-seal', 53500, 500, 'eclipse', [{ x: 53590, leverId: 'eclipse-lever' }]);

// Soul reactor: every learnt mechanic returns, followed by the open final arena.
const reactorEntry = flat('reactor-airlock', 54000, 1200, 'reactor'); foe('airlock-mage', 'mage', reactorEntry, 840, 'cinder');
const reactorWire = killwire('reactor-killwire', 55200, 1600, 'reactor'); foe('reactor-wire-sentinel', 'sentinel', reactorWire, 730, 'lightning'); foe('reactor-wire-shade', 'shade', reactorWire, 1210, 'shadow');
pulse('reactor-pressure-flame', 'fire', 56100, 0.9);
const reactorAscent = ascent('reactor-corelift', 56800, 'reactor');
foe('corelift-mage', 'mage', reactorAscent.risers[0], 125, 'cinder'); foe('corelift-sentinel', 'sentinel', reactorAscent.wall, 65, 'lightning'); foe('corelift-rocket', 'turret', reactorAscent.descents[1], 170, 'missile');
const reactorVault = vault('reactor-soulwell', 59200, 'reactor', [535, 455, 400, 500]);
foe('soulwell-shade', 'shade', reactorVault.decks[0], 130, 'shadow'); foe('soulwell-mage', 'mage', reactorVault.decks[2], 110, 'soul'); drone('soulwell-drone', 61120, 395, 'lightning');
flat('reactor-last-relay', 61600, 400, 'reactor'); flat('regent-arena', 62000, 3000, 'reactor', [{ x: 62520, bossId: 'regent' }]);
solid('regent-flank', 63820, 505, 250, 20, 'reactor', true);

const bosses = [
  { id: 'warden', name: 'THE WARDEN', type: 'warden', x: 9600, y: 490, w: 96, h: 120, hp: 1200, triggerX: 9050, arenaStart: 8800, arenaEnd: 10600 },
  { id: 'hex', name: 'HEX MATRIARCH', type: 'hex', x: 31000, y: 490, w: 96, h: 120, hp: 1600, triggerX: 30300, arenaStart: 30000, arenaEnd: 32200 },
  { id: 'regent', name: 'NULL REGENT', type: 'regent', x: 63000, y: 478, w: 112, h: 132, hp: 2600, triggerX: 62400, arenaStart: 62000, arenaEnd: 64700 },
];
const props = [
  { id: 'border-crate', type: 'crate', x: 520, y: 550, w: 54, h: 60, hp: 18, collidable: true, contents: [{ type: 'health', value: 18 }] },
  { id: 'refuge-barrel', type: 'barrel', x: 4920, y: 562, w: 38, h: 48, hp: 14 },
  { id: 'ruins-barrel', type: 'barrel', x: 17770, y: 562, w: 38, h: 48, hp: 14 },
  { id: 'crypt-barrel-a', type: 'barrel', x: 22240, y: 562, w: 38, h: 48, hp: 14 },
  { id: 'crypt-barrel-b', type: 'barrel', x: 22310, y: 562, w: 38, h: 48, hp: 14 },
  { id: 'storm-crate', type: 'crate', x: 33270, y: 550, w: 54, h: 60, hp: 18, collidable: true, contents: [{ type: 'fuel' }, { type: 'mana', value: 30 }] },
  { id: 'eclipse-barrel', type: 'barrel', x: 43820, y: 562, w: 38, h: 48, hp: 14 },
  { id: 'reactor-crate', type: 'crate', x: 54720, y: 550, w: 54, h: 60, hp: 18, collidable: true, contents: [{ type: 'shield', value: 35 }] },
  { id: 'snow-soul-cache', type: 'cache', x: 680, y: 465, w: 42, h: 40, hp: 24, contents: [{ type: 'treasure', itemId: 'ember-heart' }, { type: 'mana', value: 35 }] },
  { id: 'ruins-soul-cache', type: 'cache', x: 13410, y: 360, w: 42, h: 40, hp: 24, contents: [{ type: 'treasure', itemId: 'tide-glass' }, { type: 'spell', itemId: 'veil' }] },
  { id: 'crypt-soul-cache', type: 'cache', x: 24025, y: 170, w: 42, h: 40, hp: 24, contents: [{ type: 'armor', itemId: 'wraith' }, { type: 'mana', value: 45 }] },
  { id: 'storm-soul-cache', type: 'cache', x: 37725, y: 170, w: 42, h: 40, hp: 24, contents: [{ type: 'treasure', itemId: 'storm-seal' }, { type: 'cannon', value: 1 }] },
  { id: 'eclipse-soul-cache', type: 'cache', x: 49225, y: 170, w: 42, h: 40, hp: 24, contents: [{ type: 'treasure', itemId: 'eclipse-fragment' }, { type: 'nova', value: 1 }] },
  { id: 'reactor-soul-cache', type: 'cache', x: 62190, y: 570, w: 42, h: 40, hp: 24, contents: [{ type: 'cannon', value: 2 }, { type: 'nova', value: 1 }, { type: 'mana', value: 70 }] },
  { id: 'sluice-lever', type: 'lever', gateId: 'sluice-gate', x: 21250, y: 564, w: 28, h: 46 },
  { id: 'eclipse-lever', type: 'lever', gateId: 'eclipse-gate', x: 53590, y: 564, w: 28, h: 46 },
];
const pickups = [
  { id: 'snow-mana', type: 'mana', x: 1070, y: 578, value: 35 }, { id: 'snow-fuel', type: 'fuel', x: 3970, y: 578 },
  { id: 'snow-shield', type: 'shield', x: 8700, y: 578, value: 40 }, { id: 'snow-health', type: 'health', x: 8870, y: 578, value: 40 },
  { id: 'ruins-scatter', type: 'weapon', itemId: 'scatter', x: 11800, y: 578 }, { id: 'ruins-boost', type: 'boost', x: 17800, y: 578, value: 14 },
  { id: 'ruins-health', type: 'health', x: 18450, y: 578, value: 40 }, { id: 'ruins-mana', type: 'mana', x: 21410, y: 578, value: 40 },
  { id: 'crypt-cinder', type: 'spell', itemId: 'cinder', x: 21970, y: 578 }, { id: 'crypt-rapid', type: 'rapid', x: 26310, y: 578 },
  { id: 'crypt-health', type: 'health', x: 29900, y: 578, value: 45 }, { id: 'crypt-shield', type: 'shield', x: 30250, y: 578, value: 45 },
  { id: 'storm-rail', type: 'weapon', itemId: 'rail', x: 33390, y: 578 }, { id: 'storm-thunder', type: 'spell', itemId: 'thunder', x: 36390, y: 578 },
  { id: 'storm-health', type: 'health', x: 41820, y: 578, value: 45 }, { id: 'storm-fuel', type: 'fuel', x: 43010, y: 578 },
  { id: 'eclipse-saber', type: 'sword', itemId: 'saber', x: 43530, y: 578 }, { id: 'eclipse-mana', type: 'mana', x: 47840, y: 578, value: 45 },
  { id: 'eclipse-health', type: 'health', x: 53310, y: 578, value: 45 }, { id: 'eclipse-key', type: 'treasure', itemId: 'regent-key', x: 53870, y: 578 },
  { id: 'reactor-boost', type: 'boost', x: 55040, y: 578, value: 16 }, { id: 'reactor-shield', type: 'shield', x: 56540, y: 578, value: 50 },
  { id: 'reactor-mana', type: 'mana', x: 61770, y: 578, value: 65 }, { id: 'reactor-health', type: 'health', x: 62110, y: 578, value: 50 },
  { id: 'soul-core', type: 'treasure', itemId: 'soul-core', x: 64820, y: 578 },
];
export const LEVEL = {
  width: 65000, height: 720, spawn: { x: 100, y: 560 }, solids, hazards, route, props, pickups, bosses,
  boss: bosses.at(-1), exit: { x: 64840, y: 540, w: 50, h: 70 },
  gates: [
    { id: 'warden-gate', bossId: 'warden', x: 10680, y: 0, w: 32, h: 610 },
    { id: 'sluice-gate', leverId: 'sluice-lever', x: 21480, y: 0, w: 32, h: 610 },
    { id: 'hex-gate', bossId: 'hex', x: 32260, y: 0, w: 32, h: 610 },
    { id: 'eclipse-gate', leverId: 'eclipse-lever', x: 53820, y: 0, w: 32, h: 610 },
    { id: 'regent-gate', bossId: 'regent', x: 64720, y: 0, w: 32, h: 610 },
  ],
  checkpoints: [
    { x: 100, y: 560, label: 'ICEBREAK' }, { x: 4250, y: 564, label: 'REFUGEE RELAY' },
    { x: 8870, y: 564, label: 'WARDEN LOCK' }, { x: 10870, y: 564, label: 'TIDE ARCHIVE' },
    { x: 17480, y: 564, label: 'DROWNED GARDEN' }, { x: 21670, y: 564, label: 'CRYPT GATE' },
    { x: 26770, y: 564, label: 'OSSUARY RELAY' }, { x: 30070, y: 564, label: 'MATRIARCH LOCK' },
    { x: 32470, y: 564, label: 'STORM LANDING' }, { x: 36670, y: 564, label: 'SPIRE FOOT' },
    { x: 43270, y: 564, label: 'ECLIPSE COURT' }, { x: 48170, y: 564, label: 'RAMPART RELAY' },
    { x: 54070, y: 564, label: 'REACTOR AIRLOCK' }, { x: 59270, y: 564, label: 'SOULWELL' },
    { x: 62070, y: 564, label: 'THE LAST RELAY' },
  ],
  zones: [
    { x: 0, label: 'SNOW BORDER', subtitle: 'Carry the last unbound soul beyond the Warden.', biome: 'snow', tint: 0x87c7d9, sky: 0x07151f },
    { x: 10800, label: 'FLOODED RUINS', subtitle: 'Find the drowned archive. Open the ancient sluice.', biome: 'ruins', tint: 0x68c6ba, sky: 0x081c20 },
    { x: 21600, label: 'FURNACE CRYPT', subtitle: 'The dead fuel this war. Sever the Matriarch’s tether.', biome: 'furnace', tint: 0xef8051, sky: 0x250f18 },
    { x: 32400, label: 'STORM SPIRE', subtitle: 'Climb through the storm. Claim forbidden firepower.', biome: 'storm', tint: 0x8ab5ff, sky: 0x10192f },
    { x: 43200, label: 'ECLIPSE CITADEL', subtitle: 'The Regent’s shadows guard the final seal.', biome: 'eclipse', tint: 0xc295e8, sky: 0x180c26 },
    { x: 54000, label: 'SOUL REACTOR', subtitle: 'End the Regent. Release the souls before the core collapses.', biome: 'reactor', tint: 0xeb637b, sky: 0x230b17 },
  ],
  guides: [
    { x: 250, y: 465, text: 'HOLD JUMP FOR HEIGHT • SECOND JUMP IN AIR', action: 'jump' },
    { x: 810, y: 405, text: 'BLADE CLOSE • RIFLE FAR • BREAK THE CACHE', action: 'combat' },
    { x: 1550, y: 460, text: 'KEEP MOMENTUM • JET CORRECTS A MISSED LANDING', action: 'jet' },
    { x: 4350, y: 465, text: 'INTERACT WITH ALLIES • CHOOSE YOUR REWARD', action: 'interact' },
    { x: 5920, y: 185, text: 'PUSH INTO STEEL • JUMP OFF THE WALL', action: 'wall-jump' },
    { x: 7810, y: 280, text: 'AMBER WARNS • CROSS WHEN THE BEAM GOES DARK', action: 'laser' },
    { x: 12300, y: 425, text: 'SHADOWS LUNGE • OVERHEAD SLASH CUTS ABOVE', action: 'slash' },
    { x: 17950, y: 465, text: 'CINDER BURNS • SOUL DRAIN RETURNS LIFE', action: 'spell' },
    { x: 21110, y: 465, text: 'INTERACT WITH THE SLUICE LEVER', action: 'interact' },
    { x: 25200, y: 465, text: 'EMP STRIPS THE JET • JUMP THE FLOOR GLYPH', action: 'emp' },
    { x: 32750, y: 465, text: 'CANNON AND ECLIPSE HAVE FINITE CHARGES', action: 'power' },
    { x: 43480, y: 465, text: 'VEIL BREAKS TARGET LOCK • STASIS SLOWS PURSUIT', action: 'spell' },
    { x: 61740, y: 465, text: 'BREAK THE LAST CACHE • READ THE REGENT’S WINDUP', action: 'boss' },
  ],
  npcs: [
    { id: 'mira', name: 'MIRA // BORDER SCOUT', x: 4450, y: 564, portrait: 'portrait-mira', lines: [
      { speaker: 'MIRA', text: 'That light in your chest is a living soul. The Warden burns prisoners to power his soldiers.' },
      { speaker: 'COURIER', text: 'Then I am taking this one beyond his reach.' },
      { speaker: 'MIRA', text: 'Past him lie the drowned archive and the soul reactor. Take steel or shelter. You will need both.' },
    ], choices: [
      { id: 'mira-blade', label: 'Storm Katana — faster overhead cuts', reward: { type: 'sword', itemId: 'katana' } },
      { id: 'mira-armor', label: 'Bulwark Armor — heavier defense', reward: { type: 'armor', itemId: 'bulwark' } },
    ] },
    { id: 'orren', name: 'ORREN // DROWNED ARCHIVIST', x: 11180, y: 564, portrait: 'portrait-orren', lines: [
      { speaker: 'ORREN', text: 'The Matriarch binds the drowned to the foundry. The Regent binds her. Three chains, one machine.' },
      { speaker: 'COURIER', text: 'Tell me where the chains end.' },
      { speaker: 'ORREN', text: 'Beyond the crypt and storm spire. Turn the sluice lever first. My last pages can restore life or steal time.' },
    ], choices: [
      { id: 'orren-siphon', label: 'Soul Drain — wound foes and recover life', reward: { type: 'spell', itemId: 'siphon' } },
      { id: 'orren-stasis', label: 'Stasis — slow nearby enemies', reward: { type: 'spell', itemId: 'stasis' } },
    ] },
    { id: 'vesper', name: 'VESPER // REGENT DESERTER', x: 32980, y: 564, portrait: 'portrait-vesper', lines: [
      { speaker: 'VESPER', text: 'The missiles are his attention. They will follow you to the reactor. Watch the warning lane.' },
      { speaker: 'COURIER', text: 'Why help me?' },
      { speaker: 'VESPER', text: 'My daughter is one of the souls in his core. Take the cannon or eclipse sigil. Make the last shot count.' },
    ], choices: [
      { id: 'vesper-cannon', label: 'Oblivion Cannon — two piercing charges', reward: { type: 'cannon', value: 2 } },
      { id: 'vesper-eclipse', label: 'Eclipse Nova — one devastating cast', reward: { type: 'nova', value: 1 } },
    ] },
  ],
};
export function createEnemies() { return enemies.map(enemy => ({ ...enemy })); }
