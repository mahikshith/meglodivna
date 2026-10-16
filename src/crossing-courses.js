export const COURSE_STEPS = 28;
export const COURSE_LENGTH = COURSE_STEPS * 400;

// Four seven-landing questions per realm: learn a force, combine it with a
// second action, touch the high lantern, then recover at the next relay.
// Adjacent climbs stay within a double jump; boost is the quicker route.
const HEIGHTS = {
  wind: [0, 75, 150, 80, 130, 165, 0, 0, 80, 160, 70, 180, 190, 0,
    0, 95, 190, 260, 160, 250, 0, 0, 90, 175, 265, 180, 245, 0],
  water: [0, 45, 70, 60, 100, 90, 0, 0, 60, 110, 45, 125, 80, 140,
    0, 60, 90, 160, 110, 165, 0, 0, 70, 125, 100, 180, 120, 0],
  fire: [0, 70, 125, 50, 110, 130, 0, 0, 90, 150, 80, 160, 200, 120,
    0, 0, 175, 120, 205, 265, 0, 0, 80, 160, 220, 155, 240, 0],
};
const WIND_GUSTS = new Map([
  [1, [25, -32]], [2, [34, -35]], [3, [-34, 18]], [4, [-48, -30]], [5, [24, -32]],
  [8, [-48, -32]], [9, [-34, -35]], [10, [25, 18]], [11, [34, -32]], [12, [-48, -35]],
  [15, [25, -40]], [16, [34, -40]], [17, [-34, -40]], [18, [-48, 18]], [19, [34, -35]],
  [22, [-34, -32]], [23, [25, -40]], [24, [34, -40]], [25, [-48, 18]], [26, [25, -35]],
]);
const WATER_RAFTS = new Map([[1, 'y'], [3, 'x'], [5, 'y'], [8, 'x'], [10, 'y'],
  [12, 'x'], [16, 'y'], [18, 'x'], [22, 'x'], [24, 'y'], [26, 'x']]);
const WATER_TIDES = new Map([[1, -26], [2, 24], [3, -34], [4, 24], [5, -26],
  [8, -34], [9, 24], [10, -42], [11, 24], [12, -34], [13, 24],
  [15, -42], [16, 24], [17, -34], [18, 24], [19, -42],
  [22, -34], [23, 24], [24, -42], [25, 24], [26, -34]]);
const FIRE_CRUMBLE = new Set([1, 3, 8, 11, 18, 22, 25]);
const FIRE_VENTS = new Map([[2, 3.6], [9, 3.6], [17, 3.1], [23, 3.1]]);
const KEYS = { wind: new Set([5, 12, 19, 26]), water: new Set([4, 13, 19, 25]),
  fire: new Set([5, 13, 19, 26]) };
const DEFENDERS = { wind: new Set([4, 11, 18, 25]), water: new Set([4, 11, 19, 25]),
  fire: new Set([4, 12, 25]) };
const SECTIONS = {
  wind: [
    ['The Low Canopy', 'Catch the first updraft. Touch the high bell to release the shutter.'],
    ['The Crosswind Bells', 'The wind turns against you. Land, then correct your course.'],
    ['The Cloud Spine', 'Climb with the updraft. Descend to the relay before the next rise.'],
    ['The Last Updraft', 'Read the alternating gusts and reach the final bell.'],
  ],
  water: [
    ['The Rising Tide', 'Ride the rising raft. Land on stone to moor the gate.'],
    ['The Drifting Causeway', 'Aim for the raft ahead of you, then climb to the mooring stone.'],
    ['The Split Current', 'The current reverses between islands. Use the raft as a foothold.'],
    ['The Moonlit Crossing', 'Time the last two rafts and hold the mooring stone.'],
  ],
  fire: [
    ['The Broken Flue', 'Cross brittle stone, then wait for the vent to fall quiet.'],
    ['The Cinder Steps', 'Move before each step crumbles. The broad stones are safe.'],
    ['The High Furnace', 'Climb above the vent; the lower walk lets you recover.'],
    ['The Final Vent', 'Read the vent rhythm, cross the brittle step and touch the seal.'],
  ],
};

