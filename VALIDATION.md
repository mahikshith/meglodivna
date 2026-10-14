# Runeheart v0.5 validation

## Local playable-slice update — 14 October 2026

The published v0.5 evidence below applies to the older APK. The current `codex/runeheart-rebuild` working tree has an unpublished Soulforge readability, balance, story, and audio update described in [the playable-slice review](docs/PLAYABLE-SLICE-REVIEW.md). `node --test --test-isolation=none tests/*.test.js` passed 146/146; legal routes reached victory on all four Soulforge difficulties and Forge in the other four realms. The Soulforge Forge route completed all three guardian seals and the Orren/Mira conversations. A 740 × 360 touch-emulated Chrome capture showed a full-height canvas, visible ground during a jump, reachable controls and launch button, an unclipped settings return button, and zero browser exceptions. The four screenshots and capture script are in `artifacts/runeheart/` and `scripts/capture-mobile.mjs`.

The production `npm run build` was blocked locally by a missing `@rollup/rollup-win32-x64-msvc` optional binary after registry downloads failed. A direct esbuild bundle was used only for browser inspection. No new Android APK or physical phone test was produced for this update; the Latest APK link still identifies the previous verified delivery.

This document describes the new rebuild, not the older v0.3/v0.4 evidence. Source work is on `codex/runeheart-rebuild`, merged to `main` for Android delivery. APK publication details are recorded in `artifacts/android-report.json` after release verification.

## Physics and legal campaigns

**140 Node tests pass.** Coverage includes swept collision, frame-rate stability, buffered/variable/double/wall jumps, jet resources, dash collision, facing-locked sword combos, enemy support/patrol/chase/retreat/cover jumping, directional emission, ordinary/heavy attack distinctions, boss guard/recovery, rune-gate dependencies, rewards and save migration.

The continuous harness ran **1801.588 actual seconds** from 2026-10-13T20:42:20.080Z to 2026-10-13T21:12:21.668Z: **245 rounds, 392 full legal campaigns, zero failures**, 5,040,480 caller steps and 98,000.00000000447 simulated stress seconds. Every round reran the regression suite and varied simulation inputs; every fifth round reran all eight campaign/difficulty combinations. Eight simulation/driver files were hash-locked for the entire run. Aggregate SHA-256: `2cb57ec19ffd16a00065659d21562ee7491247085d049eff9159463c8152c4b3`. Rendering and UI were polished separately while this simulation ran. This proves simulation stability over that run, not Android performance or thirty minutes of human play.

[Full harness report](artifacts/deep-harness-report.json). `npm run test:deep` requires 30–40 actual minutes. The final campaign driver uses normal movement, attacks, equipment, dialogue and retries; it does not inject position, health, boss damage or completion. Optimized clean routes measure about97–177 simulated seconds, so a guaranteed five-minute minimum is not claimed.

All five Forge campaign traces were replayed through the actual browser simulation and reached victory with all three guardians defeated and zero runtime errors. Reports: `artifacts/replay-{world}-report.json`. Production checks verify the development API is absent, a Power hold opens the palette, and Android Back closes it before pausing. Replays are accelerated fixed-step playback, not wall-clock device play.

## Controls and rendered actions

The control fixture measures 844×480, 740×360, 640×360 and390×844 layouts, action targets/gaps, canvas separation, pointer ownership, real eight-second joystick fade, hold gestures, opacity, cancellation, keyboard/gamepad and modal behavior. It is an isolated UI/input fixture.

The final **48-capture integrated playtest** sends real keyboard and Chromium touch input at844×480 and740×360. It covers jump/double jump, jet ascent, three sword forms, held fire, dash, Mira interaction and reward choice, legal spell equip/cast, simultaneous stick/actions, pause/retry, fall death/touch reconnect, preserved spell unlock and rotation restoration. No player/world position or resource injection is used. Source hashes stayed unchanged and browser errors were zero. This is not a complete human campaign or physical phone test. See [live report](artifacts/runeheart/live-play/report.json) and [control documentation](docs/RUNEHEART-CONTROLS.md).

