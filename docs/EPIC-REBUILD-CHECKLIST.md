# October playtest rebuild checklist

This checklist preserves every part of the user's feedback. Each asset passes artwork, extraction, geometry, physics, movement, attack and integrated review in that order. Independent systems may be developed in parallel. A completed implementation is not automatically a verified delivery.

## 1 Artwork and extraction

- [x] Inspect the approved illustrated Lantern sources and existing runtime families.
- [x] Generate a detailed Minotaur with locomotion, axe, cannon, hurt and death poses.
- [x] Generate full-body dragon flight, cannon, breath, hurt and death poses.
- [x] Generate courier and armor airborne/downward firing and crouching poses; reject incorrect weapons.
- [x] Generate painted muzzle flashes, impacts, propulsion and rounds.
- [x] Generate matching sanctuary props, three portal backgrounds and three story panels.
- [x] Retain originals, exact prompts, hashes, crop rectangles, shared scale and sockets.
- [x] Inspect every live villain family, summons and death/transition states for legacy fallbacks.
- [x] Inspect all scenery materials at phone scale for pixelated leftovers.

## 2 Boss physics and attacks

- [x] Use the measured gun and cannon muzzle sockets in both facing directions.
- [x] Give Minotaur charges a committed direction, ballistic arc and grounded impact.
- [x] Drive feet from traveled distance and use moving charge poses.
- [x] Fire rapid physical rounds toward the player from both boss forms.
- [x] Move the dragon's torso, neck, legs and tail with its flight poses.
- [x] Apply flight pitch to both displayed anatomy and collision/muzzle geometry.
- [x] Inspect rotary barrel motion, recoil and visible shot origin in the running game.
- [x] Inspect transformation coherence and document the finite staged-pose limitation.

## 3 Effects and art consistency

- [x] Remove all circular enemy shield, hand and core halos from rendering.
- [x] Remove melee ground-line warnings; use authored anticipation.
- [x] Replace line-only slam feedback with painted dust, impact and airborne stone debris.
- [x] Integrate and inspect the new muzzle, round, impact and booster effects.
- [x] Verify reduced effects, paused effects and repeated attacks.

## 4 Player controls and animation

- [x] Replace the Dash action/icon with a distinct fuel-based Boost action.
- [x] Support boost while airborne and sustained thrust while holding Boost.
- [x] Keep aim independent of locomotion through attack-button drag and gamepad right stick.
- [x] Stop grounded crouch drift while preserving airborne downward aim.
- [x] Keep shooting during running, flight and boost.
- [x] Remove sword damage and sword-dash animation from propulsion.
- [x] Recheck actual touch/keyboard scenarios with the final air/crouch artwork.
- [x] Verify controls at small and large landscape sizes and clear held inputs on overlays.

## 5 Combat and companions

- [x] Resolve point-blank muzzle overlap and first enemy/wall collision order.
- [x] Use swept projectile collision and stop ordinary rounds on accepted hits.
- [x] Verify wolf, raven, dragon and echo actually reduce enemy health.
- [x] Audit visible secondary enemy anatomy against projectile bounds.
- [x] Inspect hit, death, summon and repeated attack feedback in context.

## 6 Test equipment

- [x] Unlock every sword, firearm, armor and spell in the test build.
- [x] Keep the earned campaign save separate from the test armory.
- [x] Refill limited charges and relevant resources when changing test equipment.
- [x] Exercise all 22 equipment choices and six Soul Engine upgrade ranks through actual browser UI.
- [x] Give isolated test saves sufficient souls and restore nine special charges on fresh/restarted test campaigns.
- [x] Confirm test-mode labels and retained application/signing identity in the APK.

## 7 Story and progression

- [x] Research Ramayana episodes and distinguish traditions from original gameplay inventions.
- [x] Write character powers, episode-specific constraints and adaptation notes.
- [x] Build an original rescue motive and courier-to-knight journey.
- [x] Create an eighteen-second, illustrated, skippable and pausable opening.
- [x] Inspect intro readability, full duration, skip and replay behavior.
- [x] Make the journey rank visible in the UI and link discoveries to objectives.
- [x] Document that symbolic epic figures in the intro are not newly playable character rigs.

## 8 Longer levels and portal environments

- [x] Add wind, water and fire subrealms with distinct currents and traversal hazards.
- [x] Add nine high-switch puzzles and extended vertical/raft/crumble courses.
- [x] Add three guardian encounters, resting points and 42 recovery checkpoints.
- [x] Preserve original checkpoint indices and gate/claim identities.
- [x] Validate portal arrival, retreat, completion locks and persisted guardian defeats.
- [x] Preserve correct checkpoints when choosing trials out of order, returning to the main realm and retrying; retain enemies in unvisited realms.
- [x] Complete all five expanded Forge campaigns through legal simulation inputs.
- [x] Repeat the release difficulty matrix after final integration: all nine legal runs won in 652.37 to 702.96 seconds (10:52 to 11:43).
- [x] Inspect guidance, checkpoints, backdrops, weather and realm progress in the browser.
- [ ] Establish ten-minute first-human pacing through actual player timing. The expanded legal-route matrix measures automated completion separately; do not claim the human target is measured.

## 9 Verification and Android delivery

- [x] Pass the final unit suite, production build and targeted browser tests.
- [x] Retain phone-scale screenshots and exact source/art hashes.
- [x] Distinguish isolated fixtures, legal campaigns and physical-device evidence in release notes.
- [x] Build and verify a signed Android test APK with the persistent certificate and app ID.
- [x] Upload the exact APK and verify the downloaded bytes.
- [x] Update README Latest APK/version/validation links only after that verification.
- [x] Merge the validated rebuild into main under the user's standing authorization.

Physical Android comfort, sustained performance and human enjoyment remain device/playtest questions. Full skeletal or continuous anatomical animation must not be claimed for finite generated pose strips.

Verified delivery: [v0.9.0-lantern APK](https://github.com/mahikshith/meglodivna/releases/download/v0.9.0-lantern/ASH-SIGNAL-Lantern-v0.9.0.apk), version code 10. [All nine CI campaigns, Android build/lint/signature and upload verification passed](https://github.com/mahikshith/meglodivna/actions/runs/38960622853). The locally downloaded public APK matched SHA-256 `1b29287aeb9533cc86194bb48e5abe38c162ed90c998f4e7f03788843345d5dc`; all 77 embedded files matched the signed payload report. The compiled test-armory label and separate save key were also checked.
