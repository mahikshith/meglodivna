import { CHARACTER_GEOMETRY, CHARACTER_ANIMATIONS } from './character-geometry.js';

export function companionFrame(actor) {
  const phase = actor.attackPhase, time = actor.animationTime || 0;
  if (actor.type === 'clone') return phase && phase !== 'recovery' ? firingFrame(actor) : `cr-courier-${!actor.grounded ? (actor.vy < 0 ? 8 : 10) : Math.abs(actor.vx) > 8 ? 4 + Math.floor((actor.distance || 0) / 22) % 4 : 0}`;
  const index = phase === 'lift' ? 4 : phase === 'contact' ? (['wolf','raven'].includes(actor.type) && actor.attackElapsed > .1 ? 6 : 5)
    : phase === 'recovery' ? (actor.type === 'raven' ? 7 : 6)
      : Math.floor(actor.type === 'wolf' ? (actor.distance || 0) / 24 : time * (actor.type === 'raven' ? 11 : 7)) % 4;
  return `cr-${actor.type}-${index}`;
}

export function firingFrame(actor) {
  const angle = actor.aimUp ? -Math.PI / 2 : actor.aimAngle || 0;
  const elevation = Math.atan2(-Math.sin(angle), Math.abs(Math.cos(angle)));
  const family=['lanternplate','bulwark'].includes(actor.armor)?'plate':'courier';
  const airPose=elevation < -1.05 ? 2 : elevation < -.25 ? 1 : elevation > .25 ? 3 : 0;
  const specialized=!actor.grounded?`cr-${family}gunair-${airPose}`:actor.crouching?`cr-${family}guncrouch-${actor.shootCooldown>0?1:0}`:null;
  if(specialized&&CHARACTER_GEOMETRY[specialized])return specialized;
  if (actor.grounded && Math.abs(actor.vx || 0) > 20 && Math.abs(elevation) < .25) {
    return `cr-${['lanternplate','bulwark'].includes(actor.armor)?'plate':'courier'}gunrun-${Math.floor((actor.motionDistance || actor.distance || 0) / 22) % 4}`;
  }
  const pose = elevation > 1.05 ? 3 : elevation > .25 ? 2 : 0;
  return `cr-${actor.armor === 'lanternplate' || actor.armor === 'bulwark' ? 'plate' : 'courier'}gun-${pose}`;
}

export function casterFrame(actor) {
  const phase = actor.attackPhase;
  const pose = phase === 'contact' || actor.phase === 'attack' ? 6 : phase === 'lift' || actor.phase === 'charge' ? 4
    : phase === 'recovery' ? 7 : actor.flash > 0 ? 9 : Math.abs(actor.vx || 0) > 8 ? Math.floor((actor.motion?.cycle || 0) * 4) % 4 : 8;
  return `cr-caster-${pose}`;
}

// Simulation and rendering select the same anatomical pose, including stopped attack recovery.
export function villainFrame(actor, identity, fallback) {
  identity ||= actor.form === 'flying' ? 'dragon' : { guard: 'stalker', shade: 'stalker', wispknight: 'wispknight',
    bellbeast: 'bellbeast', mage: 'caster', hex: 'caster', sentinel: 'guardian', warden: 'guardian', regent: 'guardian', drone: 'dragon' }[actor.type];
  if (!identity) return null;
  if (identity === 'caster') return casterFrame(actor);
  if (identity === 'dragon') return `cr-dragon-${actor.attackPhase === 'contact' ? 5 : actor.attackPhase === 'lift' ? 4 : Math.floor((actor.animationTime || 0) * 7) % 4}`;
  fallback ||= actor.windup > 0 || actor.phase === 'charge' ? 'windup' : actor.dashTime > 0 || actor.attackTime > 0 || actor.active && actor.phase === 'attack' ? 'attack'
    : actor.recovery > 0 || actor.recovering ? 'recovery' : actor.id?.startsWith('summon-') ? 'walk' : 'idle';
  const motion = actor.motion || {}, phase = actor.attackPhase || motion.phase;
  const rush = actor.attackKind === 'charge' && ['contact', 'downswing'].includes(phase) && Math.abs(actor.vx || 0) > 8;
  if (identity === 'wispknight' && phase === 'contact' && (actor.attackProgress || 0) < .5) return CHARACTER_ANIMATIONS['wispknight-attack'][1];
  const action = actor.flash > 0 && !['lift', 'downswing', 'contact'].includes(phase) ? 'hurt' : rush ? 'walk'
    : ['lift', 'downswing', 'contact', 'recovery'].includes(phase) ? phase : Math.abs(actor.vx || 0) > 8 ? 'walk' : fallback;
  const names = [`${identity}-${action}`, `${identity}-${action === 'lift' ? 'windup' : ['downswing', 'contact'].includes(action) ? 'attack' : fallback}`, `${identity}-idle`];
  const frames = names.map(name => CHARACTER_ANIMATIONS[name]).find(frames => frames?.length);
  if (!frames) return null;
  const progress = action === 'walk' ? motion.cycle || 0 : ['lift', 'downswing', 'contact', 'recovery'].includes(action)
    ? actor.attackProgress || 0 : ((actor.animationTime || 0) * 7 % frames.length) / frames.length;
  return frames[Math.min(frames.length - 1, Math.floor(Math.max(0, progress) * frames.length))];
}

export function villainDamageBounds(actor) {
  if (!actor.characterRevision || actor.id?.startsWith('ally-')) return [actor];
  const key = villainFrame(actor), meta = CHARACTER_GEOMETRY[key];
  if (!meta?.hurtboxes?.length) return [actor];
  const scale = actor.h / meta.body.h;
  return meta.hurtboxes.map(box => {
    const point = characterPoint(actor, key, box), w = box.w * scale;
    return { x: point.x - (actor.facing < 0 ? w : 0), y: point.y, w, h: box.h * scale };
  });
}

export function characterPoint(actor, key, point) {
  const meta = CHARACTER_GEOMETRY[key];
  if (!meta || !point) return null;
  const scale = actor.h / meta.body.h;
  return { x: actor.x + actor.w / 2 + (actor.facing || 1) * (point.x - meta.body.x - meta.body.w / 2) * scale,
    y: actor.y + actor.h + (point.y - meta.body.y - meta.body.h) * scale };
}
export function characterSocket(actor, slot, key = companionFrame(actor)) {
  const sockets = CHARACTER_GEOMETRY[key]?.sockets;
  return characterPoint(actor, key, sockets?.[slot]);
}
