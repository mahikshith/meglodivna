# Delivered slice — verification

Verified locally on12 October2026.

- **32 passing Node tests:** variable jump, coyote time, buffered landing, air/wall jump, dash duration/cooldown, jet fuel, thin-solid/one-way collisions, damage/shield/invulnerability, once-per-swing damage, projectile pool/swept hits/reflection, buff/EMP expiry, timed hazards, checkpoint/death/victory, boss patterns, and level data.
- **Continuous movement:**33.79 simulated seconds,22 landings, spawn→exit with legal inputs; no teleport or physics bypass. This check excludes combat.
- **Full combat:**54.48 simulated seconds with live enemies/hazards and two legitimate checkpoint retries. Warden defeated and exit reached. No health, invulnerability, position, or damage overrides. Boss fight11.44 seconds; missile, beam, and fan attacks all observed. Checkpoint resource recovery and authored pickups operate normally.
- **Browser replay:** same recorded action inputs reproduce victory in Chromium; foundry, laser, boss beam, and victory screenshots captured. The simulation advances in fixed steps rather than real-time playback.
- **Browser controls:** keyboard run/jump/slash/fire/dash/jet; pause freezes simulation; retry at relay; settings and resize; synthetic gamepad movement/pause/menu confirm; touch-button movement. No runtime errors. Desktop1440×960, compact800×600, touch844×480.
- **Art:**40 unique original textures, dimensions/anchors, nonempty artwork, crisp alpha, exported PNGs and manifest. Labeled sheet and scene screenshots visually inspected.
- **Production:** Vite build succeeds; static preview boots, starts, moves, and pauses. Development test API absent. Zip package includes Phaser's MIT license.

Headless frame timing was approximately16.7ms at the median and95th percentile during one sample. This is diagnostic, not a target-hardware FPS guarantee. Physical gamepad calibration, perceived audio mix, human challenge/addictiveness, and extended compatibility across browsers remain unverified. This is one completed vertical slice, not a campaign or a release candidate.

## Reproduce

`npm test` and `npm run test:game` cover the simulation. With the dev server at5173, run `npm run test:browser`; it requires an available Playwright tooling installation and matching Chromium. `npm run test:replay` also expects the production preview at4173 and a freshly recorded input trace. Reports are in `artifacts/`.
