import { createPlayer, stepPlayer, overlaps, moveBody } from './physics.js';
import { LEVEL, createEnemies } from './level.js';
import { CATALOG, DIFFICULTIES, SPELLS } from './catalog.js';
import { validateProgress } from './progress.js';

export const STEP = 1 / 120;
const addOnce = (list, id) => { if (!list.includes(id)) list.push(id); };
const item = (category, id) => Array.isArray(CATALOG[category]) ? CATALOG[category].find(entry => entry.id === id) : undefined;
const nearby = (a, b, distance = 1500) => Math.abs(a.x - b.x) < distance;
const living = world => [...world.enemies.filter(e => !e.dead), ...world.bosses.filter(b => b.active && !b.dead)];
const inBossArena = (world, boss) => nearby(world.player, boss)
  && world.player.x + world.player.w >= (boss.arenaStart ?? boss.x - 1500)
  && world.player.x <= (boss.arenaEnd ?? boss.x + 1500);
function refreshSolids(world) {
  world.solids = [...LEVEL.solids, ...world.props.filter(p => !p.dead && p.collidable), ...world.gates.filter(g => !g.open)];
}
function applyArmor(player, armor, fill = false) {
  player.armor = armor.id; player.maxHp = armor.maxHp; player.maxMana = armor.maxMana; player.fuelRate = armor.fuelRate;
  player.hp = fill ? armor.maxHp : Math.min(player.hp, armor.maxHp);
  player.mana = fill ? armor.maxMana : Math.min(player.mana, armor.maxMana);
}
export function createWorld(checkpoint = 0, options = {}) {
  const rules = DIFFICULTIES.find(mode => mode.id === options.difficulty) || DIFFICULTIES[1];
  const progress = validateProgress(options.progress || options.previous?.progress);
  const index = Number.isInteger(checkpoint) && LEVEL.checkpoints[checkpoint] ? checkpoint : 0;
  const cp = LEVEL.checkpoints[index] || LEVEL.spawn;
  const player = Object.assign(createPlayer(cp.x, cp.y), {
    hp: 100, maxHp: 100, mana: 100, maxMana: 100, invincible: 0.7,
    shootCooldown: 0, slashCooldown: 0, slashTime: 0, slashId: 0, combo: 0, comboWindow: 0,
    rapid: 0, shield: 0, impaired: 0, stealth: 0, siphon: 0, boost: 0, burn: 0, burnTick: 0,
    spellCooldown: 0, laserTime: 0, beam: null, charges: progress.charges, ...progress.equipped,
  });
  applyArmor(player, item('armor', player.armor), true);
  if (options.previous) player.mana = Math.min(player.maxMana, Math.max(options.previous.player.mana, 30 * rules.recovery));
  const bosses = (LEVEL.bosses || [{ ...LEVEL.boss, id: 'warden', name: 'Warden', type: 'warden', triggerX: 8100 }])
    .map(b => ({ ...b, hp: progress.defeatedBosses.includes(b.id) ? 0 : Math.round(b.hp * rules.enemyHealth), maxHp: Math.round(b.hp * rules.enemyHealth),
      active: false, timer: 1.4, attack: 0, phase: 'idle', phaseTime: 0, lastSlash: -1,
      dead: progress.defeatedBosses.includes(b.id), burn: 0, slow: 0 }));
  const world = {
    player, difficulty: rules.id, rules, progress, collections: progress.collections, unlocks: progress.unlocked,
    enemies: createEnemies().map(e => ({ ...e, hp: Math.round(e.hp * rules.enemyHealth), baseY: e.y,
      cooldown: 1.1 * rules.cadence, windup: 0, burn: 0, slow: 0, dead: e.x < cp.x - 350 })),
    bosses, boss: bosses.at(-1), activeBoss: null,
    props: (LEVEL.props || []).map(p => ({ ...p, hp: p.hp ?? 25,
      collidable: p.collidable ?? ['crate', 'barrel'].includes(p.type), dead: progress.destroyedProps.includes(p.id) })),
    gates: (LEVEL.gates || []).map(g => ({ ...g, open: progress.openedGates.includes(g.id) || progress.defeatedBosses.includes(g.bossId) })),
    npcs: (LEVEL.npcs || []).map(npc => ({ ...npc })), story: null,
    projectiles: Array.from({ length: 96 }, () => ({ active: false })),
    pickups: LEVEL.pickups.map(p => ({ ...p, taken: progress.claimed.includes(`pickup:${p.id}`) })),
    dynamicHazards: [], stasis: 0, missileWarning: null, pressureTimer: rules.missilePeriod,
    checkpoint: index, time: options.previous?.time || 0, kills: options.previous?.kills || 0,
    status: 'playing', events: [], bossDefeated: bosses.at(-1).dead,
    dialogue: '', dialogueTime: 0, hitstop: 0, deaths: options.previous?.deaths || 0,
    timeLeft: options.previous?.deathReason === 'deadline' ? rules.deadline : options.previous?.timeLeft ?? rules.deadline,
  };
  progress.checkpoint = Math.max(progress.checkpoint, index);
  refreshSolids(world);
  return world;
}
export function retryWorld(world) {
  const retry = createWorld(world.checkpoint, { difficulty: world.difficulty, progress: world.progress, previous: world });
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
    kind: missile ? 'missile' : 'bullet', tint: owner === 'player' ? 0xeab76f : 0xff825f, pierce: 1, hitIds: [], sourceId: null });
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
  p.vx = p.x < sourceX ? -230 : 230; p.vy = -170; p.stealth = 0;
  emit(world, 'hurt', p.x + 12, p.y + 20); world.hitstop = 0.035;
  if (p.hp === 0) die(world, 'damage');
  return true;
}
function die(world, reason) {
  world.player.hp = 0; world.status = 'dead'; world.deathReason = reason;
  emit(world, 'death', world.player.x + 12, world.player.y + 20, { reason });
}
function hitEnemy(world, enemy, amount, feedback = true) {
  if (enemy.dead || enemy.hp <= 0 || amount <= 0) return;
  const damage = Math.min(enemy.hp, amount);
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
  return hazard.type === 'laser' && phase > period - 0.55 ? 'warning' : 'off';
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
  if (reward.type === 'treasure') addOnce(world.collections, reward.itemId);
  if (reward.type === 'cannon' || reward.type === 'nova') {
    p.charges[reward.type] = Math.min(9, p.charges[reward.type] + Math.floor(value ?? 1));
    addOnce(world.progress.unlocked[reward.type === 'cannon' ? 'gun' : 'spell'], reward.type === 'cannon' ? 'cannon' : 'eclipse');
  }
  if (claimId) addOnce(world.progress.claimed, claimId);
  emit(world, 'pickup', p.x + 12, p.y + 20, { kind: reward.type, itemId: reward.itemId });
  return true;
}
function openGate(world, gate) {
  if (gate.open) return;
  gate.open = true; addOnce(world.progress.openedGates, gate.id); refreshSolids(world);
  emit(world, 'gate', gate.x, gate.y, { gateId: gate.id });
}
export function interact(world) {
  if (world.status !== 'playing' || world.story) return false;
  const p = world.player;
  const object = [...world.npcs, ...world.props.filter(prop => prop.type === 'lever' && !prop.dead)]
    .filter(candidate => Math.abs(candidate.x - p.x) < 110 && Math.abs(candidate.y - p.y) < 100)
    .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
  if (!object) return false;
  if (object.type === 'lever') {
    const gate = world.gates.find(g => g.id === object.gateId || g.leverId === object.id);
    if (!gate) return false;
    openGate(world, gate); object.used = true; return true;
  }
  world.story = { npcId: object.id, speaker: object.name, portrait: object.portrait || object.id,
    lines: Array.isArray(object.lines) && object.lines.length ? object.lines : [{ speaker: object.name, text: 'Keep your soul unbound.' }],
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
    if (!choice || !rewardPlayer(world, choice.reward, claim)) return false;
  } else if (!world.progress.claimed.includes(claim)) {
    if (npc?.reward && !rewardPlayer(world, npc.reward, claim)) return false;
    addOnce(world.progress.claimed, claim);
  }
  world.story = null; return true;
}
function destroyProp(world, prop) {
  if (prop.dead || prop.type === 'lever') return;
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
  if (prop.dead || prop.type === 'lever') return;
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
  emit(world, 'spell', p.x + 12, p.y + 20, { spell: id, radius: spell.radius || 800, tint: spell.tint });
  const targets = living(world);
  if (id === 'cinder') for (const enemy of targets) enemy.burn = Math.max(enemy.burn || 0, spell.duration);
  if (id === 'siphon') { p.siphon = spell.duration; for (const enemy of targets) if (nearby(enemy, p, 600)) hitEnemy(world, enemy, 14); }
  if (id === 'thunder') for (const enemy of targets) if (nearby(enemy, p, spell.radius)) {
    hitEnemy(world, enemy, world.bosses.includes(enemy) ? 32 : 48); enemy.slow = Math.max(enemy.slow || 0, 0.9);
    emit(world, 'thunder', enemy.x, enemy.y, { tint: spell.tint });
  }
  if (id === 'veil') p.stealth = spell.duration;
  if (id === 'stasis') { world.stasis = spell.duration; for (const enemy of targets) if (nearby(enemy, p, spell.radius)) enemy.slow = spell.duration; }
  if (id === 'eclipse') {
    for (const enemy of targets) if (nearby(enemy, p, spell.radius)) hitEnemy(world, enemy, world.bosses.includes(enemy) ? Math.max(130, enemy.maxHp * 0.25) : 200);
    for (const prop of world.props) if (!prop.dead && nearby(prop, p, spell.radius)) destroyProp(world, prop);
    world.projectiles.forEach(projectile => { if (nearby(projectile, p, spell.radius)) projectile.active = false; });
    if (world.status === 'playing') { p.hp = Math.min(p.maxHp, p.hp + 45); p.mana = p.maxMana; p.fuel = 100; }
  }
  return true;
}
function shoot(world, input) {
  const p = world.player, gun = item('gun', p.gun);
  p.shootCooldown = gun.cooldown * (p.rapid > 0 ? 0.075 / 0.17 : p.impaired > 0 ? 0.36 / 0.17 : 1); p.stealth = 0;
  const up = input.aimUp, x = p.x + 12 + (up ? 0 : p.facing * 20), y = p.y + 18;
  if (gun.id === 'cannon') {
    if (p.charges.cannon <= 0) { say(world, 'OBLIVION // No charges. Seek a soul cache.', 2); return; }
    p.charges.cannon--; p.laserTime = 0.25;
    p.beam = up ? { x: x - 15, y: y - gun.range, w: 30, h: gun.range, tint: gun.tint }
      : { x: p.facing > 0 ? x : x - gun.range, y: y - 17, w: gun.range, h: 34, tint: gun.tint };
    for (const enemy of living(world)) if (overlaps(p.beam, enemy)) hitEnemy(world, enemy, gun.damage);
    for (const prop of world.props) if (!prop.dead && overlaps(p.beam, prop)) destroyProp(world, prop);
    for (const projectile of world.projectiles) if (projectile.active && overlaps(p.beam, projectile)) projectile.active = false;
    emit(world, 'cannon', x, y, { beam: { ...p.beam }, tint: gun.tint }); return;
  }
  for (const offset of gun.id === 'scatter' ? [-160, -80, 0, 80, 160] : [0]) {
    const projectile = spawnProjectile(world, x, y, up ? offset : p.facing * gun.speed, up ? -gun.speed : offset, 'player');
    if (!projectile) continue;
    projectile.damage = gun.damage; projectile.kind = gun.id; projectile.tint = gun.tint;
    projectile.pierce = gun.pierce || 1; projectile.life = gun.id === 'scatter' ? 0.65 : 2.2;
  }
  emit(world, 'shot', x, y, { gun: gun.id, tint: gun.tint });
}
function enemyFire(world, enemy, missile = false, spread = 0, kind = 'bullet') {
  const p = world.player, x = enemy.x + enemy.w / 2, y = enemy.y + enemy.h * 0.35;
  const angle = Math.atan2(p.y + 20 - y, p.x + 12 - x) + spread;
  const speed = missile ? 220 : kind === 'fire' ? 250 : enemy.type === 'drone' ? 270 : 340;
  const projectile = spawnProjectile(world, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 'enemy', missile);
  if (projectile) {
    projectile.kind = kind === 'bullet' && missile ? 'missile' : kind;
    projectile.tint = kind === 'fire' ? 0xff825f : kind === 'hex' ? 0xc49bff : 0xff6689;
    if (world.bosses.includes(enemy)) projectile.sourceId = enemy.id;
  }
  emit(world, 'enemyshot', x, y, { kind });
}
function updateEnemy(world, enemy, dt, solids) {
  const p = world.player, tick = dt * (enemy.slow > 0 ? 0.3 : 1), distance = Math.abs(enemy.x - p.x);
  enemy.flash = Math.max(0, (enemy.flash || 0) - dt); enemy.dashTime = Math.max(0, (enemy.dashTime || 0) - tick);
  if (enemy.type === 'drone') {
    enemy.patrolDirection ||= enemy.facing; enemy.x += enemy.patrolDirection * 38 * tick;
    if (enemy.x <= enemy.minX) enemy.patrolDirection = 1;
    if (enemy.x >= enemy.maxX) enemy.patrolDirection = -1;
    enemy.y = enemy.baseY + Math.sin(world.time * 1.7 + enemy.x * 0.01) * 24;
  } else if (enemy.type === 'guard' || enemy.type === 'shade') {
    enemy.vx = enemy.dashTime > 0 ? enemy.dashFacing * 360 : distance < 330 ? 0 : enemy.facing * 48;
    enemy.vy = (enemy.vy || 0) + 1800 * tick; moveBody(enemy, solids, tick);
    if (enemy.x <= enemy.minX) enemy.facing = 1;
    if (enemy.x >= enemy.maxX) enemy.facing = -1;
  }
  if (distance < 650 && p.stealth <= 0) {
    if (enemy.dashTime <= 0) enemy.facing = p.x < enemy.x ? -1 : 1;
    enemy.cooldown -= tick;
    if (enemy.cooldown < 0.6) { if (!enemy.windup) enemy.aimX = p.x + 12; enemy.windup = 0.6 - Math.max(0, enemy.cooldown); }
    if (enemy.cooldown <= 0) {
      if (enemy.type === 'shade') { enemy.dashTime = 0.28; enemy.dashFacing = enemy.facing; }
      else if (enemy.type === 'sentinel') {
        enemy.beam = { x: enemy.aimX - 12, y: 80, w: 24, h: 530, tint: 0x82e8ff }; enemy.beamTime = 0.28;
        emit(world, 'thunder', enemy.aimX, 80, { beam: enemy.beam });
      } else if (enemy.type === 'mage') for (const spread of [-0.2, 0, 0.2]) enemyFire(world, enemy, false, spread, 'fire');
      else enemyFire(world, enemy, enemy.type === 'turret');
      enemy.cooldown = (enemy.type === 'drone' ? 1.7 : enemy.type === 'turret' ? 2.4 : enemy.type === 'mage' ? 2.3 : enemy.type === 'shade' ? 2 : enemy.type === 'sentinel' ? 2.8 : 1.45) * world.rules.cadence;
      enemy.windup = 0;
    }
  }
  enemy.hidden = enemy.type === 'shade' && enemy.cooldown > 0.6 && enemy.dashTime <= 0;
  if (enemy.beamTime > 0) { enemy.beamTime -= tick; if (enemy.beamTime <= 0) enemy.beam = null; else if (enemy.beam && overlaps(p, enemy.beam)) damagePlayer(world, 22, enemy.x); }
  if (overlaps(p, enemy)) damagePlayer(world, enemy.type === 'shade' ? 22 : 16, enemy.x);
}
function finishBossAttack(boss, world) {
  boss.phase = 'idle'; boss.timer = (boss.hp < boss.maxHp / 2 ? 0.7 : 1.1) * world.rules.cadence;
  boss.phaseTime = 0; boss.beam = null; boss.telegraph = null;
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
  const tick = dt * (boss.slow > 0 ? 0.65 : 1);
  boss.flash = Math.max(0, (boss.flash || 0) - dt); boss.timer -= tick; boss.phaseTime += tick;
  if (boss.phase === 'idle' && boss.timer <= 0) {
    boss.attack = (boss.attack + 1) % 3; boss.phase = 'charge'; boss.phaseTime = 0;
    boss.timer = boss.attack === 2 ? 1.1 : boss.type === 'hex' ? 0.9 : 0.7;
    boss.aimY = Math.min(580, p.y + 22); boss.aimX = p.x + 12;
    boss.telegraph = boss.type === 'hex' && boss.attack === 1 ? { x: boss.aimX - 22, y: 80, w: 44, h: 530, tint: 0xc49bff }
      : { x: Math.min(boss.x, boss.aimX) - 600, y: boss.aimY - 7, w: Math.abs(boss.x - boss.aimX) + 700, h: 14, tint: boss.type === 'regent' ? 0xff6689 : 0x82e8ff };
    if (boss.type === 'hex' && boss.attack === 2) boss.telegraph = { x: boss.aimX - 105, y: 565, w: 210, h: 45, tint: 0xc49bff };
    const left = Math.max(boss.arenaStart ?? 0, boss.telegraph.x);
    boss.telegraph.w = Math.max(0, Math.min(boss.arenaEnd ?? LEVEL.width, boss.telegraph.x + boss.telegraph.w) - left);
    boss.telegraph.x = left;
    emit(world, 'charge', boss.x, boss.y + 55, { bossId: boss.id, attack: boss.attack });
  } else if (boss.phase === 'charge' && boss.timer <= 0) {
    boss.phase = 'attack'; boss.phaseTime = 0; boss.shots = 0;
    boss.timer = boss.attack === 2 || (boss.type === 'hex' && boss.attack === 1) ? 0.85 : 0.14;
  }
  if (boss.phase !== 'attack') return;
  if (boss.attack === 2 || (boss.type === 'hex' && boss.attack === 1)) {
    boss.beam = { ...boss.telegraph };
    if (boss.type === 'regent' && boss.attack === 2 && boss.phaseTime > 0.3 && boss.shots === 0) {
      for (const spread of [-0.3, 0, 0.3]) enemyFire(world, boss, true, spread, 'hex'); boss.shots++;
    }
    if (overlaps(p, boss.beam)) damagePlayer(world, boss.type === 'regent' ? 30 : 24, boss.x);
    if (boss.timer <= 0) finishBossAttack(boss, world);
  } else if (boss.timer <= 0) {
    const direction = p.x < boss.x ? -1 : 1, x = boss.x + (direction > 0 ? boss.w + 8 : -8), y = boss.y + 45;
    if (boss.type === 'hex') for (const spread of [-0.45, -0.22, 0, 0.22, 0.45]) enemyFire(world, boss, false, spread, 'hex');
    else if (boss.type === 'regent') for (const spread of [-0.2, 0, 0.2]) enemyFire(world, boss, boss.attack === 0, spread, boss.attack === 0 ? 'missile' : 'hex');
    else if (boss.attack === 0) for (const vy of [-110, 0, 110]) {
      const projectile = spawnProjectile(world, x, y, direction * 330, vy, 'enemy');
      if (projectile) projectile.sourceId = boss.id;
    } else {
      const angle = Math.atan2(p.y + 20 - y, p.x - x);
      const projectile = spawnProjectile(world, x, y, Math.cos(angle) * 230, Math.sin(angle) * 230, 'enemy', true);
      if (projectile) projectile.sourceId = boss.id;
    }
    emit(world, 'enemyshot', x, y, { bossId: boss.id }); boss.shots++;
    boss.timer = (boss.hp < boss.maxHp / 2 ? 0.27 : 0.38) * world.rules.cadence;
    if (boss.shots >= (boss.attack === 0 ? 4 : 3)) finishBossAttack(boss, world);
  }
}
function updatePressure(world, dt) {
  world.pressureTimer -= dt;
  if (!world.missileWarning && world.pressureTimer <= 0) {
    world.missileWarning = { y: Math.min(580, Math.max(100, world.player.y + 22)), time: 1.1 };
    emit(world, 'missilewarning', world.player.x + 900, world.missileWarning.y);
  }
  if (!world.missileWarning) return;
  world.missileWarning.time -= dt;
  if (world.missileWarning.time > 0) return;
  const x = Math.min(LEVEL.width - 30, world.player.x + 1100), count = world.difficulty === 'extinction' ? 3 : world.difficulty === 'inferno' ? 2 : 1;
  for (let i = 0; i < count; i++) {
    const projectile = spawnProjectile(world, x + i * 65, world.missileWarning.y + (i % 2 ? -65 : 0), -360, 0, 'enemy', true);
    if (projectile) { projectile.kind = 'pressure'; projectile.homing = false; projectile.life = 6; }
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
      const angle = Math.atan2(p.y + 20 - projectile.y, p.x + 12 - projectile.x);
      projectile.vx += Math.cos(angle) * 70 * tick; projectile.vy += Math.sin(angle) * 70 * tick;
    }
    projectile.x += projectile.vx * tick; projectile.y += projectile.vy * tick; projectile.life -= dt;
    if (projectile.life <= 0) { projectile.active = false; continue; }
    if (p.slashTime > 0 && projectile.owner === 'enemy' && segmentHit(oldX, oldY, projectile.x, projectile.y, slashBox, 3)) {
      projectile.owner = 'player'; projectile.vx = p.facing * 920; projectile.vy = -30; projectile.damage = 16;
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
        if (world.props.includes(target)) hitProp(world, target, projectile.damage); else hitEnemy(world, target, projectile.damage);
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
  if (world.status !== 'playing' || world.story) return;
  const p = world.player;
  world.time += dt; world.timeLeft = Math.max(0, world.timeLeft - dt);
  if (world.timeLeft === 0) { die(world, 'deadline'); return; }
  world.dialogueTime = Math.max(0, world.dialogueTime - dt); world.stasis = Math.max(0, world.stasis - dt); p.aimUp = !!input.aimUp;
  for (const key of ['invincible', 'shootCooldown', 'slashCooldown', 'slashTime', 'comboWindow', 'rapid', 'impaired', 'stealth', 'siphon', 'boost', 'burn', 'burnTick', 'spellCooldown', 'laserTime']) p[key] = Math.max(0, p[key] - dt);
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
  for (const name of stepPlayer(p, physicsInput, solids, dt)) emit(world, name, p.x + 12, p.y + 46);
  p.x = Math.max(0, Math.min(LEVEL.width - p.w, p.x));
  if (p.y < 0) { p.y = 0; p.vy = Math.max(0, p.vy); }
  if (p.y > LEVEL.height + 70) { die(world, 'fall'); return; }
  const sword = item('sword', p.sword);
  if (input.slashPressed && p.slashCooldown <= 0) {
    p.combo = p.comboWindow > 0 ? (p.combo + 1) % 3 : 0;
    p.comboWindow = 0.65; p.slashCooldown = sword.cooldown; p.slashTime = 0.2; p.slashId++; p.stealth = 0;
    emit(world, 'slash', p.x + 12 + p.facing * 32, p.y - 20, { facing: p.facing, sword: p.sword, tint: sword.tint });
  }
  if (input.shoot && p.shootCooldown <= 0) shoot(world, input);
  if (world.status !== 'playing') return;
  const slashBox = { x: p.facing > 0 ? p.x + 3 : p.x + p.w - sword.width - 3, y: p.y + 43 - sword.height, w: sword.width, h: sword.height };
  p.slashBox = slashBox;
  for (const enemy of living(world)) {
    enemy.slow = Math.max(0, (enemy.slow || 0) - dt);
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
    if (p.slashTime > 0 && enemy.lastSlash !== p.slashId && overlaps(slashBox, enemy)) {
      enemy.lastSlash = p.slashId;
      const damage = sword.damage * (p.combo === 2 ? 40 / 27 : 1) * (world.bosses.includes(enemy) ? 0.7 : 1);
      hitEnemy(world, enemy, damage);
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
  for (const boss of world.bosses) { updateBoss(world, boss, dt); if (boss.active && !boss.dead && inBossArena(world, boss) && overlaps(p, boss)) damagePlayer(world, 20, boss.x); }
  updatePressure(world, dt); updateProjectiles(world, slashBox, dt);
  for (const hazard of LEVEL.hazards) {
    if (!nearby(hazard, p) || !overlaps(p, hazard) || hazardState(hazard, world.time) !== 'active') continue;
    if (hazard.type === 'emp') { if (p.impaired <= 0) { emit(world, 'emp', p.x, p.y); say(world, 'EMP FIELD // Thrusters offline. Keep moving.', 2.2); } p.impaired = 2; }
    else damagePlayer(world, hazard.type === 'laser' ? 24 : hazard.type === 'spikes' ? 30 : 18, hazard.x);
  }
  if (world.status !== 'playing') return;
  for (const pickup of world.pickups) {
    if (pickup.taken || !nearby(pickup, p) || !overlaps(p, { x: pickup.x - 14, y: pickup.y - 16, w: 28, h: 32 })) continue;
    if (rewardPlayer(world, pickup, `pickup:${pickup.id}`)) pickup.taken = true;
  }
  LEVEL.checkpoints.forEach((cp, index) => {
    if (index > world.checkpoint && Math.abs(p.x - cp.x) < 70 && Math.abs(p.y - cp.y) < 110) {
      world.checkpoint = index; world.progress.checkpoint = index; p.hp = Math.min(p.maxHp, p.hp + 22 * world.rules.recovery); p.fuel = 100;
      emit(world, 'checkpoint', cp.x, cp.y); say(world, `RELAY // ${cp.label}. Route secured.`, 2.5);
    }
  });
  if (world.bossDefeated && world.bosses.every(boss => boss.dead) && overlaps(p, LEVEL.exit)) { world.status = 'won'; emit(world, 'win', p.x, p.y); }
}
