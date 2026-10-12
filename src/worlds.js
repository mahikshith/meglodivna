// Authored world layouts share collision metrics, not generated room order.
export function createLayout() {
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

return { solids, hazards, route, enemies, solid, mark, flat, pit, pulse, bridge, ascent, vault, killwire, foe, drone };
}


function tunnel(layout, id, x, biome) {
  const entry = layout.solid(`${id}-entry`, x, 610, 600, 110, biome, false, 'ground'); layout.mark(entry, x + 450);
  layout.solid(`${id}-ceiling`, x + 270, 210, 2500, 32, biome, false, 'ceiling');
  const decks = [[760, 570, 340], [1300, 610, 480], [1980, 560, 300]].map(([dx, y, w], index) => {
    const s = layout.solid(`${id}-tunnel-${index}`, x + dx, y, w, 720 - y, biome, false, 'ground'); layout.mark(s, s.x + w / 2, 'double-jump'); return s;
  });
  const exit = layout.solid(`${id}-exit`, x + 2500, 610, 500, 110, biome, false, 'ground'); layout.mark(exit, x + 2900, 'double-jump');
  const supports = [entry, ...decks, exit];
  for (let i = 1; i < supports.length; i++) { const a = supports[i - 1], b = supports[i]; layout.pit(`${id}-sink-${i}`, a.x + a.w, b.x - a.x - a.w); }
  return { entry, decks, exit };
}
function terrace(layout, id, x, biome, heights) {
  const decks = [0, 800, 1600, 2400, 3200].map((dx, index) => {
    const s = layout.solid(`${id}-terrace-${index}`, x + dx, heights[index], index === 4 ? 1000 : 800, 720 - heights[index], biome, false, 'ground');
    layout.mark(s, s.x + (index === 4 ? 900 : 600), index ? 'jump' : 'run'); return s;
  });
  return { entry: decks[0], decks, exit: decks.at(-1) };
}
function mechanism(layout, id, x, biome) {
  const entry = layout.solid(`${id}-entry`, x, 610, 700, 110, biome, false, 'ground'); layout.mark(entry, x + 590);
  const decks = [[900, 540, 260], [1380, 610, 1020], [2620, 525, 280]].map(([dx, y, w], index) => {
    const s = layout.solid(`${id}-machine-${index}`, x + dx, y, w, index === 1 ? 110 : 26, biome, index !== 1); layout.mark(s, s.x + w / 2, 'double-jump'); return s;
  });
  const exit = layout.solid(`${id}-exit`, x + 3120, 610, 480, 110, biome, false, 'ground'); layout.mark(exit, x + 3510, 'double-jump');
  const supports = [entry, ...decks, exit];
  for (let i = 1; i < supports.length; i++) { const a = supports[i - 1], b = supports[i]; layout.pit(`${id}-pit-${i}`, a.x + a.w, b.x - a.x - a.w); }
  return { entry, decks, exit };
}
const ROOM_LENGTH = { approach: 1600, bridge: 3000, tunnel: 3000, terrace: 4200, machine: 3600, vault: 2400, refuge: 1200, tower: 2400, wire: 1800 };
const DEFINITIONS = {
  tide: { name: 'TIDE // THE DROWNED FLEET', description: 'Shipwrecks, flooded tunnels, shifting rafts and the fleet that sold its souls.', biome: 'ruins', tint: 0x64c9c5, sky: 0x071923,
    chapters: [
      ['approach','tunnel','terrace','bridge','machine','vault','refuge','tower','bridge'],
      ['tunnel','machine','vault','terrace','wire','bridge','approach','tunnel','refuge'],
      ['tower','tunnel','terrace','bridge','machine','vault','wire','tunnel','approach'],
    ], bosses: ['CUTLASS ADMIRAL','DROWNED ORACLE','LEVIATHAN ENGINE'], chaptersNames: ['WRECK COAST','DROWNED HOLD','ABYSSAL ENGINE'],
    npcs: ['SELK // WRECK ENGINEER','ORREN // TIDE KEEPER','VESPER // MUTINOUS CAPTAIN'], stakes: 'Free the souls powering a dead fleet before its last voyage consumes the coast.' },
  pyre: { name: 'PYRE // THE EMBER DUNGEONS', description: 'Volcanic prisons, crumbling basalt, steam vents and a soul furnace with a breakable conduit.', biome: 'furnace', tint: 0xf28b56, sky: 0x241015,
    chapters: [
      ['approach','tower','tunnel','machine','terrace','bridge','refuge','vault','bridge'],
      ['tunnel','terrace','wire','machine','bridge','vault','approach','tunnel','refuge'],
      ['tower','machine','tunnel','terrace','bridge','vault','wire','tunnel','approach'],
    ], bosses: ['INFERNAL MARSHAL','ASH WITCH','MAGMA REGENT'], chaptersNames: ['BASALT PRISON','STEAM OSSUARY','HEART OF PYRE'],
    npcs: ['NOX // CONDUIT SMITH','CAIRN // ASH PRISONER','VARRA // FIRE EXORCIST'], stakes: 'Open the pressure conduit. Break the furnace shield. Release the prisoners from the mountain.' },
  neon: { name: 'NEON // THE LAST TRANSIT', description: 'Abandoned stations, moving maintenance lifts and ceiling-mounted security shutters.', biome: 'storm', tint: 0x87ddff, sky: 0x07122a,
    chapters: [
      ['approach','machine','bridge','terrace','tunnel','tower','refuge','vault','bridge'],
      ['tunnel','wire','machine','vault','terrace','bridge','approach','tunnel','refuge'],
      ['tower','wire','tunnel','machine','terrace','bridge','vault','tunnel','approach'],
    ], bosses: ['LINE ZERO','CIPHER SIBYL','OMNINET'], chaptersNames: ['TRANSIT GRAVEYARD','SHUTTER EXCHANGE','SIGNAL CENTRAL'],
    npcs: ['FINCH // LINE TECHNICIAN','ADA // CIPHER EXILE','ROOK // CORPORATE DESERTER'], stakes: 'Carry the living signal through a transit system that treats every human as obsolete cargo.' },
  veil: { name: 'VEIL // THE MIRROR GRAVES', description: 'Wizard crypts, signposted mirror portals, hostile summoning rifts and a guide with a costly pact.', biome: 'eclipse', tint: 0xc4a0ed, sky: 0x160b24,
    chapters: [
      ['approach','vault','tunnel','terrace','bridge','machine','refuge','tower','bridge'],
      ['tunnel','vault','machine','wire','terrace','bridge','approach','tunnel','refuge'],
      ['tower','tunnel','wire','terrace','machine','bridge','vault','tunnel','approach'],
    ], bosses: ['BONEWARD SENTINEL','WITCH OF MIRRORS','GRAVE SOVEREIGN'], chaptersNames: ['IVORY CATACOMBS','COUNTERFEIT SANCTUM','THRONE OF NAMES'],
    npcs: ['ILEX // GRAVE WARDEN','ORREN // NAMELESS SCHOLAR','VESPER // BOUND KNIGHT'], stakes: 'Recover your stolen name. Every mirror offers passage; every promise demands a price.' },
};
function addEnvironment(world, layout, id, x, room, kind) {
  const surface = room.entry;
  if (world.id === 'tide' && ['machine','terrace','tunnel'].includes(kind)) {
    world.currents.push({ id: `${id}-undertow`, x: x + 1450, y: 430, w: 650, h: 180, vx: -65, vy: 0, tint: 0x64c9c5 });
  }
  if (['tide','neon'].includes(world.id) && kind === 'machine') {
    world.movingPlatforms.push({ id: `${id}-moving-${world.id === 'tide' ? 'raft' : 'lift'}`, x: x + 1120, y: 335, w: 200, h: 22,
      axis: world.id === 'tide' ? 'x' : 'y', distance: world.id === 'tide' ? 170 : 90, period: 5.5, phase: 0.4, oneWay: true, kind: world.id === 'tide' ? 'raft' : 'lift', material: 'steel' });
    layout.solid(`${id}-side-loft`, x + 1440, 315, 240, 20, world.biome, true);
    world.props.push({ id: `${id}-loft-cache`, type: 'cache', x: x + 1500, y: 275, w: 42, h: 40, hp: 24,
      contents: [{ type: 'treasure', itemId: world.id === 'tide' ? 'tide-glass' : 'storm-seal' }, { type: 'mana', value: 35 }, { type: 'cannon', value: 1 }] });
  }
  if (world.id === 'pyre' && ['bridge','vault','machine'].includes(kind)) {
    const deck = room.decks?.[0]; if (deck) world.crumble.push({ solidId: deck.id, delay: 0.9, restore: 5 });
    world.hazards.push({ id: `${id}-steam`, type: 'steam', x: x + 1550, y: 365, w: 46, h: 245, period: 4.5, onTime: 1.35, phase: 1.7 });
  }
  if (world.id === 'neon' && kind === 'wire') layout.solid(`${id}-machinery-ceiling`, x + 90, 265, ROOM_LENGTH.wire - 180, 32, world.biome, false, 'ceiling');
  if (world.id === 'neon' && ['tunnel','machine'].includes(kind)) {
    world.hazards.push({ id: `${id}-retracting-spikes`, type: 'spikes', x: surface.x + 430, y: 592, w: 90, h: 18, period: 4, onTime: 1.3, phase: 2 });
  }
  if (world.id === 'veil' && kind === 'refuge') {
    world.portals.push({ id: `${id}-mirror`, name: 'MIRROR PASSAGE', x: x + 610, y: 500, w: 42, h: 110,
      to: { x: x + 920, y: 564 }, oneWay: true, tint: 0xc4a0ed });
    world.guides.push({ x: x + 610, y: 435, text: 'F / MIRROR PASSAGE • ARRIVES AT THE FAR ARCH', action: 'portal' });
  }
}
function newWorld(id, definition) {
  const layout = createLayout(), biome = definition.biome;
  const world = { id, name: definition.name, description: definition.description, biome, height: 720, timeLimit: 620,
    spawn: { x: 100, y: 560 }, solids: layout.solids, hazards: layout.hazards, route: layout.route, enemies: layout.enemies,
    props: [], pickups: [], gates: [], bosses: [], checkpoints: [{ x: 100, y: 560, label: `${id.toUpperCase()} / ENTRY` }],
    zones: [], guides: [], npcs: [], currents: [], movingPlatforms: [], crumble: [], enemyPortals: [], portals: [] };
  let x = 0, roomNumber = 0;
  for (let chapter = 0; chapter < 3; chapter++) {
    const chapterX = x;
    world.zones.push({ x, label: definition.chaptersNames[chapter], subtitle: definition.stakes, biome, tint: definition.tint, sky: definition.sky });
    const npcId = `${id}-${['scout','scholar','deserter'][chapter]}`;
    let npcPlaced = false;
    for (const kind of definition.chapters[chapter]) {
      const roomX = x, name = `${id}-${++roomNumber}-${kind}`, firstRoute = layout.route.length;
      let room;
      if (kind === 'bridge') room = layout.bridge(name, x, biome, id === 'tide' ? [560,480,540] : id === 'pyre' ? [535,455,520] : id === 'neon' ? [555,485,525] : [530,455,515]);
      else if (kind === 'tower') room = layout.ascent(name, x, biome);
      else if (kind === 'vault') room = layout.vault(name, x, biome, id === 'tide' ? [535,465,410,510] : [535,455,400,505]);
      else if (kind === 'tunnel') room = tunnel(layout, name, x, biome);
      else if (kind === 'terrace') room = terrace(layout, name, x, biome, id === 'tide' ? [610,555,475,555,610] : id === 'pyre' ? [610,505,425,505,610] : id === 'neon' ? [610,535,460,535,610] : [610,545,450,545,610]);
      else if (kind === 'machine') room = mechanism(layout, name, x, biome);
      else { const s = kind === 'wire' ? layout.killwire(name, x, ROOM_LENGTH[kind], biome) : layout.flat(name, x, ROOM_LENGTH[kind], biome);
        room = { entry: s, decks: [], exit: s }; }
      if (!npcPlaced) {
        const npcX = x + 290;
        layout.route[firstRoute].x = npcX; layout.route[firstRoute].npcId = npcId;
        world.npcs.push({ id: npcId, name: definition.npcs[chapter], x: npcX, y: 564, skin: ['mira','wizard','vesper'][chapter], portrait: `portrait-${['mira','orren','vesper'][chapter]}`,
          lines: [{ speaker: definition.npcs[chapter].split(' // ')[0], text: definition.stakes },
            { speaker: 'COURIER', text: chapter === 0 ? 'I will carry the living soul beyond your border.' : chapter === 1 ? 'The first guardian is gone. Show me the next chain.' : 'The final engine will not own another name.' },
            { speaker: definition.npcs[chapter].split(' // ')[0], text: chapter === 0 ? 'Take protection or a spirit companion. The drowned and the machines both hunt warmth.' : chapter === 1 ? 'A stolen soul can heal, or be reflected into an ally. Choose what keeps you alive.' : 'This power is finite. Find the final cache and make the last strike count.' }],
          choices: chapter === 0 ? [
            { id: `${npcId}-armor`, label: 'Bulwark Plate — sturdy protection', reward: { type: 'armor', itemId: 'bulwark' } },
            { id: `${npcId}-wolf`, label: 'Moonfang — summon a wolf spirit', reward: { type: 'spell', itemId: 'wolf' } },
          ] : chapter === 1 ? [
            { id: `${npcId}-siphon`, label: 'Soul Siphon — restore life through combat', reward: { type: 'spell', itemId: 'siphon' } },
            { id: `${npcId}-clone`, label: 'Soul Echo — summon your reflection', reward: { type: 'spell', itemId: 'clone' } },
          ] : [
            { id: `${npcId}-cannon`, label: 'Oblivion Cannon — two piercing charges', reward: { type: 'cannon', value: 2 } },
            { id: `${npcId}-dragon`, label: 'Black Dragon — summon a fire-breathing ally', reward: { type: 'spell', itemId: 'dragon' } },
          ] }); npcPlaced = true;
      }
      if (roomNumber % 2 === 0) world.checkpoints.push({ x: x + 50, y: 564, label: `${id.toUpperCase()} / RELAY ${roomNumber}` });
      const platform = room.decks?.[Math.min(1, (room.decks?.length || 1) - 1)] || room.risers?.[1] || room.entry;
      const offset = Math.min(platform.w - 65, Math.max(70, platform.w * 0.45));
      const enemyType = ['sentinel','guard',id === 'neon' ? 'sentinel' : id === 'veil' ? 'shade' : id === 'pyre' ? 'mage' : 'guard','turret','mage','shade'][roomNumber % 6];
      layout.foe(`${name}-foe`, enemyType, platform, offset,
        enemyType === 'sentinel' ? 'lightning' : enemyType === 'shade' ? 'shadow' : enemyType === 'mage' ? 'cinder' : enemyType === 'turret' ? 'missile' : 'rifle');
      if (kind !== 'refuge') layout.drone(`${name}-drone`, x + ROOM_LENGTH[kind] - 460, 395, id === 'veil' ? 'soul' : 'rifle');
      addEnvironment(world, layout, name, x, room, kind);
      if (['pyre','veil'].includes(id) && kind === 'tower') world.props.push({ id: `${name}-summit-cache`, type: 'cache', x: room.wall.x + 45, y: 170, w: 42, h: 40, hp: 24,
        contents: [{ type: 'treasure', itemId: id === 'pyre' ? 'ember-heart' : 'eclipse-fragment' }, { type: 'mana', value: 40 }] });
      if (kind === 'refuge') {
        world.pickups.push({ id: `${name}-health`, type: 'health', x: x + 600, y: 578, value: 40 });
        world.pickups.push({ id: `${name}-mana`, type: 'mana', x: x + 940, y: 578, value: 40 });
      }
      if (roomNumber === 4) world.pickups.push({ id: `${id}-wolf`, type: 'spell', itemId: 'wolf', x: room.exit.x + Math.min(120, room.exit.w / 2), y: room.exit.y - 32 });
      if (roomNumber === 10) world.pickups.push({ id: `${id}-clone`, type: 'spell', itemId: 'clone', x: room.exit.x + Math.min(120, room.exit.w / 2), y: room.exit.y - 32 });
      if (roomNumber === 19) world.pickups.push({ id: `${id}-dragon`, type: 'spell', itemId: 'dragon', x: room.exit.x + Math.min(120, room.exit.w / 2), y: room.exit.y - 32 });
      if (roomNumber === 7) world.pickups.push({ id: `${id}-rail`, type: 'weapon', itemId: 'rail', x: x + 800, y: 578 });
      if (roomNumber === 16) world.pickups.push({ id: `${id}-saber`, type: 'sword', itemId: 'saber', x: room.exit.x + Math.min(120, room.exit.w / 2), y: room.exit.y - 32 });
      if (roomNumber % 5 === 0) world.enemyPortals.push({ id: `${name}-enemy-rift`, x: room.exit.x + Math.min(120, room.exit.w - 60), y: room.exit.y - 44,
        type: id === 'pyre' ? 'mage' : 'shade', period: 18, lifetime: 8, tint: definition.tint });
      x += ROOM_LENGTH[kind];
    }
    const arenaLength = [3000,3200,4200][chapter], bossId = `${id}-${['warden','hex','regent'][chapter]}`;
    const arena = layout.flat(`${id}-arena-${chapter + 1}`, x, arenaLength, biome, [{ x: x + 710, bossId }]);
    const bossX = x + 1200;
    world.bosses.push({ id: bossId, name: definition.bosses[chapter], type: ['warden','hex','regent'][chapter], skin: id,
      power: id === 'tide' ? 'undertow' : id === 'pyre' ? 'infernal' : id === 'neon' ? 'overload' : 'mirror',
      x: bossX, y: chapter === 2 ? 478 : 490, w: chapter === 2 ? 112 : 96, h: chapter === 2 ? 132 : 120,
      hp: [1600,2000,3200][chapter], triggerX: x + 630, arenaStart: x, arenaEnd: x + arenaLength - 260 });
    world.gates.push({ id: `${bossId}-gate`, bossId, x: x + arenaLength - 180, y: 0, w: 32, h: 610 });
    world.checkpoints.push({ x: x + 65, y: 564, label: `${definition.bosses[chapter]} / LOCK` });
    world.props.push({ id: `${bossId}-cache`, type: 'cache', x: x + 310, y: 570, w: 42, h: 40, hp: 24,
      contents: [{ type: 'health', value: 35 }, { type: 'mana', value: 50 }, ...(chapter === 2 ? [{ type: 'cannon', value: 2 }, { type: 'nova', value: 1 }] : [{ type: 'shield', value: 35 }])] });
    layout.solid(`${bossId}-flank`, bossX + 650, 505, 240, 20, biome, true);
    world.guides.push({ x: x + 180, y: 435, text: 'BREAK THE CACHE • READ THE GUARDIAN’S WINDUP', action: 'boss' });
    if (id === 'pyre' && chapter === 0) {
      const leverId = 'pyre-pressure-valve', gateId = 'pyre-conduit-lock';
      world.props.push({ id: leverId, type: 'lever', x: x + 230, y: 564, w: 28, h: 46, gateId });
      world.gates.push({ id: gateId, leverId, x: x + 490, y: 0, w: 32, h: 610 }); world.bosses.at(-1).shieldGateId = gateId;
      const index = layout.route.findIndex(marker => marker.bossId === bossId); layout.route.splice(index, 0, { id: arena.id, x: x + 230, y: 610, verb: 'run', leverId });
      world.guides.push({ x: x + 230, y: 400, text: 'F / OPEN PRESSURE VALVE • STRIP THE MARSHAL’S SHIELD', action: 'interact' });
    }
    if (id === 'veil' && chapter === 1) {
      const witchId = 'veil-ysra', portalId = 'veil-betrayal-rift';
      world.npcs.push({ id: witchId, name: 'YSRA // COUNTERFEIT GUIDE', x: x + 420, y: 564, skin: 'witch', portrait: 'portrait-ysra',
        lines: [{ speaker: 'YSRA', text: 'The mirror asks for a living price. Twenty-five life buys a dragon, and the graves will learn your name.' },
          { speaker: 'COURIER', text: 'If this is a trap, I will turn your summoned dead against you.' },
          { speaker: 'YSRA', text: 'Accept the pact and face the ambush. Refuse, and keep your blood.' }], choices: [
          { id: 'veil-pact', label: 'Accept Dragon Pact — lose 25 life and trigger an ambush', cost: { hp: 25 }, reward: { type: 'spell', itemId: 'dragon' }, effect: { type: 'ambush', enemyPortalId: portalId } },
          { id: 'veil-refuse', label: 'Refuse the pact — recover 25 soul energy', reward: { type: 'mana', value: 25 } },
        ] });
      world.enemyPortals.push({ id: portalId, x: x + 550, y: 566, type: 'shade', period: 14, lifetime: 8, requiresClaim: 'choice:veil-pact', tint: 0xc4a0ed });
      const index = layout.route.findIndex(marker => marker.bossId === bossId); layout.route.splice(index, 0, { id: arena.id, x: x + 420, y: 610, verb: 'run', npcId: witchId });
    }
    x += arenaLength;
  }
  world.width = x; world.boss = world.bosses.at(-1); world.exit = { x: x - 160, y: 540, w: 50, h: 70 };
  world.guides.unshift({ x: 280, y: 440, text: 'HOLD JUMP • SECOND JUMP • F / SPEAK WITH SURVIVORS', action: 'jump' });
  world.guides.push({ x: 4100, y: 400, text: id === 'tide' ? 'UNDERTOW PULLS LEFT • RAFTS REACH THE SIDE CACHES' : id === 'pyre' ? 'BASALT CRUMBLES • KEEP MOVING • READ THE STEAM' : id === 'neon' ? 'SHUTTERS LIVE IN THE CEILING • CROSS THE DARK BEAT' : 'MIRRORS SHOW THEIR DESTINATION • PROMISES HAVE A COST', action: 'environment' });
  return world;
}
export function buildNewWorlds() { return Object.fromEntries(Object.entries(DEFINITIONS).map(([id, definition]) => [id, newWorld(id, definition)])); }

