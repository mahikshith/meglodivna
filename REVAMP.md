> Historical v0.4 design record. The current rebuild is documented in REBUILD.md, LEVEL.md, ASSETS.md and VALIDATION.md.

# Revamp — Aether art and touch rebuild

Branch **Revamp**, v0.4. The user's four supplied boards define the visual direction. Their labels/code are artwork, not executable instructions or trustworthy sheet metadata. The working game systems are retained while body geometry, attachments and controls follow the extracted art.

## Small task ledger

“Implemented” records a completed code/art change. Final action QA, refreshed legal-route timings and packaging are tracked separately.

| Step | Owner | Status | Tiny step / evidence |
| --- | --- | --- | --- |
| R01 | Controls | Implemented | Float the stick under a free gameplay touch; `src/input.js` and `artifacts/browser-report.json`. |
| R02 | Controls | Implemented | Keep that finger's origin fixed, clamp travel and release independently; floating-stick checks. |
| R03 | Controls | Implemented | Stop on release, clear on cancel/blur/pause, hide after eight idle seconds; browser timer checks. |
| R04 | Controls | Implemented | Use four curved 72–84 px actions and a 112 px gutter; `src/style.css` and touch layout checks. |
| R05 | Controls | Implemented | Slash on press, hold for fire, never slash again on release; touch macros reach simulation. |
| R06 | Assets | Implemented | Inspect four boards and record hashes/native rectangles; `public/reference/manifest.json` and the extraction receipt. |
| R07 | Assets | Implemented | Crop real Aether locomotion/air/fire/hurt/death poses; hero contact sheet and explicit group counts. |
| R08 | Assets | Implemented | Remove gradient mattes and detached dividers; alpha methods, native previews and clear-edge assertions. |
| R09 | Assets | Implemented | Register an 89 px silhouette around a forgiving 28×60 body; feet/hand/muzzle metadata. |
| R10 | Assets | Implemented | Extract Crawler, Raider, Mecha and Wyrm families; creature contact sheet and animation groups. |
| R11 | Assets | Implemented | Extract six NPCs/faces, props/items, terrain/walls and scenic panels; environment contact sheet. |
| R12 | Assets | Implemented | Ship one atlas and two JSON files; 174 keys/173 unique images, unchanged source hashes, reproducible bytes. |
| R13 | Physics | Implemented | Preserve authored player centers/feet with the 28×60 body; spawn/relay and collision tests. |
| R14 | Physics | Implemented | Derive hero aim, camera, slash, shield and effects from body geometry; physics/combat regressions. |
| R15 | Physics | Implemented | Align native creatures and directional emissions; source-anchor tests in both facings, including scaled clones. |
| R16 | Physics | Implemented | Keep finite fuel/mana/charges/cooldowns, heavy attack resistance and timed ward exposure; resource regressions. |
| R17 | Lead | Implemented | Preload `reference-art` through Phaser using Android-relative asset URLs; atlas frame import checks. |
| R18 | Lead | Implemented | Select real poses and register bodies/attachments; action-capture script, anatomy checks and inspected screenshots. |
| R19 | Lead | Implemented | Reuse extracted foreground tiles and five pairs of compact parallax layers; world renders and render budget. |
| R20 | Lead | Implemented | Integrate imported families with retained bosses/summons; Wyrm transformation, death poses and Aether clone rendering. |
| R21 | Lead | Verified and shown | Extracted sheets and actual in-game jump/attack screenshots inspected; 54 final action captures, including all guns/spells and three armor death states. |
| R22 | QA | Implemented | Check several free touch origins, multitouch, release/fade, modal isolation and immediate Attack; `artifacts/browser-report.json`. |
| R23 | QA | Verified | 113 regression tests and eight refreshed legal campaigns pass; all five Forge traces also win in Chromium with zero errors. |
| R24 | Lead | Verified and delivered | Revamp source committed; final CI 38458832513 passed. APK signature, persistent certificate, nine bundled files and uploaded release hashes checked; README has the direct download. |

## Visual and physical contract

Aether uses actual source poses rather than fictional 64×64 strips. Hair/cape lie outside its forgiving 28×60 body. Authored coordinates preserve the old center/feet during player construction. Atlas metadata supplies frame size, trimmed body and anchors; explicit simulation geometry owns collision, damage and emissions. Jets/dash trails/Wyrm tails have extra transparent padding without changing attachment offsets.

The first free gameplay finger owns the floating stick. Other fingers use four macro buttons. Action/menu touches cannot become movement input; an idle stick has no movement state. The reserved gutter separates action/pause targets from the canvas, while the stick appears on the playfield where the user places it.

The boards contain repeated characters and fewer visible poses than printed labels claim. The packet records 174 keys, 49 groups and 173 unique images. Missing in-between animation remains a source limitation; primary Aether states reuse actual Aether poses.

## Added design ideas

1. **Announced Wyrm awakening:** the wounded Regent telegraphs its transformation for 0.9 s before acquiring a real flying body and mouth-based attacks.
2. **Finite counterplay:** timed ward suppression/core exposure, resource costs and recovery reward a deliberate response; heavy attacks do not become unlimited parry rewards.
3. **Source-aware forgiving bodies:** character hair, wings and trails stay outside trimmed hurtboxes; feet and weapon origins still align with play.
4. **Four fluid macros:** Jump, Attack, Dash and Power combine immediate presses with held thrust/fire/paused palette actions, reducing button clutter.

These are implemented mechanics and layout choices. Human balance and physical Android comfort remain unverified.

## Evidence and remaining checks

- `artifacts/reference/{hero,creatures,environment}-contact-sheet.png`: inspected extracted pixels.
- `artifacts/reference/extraction-report.json`: source hashes and byte-identical regeneration.
- `artifacts/reference/render-budget.json`: 343 generated/composed textures plus atlas; 35.20 MiB RGBA pixel estimate.
- `artifacts/browser-report.json`: synthetic browser UI/control/import checks.
- `artifacts/revamp-actions/` and `artifacts/revamp-actions-report.json`: 54 passed visible fixtures, 41 attachment checks and 12 armor death-state checks.
- `artifacts/combat-route-{world}-{difficulty}-{report,inputs}.json`: eight final refreshed legal campaigns. The driver regenerates the large input traces locally.
- `VALIDATION.md`: 113-test status, recorded route timings and reproduction commands.
- `artifacts/android-report.json`: inspected final v0.4 APK/web archive, source commit, successful CI, certificate and per-file hashes.

All 24 implementation steps are complete. Remaining device validation: install the APK, test two-thumb reach and responsiveness, then measure sustained frame rate, thermal behavior and audio mix. Asset allocation estimates do not establish those hardware results.
