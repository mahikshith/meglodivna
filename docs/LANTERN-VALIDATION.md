# The Last Lantern v0.6 validation

14 October 2026. Scope: Hollow Sanctuary only. This report separates legal simulation, real browser input, isolated rendering fixtures and Android build checks. It contains no physical-device test claim.

## Simulation

`npm test`: **162/162 passed** after the input and optional-vault regressions were added. Coverage includes movement, collision, saves/claims, portal arrival momentum, distinct enemy attacks and committed facing, falling caster projectiles, local guardian slams, dragon breath, new rewards, safe opening geometry, aqueduct takeoff margin, camera framing and second-finger utility controls.

The pressure-warning compatibility test now explicitly enables pressure in its isolated fixture. Hollow Sanctuary intentionally disables the old global missile pressure; other realms retain that behavior.

`node scripts/combat-route.mjs <difficulty> soulforge` completed the chapter through legal movement, combat, equipment and story inputs with live enemies. No health, position, invulnerability, damage or clock overrides are used. Normal checkpoint retries are allowed.

| Difficulty | Simulated seconds | Deaths | Result |
| --- | ---: | ---: | --- |
| Ember | 75.75 | 0 | All guardians, runes and exit; won |
| Forge | 86.56 | 1 | All guardians, runes and exit; won |
| Inferno | 84.83 | 0 | All guardians, runes and exit; won |
| Extinction | 90.45 | 0 | All guardians, runes and exit; won |

These optimized routes do not estimate first-time human completion or enjoyment. Forge's death occurs in the Bell Stair and uses a legitimate retry. Separate compatibility runs on Forge also won in tide (88.63s), pyre (84.09s), neon (89.28s) and veil (92.86s); those realms are not presented as newly polished chapters.

`tests/hollow-vault.test.js` starts a fresh Forge world, legally climbs both optional Roots vault steps, breaks the chest, earns the katana once and uses the return portal. It verifies departure/arrival events, supported arrival and retained reward without state overrides.

## Actual browser input and layout

`tests/hollow-ui.browser.cjs` passed at 740×360, 640×360, 390×844 and 1280×720, including home, guide, equipment, story, pause, settings, persistence and return context. `tests/runeheart-controls.browser.cjs` passed its four touch layouts. Screenshots are in `artifacts/lantern/ui` and `artifacts/runeheart/controls`.

`scripts/lantern-playtest.cjs` passed actual keyboard and independent touch contacts at 740×360 and 844×390, including Mira's real reward, equipping it, save reload, held fire/thrust, dash, second-finger Pause/Gear, settings and frozen simulation/effect state. The final run produced 13 captures, zero runtime/console errors and zero failed resources, with unchanged source hashes. Maximum observed Lantern particles were 26 of 240 and ghosts 4 of 6; this is bounded-pool evidence, not a device frame-rate measurement. Report: `artifacts/lantern/qa/report.json`.

The first integrated run found a real bug: secondary touch contacts did not synthesize clicks on Pause/Gear. Touch/pen pointer activation now clears held actions immediately, deduplicates the following compatibility click and retains keyboard/mouse activation. Failed evidence is kept with an explicit failure filename.

## Visual fixtures and art

The QA script separately labels nine scene fixtures for blade arcs, jet exhaust, portals, companions, transformation and warnings/slams. They alter isolated scene state to expose a visual and are **not** campaign completion evidence. Renderer lifecycle assertions check that deaths retain the sanctuary atlas and repeated portals open, close and retire correctly.

Independent screenshot review found and corrected a legacy-art switch during enemy death. The dragon has no authored death strip: it holds a matching pose and fades. Portal frame 3 is now used during closure, and reused portals restart their formation clock. Original source images, prompts, alpha extraction, shared scale, anchors and all remaining pose reuse are documented in `ASSETS.md`.

## Production and Android

`node scripts/replay.cjs soulforge` reproduced the recorded Forge campaign in browser simulation: victory, all three bosses defeated, one legal retry, 17 milestone captures and zero runtime errors. It also tested the built production page: no development API, held Power opens equipment, and Android Back closes equipment before pausing. The replay is fixed-step playback, not real-time human play. Evidence is copied to `artifacts/lantern/replay`.

Vite production build passes. Its approximately 1.7MB uncompressed engine/game JS chunk still produces Vite's large-chunk advisory. Local native Rollup download failed; local verification used the official Rollup WASM distribution without changing package dependencies or lockfile resolution. CI installs the normal locked dependencies.

Signed Android version `0.6.0-lantern`, code 7 passed [build, lint, signature, embedded-file and upload verification](https://github.com/mahikshith/meglodivna/actions/runs/38610685671). Package `com.meglodivna.ashsignal` and certificate SHA-256 `d5957205feb0467218e7a0483387e65a347516bbb6511c2e7b5007ff165cc437` are unchanged. The APK is **6,242,607 bytes**, SHA-256 `0ce4bbf977f12de65fa5683e12cde632911d94b5722d48a54139aa1cdc669d81`, from source commit `6a5c99dc8f0ab79ddebcb89b798dcc3170fea6b9`.

The [GitHub prerelease](https://github.com/mahikshith/meglodivna/releases/tag/v0.6.0-lantern) contains the APK, signed-payload report and checksum. CI downloaded the uploaded APK and compared every byte successfully. README's Latest APK now links this exact artifact and validation run. The validated rebuild was fast-forwarded into `main`; ongoing work remains on `codex/runeheart-rebuild`.

## Limits

No physical Android device was available. Thumb reach, input-to-photon latency, sustained frame pacing, thermal/battery behavior and audio mix are unmeasured. Browser timing is host evidence only. Human playtesting must still assess readability under pressure, boss pacing, repetition and willingness to pay; automation and attractive screenshots cannot establish paid-release quality.
