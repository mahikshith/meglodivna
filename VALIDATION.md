# Fractured Realms v0.3 — verification

Verified13 October2026. This replaces the v0.2 report. Automated evidence does not establish subjective fun, balance or physical touchscreen comfort.

## Simulation and complete routes

**100 Node tests pass.** Coverage includes fixed120Hz swept movement, jump/coyote/buffer/wall/double jump, finite thrust, one-way drop, dash sword damage, alternating melee, bounded light parries/heavy attack resistance, diagonal muzzle/core beams, projectile pools, enemy pursuit, shields and real boss power modifiers, warned portals, clone/wolf/dragon attacks and expiry, currents/platform carry/crumble, hazards, conduit weakness, damage/death/retry, isolated world saves and v0.2 migration.

Eight live runs finish using legal movement, combat, gear and story inputs. No position, health, invulnerability, damage or clock overrides. Every world's three bosses activate at their triggers, expose attacks0/1/2 and die; linked gates and story rewards complete.

| World | Tier | Simulated gameplay | Retries |
| --- | --- | ---: | ---: |
| Soulforge | Ember / Easy |326.29s |0 |
| Soulforge | Forge / Medium |335.70s |0 |
| Soulforge | Inferno / Hard |357.59s |0 |
| Soulforge | Extinction / Ultra hard |382.49s |1 |
| Tide | Forge / Medium |349.63s |0 |
| Pyre | Forge / Medium |336.77s |0 |
| Neon | Forge / Medium |336.08s |0 |
| Veil | Forge / Medium |336.59s |0 |

Each efficient completion exceeds five simulated minutes; reading, exploration and hit-stop change elapsed human play. Movement-only proofs take270.88–283.79s and omit combat. Moving-surface fixtures exercise carry/collision; full routes can use stable surfaces. Fifteen named encounters use three physical boss families and different world power modifiers, rather than fifteen animation families.

Reports/traces: `artifacts/combat-route-{world}-{difficulty}-{report,inputs}.json`. Reproduce with `node scripts/combat-route.mjs forge tide` or another valid tier/world. Extinction's retry follows a real death and normal relay retry.

## Thirty-minute development harness

The requested harness ran **1800.002 actual seconds**, from2026-10-12T18:44:35.538Z to19:14:35.540Z, across25 rounds. Fresh processes ran seeded checkpoint fixtures and Node regressions while implementation changed. It retained17 transient failed rounds, including stale assertions and intermediate source failures; final rounds24/25 passed. Full history: `artifacts/deep-harness-report.json`.

This was a development harness, not thirty clean minutes on the final build, a complete legal route or human playtesting. Frozen-source tests, legal routes and browser checks are separate evidence. `npm run test:deep` reproduces a30-minute run; the script accepts30–40 minutes.

## Browser, touch and art

Chromium QA passes with **zero runtime errors** and347 original textures. It checks five-world/four-tier selection, keyboard movement/combat, alternating slashes, jet/magic, catalogue locks/costs, paused dialogue/saved choices, six Soulforge biomes/five realms, red missile warning/launch, pause and synthetic gamepad input.

Touch QA at844×480 checks a112px circular analogue stick, four curved SVG action buttons of48px or larger, simultaneous movement/jump and independent release, Attack tap/hold fire, Jump hold thrust, and Power tap/hold palette without unwanted mana spending. All controls lie in the reserved112px gutter below the canvas. Gear browsing pauses play. Physical reach/comfort still needs a phone.

347 exported textures have dimensions/anchors and51,931,904RGBA source bytes (49.53MiB), before renderer/GPU overhead. Character drawing uses a finer grid than scenery. Platforms have material/rim contrast; mechanical traps, shields, rockets, summoning circles, slash poses and core beams follow simulation state. Contact sheets, mobile layout and environment captures were inspected. UI position fixtures isolate rendering and do not replace legal campaign proofs.

`scripts/replay.cjs <world>` replays legal Forge traces in Chromium and checks production with development hooks absent, Power-hold palette and Android Back. Playback is accelerated fixed steps, not real time. Successful final reports are `artifacts/replay-{world}-report.json`.

## Build and distribution

Vite6.4.4 production build passes; npm audit reports zero vulnerabilities. Android uses JDK17/SDK36/Gradle8.13, appID `com.meglodivna.ashsignal`, code3/name `0.3.0-fractured-realms`, minimum API24 and landscape. Assets/licenses are bundled; no Internet permission.

CI runs100 tests, all eight legal routes, production build, Android assemble/lint, then uploads `ASH-SIGNAL-Fractured-Realms-debug-APK` and evidence. Exact distribution signature/hash/asset inspection is recorded in `artifacts/android-report.json` and appended below after delivery.

No Android device/emulator was available. On-device boot, two-thumb comfort, sustained frame rate/thermal behavior, speaker mix, hardware gamepad calibration and human balance remain unchecked. This is a debug test build. Local/CI certificates can differ; successive CI APKs should update the prior CI APK. v0.2 discoveries/equipment survive migration; old Soulforge encounter/checkpoint coordinates reset for its expanded route.

## Reproduce

Run `npm test`, the eight `test:game` combinations in CI and `npm run build`. With dev at5173 and preview at4173, run `npm run test:browser` and `npm run test:replay -- veil` with Playwright/Chromium. Run `npm run android:sync`, then `android/gradlew assembleDebug lintDebug --no-daemon`. README covers SDK setup/installation.
