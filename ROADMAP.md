# ASH//SIGNAL — vertical slice

An original, mature 2D action platformer: a courier infiltrates a frozen weapons foundry, shuts down the Warden, and escapes with its core. Snow, oxidized steel, ember red, cold cyan, and a worn amber scarf. Detailed pixel clusters at a 960 × 540 render resolution; readable silhouettes rather than cartoon proportions.

All five build stages are implemented. Final live-combat validation:54.48 simulated seconds, two checkpoint retries, all three Warden attacks, victory. Physical traversal alone:33.79 seconds. Exported PNGs, labeled asset sheet, browser screenshots, and reproducible checks are included.

## Build order

1. **Assets:** original runtime-generated pixel textures; coherent proportions and anchors; idle, run, airborne, slash, enemy, and boss states. Inspect the full texture sheet and in-game scale.
2. **Physics:** fixed 120 Hz simulation, acceleration and friction, variable-height jumping, coyote time, jump buffering, double jump, wall slide/jump, dash, finite jetpack fuel, separate hurt box. Assert movement and collision behavior before integration.
3. **Environment:** one roughly 9,400-pixel level, grounded introduction → broken viaduct → vertical foundry → laser gauntlet → boss arena. Minimum traversal time over 30 seconds including combat. Check every required gap against actual movement.
4. **Gameplay:** sword arcs, bullets, drones, rifle guards, missile turret, readable laser warnings, temporary rapid fire, health/fuel recovery, EMP impairment, boss attack phases, checkpoints, death/retry, victory.
5. **Integration:** Phaser renders pure simulation state; DOM menus/HUD; synthesized audio; bounded particles; keyboard and gamepad input; restart/pause/focus safety. Build, unit tests, scripted full-route checks, browser screenshots, and performance sampling.

## Responsibilities and scope

Atlas roles: asset artist owns `src/art.js`; systems programmer owns `src/physics.js` and physics tests; level designer owns `src/level.js`, level tests, and route notes. Lead integrates combat, renderer, controls, sound, menus, and QA. Files are disjoint during initial work.

The empty workspace has no existing callers, fixtures, configuration, or assets to preserve. New module interfaces, their tests, the entry point, package lock, and production build all need to agree. No external game art or code is copied. Existing franchises inform pacing and mechanics only. Heavy engines, multiplayer, a campaign, and skill installations are outside this slice.

## Acceptance

- A complete original playable level with a boss, loss/retry, and victory.
- Jump, slash, shoot, dash, wall jump, and jetpack respond consistently at different render rates.
- Bullets and missiles collide; attacks communicate windup; temporary buffs and impairment expire.
- Critical state and collision tests pass. Route can be completed with legal inputs.
- Browser rendering inspected; assets and screenshots saved; actual limits reported honestly.
