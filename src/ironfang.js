import { IRONFANG_GEOMETRY } from './ironfang-geometry.js';
import { villainDamageBounds } from './character-motion.js';

export const isIronfang = actor => actor.type === 'regent' && actor.combatStyle === 'sanctuary';
export const ironfangRotation = actor => actor.form==='flying'&&actor.phase!=='transform'?(actor.flightPitch||0)*(actor.facing||1):0;

// One pose selection contract for rendering, muzzle sockets and damage geometry.
export function ironfangFrame(actor) {
  const time = actor.animationTime || 0, phase = actor.phaseTime || 0;
  if (actor.phase === 'transform') {
    const keys = ['if-bull-12', 'if-morph-0', 'if-morph-1', 'if-morph-2', 'if-dragon-1', 'if-dragon-0'];
    return keys[Math.min(5, Math.floor((1 - Math.max(0, actor.transformTime) / .9) * 6))];
  }
  if (actor.form === 'flying') {
    if (actor.flash > 0 && actor.phase === 'idle') return 'if-dragon-9';
    if(actor.attackKind==='cannon'&&['charge','attack'].includes(actor.phase)){
      const key=`if-dragon-cannon-${actor.phase==='charge'?0:1+Math.floor(phase*18)%3}`;
      if(IRONFANG_GEOMETRY[key])return key;
    }
    if (actor.attackKind === 'breath' || actor.attackKind === 'cinder') {
      if (actor.phase === 'charge') return phase < .35 ? 'if-dragon-4' : 'if-dragon-5';
      if (actor.phase === 'attack') return 'if-dragon-6';
      if (actor.recovering && phase < .22) return 'if-dragon-7';
    }
    return `if-dragon-${Math.floor(time * 8) % 4}`;
  }
  if (actor.flash > 0 && actor.phase === 'idle') return 'if-bull-13';
  if(actor.attackKind==='charge'&&actor.phase==='attack'){
    const key=`if-bull-charge-${Math.floor((actor.motion?.cycle||phase*3)*4)%4}`;
    if(IRONFANG_GEOMETRY[key])return key;
  }
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
  const x=facing*(point.x-body.x-body.w/2)*scale,y=(point.y-body.y-body.h)*scale,angle=ironfangRotation(actor);
  return { x:actor.x+actor.w/2+x*Math.cos(angle)-y*Math.sin(angle),y:actor.y+actor.h+x*Math.sin(angle)+y*Math.cos(angle) };
}

export function ironfangSocket(actor, slot) {
  const key = ironfangFrame(actor), meta = IRONFANG_GEOMETRY[key];
  const socket = meta.sockets[slot] || meta.sockets[actor.form === 'flying' ? 'mouth' : 'gun'];
  return socket ? ironfangPoint(actor, socket, key) : { x: actor.x + actor.w / 2, y: actor.y + actor.h / 2 };
}

export function damageBounds(actor) {
  if (!isIronfang(actor)) return villainDamageBounds(actor);
  const key = ironfangFrame(actor), meta = IRONFANG_GEOMETRY[key], scale = actor.h / meta.body.h;
  return meta.hurtboxes.map(box => {
    const corners=[box,{x:box.x+box.w,y:box.y},{x:box.x,y:box.y+box.h},{x:box.x+box.w,y:box.y+box.h}].map(p=>ironfangPoint(actor,p,key));
    const x=Math.min(...corners.map(p=>p.x)),y=Math.min(...corners.map(p=>p.y));
    return {x,y,w:Math.max(...corners.map(p=>p.x))-x,h:Math.max(...corners.map(p=>p.y))-y};
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
