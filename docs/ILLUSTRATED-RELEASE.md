# The Last Lantern v0.8.0 — Illustrated Sanctuary test build

The sanctuary now uses the detailed illustrated direction selected by the user. Higher-resolution character cutouts, smooth rendering, a painted sanctuary panorama and transparent illustrated controls replace the forced pixel presentation while retaining the level and fixed 120 Hz simulation.

- 168 character frames cover courier and Lanternplate movement, sword attacks, directional rifle poses and running fire, hurt/death, stalkers, casters, stone guardians, Wispknight, Bellbeast, companions and NPC gestures. Bulwark uses the heavy armor family; Wraith uses the courier family with its equipment tint.
- Ironfang replaces the Regent artwork with a detailed armored minotaur, reptilian dragon and intermediate transformation poses. Mouth, gun, axe contact and damage bounds share measured source geometry. Boss shots and beams visibly impact the body; flame attacks no longer draw warning rails.
- Sword crescents remain visible through contact and recovery. Booster exhaust follows the opposite of the actual travel vector. Ground dash emits textured dust. Hero and enemies show accepted-hit feedback.
- Stone guardians no longer display circular shield, hand or body auras. Axe anticipation and grounded impact remain visible. High-resolution scenery keeps its original world dimensions.
- Awakened enemies and bosses continue simulating offscreen. Projectiles remain bounded to their encounter rather than following the player across unrelated rooms.
- Wolf: grounded pursuit, reachable jumps and committed bites. Dragon: obstacle-aware flight and mouth fire bursts. Raven: overhead approach, interrupted dives and weakening contact. Courier Echo: grounded navigation, aim and clear-path rifle fire. Summons choose free arrival space, avoid solids and reacquire targets.
- The title, challenge selectors, equipment, Soul Engine and HUD use the sanctuary palette and offline Alegreya typography. Transparent touch controls use illustrated sword, boots, rifle, jet, rune, lantern, bell and satchel art. Existing hit areas and multitouch actions remain.

Version code 9. Application ID `com.meglodivna.ashsignal` and the persistent signing certificate are unchanged. Install over the existing signed build to retain saves; uninstalling or clearing application data removes them.

Validation distinguishes 189 simulation tests, nine legal controller-driven campaign routes, 52 isolated render fixtures and Chromium input/UI checks. Android CI separately builds/lints, verifies signing and embedded production files, then downloads the uploaded APK and compares its bytes. See the attached `android-report.json` for the exact source commit, signature and payload hashes.

This is a debug prerelease. Physical Android frame pacing, memory, thermals, touch comfort and audio mix remain unmeasured. Animation uses finite authored poses, including three rifle aiming elevations; it is not a skeletal animation system. The sanctuary companion dragon reuses its hurt/idle family when fading on death.
