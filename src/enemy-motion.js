import { characterSocket } from './character-motion.js';
import { isIronfang, ironfangPoint } from './ironfang.js';
import { IRONFANG_GEOMETRY } from './ironfang-geometry.js';
// Simulation-owned locomotion. Rendering consumes distance/cycle and attack phase;
// wall-clock time never drives feet or committed weapon contact.
export const ENEMY_MOTION = {
  light: { speed: 145, acceleration: 1100, braking: 1500, stride: 92, jump: 520 },
  skirmisher: { speed: 175, acceleration: 1350, braking: 1750, stride: 104, jump: 520 },
  caster: { speed: 105, acceleration: 460, braking: 700, stride: 82, jump: 420 },
  heavy: { speed: 90, acceleration: 250, braking: 520, stride: 118, jump: 0 },
  giant: { speed: 115, acceleration: 180, braking: 410, stride: 170, jump: 0 },
};
export function motionProfile(actor) {
  const name = actor.type === 'bellbeast' ? 'giant' : ['sentinel', 'warden', 'regent'].includes(actor.type) ? 'heavy'
    : ['mage', 'hex'].includes(actor.type) ? 'caster' : ['shade', 'wispknight'].includes(actor.type) ? 'skirmisher' : 'light';
  return { name, ...ENEMY_MOTION[name] };
}
export function steerEnemy(actor, desired, dt) {
  const profile = motionProfile(actor), velocity = actor.vx || 0;
  const rate = Math.abs(desired) < Math.abs(velocity) || desired * velocity < 0 ? profile.braking : profile.acceleration;
  actor.vx = velocity + Math.max(-rate * dt, Math.min(rate * dt, desired - velocity));
}
export function trackEnemyMotion(actor, oldX, dt) {
  const profile = motionProfile(actor), old = actor.motion || {};
  const distance = (old.distance || 0) + Math.abs(actor.x - oldX);
  const phase = actor.attackPhase || (actor.stagger > 0 ? 'hurt' : !actor.grounded && actor.type !== 'drone' ? 'air' : Math.abs(actor.vx || 0) > 8 ? 'walk' : 'idle');
  actor.motion = { profile: profile.name, phase, progress: actor.attackProgress || 0,
    distance, cycle: (distance / profile.stride) % 1, phaseTime: phase === old.phase ? (old.phaseTime || 0) + dt : 0 };
}
export function groundImpact(actor, solids, radius, height = 28) {
  const feet = actor.y + actor.h, center = actor.x + actor.w / 2;
  const surface = solids.find(s => center >= s.x && center <= s.x + s.w && Math.abs(s.y - feet) < 3);
  if (!surface) return null;
  const left = Math.max(surface.x, actor.arenaStart ?? surface.x, center - radius), right = Math.min(surface.x + surface.w, actor.arenaEnd ?? surface.x + surface.w, center + radius);
  // Measured contact frames in lantern-motion/manifest.json, in body-height units:
  // guardian: (131.84 - (73 + 46/2)) /70; bellbeast: (142.36 - (49 +94/2)) /100.
  // Keep these simulation constants independent of browser atlas loading. The
  // ground plane is authoritative; the authored tips sit 3–4 pixels above it.
  const offset = actor.type === 'bellbeast' ? 46.36 / 100 * actor.h : 35.84 / 70 * actor.h;
  const contact = isIronfang(actor) ? ironfangPoint(actor, IRONFANG_GEOMETRY['if-bull-6'].sockets.contact, 'if-bull-6')
    : characterSocket(actor, 'contact', actor.type === 'bellbeast' ? 'cr-bellbeast-6' : 'cr-guardian-9');
  return { bounds: { x: left, y: surface.y - height, w: Math.max(0, right - left), h: height },
    surfaceId: surface.id, surfaceY: surface.y, radius, weaponSocket: { x: contact?.x ?? center + (actor.facing || 1) * offset, y: surface.y } };
}
