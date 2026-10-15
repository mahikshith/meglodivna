export const BLADE_ATTACKS = {
  horizontal: { duration: .26, start: .05, end: .17 },
  vertical: { duration: .30, start: .08, end: .20 },
  finisher: { duration: .34, start: .12, end: .24 },
};
export function bladeMotion(player, sword) {
  const mode = player.dashTime > 0 ? 'dash' : ['horizontal', 'vertical', 'finisher'][player.combo || 0];
  const timing = BLADE_ATTACKS[mode] || { duration: player.slashDuration || .2, start: 0, end: 1 };
  const duration = mode === 'dash' ? .16 : player.slashDuration || timing.duration, elapsed = Math.max(0, duration - (mode === 'dash' ? player.dashTime : player.slashTime));
  const progress = Math.min(1, elapsed / duration), facing = player.slashFacing || player.facing || 1;
  const origin = { x: player.x + player.w / 2 + facing * 9, y: player.y + player.h - 39 };
  const width = mode === 'dash' ? sword.width : mode === 'vertical' ? 48 : mode === 'finisher' ? 64 : 52;
  const height = mode === 'vertical' ? 90 : mode === 'finisher' ? 84 : 64;
  const bounds = { x: facing > 0 ? origin.x - 8 : origin.x + 8 - width,
    y: mode === 'vertical' ? player.y + player.h - 94 : mode === 'finisher' ? player.y + player.h - 88 : origin.y - 28, w: width, h: height };
  const active = player.slashTime > 0 && elapsed >= timing.start && elapsed < timing.end;
  const poseIndex = elapsed < timing.start ? 0 : elapsed < (timing.start + timing.end) / 2 ? 1 : elapsed < timing.end ? 2 : 3;
  return { mode, duration, elapsed, progress, active, poseIndex, bounds, origin };
}