export function addCrossingCourse(level, realm, prefix, startX, floor, route, solid) {
  const heights = HEIGHTS[realm.id];
  if (!heights || heights.length !== COURSE_STEPS) throw new Error(`Invalid ${realm.id} crossing course`);
  // A forge fall costs time and height, but cannot strand an empty fuel tank.
  if (realm.id === 'fire') solid('maintenance-walk', startX, floor + 140, COURSE_LENGTH);
  for (let index = 0; index < COURSE_STEPS; index++) {
    const x = startX + index * 400, y = floor - heights[index];
    const section = Math.floor(index / 7), rest = index % 7 === 0 || index === COURSE_STEPS - 1;
    if (index % 7 === 0) {
      const [label, instruction] = SECTIONS[realm.id][section];
      level.zones.push({ x, label, subtitle: realm.subtitle, biome: realm.biome, tint: realm.tint, sky: realm.sky,
        theme: { scene: realm.scene, foreground: realm.material }, weather: realm.weather });
      level.guides.push({ x: x + 140, y: y - 160, text: `${label}\n${instruction}` });
    }
    const axis = realm.id === 'water' && WATER_RAFTS.get(index);
    if (axis) {
      const raft = { id: `${prefix}-causeway-raft-${index}`, kind: 'raft', x, y, w: 300, h: 24,
        oneWay: true, axis, distance: axis === 'x' ? 45 : 35, period: 4.8 + index % 3, phase: index * .4 };
      level.movingPlatforms.push(raft);
      route.push({ id: raft.id, x: x + 170, y, verb: 'jump', dynamic: true, offsetX: 170 });
      solid(`raft-catch-${index}`, x + 30, floor + 110, 240, true);
    } else {
      const platform = solid(`course-${index}`, x, y, rest ? 330 : 300, !rest);
      route.push({ id: platform.id, x: x + 205, y, verb: 'jump' });
      if (realm.id === 'fire' && FIRE_CRUMBLE.has(index))
        level.crumble.push({ solidId: platform.id, delay: 1.15, restore: 3 });
    }
    if (rest) {
      const relay = index === COURSE_STEPS - 1 ? 5 : section + 1;
      level.checkpoints.push({ x: x + 193, y: y - 46, label: `${realm.name} · crossing relay ${relay}` });
      level.pickups.push({ id: `${prefix}-relay-health-${index}`, type: 'health', x: x + 150, y: y - 28, value: 40 },
        { id: `${prefix}-relay-mana-${index}`, type: 'mana', x: x + 195, y: y - 28, value: 35 });
      level.landmarks.push({ type: 'lantern', x: x + 65, y, seed: 400 + index });
    }
    if (DEFENDERS[realm.id].has(index)) {
      const type = realm.id === 'wind' ? 'drone' : realm.id === 'water' ? 'mage' : 'guard';
      const [w, h] = type === 'drone' ? [34, 45] : type === 'mage' ? [34, 50] : [30, 44];
      level.enemies.push({ id: `${prefix}-course-defender-${index}`, type, x: x + 190, y: y - h, w, h, hp: 75,
        power: realm.id === 'fire' ? 'cinder' : 'rifle', facing: -1,
        minX: x + 15, maxX: x + 280 - w, leashX: x, leashW: 300 });
    }
    const gust = realm.id === 'wind' && WIND_GUSTS.get(index);
    if (gust) level.currents.push({ id: `${prefix}-high-draft-${index}`, x: x - 40, y: Math.max(0, y - 300),
      w: 380, h: 210, vx: gust[0], vy: gust[1] });
    const tide = realm.id === 'water' && WATER_TIDES.get(index);
    if (tide) level.currents.push({ id: `${prefix}-undertow-${index}`, x, y: floor - 180,
      w: 340, h: 280, vx: tide, vy: 0 });
    const vent = realm.id === 'fire' && FIRE_VENTS.get(index);
    if (vent) level.hazards.push({ id: `${prefix}-furnace-breath-${index}`, type: 'steam',
      x: x + 225, y: y - 125, w: 24, h: 125, period: vent, onTime: .7, phase: index * .21 });
    if (KEYS[realm.id].has(index)) {
      const gateX = startX + (section * 7 + 6) * 400 + 340;
      level.gates.push({ id: `${prefix}-course-shutter-${section}`, x: gateX, y: 0, w: 22, h: floor,
        autoOpenAt: { x: x + 60, y, w: 200 } });
      level.landmarks.push({ type: 'lantern', x: x + 115, y, seed: 500 + section });
    }
  }
  return startX + COURSE_LENGTH;
}
