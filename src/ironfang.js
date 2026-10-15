import { IRONFANG_GEOMETRY } from './ironfang-geometry.js';

export const isIronfang = actor => actor.type === 'regent' && actor.combatStyle === 'sanctuary';

// One pose selection contract for rendering, muzzle sockets and damage geometry.
export function ironfangFrame(actor) {
  const time = actor.animationTime || 0, phase = actor.phaseTime || 0;
  if (actor.phase === 'transform') {
    const keys = ['if-bull-12', 'if-morph-0', 'if-morph-1', 'if-morph-2', 'if-dragon-1', 'if-dragon-0'];
    return keys[Math.min(5, Math.floor((1 - Math.max(0, actor.transformTime) / .9) * 6))];
  }
  if (actor.form === 'flying') {
    if (actor.flash > 0 && actor.phase === 'idle') return 'if-dragon-9';
    if (actor.attackKind === 'breath' || actor.attackKind === 'cinder') {
      if (actor.phase === 'charge') return phase < .35 ? 'if-dragon-4' : 'if-dragon-5';
      if (actor.phase === 'attack') return 'if-dragon-6';
      if (actor.recovering && phase < .22) return 'if-dragon-7';
    }
    return `if-dragon-${Math.floor(time * 8) % 4}`;
  }
  if (actor.flash > 0 && actor.phase === 'idle') return 'if-bull-13';
  if (actor.attackKind === 'cannon' && ['charge', 'attack'].includes(actor.phase))
    return `if-bull-${actor.phase === 'charge' ? 8 : 9 + Math.floor(phase * 14) % 2}`;
  if (['slam', 'cleave'].includes(actor.attackKind)) {
    if (actor.phase === 'charge') return phase < .35 ? 'if-bull-4' : 'if-bull-5';
    if (actor.phase === 'attack') return actor.attackKind === 'slam' && phase < .18 ? 'if-bull-5' : 'if-bull-6';
    if (actor.recovering && phase < .4) return 'if-bull-7';
  }
  return Math.abs(actor.vx || 0) > 8 ? `if-bull-${Math.floor((actor.motion?.cycle || 0) * 4) % 4}` : 'if-bull-12';
}

export function ironfangPoint(actor, point, key = ironfangFrame(actor)) {
  const { body } = IRONFANG_GEOMETRY[key], scale = actor.h / body.h, facing = actor.facing || 1;
  return { x: actor.x + actor.w / 2 + facing * (point.x - body.x - body.w / 2) * scale,
    y: actor.y + actor.h + (point.y - body.y - body.h) * scale };
}

export function ironfangSocket(actor, slot) {
  const key = ironfangFrame(actor), meta = IRONFANG_GEOMETRY[key];
  const socket = meta.sockets[slot] || meta.sockets[actor.form === 'flying' ? 'mouth' : 'gun'];
  return socket ? ironfangPoint(actor, socket, key) : { x: actor.x + actor.w / 2, y: actor.y + actor.h / 2 };
}

export function damageBounds(actor) {
  if (!isIronfang(actor)) return [actor];
  const key = ironfangFrame(actor), meta = IRONFANG_GEOMETRY[key], scale = actor.h / meta.body.h;
  return meta.hurtboxes.map(box => {
    const p = ironfangPoint(actor, box, key), w = box.w * scale;
    return { x: p.x - (actor.facing < 0 ? w : 0), y: p.y, w, h: box.h * scale };
  });
}

// The source jet points down (+Y). Exhaust trails opposite the current travel
// vector; low-speed hover retains a vertical jet instead of noisy angle flips.
export function boosterPose(player) {
  const speed = Math.hypot(player.vx || 0, player.vy || 0);
  const dx = speed > 24 ? -(player.vx || 0) / speed : 0;
  const dy = speed > 24 ? -(player.vy || 0) / speed : 1;
  return { x: player.x + player.w / 2 - player.facing * 9, y: player.y + player.h * .65,
    dx, dy, rotation: Math.atan2(dy, dx) - Math.PI / 2 };
}
