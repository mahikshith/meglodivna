import { CROSSINGS } from './story.js';
import { addCrossingCourse, COURSE_LENGTH } from './crossing-courses.js';

// Keep the original room/claim IDs and checkpoint indices: existing saves enter at the same relay.
export function addCrossings(level) {
  const hub = level.rooms.find(room => room.kind === 'regent');
  const hubFloor = level.solids.find(solid => solid.kind === 'ground' && solid.x === hub.x);
  const baseWidth = level.width;
  level.mainWidth = baseWidth;
  level.crossings = [];
  level.campaignRoute = [...level.route];
  level.timeLimit = Math.max(level.timeLimit, 1800);
  level.description = 'Rescue the captive sanctuary through three rune trials and three portal crossings.';
  const insertion = level.campaignRoute.findIndex(marker => marker.bossId === level.boss.id);
  const detours = [];
  const crossingWidth = 4470 + COURSE_LENGTH + 900, crossingStride = crossingWidth + 630;
  for (const [realmIndex, realm] of CROSSINGS.entries()) {
    const prefix = `${level.id}-crossing-${realm.id}`;
    const x = baseWidth + 700 + realmIndex * crossingStride, floor = 1160;
    // More than portal width + player width leaves a real non-contact gap,
    // allowing the arrival lock to release before the next entrance.
    const entranceX = hub.x + 20 + realmIndex * 80;
    const completionGate = `${prefix}-heart-seal`, entryId = `${prefix}-entry`, returnId = `${prefix}-return`;
    const route = [], solids = [];
    const solid = (id, sx, sy, w, oneWay = false) => {
      const value = { id: `${prefix}-${id}`, x: sx, y: sy, w, h: oneWay ? 26 : 1440 - sy, oneWay, kind: oneWay ? 'platform' : 'ground', material: realm.material, biome: realm.biome };
      level.solids.push(value); solids.push(value); return value;
    };
    const marker = (s, sx, extra = {}) => route.push({ id: s.id, x: sx, y: s.y, verb: 'jump', ...extra });
    const pickup = (id, type, px, py, extra = {}) => level.pickups.push({ id: `${prefix}-${id}`, type, x: px, y: py - 28, ...extra });
    const entry = solid('landing', x, floor, 420);
    marker(entry, x + 210);
    level.portals.push({ id: entryId, pairId: `${prefix}-entry-pair`, destinationId: `${prefix}-retreat`, x: entranceX, y: hub.floorY - 46, w: 34, h: 46,
      to: { x: x + 90, y: floor - 46 }, label: realm.name, disabledWhenGateOpen: completionGate });
    // Retreat is available from the first landing even before any trial is solved.
    level.portals.push({ id: `${prefix}-retreat`, pairId: `${prefix}-entry-pair`, destinationId: entryId, x: x + 90, y: floor - 46, w: 34, h: 46, dormant: false,
      to: { x: entranceX, y: hub.floorY - 46 }, label: 'Return to the heart gate' });
    level.gates.push({ id: completionGate, x: hub.x + 236 + realmIndex * 25, y: 0, w: 20, h: hub.floorY, leverId: `${prefix}-oath` });
    level.guides.push({ x: x + 200, y: floor - 165, text: `${realm.name}\n${realm.subtitle}` });
    level.rooms.push({ id: prefix, kind: `crossing-${realm.id}`, name: realm.name, x, y: 0, w: crossingWidth, h: 1440, floorY: floor });
    level.zones.push({ x, label: realm.name, subtitle: realm.subtitle, biome: realm.biome, tint: realm.tint, sky: realm.sky, theme: { scene: realm.scene, foreground: realm.material }, weather: realm.weather });
    for (let chamber = 0; chamber < 3; chamber++) {
      const cx = x + 420 + chamber * 1350;
      const low = solid(`court-${chamber}`, cx, floor, 410);
      marker(low, cx + 325);
      const rise = realm.id === 'water' ? 70 : realm.id === 'fire' ? 110 : 100;
      const middle = solid(`step-${chamber}`, cx + 495, floor - rise, 210, true);
      marker(middle, cx + 610);
      const high = solid(`bell-${chamber}`, cx + 780, floor - rise * 2, 250, true);
      const leverId = `${prefix}-lever-${chamber}`, gateId = `${prefix}-shutter-${chamber}`;
      level.props.push({ id: leverId, type: 'lever', x: high.x + 95, y: high.y - 46, w: 28, h: 46, gateId });
      marker(high, high.x + 109, { leverId });
      const end = solid(`bridge-${chamber}`, cx + 1100, floor, 250);
      level.gates.push({ id: gateId, leverId, x: cx + 1230, y: 0, w: 22, h: floor });
      marker(end, cx + 1190); marker(end, cx + 1310);
      pickup(`rest-${chamber}`, 'health', cx + 1160, floor, { value: 30 });
      pickup(`fuel-${chamber}`, 'fuel', cx + 1200, floor, { value: 65 });
      const enemyType = chamber === 1 ? 'mage' : 'guard', eh = enemyType === 'mage' ? 50 : 44, ew = enemyType === 'mage' ? 34 : 30;
      level.enemies.push({ id: `${prefix}-watcher-${chamber}`, type: enemyType, x: cx + 140, y: floor - eh, w: ew, h: eh, hp: chamber === 1 ? 72 : 60,
        power: realm.id === 'fire' ? 'cinder' : 'rifle', facing: -1, minX: cx + 20, maxX: cx + 380 - ew, leashX: cx, leashW: 410 });
      if (chamber === 1) {
        level.enemies.push({ id: `${prefix}-bell-keeper`, type: 'mage', x: high.x + 180, y: high.y - 50, w: 34, h: 50, hp: 84,
          power: realm.id === 'fire' ? 'cinder' : 'soul', facing: -1, minX: high.x + 15, maxX: high.x + high.w - 49, leashX: high.x, leashW: high.w });
        const vault = solid('optional-reliquary', cx + 425, floor - rise * 2 - 100, 220, true);
        level.props.push({ id: `${prefix}-reliquary`, type: 'cache', x: vault.x + 85, y: vault.y - 40, w: 44, h: 40, hp: 24,
          contents: [{ type: realm.id === 'fire' ? 'weapon' : realm.id === 'water' ? 'sword' : 'spell', itemId: realm.id === 'fire' ? 'rocket' : realm.id === 'water' ? 'saber' : 'raven' }, { type: 'mana', value: 50 }] });
      }
      level.landmarks.push({ type: chamber === 1 ? 'lantern' : 'arch', x: high.x + 125, y: high.y, seed: 280 + realmIndex * 3 + chamber });
      if (realm.id === 'wind') level.currents.push({ id: `${prefix}-draft-${chamber}`, x: cx + 420, y: floor - 330, w: 650, h: 360, vx: 24, vy: -48 });
      if (realm.id === 'water') {
        level.currents.push({ id: `${prefix}-tide-${chamber}`, x: cx + 420, y: floor - 150, w: 650, h: 260, vx: -26, vy: 0 });
        level.movingPlatforms.push({ id: `${prefix}-raft-${chamber}`, kind: 'raft', x: cx + 490, y: floor + 65, w: 180, h: 24, oneWay: true, axis: 'x', distance: 190, period: 6, phase: chamber });
      }
      if (realm.id === 'fire') {
        level.crumble.push({ solidId: middle.id, delay: 1.15, restore: 2.8 });
        level.hazards.push({ id: `${prefix}-vent-${chamber}`, type: 'steam', x: cx + 1150, y: floor - 140, w: 24, h: 140, period: 4.2, onTime: .8, phase: chamber });
      }
    }
    const endX = addCrossingCourse(level, realm, prefix, x + 4470, floor, route, solid);
    const finish = solid('oath-court', endX - 70, floor, 970);
    const guardianId = `${prefix}-oath-guardian`, guardianGate = `${prefix}-guardian-seal`;
    level.enemies.push({ id: guardianId, name: `${realm.mentor.toUpperCase()} / BOUND GUARDIAN`, type: 'sentinel', major: true, soulValue: 35,
      x: endX + 220, y: floor - 90, w: 66, h: 90, hp: 240, shield: 20, facing: -1, power: realm.id === 'fire' ? 'cinder' : 'lightning',
      minX: endX + 40, maxX: endX + 500, leashX: endX - 70, leashW: 700 });
    level.gates.push({ id: guardianGate, requiresEnemyDefeated: guardianId, x: endX + 620, y: 0, w: 24, h: floor });
    marker(finish, endX + 110, { enemyId: guardianId });
    const oathId = `${prefix}-oath`;
    level.props.push({ id: oathId, type: 'lever', x: endX + 720, y: floor - 46, w: 28, h: 46, gateId: completionGate });
    marker(finish, endX + 734, { leverId: oathId });
    pickup('pact', 'spell', endX + 770, floor, { itemId: realm.power });
    level.portals.push({ id: returnId, pairId: `${prefix}-completion-pair`, destinationId: `${prefix}-completed`, x: endX + 830, y: floor - 46, w: 34, h: 46,
      to: { x: entranceX, y: hub.floorY - 46 }, label: 'Carry the oath home' });
    marker(finish, endX + 845, { portalId: returnId });
    detours.push({ id: hubFloor.id, x: entranceX + 15, y: hub.floorY, portalId: entryId, crossingId: prefix }, ...route);
    level.crossings.push({ ...realm, id: prefix, x, w: crossingWidth, completionGate, entryId, returnId, guardianId, route, solidIds: solids.map(s => s.id), targetMinutes: [3, 4] });
  }
  level.campaignRoute.splice(insertion, 0, ...detours);
  level.width = baseWidth + 700 + 2 * crossingStride + crossingWidth + 200;
  level.zones.sort((a, b) => a.x - b.x);
  level.guides.push({ x: hub.x + 150, y: hub.floorY - 155, text: 'THREE CROSSINGS\nRestore wind, water and flame to open the heart.' });
  const keeper = level.npcs.find(npc => npc.id.endsWith('-mira'));
  if (keeper) keeper.lines.at(-1).text = 'Recover Ember, Tide and Storm. At the heart, three crossings remain: restore wind, water and flame. No one gets left behind.';
  return level;
}