export function extendSoulforge(base) {
  const additions = [{ at: 10800, length: 3300 }, { at: 21600, length: 3600 }, { at: 32400, length: 3500 }, { at: 43200, length: 4500 }, { at: 54000, length: 4500 }];
  const offset = x => additions.reduce((sum, extra) => sum + (x >= extra.at ? extra.length : 0), 0);
  const translate = object => {
    const clone = { ...object };
    for (const key of ['x','triggerX','arenaStart','arenaEnd','minX','maxX']) if (Number.isFinite(clone[key])) clone[key] += offset(clone[key]);
    return clone;
  };
  const world = { ...base, id: 'soulforge', name: 'SOULFORGE // THE UNBOUND ENGINE', description: 'Industrial soul foundries, frozen borders, drowned archives and a stolen human soul.',
    biome: 'furnace', timeLimit: 620, width: base.width + 19400, spawn: { ...base.spawn }, exit: translate(base.exit),
    currents: [], movingPlatforms: [], crumble: [], enemyPortals: [], portals: [] };
  for (const key of ['solids','hazards','route','enemies','props','pickups','gates','bosses','checkpoints','zones','guides','npcs']) world[key] = base[key].map(translate);
  world.boss = world.bosses.at(-1);
  for (let i = 0; i < additions.length; i++) {
    const extra = additions[i], x = extra.at + additions.filter(item => item.at < extra.at).reduce((sum, item) => sum + item.length, 0);
    const layout = createLayout(), id = `soulforge-expansion-${i}`, biome = ['ruins','furnace','storm','eclipse','reactor'][i];
    let room;
    if (i === 0) { room = tunnel(layout, id, x, biome); layout.flat(`${id}-relay`, x + 3000, 300, biome); }
    else if (i === 1) room = mechanism(layout, id, x, biome);
    else if (i === 2) { room = layout.ascent(id, x, biome); layout.flat(`${id}-relay`, x + 2400, 1100, biome); }
    else if (i === 3) { room = tunnel(layout, id, x, biome); layout.killwire(`${id}-shutters`, x + 3000, 1500, biome); layout.solid(`${id}-roof`, x + 3050, 265, 1400, 32, biome, false, 'ceiling'); }
    else { room = terrace(layout, id, x, biome, [610,535,455,535,610]); layout.flat(`${id}-relay`, x + 4200, 300, biome); }
    const support = room.decks?.[1] || room.risers?.[1] || room.entry;
    layout.foe(`${id}-guard`, i % 2 ? 'sentinel' : 'mage', support, Math.min(120, support.w - 50), i % 2 ? 'lightning' : 'soul');
    layout.drone(`${id}-drone`, x + 1800, 360, 'soul');
    world.solids.push(...layout.solids); world.hazards.push(...layout.hazards); world.route.push(...layout.route); world.enemies.push(...layout.enemies);
    world.pickups.push({ id: `${id}-mana`, type: 'mana', x: room.exit.x + Math.min(130, room.exit.w / 2), y: room.exit.y - 32, value: 45 });
    world.enemyPortals.push({ id: `${id}-rift`, x: room.exit.x + 200, y: 566, type: 'shade', period: 18, lifetime: 8 });
    world.guides.push({ x: x + 280, y: 440, text: 'SOUL CONDUIT DUNGEON • BREAK THE SUMMONING LINE', action: 'dungeon' });
  }
  world.route.sort((a, b) => a.x - b.x);
  world.pickups.push({ id: 'soulforge-soul-echo', type: 'spell', itemId: 'clone', x: 10240, y: 578 });
  world.pickups.push({ id: 'soulforge-moonfang', type: 'spell', itemId: 'wolf', x: 18340, y: 578 });
  world.pickups.push({ id: 'soulforge-black-dragon', type: 'spell', itemId: 'dragon', x: 46540, y: 578 });
  return world;
}