**54 isolated action fixtures** cover all five guns in both directions, nine spells, three live summons, damage, three armor death presentations, three sword poses, enemy windup/discharge and Regent transformation/rockets/beams. Twenty-one attachment/emission comparisons have maximum rounding error below0.49 world pixels. Twelve terminal presentation checks verify no live weapon/armor/effect overlays after death. These fixtures deliberately set valid equipment/resources and reposition authored actors; they are separate from legal campaign proof. [Action report](artifacts/runeheart/actions-report.json), [contact sheet](artifacts/runeheart/actions/contact-sheet.png).

**20 environment/action captures** inspect solid foundations, landing rims, crypt ceilings, aqueducts, high jet travel, summons and all five realms. Old room-title watermarks were removed. A modular castle source was recomposed before use, and skyline layers were aligned above the solid ground. [Visual report](artifacts/runeheart/gameplay/report.json). Root visually inspected sanctuary, crypt and city; asset review additionally inspected poses, backgrounds and contrast.

## Assets and budget

The new selected graphics packet contains184 frame keys,166 unique rectangles and62 animation groups. Its twelve compiled files total465,343bytes. Canonical CC0 sources, author permissions, hashes and isolated regeneration are in[ASSETS.md](ASSETS.md) and `artifacts/runeheart/`.

All loaded texture pixels together estimate **50.42MiB per uncompressed copy**:333 generated textures, two2048² atlases and eight background paintings. A CPU+GPU two-copy scenario is100.83MiB before screen buffers, browser, geometry and caches. This is an allocation estimate, not measured device RAM. Original boards, unused source packs, music and demos are excluded from the shipped bundle.

## Android and limitations

Local production build, offline asset sync, Android assemble and lint have passed. Version name0.5.0-runeheart, code5, application ID `com.meglodivna.ashsignal`, minAPI24, target36, persistent v0.3+ signing certificate. CI runs the regression suite, eight campaigns and native build/lint. Final signed APK hash, embedded file matches and CI URL belong in the delivery receipt.

There is no connected Android device/emulator. Two-thumb comfort, touchscreen latency, sustained frame rate, thermal behavior, speaker mix and actual human balance remain unmeasured. At740×360, a cape edge can crop during extreme jet/threat framing while the physical body and head remain visible. The opening area becomes exposed to incoming fire after play progresses; dialogue and armory themselves pause simulation. The five realms share room archetypes. Commercial readiness and a five-minute minimum are not established.

## Reproduction

```sh
npm test
node scripts/combat-route.mjs forge soulforge
node scripts/combat-route.mjs forge tide
node scripts/combat-route.mjs forge pyre
node scripts/combat-route.mjs forge neon
node scripts/combat-route.mjs forge veil
npm run test:deep
npm run test:browser
npm run test:art
npm run test:visual
node scripts/replay.cjs soulforge
```

Browser commands require Playwright/Chromium and a dev server on5173. Replay production checks additionally require the latest built preview on4173. Failures while adapting old fixtures (old floor height, old frame names, array-versus-object attachment metadata and windup timing) were corrected in the harness; final reports describe current behavior rather than reusing old screenshots.

## Verified delivery — 14 October 2026

The [main-branch CI run38470313614](https://github.com/mahikshith/meglodivna/actions/runs/38470313614) passed for source commit `83e0af57d626c32f6b754a88713d685df7892207`. The downloaded CI APK is4,874,043bytes with SHA-256 `701c98700a6a5f3717587dcd3da8aa55d4c8d3a7e1b2b73b71141cc741a8f247`. It has one valid v2 signer, matching the persistent certificate, version5 and no Internet permission. All22 embedded web/art/license files match local `dist` byte for byte; there are no stale files. Local Android lint reports zero errors.

[Download Runeheart APK](https://github.com/mahikshith/meglodivna/releases/download/v0.5.0-runeheart/ASH-SIGNAL-Runeheart-debug.apk). Uploaded APK, web archive, receipt and crypt screenshot hashes and byte counts match the inspected files. Receipt:[android-report.json](artifacts/android-report.json). The web archive is2,480,705bytes, SHA-256 `e34591a68155767b08ec6ec271048ab2ce8b01e61a247b0f46e665e336e743c5`. Later documentation/checker commits do not change the delivered game payload.
