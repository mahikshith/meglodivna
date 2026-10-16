export const COURSE_STEPS = 104;
export const COURSE_LENGTH = COURSE_STEPS * 400;

// Long action routes follow the short teaching chambers. Each realm exercises a
// different motion model, with permanent rescue relays between its sections.
export function addCrossingCourse(level, realm, prefix, startX, floor, route, solid) {
  const pattern = [0, 100, 200, 300, 400, 500, 600, 500, 400, 300, 200, 100, 0];
  // The forge has a recoverable lower maintenance walk beneath brittle bridges.
  // Missing a vent window costs height and fuel, not an unavoidable death loop.
  if (realm.id === 'fire') solid('maintenance-walk', startX, floor + 140, COURSE_LENGTH);
  const sections = {
    wind: ['The Low Canopy', 'The Crosswind Bells', 'The Cloud Spine', 'The Last Updraft'],
    water: ['The Rising Tide', 'The Drifting Causeway', 'The Split Current', 'The Moonlit Crossing'],
    fire: ['The Broken Flue', 'The Cinder Steps', 'The High Furnace', 'The Final Vent'],
  };
  for (let index = 0; index < COURSE_STEPS; index++) {
    const x = startX + index * 400;
    const section = Math.floor(index / 26);
    const rest = index % 8 === 0 || index === COURSE_STEPS - 1;
    const height = realm.id === 'wind' ? pattern[index % pattern.length] * [1, .8, 1.1, .9][section]
      : realm.id === 'fire' ? (section < 2 ? [0, 70, 140, 70] : [0, 90, 180, 90])[index % 4] : 0;
    const y = index === COURSE_STEPS - 1 ? floor : floor - height;
    if (index % 26 === 0) {
      const label = sections[realm.id][section];
      level.zones.push({ x, label, subtitle: realm.subtitle, biome: realm.biome, tint: realm.tint, sky: realm.sky,
        theme: { scene: realm.scene, foreground: realm.material }, weather: realm.weather });
      const instruction = realm.id === 'wind' ? ['Use the first gust to reach the bells.', 'Crosswinds push sideways. Land before correcting.', 'The cloud spine rises higher. Rest at each lantern.', 'Read the final gusts, then face the bound guardian.'][section]
        : realm.id === 'water' ? ['Land on a rising raft, then jump to stone.', 'These rafts drift sideways. Aim for their leading edge.', 'The current changes direction between islands.', 'Follow the moonlit rafts to the guardian.'][section]
        : ['Cross the brittle stone before it gives way.', 'Watch the vent rhythm. Rest on the broad stones.', 'The furnace steps climb higher. Recover on the lower walk.', 'Staggered vents guard the final approach.'][section];
      level.guides.push({ x: x + 140, y: y - 160, text: `${label}\n${instruction}` });
    }
    if (realm.id === 'water' && index % 2 === 1 && !rest) {
      const raft = { id: `${prefix}-causeway-raft-${index}`, kind: 'raft', x, y: floor - 45, w: 300, h: 24,
        oneWay: true, axis: section % 2 ? 'x' : 'y', distance: section % 2 ? 45 : 35, period: 4.8 + index % 3, phase: index * .4 };
      level.movingPlatforms.push(raft);
      route.push({ id: raft.id, x: x + 170, y: raft.y, verb: 'jump', dynamic: true, offsetX: 170 });
      // A low landing catches a missed tide jump; the raft is still the next objective.
      solid(`raft-catch-${index}`, x + 30, floor + 110, 240, true);
    } else {
      const platform = solid(`course-${index}`, x, y, rest ? 330 : 300, !rest);
      route.push({ id: platform.id, x: x + 205, y, verb: 'jump' });
      if (realm.id === 'fire' && !rest && index % 2) level.crumble.push({ solidId: platform.id, delay: .95, restore: 2.8 });
      if (rest) {
        level.checkpoints.push({ x: x + 193, y: y - 46, label: `${realm.name} · crossing relay ${Math.floor(index / 8) + 1}` });
        level.pickups.push({ id: `${prefix}-relay-health-${index}`, type: 'health', x: x + 150, y: y - 28, value: 40 },
          { id: `${prefix}-relay-mana-${index}`, type: 'mana', x: x + 195, y: y - 28, value: 35 });
        level.landmarks.push({ type: 'lantern', x: x + 65, y, seed: 400 + index });
      }
      if (index % 8 === 4) {
        const type = realm.id === 'wind' ? 'drone' : realm.id === 'water' ? 'mage' : 'guard';
        const [w, h] = type === 'drone' ? [34, 45] : type === 'mage' ? [34, 50] : [30, 44];
        level.enemies.push({ id: `${prefix}-course-defender-${index}`, type, x: x + 190, y: y - h, w, h, hp: 75,
          power: realm.id === 'fire' ? 'cinder' : 'rifle', facing: -1, minX: x + 15, maxX: x + 280 - w, leashX: x, leashW: 300 });
      }
    }
    // Updrafts start above standing height, so a resting player retains a jump.
    if (realm.id === 'wind' && !rest) level.currents.push({ id: `${prefix}-high-draft-${index}`, x: x - 40, y: Math.max(0, y - 300), w: 380, h: 210,
      vx: index % 3 === 0 ? -(section === 1 ? 48 : 34) : 25, vy: index % 13 < 7 ? -(section === 2 ? 40 : 32) : 18 });
    if (realm.id === 'water' && !rest) level.currents.push({ id: `${prefix}-undertow-${index}`, x, y: floor - 180, w: 340, h: 280, vx: index % 4 < 2 ? -(section === 2 ? 42 : 34) : 24, vy: 0 });
    if (realm.id === 'fire' && index % 4 === 2) level.hazards.push({ id: `${prefix}-furnace-breath-${index}`, type: 'steam', x: x + 225, y: y - 125, w: 24, h: 125, period: section === 3 ? 3.1 : 3.6, onTime: .7, phase: index * .21 });
  }
  return startX + COURSE_LENGTH;
}
