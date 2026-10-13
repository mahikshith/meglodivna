# Aether Revamp v0.4 — verification

Branch **Revamp**, 14 October 2026. This records the supplied-art, floating-control and geometry rebuild. **113 regression tests pass; all eight refreshed legal campaigns and all five browser replays finish successfully.** Automated completion does not establish subjective fun, balance or physical touchscreen comfort.

## Simulation and campaigns

The suite covers fixed 120 Hz swept movement, coyote time, jump buffering, variable/wall/double jumps, finite thrust, one-way drops, dash damage, alternating melee, bounded light parries, heavy attack resistance, directional muzzle/core beams, projectile pools, pursuit, wards, boss modifiers, portals, summon attacks/expiry, moving platforms, currents, crumble, traps, conduit weakness, death/retry, isolated saves and migration.

Revamp adds the 28×60 hero, authored center/feet preservation, native crawler/raider bodies, atlas attachment alignment in both directions, the Regent's announced ground-to-flight transformation, and scaled Aether clone muzzles. The **113-test** result includes that final clone correction.

Eight refreshed campaigns use legal movement, combat, equipment and story inputs, without position, health, invulnerability, damage or clock overrides. Their three bosses activate at authored triggers, expose attacks 0/1/2 and die; linked gates and story rewards complete. Final Regents transform into the 112×86 Wyrm and perform its three flying patterns. The runs were regenerated after the final clone alignment correction.

| World / stable ID | Tier | Recorded simulated gameplay | Retries |
| --- | --- | ---: | ---: |
| Verdant / soulforge | Ember / Easy | 355.84 s | 2 |
| Verdant / soulforge | Forge / Medium | 339.05 s | 0 |
| Verdant / soulforge | Inferno / Hard | 374.88 s | 1 |
| Verdant / soulforge | Extinction / Ultra hard | 372.40 s | 0 |
| Aerie / tide | Forge / Medium | 351.79 s | 0 |
| Tempest / pyre | Forge / Medium | 350.11 s | 1 |
| Zenith / neon | Forge / Medium | 338.23 s | 0 |
| Prism / veil | Forge / Medium | 342.25 s | 0 |

These efficient recorded completions exceed five simulated minutes. Reading, exploration, hit-stop and human execution change elapsed play. Retained movement-only proofs take 270.93–283.81 s and omit combat. Encounters reuse three physical boss families with world-specific powers plus the Wyrm form; they are not fifteen separately drawn animation families.

Reports and traces use `artifacts/combat-route-{world}-{difficulty}-{report,inputs}.json`. For example, `node scripts/combat-route.mjs forge tide` runs Forge in Aerie and generates its replay input trace. Retries follow real deaths and normal relay recovery.

## Browser, touch and visible actions

`scripts/playtest.cjs` checks five worlds/four tiers, keyboard/gamepad input, catalogue locks/costs, dialogue choices, six biomes/five realms, missile icons, pause and touch macros. The final browser report is `artifacts/browser-report.json`; runtime import counts are **343 generated/composed textures, 174 atlas frames and 49 animation groups**. All checks pass with zero runtime errors and an approximately eight-second joystick fade.

At 844×480, a 112 px floating analogue stick starts where a free gameplay touch lands, remains fixed while dragging, stops movement on release and hides after eight idle seconds. Independent movement/jump release, action-button exclusion, cancellation, fresh origins and modal isolation are checked. Curved Jump/Attack/Dash/Power targets are 84/80/76/72 px in a 112 px reserved bottom gutter, with a 44 px pause target. Action/pause faces exclude the canvas; the floating stick overlays the playfield where the player places it.

Attack reaches the next simulation tick on press, transitions to firing after a 120 ms hold, and adds no slash on release. Holding Jump enables thrust. Holding Power opens the paused palette without casting. These are synthetic browser checks, not a physical two-thumb comfort test.

`scripts/revamp-art-playtest.cjs` passes **54 action captures** with zero runtime errors. Images in `artifacts/revamp-actions/` cover movement, three slash forms, five guns in both directions, nine spells, live summons, damage/death and creature attacks. Its 41 attachment/emission checks measure at most 0.49 px alignment error. Twelve terminal-state checks cover Courier/Bulwark/Wraith corpses at different visual times with frozen protection/stealth timers: fully opaque, without standing armor overlays, gun, jet or cut effects. `artifacts/revamp-actions-report.json` distinguishes deliberate fixture setup/unlocks/resources from legal campaign proofs. The inspected gallery uses the normal Phaser camera pipeline.

`node scripts/replay.cjs <world>` reproduces recorded legal Forge inputs in Chromium and checks production with development hooks absent, Power-hold palette and Android Back. All five current world reports pass with zero runtime errors. Playback uses accelerated fixed steps, not real time. Reports are `artifacts/replay-{world}-report.json`. Manual captures use Phaser's normal camera visibility filtering; an earlier capture-helper error that showed hidden pooled effects was corrected and all screenshots regenerated.

