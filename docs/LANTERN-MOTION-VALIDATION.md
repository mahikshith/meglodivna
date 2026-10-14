# Motion and Soul Engine validation

## Critique of the delivered v0.6 gameplay

The sanctuary composition, character identities, portal art and encounter route were worth retaining. The main problems were integration and incomplete motion coverage:

- Enemy rendering selected idle during travel despite available movement state. Weapon anticipation, contact and damage used inconsistent clocks.
- Sword trails orbited a damage rectangle, rather than a measured blade. One source follow-through had no visible sword. A new source strip was necessary.
- Boost and smoke used large rectangles whose pixel density differed from the actors. Metal and moving platforms bypassed the approved terrain artwork.
- Old shield, projectile, lever and checkpoint graphics remained alongside the newer assets. The water surface was hundreds of pixels above the actual lethal water boundary.
- Portal prompts required interaction and destinations were invisible. Incidental messages competed with the middle of the playfield.
- The chapter lacked a persistent soul-spending loop and a distinct optional large encounter.

The revision addresses those causes while retaining the approved artwork and collision foundation. It also fixes issues found during integration: incorrect giant death identity, offset soul visuals, planted charge poses, missing windup fallback, understated attack warnings, stale rendered objects after retry, and the completed Mira objective remaining on screen.

## Evidence and its limits

- **Unit/simulation:** 171 tests pass. See `artifacts/lantern-motion/unit-tests.txt`. Coverage includes shared blade phases, measured mirrored impact sockets, movement inertia, portal return locks, soul reward persistence and spending guards.
- **Legal simulation campaigns:** all four sanctuary difficulties, four compatibility realms and the optional Bellbeast route finish using ordinary simulated controls. The optional route reaches the raised entrance, observes slam/charge phases, defeats the giant, collects exactly 80 souls, returns through the portal and completes the chapter. Reports are in `artifacts/lantern-motion/campaigns`. These are controller simulations, not human pacing or device tests.
- **Art pipeline:** 79 motion frames/54 aliases, inspected contact sheets, clipping/pivot/reference assertions and reproducible source extraction. Effects add 16 frames and nine coherent materials/props. See `ASSETS.md`, `artifacts/lantern-motion` and the source manifests.
- **Isolated visual fixtures:** 17 scenarios in `artifacts/lantern-motion/qa/visual`, including sword/armor, boost, enemy locomotion, axe/giant impact, raven, water, conduit, paired portals and souls. Fixture coordinates, inventory and health are deliberately injected. They prove rendering integration, not legal campaign completion.
- **Chromium UI and real input:** geometry at four viewport sizes; actual keyboard/CDP multi-touch, real Mira reward, six equipment tabs, held-input pause/settings/gear, dialogue Escape/resume, save reload and paused FX checks. Engine transaction tests seed a balance explicitly. Reports and screenshots are under `artifacts/lantern-motion/qa/{controls,ui,engine,input}`.
- **Production browser:** offline asset/font loading and menu/settings/equipment flow checked against the built distribution without the development hook. Evidence is under `artifacts/lantern-motion/qa/production`.
- **Android:** the delivery workflow builds, lints, verifies the persistent signing certificate/application ID and compares every packaged web file against `dist`. Release publication downloads the uploaded APK again and compares its bytes. The release report records the exact source commit and CI run.

## Remaining human/device assessment

This is a test prerelease. No physical Android performance, thermals, comfort or audio mix measurement is claimed. Portrait retains the existing landscape playfield presentation. Dedicated firearm, hurt and death strips remain documented pose reuse, and the new enemies still have relatively short authored cycles. Human playtesting must judge pacing, difficulty, animation naturalness and whether the overall experience merits a paid release.
