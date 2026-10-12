# Soulforge — delivered campaign verification

Verified locally on 12 October 2026. This file supersedes the prototype's 32-test/54-second report.

## Simulation

**64 Node tests pass.** Coverage includes fixed-step motion, acceleration/friction, variable-height jump, coyote time and buffering, double/wall jump, wall slide, swept solid/one-way collisions, finite jet fuel, boost and armor tradeoffs, damage/invulnerability, vertical sword hitboxes and once-per-swing hits, reflection, projectile pooling and piercing, all six spells, timed hazards, EMP/burn expiry, checkpoints, death/retry and all-boss victory. Save validation rejects malformed data and unknown items. Spent cannon/nova charges survive retry and immediate save/reload; ordinary mana refills on a cold launch.

Containment regressions exercise legal held-jet/wall-jump/dash attempts at every closed forcefield, clamp the upper world boundary, and prevent hidden boss beams/projectiles outside their authored arenas. Boss warnings and damaging rectangles stay within the arena.

| Difficulty | Legal simulated gameplay | Retries | Reactor time remaining |
| --- | ---: | ---: | ---: |
| Ember / Easy | 251.89s | 0 | 408.11s |
| Forge / Medium | 263.50s | 0 | 246.50s |
| Inferno / Hard | 273.99s | 0 | 176.01s |
| Extinction / Ultra hard | 289.14s | 1 | 100.86s |

Each full combat run uses live enemies/hazards and legal movement, weapon, spell, menu and story actions. No position, health, invulnerability, damage or clock overrides. All three bosses activate only at their proper encounter trigger, expose attacks 0/1/2, and die; all five gates open and all three NPC reward choices are claimed once. Reports and run-length input traces are reproducible with `node scripts/combat-route.mjs <difficulty>`.

The movement-only route reaches extraction in 220.47 simulated seconds with 137 landings. That check excludes combat and dynamic gates; the four live campaign proofs cover those. Efficient automated runs take roughly 4–5 minutes. Dialogue reading, exploration and hit-stop add wall-clock time; five minutes is an intended player target, not a guaranteed duration.

## Browser and art

- Forge's recorded legal inputs reproduce victory in Chromium: 263.50 simulated seconds, all bosses dead, zero runtime errors. Captures include six biomes, three boss attacks, three conversations and the victory screen. Fixed-step replay is not real-time playback.
- Browser QA passes difficulty selection; keyboard run/jump/large vertical slash/jet/cinder; armory locks, tabs, pause and focus; NPC conversation, reward and save; six environment renders; missile warning followed by launch; pause; and synthetic gamepad movement/menu controls.
- Landscape touch at 844×480 passes 15 targets of at least 44×44 pixels, real browser multi-touch movement+jump, independent finger release, and armory open/close. UI render tests use isolated position fixtures; full campaign proofs use legal inputs.
- Production preview boots with the development API absent. Touch layout and the Android back-control bridge close the armory and pause the campaign correctly.
- 121 unique original textures are exported with dimensions/anchors. Nonempty artwork, crisp alpha and composed backgrounds were checked. The contact sheet, six environments, menus, touch layout, enlarged blade and live boss screenshots were visually inspected. Texture pixels total about 40 MiB before renderer overhead.

## Packaging

Vite production build succeeds. The native offline Android WebView shell builds with Java 17, SDK 36 and Gradle 8.13. `assembleDebug` and `lintDebug` pass with zero lint errors. APK identity: `com.meglodivna.ashsignal`, version `0.2.0-soulforge` / code 2, minimum API 24, target API 36, landscape. APK signature verification passes with one v2 signer. Every embedded web asset is hash-compared against `dist`; stale web assets are rejected. Runtime licenses are bundled.

The GitHub workflow runs all 64 tests, all four live campaign proofs, production build, Android build/lint, and uploads the debug APK plus test evidence. [Run 38288675281 passed](https://github.com/mahikshith/meglodivna/actions/runs/38288675281) for campaign commit `15e0b4fa38f3f0637768fc318f5feb90d96a7104`. The delivered `ASH-SIGNAL-Soulforge-debug.apk` is its CI artifact, 2,732,767 bytes; its signature and all six embedded production/license files were verified locally. SHA-256: `F5289A892CF893E01EF411E4ED505EA2CAE5590E14CA66300CB4AB7959FAC84E`. `artifacts/android-report.json` records the inspection. The accompanying `ASH-SIGNAL-Soulforge-web.zip` contains the matching static build.

No connected Android device or installed emulator was available. Native device boot, thermal performance, speaker mix, physical gamepad calibration and human challenge/addictiveness remain unverified. This is a playable debug campaign for testing, not a store release. Local builds and CI builds use different debug certificates; use one distribution consistently for in-place updates.

## Reproduce

`npm test`, `node scripts/combat-route.mjs ember|forge|inferno|extinction` (one ID per invocation), and `npm run build` cover simulation and production. With dev at 5173 and preview at 4173, `npm run test:browser` and `npm run test:replay` use an available Playwright installation; set `CHROMIUM_EXECUTABLE` if needed. `npm run android:sync`, then `android/gradlew -p android assembleDebug lintDebug`, produces the offline debug APK. See `README.md` for installation and controls.
