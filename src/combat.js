import { createPlayer, stepPlayer, overlaps, moveBody, PHYSICS } from './physics.js';
import * as Levels from './level.js';
import { CATALOG, DIFFICULTIES, SPELLS } from './catalog.js';
import { switchWorldProgress } from './progress.js';

export const STEP = 1 / 120;
export function weaponOrigin(entity, slot = 'gun') {
  const facing = entity.facing || 1, center = entity.x + entity.w / 2;
  const aether = !!entity.sword || entity.type === 'clone', aetherScale = entity.h / 60;
  // Wyrm frame: trimmed body86high, anchor128/200, mouth228/128, shoulder mount156/100.
  if (entity.visualFamily === 'wyrm') {
    const scale = entity.h / 86;
    if (['mouth', 'core', 'hand', 'gun'].includes(slot)) return { x: center + facing * 100 * scale, y: entity.y + entity.h - 72 * scale };
    if (slot === 'rocket') return { x: center + facing * 28 * scale, y: entity.y + entity.h - 100 * scale };
  }
  if (entity.visualFamily === 'riftcrawler' && ['gun', 'mouth'].includes(slot)) return { x: center + facing * 30, y: entity.y + 6 };
  if (entity.visualFamily === 'hexwing' && slot === 'gun') return { x: center + facing * 30, y: entity.y + 22 };
  if (entity.visualFamily === 'crimsonmecha' && slot === 'gun') return { x: center + facing * 56 * entity.h / 71, y: entity.y + 23 * entity.h / 71 };
  if (slot === 'core') return { x: center, y: entity.y + entity.h * 0.35 };
  // Aether's canonical fire frame has feet64/116, hand80/75 and muzzle93/75.
  if (slot === 'hand') return aether ? { x: center + facing * 16 * aetherScale, y: entity.y + entity.h - 41 * aetherScale }
    : { x: center + facing * 5, y: entity.y + entity.h * 0.42 };
  if (slot === 'blade') return { x: center + facing * (entity.w / 2 + 3), y: aether ? entity.y + entity.h - 41 * aetherScale : entity.y + entity.h * 0.42 };
  if (aether && slot === 'gun') {
    const angle = entity.aimUp ? -Math.PI / 2 : Number.isFinite(entity.aimAngle) ? entity.aimAngle : facing > 0 ? 0 : Math.PI;
    const hand = weaponOrigin(entity, 'hand');
    return { x: hand.x + Math.cos(angle) * 13 * aetherScale, y: hand.y + Math.sin(angle) * 13 * aetherScale };
  }
  return { x: center + facing * (entity.sword ? 40 : entity.w / 2 + (slot === 'rocket' ? 14 : 8)),
    y: entity.y + entity.h * (slot === 'rocket' ? 0.26 : 0.36) };
}
export function projectileAim(entity, target, slot = 'gun', spread = 0, speed = 340) {
  const origin = weaponOrigin(entity, slot);
  let angle = Math.atan2(target.y + target.h / 2 - origin.y, target.x + target.w / 2 - origin.x) + spread;
  if (entity.visualFamily === 'wyrm' && slot !== 'rocket') {
    const forward = (entity.facing || 1) > 0 ? 0 : Math.PI;
    const relative = Math.atan2(Math.sin(angle - forward), Math.cos(angle - forward));
    angle = forward + Math.max(-0.75, Math.min(0.75, relative));
  }
  return { ...origin, angle, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}
function aimedBeam(entity, target, slot, range, width, tint, heavy = true) {
  const origin = weaponOrigin(entity, slot), forward = (entity.facing || 1) > 0 ? 0 : Math.PI;
  const raw = Math.atan2(target.y + target.h / 2 - origin.y, target.x + target.w / 2 - origin.x);
  const relative = Math.atan2(Math.sin(raw - forward), Math.cos(raw - forward));
  const angle = entity.aimUp ? -Math.PI / 2 : entity.sword && Number.isFinite(entity.aimAngle) ? entity.aimAngle : forward + Math.max(-0.75, Math.min(0.75, relative));
  const x1 = origin.x + Math.cos(angle) * range, y1 = origin.y + Math.sin(angle) * range;
  return { x0: origin.x, y0: origin.y, x1, y1, width, tint, heavy, angle,
    x: Math.min(origin.x, x1), y: Math.min(origin.y, y1) - width / 2,
    w: Math.max(width, Math.abs(x1 - origin.x)), h: Math.max(width, Math.abs(y1 - origin.y)) };
}
export function beamHit(beam, target) {
  return !!beam && Number.isFinite(beam.x0) && segmentHit(beam.x0, beam.y0, beam.x1, beam.y1, target, beam.width / 2);
}
const addOnce = (list, id) => { if (!list.includes(id)) list.push(id); };
const item = (category, id) => Array.isArray(CATALOG[category]) ? CATALOG[category].find(entry => entry.id === id) : undefined;
const nearby = (a, b, distance = 1500) => Math.abs(a.x - b.x) < distance;
const living = world => [...world.enemies.filter(e => !e.dead), ...world.enemySummons.filter(e => !e.dead && e.phase === 'attack'), ...world.bosses.filter(b => b.active && !b.dead)];
const inBossArena = (world, boss) => nearby(world.player, boss)
  && world.player.x + world.player.w >= (boss.arenaStart ?? boss.x - 1500)
  && world.player.x <= (boss.arenaEnd ?? boss.x + 1500)
  && Math.abs(world.player.y + world.player.h - (boss.floorY ?? boss.baseY + boss.h)) < 600;
const hasRunes = (world, object) => [object.requiresRelic, ...(object.requiresRelics || [])]
  .filter(Boolean).every(id => world.collections.includes(id));
const bossFloor = boss => boss.floorY ?? boss.baseY + boss.h;
function refreshSolids(world) {
  for (const gate of world.gates) if (!gate.open && (gate.requiresRelic || gate.requiresRelics?.length)
    && hasRunes(world, gate) && (!gate.bossId || world.progress.defeatedBosses.includes(gate.bossId))) {
    gate.open = true; addOnce(world.progress.openedGates, gate.id);
    emit(world, 'gate', gate.x, gate.y, { gateId: gate.id, rune: true });
  }
  world.solids = [...(world.staticSolids || world.level.solids).filter(solid => !solid.missing), ...(world.movingPlatforms || []), ...world.props.filter(p => !p.dead && p.collidable), ...world.gates.filter(g => !g.open)];
}
function applyArmor(player, armor, fill = false) {
  player.armor = armor.id; player.maxHp = armor.maxHp; player.maxMana = armor.maxMana; player.fuelRate = armor.fuelRate;
  player.hp = fill ? armor.maxHp : Math.min(player.hp, armor.maxHp);
  player.mana = fill ? armor.maxMana : Math.min(player.mana, armor.maxMana);
}
function alignEnemyBody(enemy, solids) {
  enemy.visualFamily ||= { guard: 'riftcrawler', drone: 'hexwing', sentinel: 'crimsonmecha' }[enemy.type] || enemy.type;
  const size = enemy.visualFamily === 'riftcrawler' ? [60, 41] : enemy.visualFamily === 'hexwing' ? [34, 45] : null;
  const center = enemy.x + enemy.w / 2, feet = enemy.y + enemy.h;
  if (size) {
    enemy.y += enemy.visualFamily === 'hexwing' ? (enemy.h - size[1]) / 2 : enemy.h - size[1];
    enemy.x += (enemy.w - size[0]) / 2; [enemy.w, enemy.h] = size;
  }
  enemy.baseY = enemy.y; enemy.homeX = enemy.x; enemy.patrolDirection = enemy.facing || 1;
  // Old +/-55px patrol hints are not combat leashes. Use the actual safe supporting span.
  enemy.minX = Number.isFinite(enemy.leashX) ? enemy.leashX : Math.max(0, enemy.x - 700);
  enemy.maxX = Number.isFinite(enemy.leashW) ? enemy.minX + enemy.leashW - enemy.w : enemy.x + 700;
  if (enemy.type !== 'drone') {
    const support = solids.find(solid => Math.abs(solid.y - feet) < 0.001 && center >= solid.x && center <= solid.x + solid.w && solid.w >= enemy.w);
    if (support) {
      enemy.minX = Math.max(support.x, enemy.minX);
      enemy.maxX = Math.min(support.x + support.w - enemy.w, enemy.maxX);
      enemy.minX = Math.min(enemy.minX, enemy.maxX);
      enemy.x = Math.max(enemy.minX, Math.min(enemy.maxX, enemy.x));
    }
  }
  return enemy;
}
export function createWorld(checkpoint = 0, options = {}) {
  const sourceProgress = options.progress || options.previous?.progress;
  const worldId = options.worldId || options.previous?.worldId || sourceProgress?.worldId || 'soulforge';
  const level = options.level || options.previous?.level || Levels.getLevel?.(worldId) || Levels.LEVEL;
  const rules = DIFFICULTIES.find(mode => mode.id === options.difficulty) || DIFFICULTIES[1];
  const progress = switchWorldProgress(sourceProgress, level.id || worldId);
  const index = Number.isInteger(checkpoint) && level.checkpoints[checkpoint] ? checkpoint : 0;
  const cp = level.checkpoints[index] || level.spawn;
  // Authored relay positions use the original 24×46 body; preserve their center and feet.
  const player = Object.assign(createPlayer(cp.x + 12 - PHYSICS.playerWidth / 2, cp.y + 46 - PHYSICS.playerHeight), {
    visualFamily: 'aether', hp: 100, maxHp: 100, mana: 100, maxMana: 100, invincible: 0.7,
    shootCooldown: 0, slashCooldown: 0, slashTime: 0, slashId: 0, combo: 0, comboWindow: 0, slashBuffer: 0, slashFacing: 1,
    rapid: 0, shield: 0, impaired: 0, stealth: 0, siphon: 0, boost: 0, burn: 0, burnTick: 0,
    spellCooldown: 0, laserTime: 0, beam: null, parryTime: 0, parries: 0, dashSlashId: -1,
    charges: progress.charges, ...progress.equipped,
  });
  applyArmor(player, item('armor', player.armor), true);
  if (options.previous) player.mana = Math.min(player.maxMana, Math.max(options.previous.player.mana, 30 * rules.recovery));
  const bosses = (level.bosses || [{ ...level.boss, id: 'warden', name: 'Warden', type: 'warden', triggerX: 8100 }])
    .map(b => ({ ...b, hp: progress.defeatedBosses.includes(b.id) ? 0 : Math.round(b.hp * rules.enemyHealth), maxHp: Math.round(b.hp * rules.enemyHealth),
      visualFamily: b.visualFamily || (b.type === 'regent' ? 'crimsonmecha' : b.type), form: 'ground', transformTime: 0,
      active: false, timer: 1.4, attack: 0, phase: 'idle', phaseTime: 0, lastSlash: -1,
      baseX: b.x, baseY: b.y, vx: 0, vy: 0, facing: -1, shield: b.shield ?? 60,
      weakened: 0, enraged: false, emotion: 'watching', taunt: '', tauntTime: 0, arrivalGrace: 0, blinkFlash: 0,
      dead: progress.defeatedBosses.includes(b.id), burn: 0, slow: 0 }));
  const world = {
    player, level, worldId: level.id || worldId, difficulty: rules.id, rules, progress, collections: progress.collections, unlocks: progress.unlocked,
    enemies: Levels.createEnemies(level).map(e => alignEnemyBody({ ...e, hp: Math.round(e.hp * rules.enemyHealth), maxHp: Math.round(e.hp * rules.enemyHealth), baseY: e.y,
      shield: e.shield ?? (e.type === 'sentinel' ? 35 : 0), weakened: 0, emotion: 'patrol',
      cooldown: 1.1 * rules.cadence, windup: 0, burn: 0, slow: 0, dead: e.x < cp.x - 350 }, level.solids)),
    bosses, boss: bosses.at(-1), activeBoss: null,
    props: (level.props || []).map(p => ({ ...p, hp: p.hp ?? 25,
      collidable: p.collidable ?? ['crate', 'barrel'].includes(p.type), dead: progress.destroyedProps.includes(p.id) })),
    gates: (level.gates || []).map(g => ({ ...g, open: progress.openedGates.includes(g.id) || progress.defeatedBosses.includes(g.bossId) })),
    npcs: (level.npcs || []).map(npc => ({ ...npc })), story: null,
    projectiles: Array.from({ length: 96 }, () => ({ active: false })),
    pickups: level.pickups.map(p => ({ ...p, taken: progress.claimed.includes(`pickup:${p.id}`) })),
    staticSolids: level.solids.map(solid => ({ ...solid })), movingPlatforms: (level.movingPlatforms || []).map(platform => ({ ...platform, baseX: platform.x, baseY: platform.y })),
    crumble: (level.crumble || []).map(entry => ({ ...entry, timer: 0, missing: 0 })),
    allies: [], enemySummons: [], enemyPortals: (level.enemyPortals || []).map(portal => ({ ...portal, phase: 'idle', timer: portal.period || 14 })),
    dynamicHazards: [], stasis: 0, missileWarning: null, pressureTimer: rules.missilePeriod,
    checkpoint: index, time: options.previous?.time || 0, kills: options.previous?.kills || 0,
    status: 'playing', events: [], bossDefeated: bosses.at(-1).dead,
    dialogue: '', dialogueTime: 0, hitstop: 0, deaths: options.previous?.deaths || 0,
    timeLeft: options.previous?.deathReason === 'deadline' ? rules.deadline * ((level.timeLimit || 510) / 510) : options.previous?.timeLeft ?? rules.deadline * ((level.timeLimit || 510) / 510),
  };
  progress.checkpoint = Math.max(progress.checkpoint, index);
  refreshSolids(world);
  return world;
}
export function retryWorld(world) {
  const retry = createWorld(world.checkpoint, { difficulty: world.difficulty, worldId: world.worldId, progress: world.progress, previous: world });
  retry.deaths++;
  return retry;
}
export function equipItem(world, category, id) {
  const definition = item(category, id);
  if (!definition || !world.progress.unlocked[category]?.includes(id)) return false;
  world.progress.equipped[category] = id;
  if (category === 'armor') applyArmor(world.player, definition);
  else world.player[category] = id;
  emit(world, 'equip', world.player.x, world.player.y, { category, itemId: id });
  return true;
}
export function cycleItem(world, category) {
  const unlocked = world.progress.unlocked[category];
  if (!unlocked?.length) return false;
  return equipItem(world, category, unlocked[(unlocked.indexOf(world.player[category]) + 1) % unlocked.length]);
}
export function say(world, text, duration = 4) { world.dialogue = text; world.dialogueTime = duration; }
function emit(world, type, x, y, extra = {}) { if (world.events.length < 160) world.events.push({ type, x, y, ...extra }); }
export function spawnProjectile(world, x, y, vx, vy, owner, missile = false) {
  if (![x, y, vx, vy].every(Number.isFinite)) return;
  const projectile = world.projectiles.find(entry => !entry.active);
  if (!projectile) return;
  Object.assign(projectile, { active: true, x, y, vx, vy, w: missile ? 14 : 8, h: missile ? 8 : 4,
    owner, missile, homing: missile, life: missile ? 5 : 2.2, damage: owner === 'player' ? 8 : missile ? 22 : 12,
    kind: missile ? 'rocket' : 'bullet', tint: owner === 'player' ? 0xeab76f : 0xff825f,
    heavy: false, reflectable: true, angle: Math.atan2(vy, vx), pierce: 1, hitIds: [], sourceId: null });
  return projectile;
}
export function segmentHit(x0, y0, x1, y1, box, padding = 0) {
  let near = 0, far = 1;
  for (const [start, end, low, high] of [[x0, x1, box.x - padding, box.x + box.w + padding], [y0, y1, box.y - padding, box.y + box.h + padding]]) {
    const delta = end - start;
    if (Math.abs(delta) < 0.0001) { if (start < low || start > high) return false; continue; }
    let a = (low - start) / delta, b = (high - start) / delta;
    if (a > b) [a, b] = [b, a];
    near = Math.max(near, a); far = Math.min(far, b);
    if (near > far) return false;
  }
  return true;
}
export function damagePlayer(world, amount, sourceX) {
  const p = world.player;
  if (!Number.isFinite(amount) || amount <= 0 || p.invincible > 0 || p.dashTime > 0 || world.status !== 'playing') return false;
  const damage = amount * world.rules.damage * item('armor', p.armor).damageTaken;
  const absorbed = Math.min(damage, p.shield); p.shield -= absorbed;
  p.hp = Math.max(0, p.hp - damage + absorbed); p.invincible = 0.85;
  p.vx = p.x + p.w / 2 < sourceX ? -230 : 230; p.vy = -170; p.stealth = 0;
  emit(world, 'hurt', p.x + p.w / 2, p.y + p.h / 2); world.hitstop = 0.035;
  if (p.hp === 0) die(world, 'damage');
  return true;
}
function die(world, reason) {
  world.player.hp = 0; world.status = 'dead'; world.deathReason = reason;
  emit(world, 'death', world.player.x + world.player.w / 2, world.player.y + world.player.h / 2, { reason });
}
function hitEnemy(world, enemy, amount, feedback = true, kind = 'power') {
  if (enemy.dead || enemy.hp <= 0 || amount <= 0) return;
  const boss = world.bosses.includes(enemy);
  if (boss && (enemy.form === 'transforming' || enemy.phase === 'transform')) return;
  const locked = enemy.shieldGateId && world.gates.some(gate => gate.id === enemy.shieldGateId && !gate.open);
  const shielded = enemy.shield > 0 && (enemy.weakened || 0) <= 0;
  const timing = boss && enemy.phase === 'charge' && kind === 'ranged' ? 0.35
    : boss && enemy.phase === 'idle' && kind === 'melee' ? 1.25 : 1;
  const resisted = amount * timing * (locked ? 0.15 : shielded ? 0.4 : enemy.weakened > 0 ? 1.25 : 1);
  if (shielded) enemy.shield = Math.max(0, enemy.shield - amount * 0.3);
  const damage = Math.min(enemy.hp, resisted);
  enemy.hp = Math.max(0, enemy.hp - damage);
  if (feedback) enemy.flash = 0.1;
  if (world.status === 'playing' && world.player.siphon > 0) world.player.hp = Math.min(world.player.maxHp, world.player.hp + damage * 0.25);
  if (feedback) emit(world, 'hit', enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
  if (enemy.hp > 0) return;
  enemy.dead = true; world.kills++;
  if (nearby(enemy, world.player)) world.player.mana = Math.min(world.player.maxMana, world.player.mana + 6 * world.rules.recovery);
  emit(world, 'explode', enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
  if (world.bosses.includes(enemy)) {
    addOnce(world.progress.defeatedBosses, enemy.id);
    for (const gate of world.gates) if (gate.bossId === enemy.id) openGate(world, gate);
    world.projectiles.forEach(projectile => { if (projectile.owner !== 'player') projectile.active = false; });
    world.dynamicHazards.length = 0; world.bossDefeated = world.boss.dead; world.activeBoss = null;
    say(world, `${enemy.name || enemy.id} // Soul engine severed. Move on.`, 5);
    emit(world, 'bossdead', enemy.x, enemy.y, { bossId: enemy.id });
  }
}
export function hazardState(hazard, time) {
  if (!hazard.period && hazard.type !== 'laser') return 'active';
  const period = hazard.period || 3.2, phase = ((time + (hazard.phase || 0)) % period + period) % period;
  if (phase < (hazard.onTime ?? 1.2)) return 'active';
  const warningTime = hazard.type === 'spikes' ? 0.35 : 0.55;
  return ['laser', 'spikes', 'steam', 'fire', 'emp'].includes(hazard.type) && phase > period - warningTime ? 'warning' : 'off';
}
export function rewardPlayer(world, reward, claimId) {
  if (!reward || world.status !== 'playing' || (claimId && world.progress.claimed.includes(claimId))) return false;
  const category = { weapon: 'gun', sword: 'sword', armor: 'armor', spell: 'spell' }[reward.type];
  if (category && !item(category, reward.itemId)) return false;
  if (reward.type === 'treasure' && !item('relic', reward.itemId)) return false;
  if (!category && !['health', 'fuel', 'rapid', 'shield', 'boost', 'mana', 'treasure', 'cannon', 'nova'].includes(reward.type)) return false;
  const p = world.player, value = Number.isFinite(reward.value) ? Math.max(0, Math.min(200, reward.value)) : null;
  if (category) { addOnce(world.progress.unlocked[category], reward.itemId); equipItem(world, category, reward.itemId); }
  if (reward.type === 'health') p.hp = Math.min(p.maxHp, p.hp + (value ?? 35) * world.rules.recovery);
  if (reward.type === 'mana') p.mana = Math.min(p.maxMana, p.mana + (value ?? 35) * world.rules.recovery);
  if (reward.type === 'fuel') p.fuel = Math.min(100, p.fuel + (value ?? 100));
  if (reward.type === 'rapid') p.rapid = value ?? 12;
  if (reward.type === 'shield') p.shield = Math.min(100, p.shield + (value ?? 35));
  if (reward.type === 'boost') p.boost = value ?? 10;
  if (reward.type === 'treasure') {
    const fresh = !world.collections.includes(reward.itemId);
    addOnce(world.collections, reward.itemId);
    if (fresh && reward.itemId === 'tide-glass') p.shield = Math.min(100, p.shield + 20);
    refreshSolids(world);
  }
  if (reward.type === 'cannon' || reward.type === 'nova') {
    p.charges[reward.type] = Math.min(9, p.charges[reward.type] + Math.floor(value ?? 1));
    addOnce(world.progress.unlocked[reward.type === 'cannon' ? 'gun' : 'spell'], reward.type === 'cannon' ? 'cannon' : 'eclipse');
  }
  if (claimId) addOnce(world.progress.claimed, claimId);
  emit(world, 'pickup', p.x + p.w / 2, p.y + p.h / 2, { kind: reward.type, itemId: reward.itemId });
  return true;
}
function openGate(world, gate) {
  if (gate.open) return;
  if (!hasRunes(world, gate)) return;
  gate.open = true; addOnce(world.progress.openedGates, gate.id); refreshSolids(world);
  for (const boss of world.bosses) if (boss.shieldGateId === gate.id) { boss.shield = 0; boss.weakened = 8; }
  emit(world, 'gate', gate.x, gate.y, { gateId: gate.id });
}
export function interact(world) {
  if (world.status !== 'playing' || world.story) return false;
  const p = world.player;
  const object = [...world.npcs, ...world.props.filter(prop => ['lever', 'valve', 'conduit'].includes(prop.type) && !prop.dead), ...(world.level.portals || []).map(portal => ({ ...portal, type: 'portal' }))]
    .filter(candidate => Math.abs(candidate.x + (candidate.w || 28) / 2 - p.x - p.w / 2) < 110
      && Math.abs(candidate.y + (candidate.h || 46) / 2 - p.y - p.h / 2) < 100)
    .sort((a, b) => Math.abs(a.x + (a.w || 28) / 2 - p.x - p.w / 2) - Math.abs(b.x + (b.w || 28) / 2 - p.x - p.w / 2))[0];
  if (!object) return false;
  const objectCenter = object.x + (object.w || 28) / 2;
  if (objectCenter !== p.x + p.w / 2) p.facing = objectCenter > p.x + p.w / 2 ? 1 : -1;
  if (!object.type) object.facing = -p.facing;
  if (object.type === 'portal') {
    if (!hasRunes(world, object)) { say(world, 'RUNE SEAL // Recover the missing heart before crossing.', 2); return false; }
    if (!object.to || !Number.isFinite(object.to.x) || !Number.isFinite(object.to.y)) return false;
    const to = { x: object.to.x + 12 - p.w / 2, y: object.to.y + 46 - p.h };
    if (to.x < 0 || to.x > world.level.width - p.w || to.y < 0 || to.y > world.level.height - p.h) return false;
    p.x = to.x; p.y = to.y; p.vx = 0; p.vy = 0;
    emit(world, 'portal', object.x, object.y, { to }); return true;
  }
  if (['lever', 'valve', 'conduit'].includes(object.type)) {
    const gate = world.gates.find(g => g.id === object.gateId || g.leverId === object.id);
    const boss = world.bosses.find(entry => entry.id === object.bossId);
    if (!gate && !boss) return false;
    if (gate) openGate(world, gate);
    if (boss) { boss.shield = 0; boss.weakened = 8; boss.emotion = 'weakened'; emit(world, 'weaken', boss.x, boss.y); }
    object.used = true; return true;
  }
  const reunion=object.id==='soulforge-mira'&&world.progress.claimed.includes('npc:soulforge-orren');
  world.story = { npcId: object.id, speaker: object.name, portrait: object.portrait || object.id,
    lines: reunion?[{speaker:'AETHER',text:'Orren is alive. He showed me how to break the Keeper.'},{speaker:'MIRA',text:'Then bring him home. I will keep this lantern burning until you return.'}]:Array.isArray(object.lines) && object.lines.length ? object.lines : [{ speaker: object.name, text: 'Keep your soul unbound.' }],
    choices: world.progress.claimed.includes(`npc:${object.id}`) ? [] : object.choices || [], index: 0 };
  emit(world, 'story', object.x, object.y, { npcId: object.id });
  return true;
}
export function advanceStory(world, choiceId) {
  const story = world.story;
  if (!story) return false;
  if (story.index < story.lines.length - 1) { if (choiceId !== undefined) return false; story.index++; return true; }
  const npc = world.npcs.find(entry => entry.id === story.npcId), claim = `npc:${story.npcId}`;
  if (story.choices.length && !world.progress.claimed.includes(claim)) {
    const choice = story.choices.find(entry => entry.id === choiceId);
    if (!choice || !Number.isFinite(choice.cost?.hp ?? 0) || !Number.isFinite(choice.cost?.mana ?? 0)
      || (choice.cost?.hp || 0) >= world.player.hp || (choice.cost?.mana || 0) > world.player.mana) return false;
    if (!choice || !rewardPlayer(world, choice.reward, claim)) return false;
    world.player.hp -= Math.max(0, choice.cost?.hp || 0);
    world.player.mana -= Math.max(0, choice.cost?.mana || 0);
    addOnce(world.progress.claimed, `choice:${choice.id}`);
    if (choice.effect?.type === 'ambush') {
      const portal = world.enemyPortals.find(entry => entry.id === choice.effect.enemyPortalId);
      if (portal) portal.timer = 0;
      if (Number.isFinite(choice.effect.damage)) damagePlayer(world, Math.max(0, choice.effect.damage), world.player.x);
    }
  } else if (!world.progress.claimed.includes(claim)) {
    if (npc?.reward && !rewardPlayer(world, npc.reward, claim)) return false;
    addOnce(world.progress.claimed, claim);
  }
  world.story = null; return true;
}
function destroyProp(world, prop) {
  if (prop.dead || ['lever', 'conduit', 'valve'].includes(prop.type)) return;
  prop.dead = true; addOnce(world.progress.destroyedProps, prop.id);
  emit(world, 'debris', prop.x + prop.w / 2, prop.y + prop.h / 2, { kind: prop.type });
  if (prop.contents) {
    const contents = Array.isArray(prop.contents) ? prop.contents : prop.contents ? [prop.contents] : [];
    contents.forEach((reward, index) => rewardPlayer(world, reward, `${prop.type === 'cache' ? 'cache' : 'prop'}:${prop.id}:${index}`));
  }
  if (prop.type === 'barrel') {
    const x = prop.x + prop.w / 2, blast = { x: x - 135, y: prop.y - 110, w: 270, h: 250 };
    emit(world, 'explode', x, prop.y, { radius: 135 });
    for (const enemy of living(world)) if (overlaps(blast, enemy)) hitEnemy(world, enemy, 55);
    for (const other of world.props) if (!other.dead && other.type !== 'lever' && overlaps(blast, other)) destroyProp(world, other);
    if (overlaps(blast, world.player)) damagePlayer(world, 16, x);
  }
  refreshSolids(world);
}
function hitProp(world, prop, damage) {
  if (prop.dead || ['lever', 'conduit', 'valve'].includes(prop.type)) return;
  prop.hp -= damage; prop.flash = 0.12;
  if (prop.hp <= 0) destroyProp(world, prop);
}
export function castSpell(world, id = world.player.spell) {
  const p = world.player, spell = SPELLS.find(entry => entry.id === id);
  if (!spell || world.status !== 'playing' || world.story || !world.unlocks.spell.includes(id)
    || p.spellCooldown > 0 || p.mana < spell.cost || (spell.charge && p.charges[spell.charge] <= 0)) return false;
  p.mana -= spell.cost; p.spellCooldown = spell.cooldown;
  if (spell.charge) p.charges[spell.charge]--;
  if (id !== 'veil') p.stealth = 0;
  emit(world, 'spell', p.x + p.w / 2, p.y + p.h / 2, { spell: id, radius: spell.radius || 800, tint: spell.tint });
  const targets = living(world);
  if (id === 'cinder') for (const enemy of targets) enemy.burn = Math.max(enemy.burn || 0, spell.duration);
  if (id === 'siphon') { p.siphon = spell.duration; for (const enemy of targets) if (nearby(enemy, p, 600)) hitEnemy(world, enemy, 14); }
  if (id === 'thunder') for (const enemy of targets) if (nearby(enemy, p, spell.radius)) {
    if (enemy.type === 'sentinel' && !world.bosses.includes(enemy)) {
      enemy.wardRestore = Math.max(enemy.wardRestore || 0, enemy.shield || 0);
      enemy.shield = 0; enemy.wardDisabled = 3; enemy.weakened = 3;
    }
    hitEnemy(world, enemy, world.bosses.includes(enemy) ? 32 : 48); enemy.slow = Math.max(enemy.slow || 0, 0.9);
    emit(world, 'thunder', enemy.x, enemy.y, { tint: spell.tint });
  }
  if (id === 'veil') p.stealth = spell.duration;
  if (id === 'stasis') { world.stasis = spell.duration; for (const enemy of targets) if (nearby(enemy, p, spell.radius)) enemy.slow = spell.duration; }
  if (['clone', 'wolf', 'dragon'].includes(id)) {
    if (world.allies.length >= 3) world.allies.shift();
    world.allies.push({ id: `ally-${id}-${world.time}`, type: id, x: p.x - p.facing * 55, y: p.y,
      w: id === 'dragon' ? 72 : 32, h: id === 'dragon' ? 48 : 40, facing: p.facing,
      phase: 'arrive', time: 0.7, life: spell.duration, cooldown: 0.5, hp: 60, damage: id === 'wolf' ? 18 : 12 });
    emit(world, 'summon', p.x - p.facing * 55, p.y + 40, { summon: id, phase: 'arrive' });
  }
  if (id === 'eclipse') {
    for (const enemy of targets) if (nearby(enemy, p, spell.radius)) { enemy.shield = 0; hitEnemy(world, enemy, world.bosses.includes(enemy) ? Math.max(130, enemy.maxHp * 0.25) : 200); }
    for (const prop of world.props) if (!prop.dead && nearby(prop, p, spell.radius)) destroyProp(world, prop);
    world.projectiles.forEach(projectile => { if (nearby(projectile, p, spell.radius)) projectile.active = false; });
    if (world.status === 'playing') { p.hp = Math.min(p.maxHp, p.hp + 45); p.mana = p.maxMana; p.fuel = 100; }
  }
  return true;
}
function shoot(world, input) {
  const p = world.player, gun = item('gun', p.gun);
  p.shootCooldown = gun.cooldown * (p.rapid > 0 ? 0.075 / 0.17 : p.impaired > 0 ? 0.36 / 0.17 : 1); p.stealth = 0;
  if (gun.id === 'rocket') { if (p.mana < gun.cost) return; p.mana -= gun.cost; }
  const analogAim = Number.isFinite(input.aimX) && Number.isFinite(input.aimY) && Math.hypot(input.aimX, input.aimY) > 0.25;
  p.aimAngle = input.aimUp ? -Math.PI / 2 : analogAim ? Math.atan2(input.aimY, input.aimX) : p.facing > 0 ? 0 : Math.PI;
  if (analogAim && Math.abs(input.aimX) > 0.1) p.facing = Math.sign(input.aimX);
  const up = input.aimUp, { x, y } = weaponOrigin(p, 'gun');
  if (gun.id === 'cannon') {
    if (p.charges.cannon <= 0) { say(world, 'OBLIVION // No charges. Seek a soul cache.', 2); return; }
    p.charges.cannon--; p.laserTime = 0.25;
    const aim = { x: x + (up ? 0 : p.facing * gun.range), y: y + (up ? -gun.range : 0), w: 0, h: 0 };
    p.beam = aimedBeam(p, aim, 'gun', gun.range, 34, gun.tint);
    for (const enemy of living(world)) if (beamHit(p.beam, enemy)) { enemy.shield = 0; hitEnemy(world, enemy, gun.damage, true, 'ranged'); }
    for (const prop of world.props) if (!prop.dead && beamHit(p.beam, prop)) destroyProp(world, prop);
    for (const projectile of world.projectiles) if (projectile.active && beamHit(p.beam, projectile)) projectile.active = false;
    emit(world, 'cannon', x, y, { beam: { ...p.beam }, tint: gun.tint }); return;
  }
  for (const offset of gun.id === 'scatter' ? [-160, -80, 0, 80, 160] : [0]) {
    const angle = p.aimAngle + offset / gun.speed;
    const projectile = spawnProjectile(world, x, y, Math.cos(angle) * gun.speed, Math.sin(angle) * gun.speed, 'player', gun.id === 'rocket');
    if (!projectile) continue;
    projectile.damage = gun.damage; projectile.kind = gun.id; projectile.tint = gun.tint;
    projectile.pierce = gun.pierce || 1; projectile.life = gun.id === 'scatter' ? 0.65 : gun.id === 'rocket' ? 4 : 2.2;
    if (gun.id === 'rocket') { projectile.heavy = true; projectile.reflectable = false; }
  }
  emit(world, 'shot', x, y, { gun: gun.id, tint: gun.tint });
}
function enemyFire(world, enemy, missile = false, spread = 0, kind = 'bullet') {
  const p = world.player;
  const speed = missile ? enemy.power === 'overload' ? 330 : 220 : kind === 'fire' ? 250 : enemy.type === 'drone' ? 270 : 340;
  if (enemy.power === 'infernal') kind = 'fire';
  enemy.weaponSlot = missile ? 'rocket' : enemy.type === 'mage' ? 'hand' : ['fire', 'hex'].includes(kind) ? 'core' : 'gun';
  const aim = projectileAim(enemy, p, enemy.weaponSlot, spread, speed);
  enemy.aimAngle = projectileAim(enemy, p, enemy.weaponSlot, 0, speed).angle;
  const { x, y } = aim;
  const projectile = spawnProjectile(world, x, y, aim.vx, aim.vy, 'enemy', missile);
  if (projectile) {
    projectile.kind = kind === 'bullet' && missile ? 'rocket' : kind;
    projectile.tint = kind === 'fire' ? 0xff825f : kind === 'hex' ? 0xc49bff : 0xff6689;
    if (world.bosses.includes(enemy)) { projectile.sourceId = enemy.id; if (missile) { projectile.heavy = true; projectile.reflectable = false; } }
  }
  emit(world, 'enemyshot', x, y, { kind, weaponSlot: enemy.weaponSlot, angle: aim.angle });
}
function updateEnemy(world, enemy, dt, solids) {
  const p = world.player, tick = dt * (enemy.slow > 0 ? 0.3 : 1);
  const dx = p.x + p.w / 2 - enemy.x - enemy.w / 2, distance = Math.abs(dx), toward = Math.sign(dx) || enemy.facing || 1;
  const alert = distance < 600 && Math.abs(p.y - enemy.y) < 420 && p.stealth <= 0;
  enemy.flash = Math.max(0, (enemy.flash || 0) - dt); enemy.dashTime = Math.max(0, (enemy.dashTime || 0) - tick);
  enemy.stagger = Math.max(0, (enemy.stagger || 0) - dt); enemy.attackTime = Math.max(0, (enemy.attackTime || 0) - tick);
  enemy.jumpCooldown = Math.max(0, (enemy.jumpCooldown || 0) - tick);
  enemy.patrolDirection ||= enemy.facing || 1;
  if (enemy.x <= (enemy.minX ?? 0) + 2) enemy.patrolDirection = 1;
  if (enemy.x >= (enemy.maxX ?? world.level.width - enemy.w) - 2) enemy.patrolDirection = -1;
  if (alert && enemy.dashTime === 0) enemy.facing = toward;
  let desired = 0;
  if (enemy.type === 'drone') {
    enemy.intent = !alert ? 'patrol' : distance < 150 ? 'retreat' : 'strafe';
    desired = !alert ? enemy.patrolDirection * 70 : distance < 150 ? -toward * 120 : toward * (distance > 280 ? 145 : 60);
    if (enemy.stagger <= 0) enemy.vx = desired;
    const desiredY = alert ? Math.max(30, Math.min(enemy.baseY + 150, Math.max(enemy.baseY - 150, p.y - 90)))
      + Math.sin(world.time * 2.4) * 32 : enemy.baseY + Math.sin(world.time * 2.4) * 32;
    enemy.vy = enemy.stagger > 0 ? enemy.vy || 0 : Math.max(-160, Math.min(160, (desiredY - enemy.y) * 3));
    moveBody(enemy, solids, tick);
  } else if (['guard', 'shade', 'mage', 'sentinel'].includes(enemy.type)) {
    const melee = enemy.type === 'guard' || enemy.type === 'shade';
    const speed = enemy.type === 'shade' ? 175 : enemy.type === 'guard' ? 145 : enemy.type === 'mage' ? 105 : 90;
    enemy.intent = !alert ? 'patrol' : !melee && distance < 210 ? 'retreat' : 'chase';
    desired = !alert ? enemy.patrolDirection * speed * 0.55 : enemy.intent === 'retreat' ? -toward * speed
      : toward * speed * (melee && distance < 68 ? 0.25 : 1);
    if (enemy.windup > 0) desired *= melee ? 0.3 : 0.5;
    if (enemy.stagger <= 0) enemy.vx = enemy.dashTime > 0 ? enemy.dashFacing * 360 : desired;
    const feet = enemy.y + enemy.h, ahead = enemy.x + (enemy.vx > 0 ? enemy.w + 10 : -10);
    const supported = solids.some(s => ahead >= s.x && ahead <= s.x + s.w && Math.abs(s.y - feet) < 30);
    const obstacle = solids.find(s => !s.oneWay && ahead >= s.x && ahead <= s.x + s.w && s.y < feet && s.y >= feet - 110);
    if (enemy.grounded && enemy.jumpCooldown === 0 && enemy.stagger <= 0
      && (obstacle || enemy.wall || (alert && p.y + p.h < feet - 55 && distance < 260))) {
      enemy.vy = -520; enemy.jumpCooldown = 1.2; enemy.action = 'jump';
    } else if (enemy.grounded && !supported && !obstacle) { enemy.vx = 0; enemy.patrolDirection *= -1; }
    enemy.vy = Math.min(900, (enemy.vy || 0) + PHYSICS.gravity * tick); moveBody(enemy, solids, tick);
  } else enemy.intent = 'aim';
  enemy.x = Math.max(enemy.minX ?? 0, Math.min(enemy.maxX ?? world.level.width - enemy.w, enemy.x));
  enemy.x = Math.max(0, Math.min(world.level.width - enemy.w, enemy.x)); enemy.y = Math.max(0, enemy.y);
  if (enemy.y > world.level.height + 70) { enemy.dead = true; return; }
  enemy.action = enemy.stagger > 0 ? 'hurt' : enemy.dashTime > 0 || enemy.attackTime > 0 ? 'attack'
    : enemy.windup > 0 ? 'windup' : enemy.vy < -20 ? 'jump' : Math.abs(enemy.vx || 0) > 8 ? 'run' : 'idle';
  enemy.emotion = enemy.weakened > 0 ? 'weakened' : enemy.stagger > 0 ? 'staggered' : enemy.windup > 0 ? 'aiming' : enemy.intent;
  if (enemy.stagger > 0) { enemy.windup = 0; enemy.telegraph = null; return; }
  if (alert) {
    enemy.cooldown = (enemy.cooldown ?? 1) - tick;
    const windup = enemy.type === 'guard' ? 0.32 : enemy.type === 'shade' ? 0.45 : enemy.type === 'drone' ? 0.4 : 0.65;
    if (enemy.cooldown < windup) {
      if (!enemy.windup) {
        enemy.aimX = p.x + p.w / 2; enemy.aimY = p.y + p.h / 2;
        enemy.attackKind = enemy.type === 'guard' && distance < 180 ? 'bite' : enemy.type === 'shade' ? 'lunge' : enemy.type === 'sentinel' ? 'beam' : 'shot';
        emit(world, 'enemywindup', enemy.x + enemy.w / 2, enemy.y, { enemyId: enemy.id, attack: enemy.attackKind, time: windup });
      }
      enemy.windup = windup - Math.max(0, enemy.cooldown);
      enemy.weaponSlot = enemy.type === 'mage' ? 'hand' : enemy.type === 'turret' ? 'rocket' : 'gun';
      const locked = { x: enemy.aimX, y: enemy.aimY, w: 0, h: 0 };
      enemy.telegraph = aimedBeam(enemy, locked, enemy.weaponSlot, enemy.attackKind === 'bite' || enemy.attackKind === 'lunge' ? 120 : 700, 8, 0xff825f);
      enemy.aimAngle = enemy.telegraph.angle;
    }
    if (enemy.cooldown <= 0) {
      if (enemy.attackKind === 'bite' || enemy.attackKind === 'lunge') {
        enemy.dashTime = enemy.attackKind === 'bite' ? 0.18 : 0.28; enemy.dashFacing = enemy.facing;
      } else if (enemy.type === 'sentinel') {
        enemy.beam = aimedBeam(enemy, { x: enemy.aimX, y: enemy.aimY, w: 0, h: 0 }, 'gun', 700, 18, 0x82e8ff);
        enemy.beamTime = 0.28; enemy.aimAngle = enemy.beam.angle; emit(world, 'thunder', enemy.beam.x0, enemy.beam.y0, { beam: enemy.beam });
      } else if (enemy.type === 'mage') for (const spread of [-0.2, 0, 0.2]) enemyFire(world, enemy, false, spread, 'fire');
      else enemyFire(world, enemy, enemy.type === 'turret');
      enemy.attackTime = 0.2; enemy.action = 'attack';
      enemy.cooldown = (enemy.type === 'drone' ? 1.7 : enemy.type === 'turret' ? 2.4 : enemy.type === 'mage' ? 2.3 : enemy.type === 'shade' ? 1.8 : enemy.type === 'sentinel' ? 2.6 : 1.15) * world.rules.cadence;
      enemy.windup = 0; enemy.telegraph = null;
    }
  } else { enemy.windup = 0; enemy.telegraph = null; }
  enemy.hidden = false;
  if (enemy.beamTime > 0) { enemy.beamTime -= tick; if (enemy.beamTime <= 0) enemy.beam = null; else if (beamHit(enemy.beam, p)) damagePlayer(world, 22, enemy.x); }
  if (overlaps(p, enemy)) damagePlayer(world, enemy.type === 'shade' ? 22 : enemy.type === 'guard' ? 12 : 16, enemy.x);
}
function finishBossAttack(boss, world) {
  boss.phase = 'idle'; boss.timer = (boss.hp < boss.maxHp / 2 ? 0.7 : 1.1) * world.rules.cadence * (boss.power === 'overload' ? 0.75 : 1);
  boss.phaseTime = 0; boss.beam = null; boss.telegraph = null; boss.portalSource = null; boss.portalExit = null;
  boss.guarding = false; boss.recovering = true;
}
function updateBoss(world, boss, dt) {
  if (boss.dead) return;
  if (!inBossArena(world, boss)) { boss.beam = null; return; }
  const p = world.player;
  if (!boss.active && p.x > (boss.triggerX ?? boss.x - 500)) {
    boss.active = true; boss.timer = 1.5; say(world, `${boss.name || boss.id} // Your unbound soul belongs to the engine.`, 5);
    emit(world, 'bossstart', boss.x, boss.y, { bossId: boss.id });
  }
  if (!boss.active) return;
  world.activeBoss = boss;
  boss.guarding = boss.phase === 'charge' || boss.phase === 'transform'; boss.recovering = boss.phase === 'idle';
  boss.facing = p.x + p.w / 2 < boss.x + boss.w / 2 ? -1 : 1;
  boss.weakened = Math.max(0, (boss.weakened || 0) - dt);
  boss.tauntTime = Math.max(0, (boss.tauntTime || 0) - dt);
  boss.arrivalGrace = Math.max(0, (boss.arrivalGrace || 0) - dt);
  boss.blinkFlash = Math.max(0, (boss.blinkFlash || 0) - dt);
  if (boss.mirrorExit) {
    boss.mirrorExit.time = Math.max(0, boss.mirrorExit.time - dt);
    if (boss.mirrorExit.time === 0) { queueEnemySummon(world, 'shade', boss.mirrorExit.x, boss.mirrorExit.y, 5, boss.id); boss.mirrorExit = null; }
  }
  if (boss.powerPulse) {
    const pulse = boss.powerPulse;
    pulse.time = Math.max(0, pulse.time - dt);
    if (pulse.phase === 'warning' && pulse.time === 0) { pulse.phase = 'active'; pulse.time = 1.2; }
    if (pulse.phase === 'active' && overlaps(p, pulse)) externalMove(world, p, pulse.vx, pulse.vy, dt);
    if (pulse.time === 0) boss.powerPulse = null;
  }
  if (boss.portalExit) {
    boss.portalExit.time = Math.max(0, boss.portalExit.time - dt);
    if (boss.portalExit.time === 0) {
      boss.x = boss.portalExit.x; boss.y = boss.portalExit.y; boss.vx = 0; boss.vy = 0;
      boss.portalExit = null; boss.arrivalGrace = 0.55; boss.blinkFlash = 0.4; boss.timer = Math.max(boss.timer, 0.45);
      emit(world, 'portalarrival', boss.x, boss.y, { bossId: boss.id });
    }
  }
  if (boss.hp < boss.maxHp * 0.35 && !boss.enraged) {
    boss.enraged = true; boss.taunt = boss.type === 'hex' ? 'THE DEAD REMEMBER YOU.' : boss.type === 'regent' ? 'KNEEL, UNBOUND.' : 'NO MORE MERCY.';
    boss.tauntTime = 2.5; emit(world, 'taunt', boss.x, boss.y, { text: boss.taunt });
    if (boss.type === 'regent' && boss.form === 'ground') {
      boss.form = 'transforming'; boss.phase = 'transform'; boss.timer = 0.9; boss.transformTime = 0.9;
      boss.beam = null; boss.telegraph = null; boss.portalSource = null; boss.portalExit = null; boss.mirrorExit = null; boss.powerPulse = null;
      boss.arrivalGrace = 0.9; boss.vx = 0; boss.vy = 0;
      for (const projectile of world.projectiles) if (projectile.sourceId === boss.id && projectile.owner !== 'player') projectile.active = false;
      emit(world, 'transform', boss.x + boss.w / 2, boss.y + boss.h / 2, { bossId: boss.id, form: 'warning', time: 0.9 });
    }
  }
  boss.emotion = boss.form === 'transforming' ? 'transforming' : boss.weakened > 0 ? 'weakened' : boss.enraged ? 'enraged' : boss.phase === 'charge' ? 'focused' : boss.phase === 'attack' ? 'furious' : 'watching';
  const distance = Math.abs(p.x + p.w / 2 - boss.x - boss.w / 2);
  const direction = p.x + p.w / 2 < boss.x + boss.w / 2 ? -1 : 1;
  boss.intent = distance < 160 ? 'retreat' : 'chase';
  boss.vx = boss.phase === 'idle' ? (distance < 160 ? -direction * 105 : direction * (distance > 300 ? 170 : 80)) * (boss.enraged ? 1.2 : 1) : 0;
  if (boss.form === 'transforming') { boss.vx = 0; boss.vy = 0; }
  else if (boss.form === 'flying') {
    const desiredY = Math.max(40, boss.baseY - 45 + Math.sin(world.time * 1.7) * 16);
    boss.vy = Math.max(-130, Math.min(130, (desiredY - boss.y) * 5));
    moveBody(boss, world.solids, dt);
  }
  else if (boss.type === 'hex') { boss.x += boss.vx * dt; boss.y = boss.baseY + Math.sin(world.time * 1.8) * 14; }
  else { boss.vy = (boss.vy || 0) + 1800 * dt; moveBody(boss, world.solids, dt); }
  boss.x = Math.max(boss.arenaStart + 45, Math.min(boss.arenaEnd - boss.w - 45, boss.x));
  boss.y = Math.max(0, boss.y);
  const tick = dt * (boss.slow > 0 ? 0.65 : 1);
  boss.flash = Math.max(0, (boss.flash || 0) - dt); boss.timer -= tick; boss.phaseTime += tick;
  if (boss.form === 'transforming') {
    boss.transformTime = Math.max(0, boss.timer);
    if (boss.timer <= 0) {
      const oldHeight = boss.h;
      boss.h = 86; boss.y += oldHeight - boss.h; boss.baseY += oldHeight - boss.h;
      boss.form = 'flying'; boss.visualFamily = 'wyrm'; boss.arrivalGrace = 0.45;
      finishBossAttack(boss, world);
      emit(world, 'transform', boss.x + boss.w / 2, boss.y + boss.h / 2, { bossId: boss.id, form: 'flying' });
    }
    return;
  }
  if (boss.phase === 'idle' && boss.timer <= 0) {
    boss.attack = (boss.attack + 1) % 3; boss.phase = 'charge'; boss.phaseTime = 0; boss.guarding = true; boss.recovering = false;
    boss.weaponSlot = boss.attack === 2 || boss.type === 'hex' ? 'core'
      : boss.type === 'regent' && boss.attack === 0 || boss.type === 'warden' && boss.attack === 1 ? 'rocket' : 'gun';
    boss.timer = boss.attack === 2 ? 1.1 : boss.type === 'hex' ? 0.9 : 0.85;
    if (boss.power === 'undertow') {
      const floor = bossFloor(boss);
      boss.powerPulse = { x: Math.max(boss.arenaStart, Math.min(boss.arenaEnd - 280, p.x - 120)), y: Math.max(0, floor - 400), w: 280, h: Math.min(400, floor),
        vx: p.x < boss.x ? 80 : -80, vy: 0, phase: 'warning', time: 0.7 };
      emit(world, 'currentwarning', boss.powerPulse.x, floor - 50, { bossId: boss.id, pulse: { ...boss.powerPulse } });
    }
    if (boss.power === 'mirror') {
      boss.mirrorExit = { x: Math.max(boss.arenaStart + 60, Math.min(boss.arenaEnd - 80, p.x + (p.x < boss.x ? -150 : 150))), y: bossFloor(boss) - 44, time: 0.9 };
      emit(world, 'portalwarning', boss.mirrorExit.x, bossFloor(boss), { bossId: boss.id, time: 0.9 });
    }
    if (boss.attack === 0 && ['hex', 'regent'].includes(boss.type)) {
      const away = p.x < boss.x ? 1 : -1;
      const candidates = [boss.x + away * 320, boss.x - away * 400]
        .map(x => Math.max(boss.arenaStart + 70, Math.min(boss.arenaEnd - boss.w - 70, x)));
      const exitX = candidates.find(x => Math.abs(x - boss.x) > 100 && Math.abs(x - p.x) > boss.w + p.w + 100);
      if (exitX !== undefined) {
        boss.portalSource = { x: boss.x, y: boss.y };
        const exitY = boss.form === 'flying' ? Math.max(40, boss.baseY - 45) : boss.baseY;
        boss.portalExit = { x: exitX, y: exitY, time: 0.8 }; boss.timer = Math.max(1.1, boss.timer);
        emit(world, 'portalwarning', exitX, exitY + boss.h, { bossId: boss.id, time: 0.8 });
      }
    }
    boss.aimY = p.y + p.h / 2; boss.aimX = p.x + p.w / 2;
    const origin = weaponOrigin(boss, 'core');
    const range = Math.min(1400, boss.facing > 0 ? boss.arenaEnd - origin.x : origin.x - boss.arenaStart);
    boss.telegraph = aimedBeam(boss, { x: boss.aimX, y: boss.aimY, w: 0, h: 0 }, 'core', range, 14, boss.type === 'regent' ? 0xff6689 : 0x82e8ff);
    boss.aimAngle = boss.weaponSlot === 'core' ? boss.telegraph.angle : projectileAim(boss, p, boss.weaponSlot).angle;
    if (boss.attack === 0 && boss.type !== 'hex' && boss.form !== 'flying' && boss.grounded) boss.vy = -360;
    emit(world, 'charge', boss.x, boss.y + 55, { bossId: boss.id, attack: boss.attack });
  } else if (boss.phase === 'charge' && boss.timer <= 0) {
    boss.phase = 'attack'; boss.phaseTime = 0; boss.shots = 0; boss.guarding = false; boss.recovering = false;
    boss.timer = boss.attack === 2 || (boss.type === 'hex' && boss.attack === 1) ? 0.85 : 0.14;
  }
  if (boss.phase === 'charge' && boss.telegraph) {
    const origin = weaponOrigin(boss, 'core');
    const range = Math.min(1400, boss.facing > 0 ? boss.arenaEnd - origin.x : origin.x - boss.arenaStart);
    boss.telegraph = aimedBeam(boss, { x: boss.aimX, y: boss.aimY, w: 0, h: 0 }, 'core', range, 14, boss.telegraph.tint);
    if (boss.weaponSlot === 'core') boss.aimAngle = boss.telegraph.angle;
  }
  if (boss.phase !== 'attack') return;
  if (boss.attack === 2 || (boss.type === 'hex' && boss.attack === 1)) {
    const origin = weaponOrigin(boss, 'core');
    const range = Math.min(1400, boss.facing > 0 ? boss.arenaEnd - origin.x : origin.x - boss.arenaStart);
    boss.beam = aimedBeam(boss, { x: boss.aimX, y: boss.aimY, w: 0, h: 0 }, 'core', range, 14, boss.telegraph.tint);
    boss.weaponSlot = 'core';
    boss.aimAngle = boss.beam.angle;
    if (boss.type === 'hex' && boss.attack === 2 && boss.shots === 0) { queueEnemySummon(world, 'shade', p.x + 110, bossFloor(boss) - 44, 8, boss.id); boss.shots++; }
    if (boss.type === 'regent' && boss.attack === 2 && boss.phaseTime > 0.3 && boss.shots === 0) {
      for (const spread of [-0.3, 0, 0.3]) enemyFire(world, boss, true, spread, 'hex'); boss.shots++;
    }
    if (beamHit(boss.beam, p)) damagePlayer(world, boss.type === 'regent' ? 30 : 24, boss.x);
    if (boss.timer <= 0) finishBossAttack(boss, world);
  } else if (boss.timer <= 0) {
    boss.weaponSlot = boss.type === 'regent' && boss.attack === 0 || boss.type === 'warden' && boss.attack === 1 ? 'rocket' : 'gun';
    const direction = boss.facing, { x, y } = weaponOrigin(boss, boss.weaponSlot);
    boss.aimAngle = projectileAim(boss, p, boss.weaponSlot).angle;
    if (boss.type === 'hex') for (const spread of [-0.45, -0.22, 0, 0.22, 0.45]) enemyFire(world, boss, false, spread, 'hex');
    else if (boss.type === 'regent') for (const spread of [-0.2, 0, 0.2]) enemyFire(world, boss, boss.attack === 0, spread, boss.attack === 0 ? 'missile' : 'hex');
    else if (boss.attack === 0) for (const spread of [-0.25, 0, 0.25]) {
      const aim = projectileAim(boss, p, 'gun', spread, 330);
      const projectile = spawnProjectile(world, aim.x, aim.y, aim.vx, aim.vy, 'enemy');
      if (projectile) { projectile.sourceId = boss.id; if (boss.power === 'infernal') { projectile.kind = 'fire'; projectile.tint = 0xff825f; } }
    } else {
      const aim = projectileAim(boss, p, 'rocket', 0, boss.power === 'overload' ? 345 : 230);
      const projectile = spawnProjectile(world, aim.x, aim.y, aim.vx, aim.vy, 'enemy', true);
      if (projectile) { projectile.sourceId = boss.id; projectile.heavy = true; projectile.reflectable = false;
        if (boss.power === 'infernal') { projectile.kind = 'fire'; projectile.tint = 0xff825f; } }
    }
    if (boss.power === 'overload' && boss.weaponSlot === 'rocket') enemyFire(world, boss, true, 0.4, 'rocket');
    emit(world, 'enemyshot', x, y, { bossId: boss.id, weaponSlot: boss.weaponSlot, angle: boss.aimAngle }); boss.shots++;
    boss.timer = (boss.hp < boss.maxHp / 2 ? 0.27 : 0.38) * world.rules.cadence * (boss.enraged ? 0.8 : 1);
    if (boss.shots >= (boss.attack === 0 ? 4 : 3)) finishBossAttack(boss, world);
  }
}
function externalMove(world, body, vx, vy, dt, excluded) {
  const oldVx = body.vx, oldVy = body.vy;
  body.vx = vx; body.vy = vy;
  moveBody(body, world.solids.filter(solid => solid !== excluded), dt);
  body.vx = oldVx; body.vy = oldVy;
}
function updateEnvironment(world, dt) {
  const p = world.player;
  for (const platform of world.movingPlatforms) {
    const oldX = platform.x, oldY = platform.y;
    const standing = p.grounded && Math.abs(p.y + p.h - oldY) < 0.01 && p.x < oldX + platform.w && p.x + p.w > oldX;
    const offset = Math.sin((world.time + (platform.phase || 0)) * Math.PI * 2 / platform.period) * platform.distance;
    if (platform.axis === 'y') platform.y = platform.baseY + offset; else platform.x = platform.baseX + offset;
    platform.dx = platform.x - oldX; platform.dy = platform.y - oldY;
    if (standing) {
      externalMove(world, p, platform.dx / dt, platform.dy / dt, dt, platform);
      p.grounded = Math.abs(p.y + p.h - platform.y) < 0.01;
    }
  }
  for (const crumble of world.crumble) {
    const solid = world.staticSolids.find(entry => entry.id === crumble.solidId);
    if (!solid) continue;
    if (crumble.missing > 0) {
      crumble.missing = Math.max(0, crumble.missing - dt);
      if (crumble.missing === 0 && overlaps(p, solid)) crumble.missing = dt;
      solid.missing = crumble.missing > 0;
      continue;
    }
    const standing = p.grounded && Math.abs(p.y + p.h - solid.y) < 0.01 && p.x < solid.x + solid.w && p.x + p.w > solid.x;
    crumble.timer = standing ? crumble.timer + dt : Math.max(0, crumble.timer - dt);
    solid.crack = Math.min(1, crumble.timer / crumble.delay);
    if (crumble.timer >= crumble.delay) {
      crumble.missing = crumble.restore; crumble.timer = 0; solid.missing = true;
      emit(world, 'crumble', solid.x, solid.y);
    }
  }
  refreshSolids(world);
  for (const current of world.level.currents || []) if (overlaps(p, current)) externalMove(world, p, current.vx || 0, current.vy || 0, dt);
}
function queueEnemySummon(world, type, x, y, lifetime = 8, sourceId = null) {
  if (world.enemySummons.length >= 12) return false;
  const summon = { id: `summon-${world.time}-${world.enemySummons.length}`, type, x, y, w: 30, h: 44,
    hp: 28 * world.rules.enemyHealth, maxHp: 28 * world.rules.enemyHealth, facing: -1,
    minX: x - 180, maxX: x + 180, baseY: y, cooldown: 1.2, windup: 0,
    phase: 'arrive', time: 0.7, life: lifetime, sourceId, burn: 0, slow: 0, weakened: 0 };
  alignEnemyBody(summon, world.solids);
  world.enemySummons.push(summon);
  emit(world, 'portalwarning', summon.x + summon.w / 2, summon.y + summon.h, { summon: type, time: 0.7 });
  return true;
}
function updateSummons(world, dt) {
  const p = world.player;
  for (const portal of world.enemyPortals) {
    if (!nearby(portal, p, 1400) || (portal.requiresClaim && !world.progress.claimed.includes(portal.requiresClaim))) continue;
    portal.timer -= dt;
    if (portal.phase === 'idle' && portal.timer <= 0) {
      portal.phase = 'warning'; portal.timer = 1.1;
      emit(world, 'portalwarning', portal.x, portal.y, { summon: portal.type, time: 1.1 });
    } else if (portal.phase === 'warning' && portal.timer <= 0) {
      queueEnemySummon(world, portal.type || 'shade', portal.x, portal.y, portal.lifetime || 8);
      portal.phase = 'idle'; portal.timer = portal.period || 14;
    }
  }
  for (const summon of [...world.allies, ...world.enemySummons]) {
    summon.life -= dt; summon.time = Math.max(0, summon.time - dt);
    if (summon.life <= 0 || summon.dead) {
      if (summon.phase !== 'expire') { summon.phase = 'expire'; summon.time = 0.35; summon.dead = true; emit(world, 'summonexpire', summon.x, summon.y); }
      continue;
    }
    if (summon.phase === 'arrive' && summon.time === 0) { summon.phase = 'attack'; emit(world, 'summonarrival', summon.x, summon.y, { summon: summon.type }); }
    if (summon.phase !== 'attack' || world.enemySummons.includes(summon)) continue;
    const target = living(world).filter(enemy => nearby(enemy, summon, 1100)).sort((a, b) => Math.abs(a.x - summon.x) - Math.abs(b.x - summon.x))[0];
    summon.cooldown = Math.max(0, summon.cooldown - dt);
    summon.attackTime = Math.max(0, (summon.attackTime || 0) - dt);
    const destination = target ? target.x - (target.x > summon.x ? 100 : -100) : p.x - p.facing * 65;
    summon.facing = target && summon.type === 'clone'
      ? Math.sign(target.x + target.w / 2 - summon.x - summon.w / 2) || summon.facing : destination > summon.x ? 1 : -1;
    summon.action = summon.attackTime > 0 ? 'attack' : Math.abs(destination - summon.x) > 30 ? 'run' : 'idle';
    if (summon.type === 'wolf') {
      summon.vx = Math.sign(destination - summon.x) * Math.min(240, Math.abs(destination - summon.x) * 4);
      summon.vy = (summon.vy || 0) + 1800 * dt;
      if (summon.wall && summon.grounded) summon.vy = -530;
      moveBody(summon, world.solids, dt);
    } else {
      summon.x += Math.sign(destination - summon.x) * Math.min(180, Math.abs(destination - summon.x) * 4) * dt;
      const desiredY = summon.type === 'dragon' ? Math.max(80, (target?.y || p.y) - 90) : p.y;
      summon.y += (desiredY - summon.y) * Math.min(1, dt * 5);
    }
    if (target && summon.cooldown === 0) {
      if (summon.type === 'wolf' && Math.abs(target.x - summon.x) < 140) hitEnemy(world, target, 18);
      else if (summon.type !== 'wolf') {
        if (summon.type === 'clone') {
          const hand = weaponOrigin(summon, 'hand');
          summon.aimAngle = Math.atan2(target.y + target.h / 2 - hand.y, target.x + target.w / 2 - hand.x);
        }
        const aim = projectileAim(summon, target, summon.type === 'dragon' ? 'core' : 'gun', 0, 700);
        const projectile = spawnProjectile(world, aim.x, aim.y, aim.vx, aim.vy, 'player');
        if (projectile) { projectile.kind = summon.type === 'dragon' ? 'dragonfire' : 'ally'; projectile.damage = summon.type === 'dragon' ? 20 : 12; projectile.tint = summon.type === 'dragon' ? 0xff825f : 0x82e8ff; }
      }
      summon.cooldown = summon.type === 'dragon' ? 0.65 : 0.8; summon.attackTime = 0.18;
    }
  }
  world.allies = world.allies.filter(summon => summon.phase !== 'expire' || summon.time > 0);
  world.enemySummons = world.enemySummons.filter(summon => summon.phase !== 'expire' || summon.time > 0);
}
function updatePressure(world, dt) {
  world.pressureTimer -= dt;
  if (!world.missileWarning && world.pressureTimer <= 0) {
    world.missileWarning = { y: Math.min(world.level.height - 30, Math.max(30, world.player.y + world.player.h / 2)), time: 1.1 };
    emit(world, 'missilewarning', world.player.x + 900, world.missileWarning.y);
  }
  if (!world.missileWarning) return;
  world.missileWarning.time -= dt;
  if (world.missileWarning.time > 0) return;
  const x = Math.min(world.level.width - 30, world.player.x + 1100), count = world.difficulty === 'extinction' ? 3 : world.difficulty === 'inferno' ? 2 : 1;
  for (let i = 0; i < count; i++) {
    const projectile = spawnProjectile(world, x + i * 65, world.missileWarning.y + (i % 2 ? -65 : 0), -360, 0, 'enemy', true);
    if (projectile) { projectile.kind = 'pressure'; projectile.homing = false; projectile.life = 6; projectile.heavy = true; projectile.reflectable = false; }
  }
  world.missileWarning = null; world.pressureTimer = world.rules.missilePeriod;
}
function updateProjectiles(world, slashBox, dt) {
  const p = world.player;
  for (const projectile of world.projectiles) {
    if (!projectile.active) continue;
    if (projectile.owner !== 'player' && projectile.sourceId) {
      const boss = world.bosses.find(entry => entry.id === projectile.sourceId);
      if (boss && (!inBossArena(world, boss) || boss.dead)) { projectile.active = false; continue; }
    }
    const oldX = projectile.x, oldY = projectile.y;
    const tick = dt * (world.stasis > 0 && projectile.owner !== 'player' && nearby(projectile, p, 800) ? 0.3 : 1);
    if (projectile.missile && projectile.homing && projectile.owner !== 'player') {
      const angle = Math.atan2(p.y + p.h / 2 - projectile.y, p.x + p.w / 2 - projectile.x);
      projectile.vx += Math.cos(angle) * 70 * tick; projectile.vy += Math.sin(angle) * 70 * tick;
    }
    projectile.x += projectile.vx * tick; projectile.y += projectile.vy * tick; projectile.life -= dt;
    if (projectile.life <= 0) { projectile.active = false; continue; }
    projectile.angle = Math.atan2(projectile.vy, projectile.vx);
    if (p.parryTime > 0 && p.parries < 2 && projectile.reflectable && !projectile.heavy && projectile.owner === 'enemy' && segmentHit(oldX, oldY, projectile.x, projectile.y, slashBox, 3)) {
      p.parries++;
      projectile.owner = 'player'; projectile.vx = p.facing * 920; projectile.vy = -30; projectile.damage = 16;
      p.mana = Math.min(p.maxMana, p.mana + 5);
      projectile.homing = false; projectile.hitIds = []; emit(world, 'parry', projectile.x, projectile.y); continue;
    }
    if (world.solids.some(solid => !solid.oneWay && !world.props.includes(solid) && segmentHit(oldX, oldY, projectile.x, projectile.y, solid, 1))) {
      projectile.active = false; emit(world, projectile.missile ? 'explode' : 'spark', projectile.x, projectile.y); continue;
    }
    if (projectile.owner === 'player') {
      const contacts = [...living(world), ...world.props.filter(prop => !prop.dead && prop.type !== 'lever')]
        .filter(target => !projectile.hitIds.includes(target.id) && segmentHit(oldX, oldY, projectile.x, projectile.y, target, 2))
        .sort((a, b) => Math.abs(a.x - oldX) - Math.abs(b.x - oldX));
      for (const target of contacts) {
        projectile.hitIds.push(target.id);
        if (world.props.includes(target)) hitProp(world, target, projectile.damage); else hitEnemy(world, target, projectile.damage, true, 'ranged');
        if (projectile.kind === 'rocket') {
          for (const other of living(world)) if (other !== target && nearby(other, target, 100)) hitEnemy(world, other, 15);
          emit(world, 'explode', projectile.x, projectile.y, { radius: 90 });
        }
        if (--projectile.pierce <= 0) { projectile.active = false; break; }
      }
    } else if (segmentHit(oldX, oldY, projectile.x, projectile.y, p, 2)) {
      projectile.active = false;
      if (damagePlayer(world, projectile.damage, projectile.x) && projectile.kind === 'fire') p.burn = 3;
      emit(world, projectile.missile ? 'explode' : 'spark', projectile.x, projectile.y);
    }
  }
}
export function stepWorld(world, input = {}, dt = STEP) {
  if (!Number.isFinite(dt) || dt <= 0) throw new RangeError('Simulation step must be positive and finite.');
  if (dt > STEP + 1e-9) {
    const held = Object.fromEntries(Object.entries(input).map(([key, value]) => [key, key.endsWith('Pressed') ? false : value]));
    for (let remaining = dt, first = true; remaining > 1e-9 && world.status === 'playing' && !world.story; first = false) {
      const tick = Math.min(STEP, remaining); stepWorld(world, first ? input : held, tick); remaining -= tick;
    }
    return;
  }
  if (world.status !== 'playing' || world.story) return;
  const p = world.player;
  world.time += dt; world.timeLeft = Math.max(0, world.timeLeft - dt);
  updateEnvironment(world, dt);
  if (world.timeLeft === 0) { die(world, 'deadline'); return; }
  world.dialogueTime = Math.max(0, world.dialogueTime - dt); world.stasis = Math.max(0, world.stasis - dt); p.aimUp = !!input.aimUp;
  for (const key of ['invincible', 'shootCooldown', 'slashCooldown', 'slashTime', 'slashBuffer', 'comboWindow', 'rapid', 'impaired', 'stealth', 'siphon', 'boost', 'burn', 'burnTick', 'spellCooldown', 'laserTime', 'parryTime']) p[key] = Math.max(0, (p[key] || 0) - dt);
  if (input.slashPressed) p.slashBuffer = 0.12;
  if (p.laserTime === 0) p.beam = null;
  p.mana = Math.min(p.maxMana, p.mana + 2.5 * dt);
  if (p.burn > 0 && p.burnTick === 0) { damagePlayer(world, 5, p.x); p.burnTick = 0.9; }
  if (world.status !== 'playing') return;
  if (input.cycleGunPressed) cycleItem(world, 'gun');
  if (input.cycleSwordPressed) cycleItem(world, 'sword');
  if (input.cycleSpellPressed) cycleItem(world, 'spell');
  if (input.interactPressed && interact(world)) return;
  if (input.spellPressed) castSpell(world);
  if (input.ultimatePressed) castSpell(world, 'eclipse');
  if (world.status !== 'playing') return;
  const physicsInput = p.impaired ? { ...input, move: (input.move || 0) * 0.6, dashPressed: false, jet: false } : input;
  const solids = world.solids.filter(solid => solid.x + solid.w > p.x - 1500 && solid.x < p.x + 1500);
  const previousX = p.x, previousY = p.y;
  for (const name of stepPlayer(p, physicsInput, solids, dt)) {
    emit(world, name, p.x + p.w / 2, p.y + p.h);
    if (name === 'dash') {
      p.slashId++; p.dashSlashId = p.slashId; p.slashTime = p.dashTime; p.slashFacing = p.facing;
      p.parryTime = 0; p.parries = 2; p.slashBuffer = 0; p.stealth = 0;
    }
  }
  p.x = Math.max(0, Math.min(world.level.width - p.w, p.x));
  if (p.y < 0) { p.y = 0; p.vy = Math.max(0, p.vy); }
  if (p.y > world.level.height + 70) { die(world, 'fall'); return; }
  const sword = item('sword', p.sword);
  if (p.slashBuffer > 0 && p.slashCooldown <= 0 && p.dashTime <= 0) {
    p.combo = p.comboWindow > 0 ? (p.combo + 1) % 3 : 0;
    p.comboWindow = 0.65; p.slashCooldown = sword.cooldown; p.slashTime = 0.2; p.slashId++; p.stealth = 0; p.parryTime = 0.1; p.parries = 0;
    p.slashBuffer = 0; p.slashFacing = p.facing;
    const blade = weaponOrigin(p, 'blade');
    emit(world, 'slash', blade.x, blade.y, { facing: p.facing, sword: p.sword, tint: sword.tint });
  }
  if (input.shoot && p.shootCooldown <= 0) shoot(world, input);
  if (world.status !== 'playing') return;
  p.slashMode = p.dashTime > 0 ? 'dash' : ['horizontal', 'vertical', 'finisher'][p.combo];
  const horizontal = p.slashMode === 'horizontal' || p.slashMode === 'dash';
  const reach = horizontal ? sword.width + 20 : sword.width;
  const slashBox = { x: p.slashFacing > 0 ? p.x + 3 : p.x + p.w - reach - 3,
    y: horizontal ? p.y + p.h - 68 : p.y + p.h - 3 - sword.height, w: reach, h: horizontal ? 72 : sword.height };
  if (p.dashTime > 0) { slashBox.x = Math.min(slashBox.x, slashBox.x + previousX - p.x); slashBox.w += Math.abs(p.x - previousX); slashBox.y = Math.min(slashBox.y, slashBox.y + previousY - p.y); slashBox.h += Math.abs(p.y - previousY); }
  p.slashBox = slashBox;
  for (const enemy of living(world)) {
    enemy.slow = Math.max(0, (enemy.slow || 0) - dt);
    enemy.weakened = Math.max(0, (enemy.weakened || 0) - dt);
    if (enemy.wardDisabled > 0) {
      enemy.wardDisabled = Math.max(0, enemy.wardDisabled - dt);
      if (enemy.wardDisabled === 0) { enemy.shield = enemy.wardRestore || 0; enemy.wardRestore = 0; }
    }
    if (enemy.burn > 0) {
      const tick = Math.min(dt, enemy.burn);
      hitEnemy(world, enemy, tick * (world.bosses.includes(enemy) ? 3 : 6), false);
      enemy.burn = Math.max(0, enemy.burn - dt);
      enemy.burnFeedback = Math.max(0, (enemy.burnFeedback || 0) - dt);
      if (!enemy.dead && enemy.burnFeedback === 0 && nearby(enemy, p)) {
        emit(world, 'burn', enemy.x, enemy.y, { tint: 0xff825f }); enemy.burnFeedback = 0.25;
      }
    }
    if (enemy.dead || !nearby(enemy, p)) continue;
    const blocked = world.solids.some(solid => !solid.oneWay && solid !== enemy && segmentHit(p.x + p.w / 2, p.y + p.h / 2,
      enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, solid));
    if (p.slashTime > 0 && enemy.lastSlash !== p.slashId && overlaps(slashBox, enemy) && !blocked) {
      enemy.lastSlash = p.slashId;
      const damage = sword.damage * (p.dashTime > 0 ? 1.4 : p.combo === 2 ? 40 / 27 : 1) * (world.bosses.includes(enemy) ? 0.7 : 1);
      hitEnemy(world, enemy, damage, true, 'melee');
      if (world.collections.includes('ember-heart') && p.combo === 2 && p.dashTime <= 0) enemy.burn = Math.max(enemy.burn || 0, 2);
      if (enemy.dead && p.dashTime > 0 && world.collections.includes('storm-seal')) p.fuel = Math.min(100, p.fuel + 15);
      if (!enemy.dead && !world.bosses.includes(enemy)) {
        enemy.stagger = p.combo === 2 || p.dashTime > 0 ? 0.2 : 0.12;
        enemy.vx = p.slashFacing * (p.dashTime > 0 ? 340 : p.combo === 2 ? 280 : 190);
        enemy.vy = Math.min(enemy.vy || 0, p.slashMode === 'vertical' ? -240 : -100);
        enemy.windup = 0; enemy.telegraph = null; enemy.beamTime = 0; enemy.beam = null;
        emit(world, 'stagger', enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, { facing: p.slashFacing });
      }
      if (sword.id === 'saber') p.hp = Math.min(p.maxHp, p.hp + damage * 0.06);
      if (sword.id === 'katana' && p.combo === 2) { for (const other of living(world)) if (other !== enemy && nearby(other, enemy, 150)) hitEnemy(world, other, 12); emit(world, 'thunder', enemy.x, enemy.y, { tint: sword.tint }); }
      world.hitstop = 0.035;
    }
    if (!enemy.dead && !world.bosses.includes(enemy)) updateEnemy(world, enemy, dt, solids);
    if (world.status !== 'playing') return;
  }
  for (const prop of world.props) {
    prop.flash = Math.max(0, (prop.flash || 0) - dt);
    if (!prop.dead && nearby(prop, p) && p.slashTime > 0 && prop.lastSlash !== p.slashId && overlaps(slashBox, prop)) { prop.lastSlash = p.slashId; hitProp(world, prop, sword.damage * 1.5); }
  }
  world.activeBoss = null;
  for (const boss of world.bosses) { updateBoss(world, boss, dt); if (boss.active && !boss.dead && boss.arrivalGrace <= 0 && inBossArena(world, boss) && overlaps(p, boss)) damagePlayer(world, 20, boss.x); }
  updateSummons(world, dt); updatePressure(world, dt); updateProjectiles(world, slashBox, dt);
  for (const hazard of world.level.hazards) {
    if (!nearby(hazard, p) || !overlaps(p, hazard) || hazardState(hazard, world.time) !== 'active') continue;
    if (hazard.type === 'emp') { if (p.impaired <= 0) { emit(world, 'emp', p.x, p.y); say(world, 'EMP FIELD // Thrusters offline. Keep moving.', 2.2); } p.impaired = 2; }
    else damagePlayer(world, hazard.type === 'laser' ? 24 : hazard.type === 'spikes' ? 30 : 18, hazard.x);
  }
  if (world.status !== 'playing') return;
  for (const pickup of world.pickups) {
    if (pickup.taken || !nearby(pickup, p) || !overlaps(p, { x: pickup.x - 14, y: pickup.y - 16, w: 28, h: 32 })) continue;
    if (rewardPlayer(world, pickup, `pickup:${pickup.id}`)) pickup.taken = true;
  }
  world.level.checkpoints.forEach((cp, index) => {
    if (index > world.checkpoint && Math.abs(p.x + p.w / 2 - cp.x - 12) < 70 && Math.abs(p.y + p.h - cp.y - 46) < 110) {
      world.checkpoint = index; world.progress.checkpoint = index; p.hp = Math.min(p.maxHp, p.hp + 22 * world.rules.recovery); p.fuel = 100;
      emit(world, 'checkpoint', cp.x, cp.y); say(world, `RELAY // ${cp.label}. Route secured.`, 2.5);
    }
  });
  if (world.bossDefeated && world.bosses.every(boss => boss.dead) && overlaps(p, world.level.exit)) {
    world.status = 'won'; addOnce(world.progress.completedWorlds, world.worldId); emit(world, 'win', p.x, p.y);
  }
}
