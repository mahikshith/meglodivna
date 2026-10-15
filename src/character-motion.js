import { CHARACTER_GEOMETRY } from './character-geometry.js';

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