## Extraction and memory

All four source boards remain unchanged. The three compiled reference files total **1,952,086 bytes**. Isolated regeneration matched them byte for byte; `artifacts/reference/extraction-report.json` records hashes. **174 frame keys represent 173 unique pixel payloads**; one terrain alias shares a rectangle. Printed board counts/JSON were not used as sprite metadata. Labels/divider fragments were removed; padding retains jets/tails. Sparse poses and baked lighting remain source limitations.

The 343 generated/composed textures account for 20,136,704 RGBA bytes. The 2048×2048 atlas adds 16,777,216 bytes: **36,913,920 bytes / 35.20 MiB** combined. `artifacts/reference/render-budget.json` records this dimensions-based pixel estimate. Renderer/GPU copies and process overhead are excluded; actual Android RAM and frame rate are unmeasured. Original boards/contact sheets do not ship in the runtime.

## Android and distribution

The Vite 6.4.4 production build and dependency audit pass. Native configuration is JDK 17, SDK 36, Gradle 8.13, application ID `com.meglodivna.ashsignal`, version code **4**, version name **0.4.0-aether-revamp**, minimum API **24** and landscape orientation. It is configured for bundled offline assets without Internet permission. Local assemble/lint checks pass.

The [final Android CI run 38458832513](https://github.com/mahikshith/meglodivna/actions/runs/38458832513) passed for game source commit `743f09aa47179689108f0d359bd194650b6eb190`. The downloaded APK verifies with one valid v2 signer. Its certificate matches the delivered v0.3 key. All nine embedded production/license/reference files match the current `dist` byte for byte; no stale files or original boards are bundled. `artifacts/android-report.json` records the inspection and individual embedded hashes.

Delivery: [ASH-SIGNAL-Aether-Revamp-debug.apk](https://github.com/mahikshith/meglodivna/releases/download/v0.4.0-aether-revamp/ASH-SIGNAL-Aether-Revamp-debug.apk), **4,520,221 bytes**, SHA-256 `65a2a970d6f5784e4af3d066b30dd8fc4d3c0b6dff4cd4d26f2369fd1532f6fb`. Matching web archive: `ASH-SIGNAL-Aether-Revamp-web.zip`, **2,151,251 bytes**, SHA-256 `af11d10a516e452f53623a4ab67d763b80c9b225b520baf87747f0e64ba2d526`. Both uploaded release asset digests match the inspected local files. The [v0.4 prerelease](https://github.com/mahikshith/meglodivna/releases/tag/v0.4.0-aether-revamp) also includes the receipt and action contact sheet.

CI runs the regression suite, eight legal campaigns, production build and Android assemble/lint, then uploads **ASH-SIGNAL-Aether-Revamp-debug-APK** and evidence. Local builds need `ASH_SIGNAL_DEBUG_KEYSTORE` pointed at the persistent key for update compatibility. The older v0.2 APK used another certificate and requires uninstalling it, which removes its local save. Later evidence/documentation commits do not change the delivered game payload.

No Android device/emulator was available. On-device boot, two-thumb comfort, sustained frame rate/thermal behavior, speaker mix, hardware gamepad calibration and human balance remain unchecked. This is a debug test build.

## Historical harness and reproduction

The retained 30-minute harness ran 1,800.002 actual seconds during v0.3 development: 25 rounds, 17 transient failures, and final rounds 24/25 passing. `artifacts/deep-harness-report.json` preserves that history. It predates Revamp and does not establish thirty clean minutes on the final build or human playtesting.

Run the unit suite, eight campaign combinations and build:

```text
npm test
node scripts/combat-route.mjs ember soulforge
node scripts/combat-route.mjs forge soulforge
node scripts/combat-route.mjs inferno soulforge
node scripts/combat-route.mjs extinction soulforge
node scripts/combat-route.mjs forge tide
node scripts/combat-route.mjs forge pyre
node scripts/combat-route.mjs forge neon
node scripts/combat-route.mjs forge veil
npm run build
```

With development at port 5173 and production preview at port 4173, and Playwright/Chromium available:

```text
npm run test:browser
npm run test:art
npm run test:replay -- veil
```

For local Android validation, sync the web build, enter the Android directory and run its wrapper:

```text
npm run android:sync
cd android
./gradlew assembleDebug lintDebug --no-daemon
```

On Windows, use `.\gradlew.bat assembleDebug lintDebug --no-daemon`. `npm run test:deep` starts a fresh 30–40 minute harness. README covers SDK setup/installation; REVAMP records the implementation ledger.
