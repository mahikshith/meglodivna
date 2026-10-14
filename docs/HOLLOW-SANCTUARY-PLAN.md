# Hollow Sanctuary rebuild plan

Build one complete mobile action-platformer level that earns further development through its movement, readable combat, consistent art, and player experience. Hollow Sanctuary is the only chapter being developed and offered in the launch menu during this pass. Existing saves, application identity, and signing identity remain compatible.

## Delivery rules

- Work on `codex/runeheart-rebuild`. Integrate and validate before merging to `main`.
- Finish each stage's acceptance checks before calling it complete. Record failures and fixes, not just successful screenshots.
- Use original generated pixel artwork, inspect it, extract clean frames/layers, normalize pivots, then integrate. Never call a collage an animation or a static screenshot a playtest.
- Preserve working fixed-step movement where it is sound; change behavior for a measurable reason. Rebuild inconsistent presentation and broken interactions.
- Keep new work inside one chapter. Retained realm data is compatibility coverage, not additional scope or a claim of polished content.
- Separate isolated art fixtures, uninterrupted legal simulation, browser input tests, and physical-device testing.
- A commercial release decision needs human playtesting and target-device evidence. This pass delivers a reviewable test build, with its remaining evidence gaps stated accurately.

## Rewritten implementation brief

Act as a senior mobile game developer, game designer, technical artist, and QA lead. Rebuild Hollow Sanctuary as one coherent, original pixel-art action-platformer chapter. Start with a clear visual direction and generated production assets. Extract sprites and environment layers with consistent pixel density, silhouettes, transparency, and animation anchors. Integrate assets only after checking their animation and readability at actual gameplay scale.

Make running, variable-height jumping, air jumping, wall movement, dash, jet thrust, landing, horizontal and vertical slashes, projectile impact, portals, companions, and transformation communicate their physical behavior. Give each enemy a recognizable silhouette, anticipation, committed attack, counterplay, and recovery. Melee enemies must close distance and lunge; casters may throw arcing magic; heavy enemies must brace and slam; dragons must breathe flame. Do not give every enemy interchangeable lasers or missiles.

Design the level around measured reach and clear landing surfaces. Teach a mechanic safely, let the player practice, then combine it with a distinct encounter. Place visible, useful power-ups between encounters, provide recovery points, and reward an optional detour. Connect the opening story, objective, guardian encounters, and resolution.

Use one art language across title screen, pause, settings, field manual, inventory, pickups, HUD, and touch controls. Make every button functional, touchable, legible, and consistent with the game world. Test pause and focus transitions so the game cannot continue receiving unintended input behind a menu.

Work through the staged checklist below. Use bounded specialist agents with explicit file ownership when a stage permits independent work. Integrate their work centrally. Test movement, combat, progression, save/load, all menus, touch and keyboard controls, reduced effects, and representative phone layouts. Inspect screenshots and motion, fix discovered problems, and document exact evidence. Deliver a verified Android test artifact only if its build, signing, upload, and download checks pass. Do not declare the game commercially ready from automated checks alone.

## Stage 1 Direction and baseline

Owner: integration lead. Status: audited; implementation pending.

1. Inspect current branch, game architecture, save format, input mappings, renderer, art manifests, tests, and Android workflow.
2. Define the fantasy: Aether follows Mira's lantern into a sanctuary that turns souls into light, finds her brother, and breaks the engine's hold.
3. Establish the palette: dark blue-green stone and forest, warm lantern amber, ivory highlights, cold spirit teal; danger reads through both shape and motion.
4. Establish visual hierarchy: brightest landing edges and attacks in the foreground; quieter architecture and mist behind them; minimal HUD.
5. Capture the starting build and run baseline tests. Use existing physics measurements to constrain subsequent terrain changes.

Acceptance: the task scope, asset list, enemy identities, file ownership, and validation commands are explicit. Baseline failures are recorded separately from new regressions.

## Stage 2 Original art and extraction

Owner: integration lead; extraction work may be delegated after source art exists.

1. Generate a wide pixel-art forest sanctuary environment with ruined arches, hanging roots, moonlit depth, and amber lanterns. Produce separate usable background/foreground assets; keep collision scenery out of the distant layer.
2. Generate a consistent courier character sheet. Cover idle, run, rise/fall, horizontal slash, overhead slash, and dash poses with shared scale and foot anchor.
3. Generate an enemy/companion/effect asset sheet in the same palette: lunge stalker, cinder caster, heavy guardian, spirit wolf, flame dragon, portal stages, slash arcs, fire, and smoke.
4. Preserve original outputs and exact prompts. Extract individual cells or objects, remove only background pixels where necessary, and retain clean alpha edges.
5. Normalize frames to stable canvases using shared scale, anatomy, and anchors. Store named atlas frames and animation metadata; do not stretch individual frames to unrelated sizes.
6. Inspect contact sheets, animation previews, and in-engine silhouettes. Reject clipped limbs, opaque rectangles, drifting baselines, incoherent anatomy, or missing frames.
7. Record generated-asset provenance and retained third-party sources accurately.

Acceptance: production assets exist in the repository, every referenced frame loads, character scale/pivots are stable, and the generated environment is visible in the playable scene.

## Stage 3 Movement and combat contracts

Owner: combat specialist, `src/combat.js`, `src/physics.js`, focused simulation tests.

1. Verify fixed-step integration, acceleration/braking, tap-versus-held jump height, coyote window, input buffering, double jump, wall behavior, dash distance, jet fuel, and one-way drop-through.
2. Exercise thin walls and platforms at high movement/projectile speed; retain swept collisions and prevent tunneling.
3. Make slash direction and pose agree with the damage region. Emit horizontal, vertical, and finisher metadata for effects; preserve combo buffering and one-hit-per-target rules.
4. Give guard/stalker enemies an in-range telegraph, committed facing, dash/lunge, and punishable recovery. Remove distant ranged fallback from melee identities.
5. Give the cinder caster arcing projectiles with gravity, clear launch/impact cues, and terrain collision. Reset projectile pool fields so reused bullets cannot inherit a previous attack's gravity.
6. Give the heavy sentinel a stationary brace and local, jumpable slam rather than a long beam.
7. Differentiate guardian patterns and transformation: committed charge, ground impact, sorcery, and dragon flame/breath. Preserve an observable opening after attacks.
8. Emit precise feedback events for movement, attack onset, impact, death, pickup, portal, summon, and transformation. Document event fields for the renderer.
9. Test attacks for warning duration, locked direction, damage bounds, counterplay, recovery, and no duplicated hits.

Acceptance: enemy-specific behavior tests pass; existing movement/save tests pass; a player can identify the threat and the response without reading implementation labels.

## Stage 4 Motion and effects integration

Owner: integration lead, renderer and art modules.

1. Tie animation state to simulation state and attack progress, not an unrelated global animation loop.
2. Add directional foot dust, jump takeoff, air-jump burst, landing compression/dust, dash trails, and thrust ignition.
3. Give jet thrust a bright exhaust core, embers, and slower expanding smoke; stop emission on landing, fuel exhaustion, pause, and death.
4. Give blade cuts shaped horizontal/overhead arcs that follow facing, plus local impact sparks. Keep the victim and landing surface readable.
5. Distinguish bullets, ballistic cinders, ground shock, and dragon breath by silhouette, motion, trail, and impact.
6. Animate portals through formation, stable opening, arrival, and dissipation; use oriented particles and an aperture rather than a generic circle.
7. Give wolf and dragon summons distinct anatomy, travel/attack motion, arrival effects, and flame or spirit trails. Transformation must visibly change both silhouette and effects.
8. Cap transient particles and sprites; reclaim expired effects. Respect reduced effects without removing attack warnings.

Acceptance: isolated action captures and animated browser observations show each effect at the correct position/time; no effect changes collision geometry or keeps emitting while gameplay is paused.

## Stage 5 One level and its rewards

Owner: level specialist, `src/rune-worlds.js` and level-specific tests; terrain rendering stays with integration lead.

1. Keep Hollow Sanctuary as the selected chapter and preserve saved progress identity.
2. Refine the opening into safe movement practice, first melee encounter, upward traversal, and first guardian preparation.
3. Audit every mandatory gap against measured jump/dash/thrust reach. Keep critical landing zones visible and provide room to recover.
4. Make solid masonry and one-way walkways visually distinguishable; dress suspended platforms with supports/roots/chains that do not imply false collision.
5. Place health, shield, fuel boost, and temporary combat power-ups where their use becomes understandable; test pickup effect and retry persistence.
6. Give optional rewards a readable detour and reliable return route. Check portals cannot strand the player.
7. Keep story beats short and connected to the current objective; align opening, discoveries, guardian progression, and exit resolution.
8. Validate checkpoints, gates, required items, guardian deaths, and final exit through legal play inputs.

Acceptance: the chapter is completable without teleporting or editing player health/resources; no unavoidable geometry traps or progression soft locks; route evidence records deaths, elapsed simulation time, and collected goals.

## Stage 6 Unified mobile interface

Owner: UI specialist, `index.html`, `src/style.css`, `src/ui.js`; integration lead updates scene/menu handlers.

1. Replace the title screen with a focused chapter invitation, clear primary action, difficulty, settings, and readable field manual.
2. Apply shared typography, material, borders, icons, and interaction states to home, pause, settings, story, inventory, death, and completion.
3. Make pause resume the exact current run. Settings and inventory must clear held input and preserve their return context.
4. Consolidate music/SFX controls, reduced effects, and touch-opacity preferences with accurate saved state.
5. Preserve generous thumb targets and spacing, show held-fire/held-thrust modes, and make the contextual interact/power action understandable.
6. Reduce HUD obstruction while keeping health, fuel, resonance, objective, and boss warnings legible.
7. Verify keyboard focus, Escape/Android Back behavior, dialogue choices, item equip, manual expansion, and all buttons.
8. Check desktop, portrait fallback, and landscape widths including 740 by 360 and 844 by 390; account for safe-area insets.

Acceptance: every visible control works; no overlapping targets or clipped primary action; UI screenshots share the same art direction; opening/closing a menu never leaves movement or attack held.

## Stage 7 Integrated smoke testing and correction

Owner: integration lead plus independent QA specialist after implementation ownership frees.

1. Run all unit tests and build the offline bundle.
2. Run uninterrupted legal chapter simulation on supported difficulties. Keep fixture-based effect tests separate.
3. Test actual browser input: launch, movement, jump, dash, slash, fire, thrust, interact, summon, pause, settings, inventory, retry, and return.
4. Capture menu, playfield, enemies in warning/attack/recovery, portals, summons, transformation, settings, and completion at representative viewports.
5. Inspect images and motion for clipping, contrast, inconsistent scale, missing alpha, visual noise, and foreground obstruction.
6. Verify old save migration, refreshed browser state, preference persistence, and save isolation from test fixtures.
7. Check console errors, missing assets, bounded pools, and offline boot. Record browser timing only as browser evidence.
8. Fix failures and rerun affected checks, then issue a concise findings report with remaining limitations.

Acceptance: required automated checks pass and representative visuals have been inspected. Physical thumb comfort, thermal behavior, battery use, and actual Android frame pacing remain pending until measured on a device.

## Stage 8 Reviewable Android delivery

Owner: integration lead, conditional on all preceding validation.

1. Increment package/Android version consistently while retaining application ID and persistent certificate.
2. Build and lint the APK through the existing signed workflow or authorized local toolchain.
3. Verify packaged version, certificate, bundled assets, and offline entry point.
4. Upload a clearly named GitHub prerelease APK with checksums and exact validation evidence.
5. Verify the uploaded asset can be downloaded and matches the built artifact.
6. Update README Latest APK to that exact version and validation link only after verification.
7. Merge the validated rebuild into main using the user's existing authorization.

Acceptance: downloadable signed test artifact with traceable evidence. If signing/build/upload is blocked, report the exact blocker and preserve the existing Latest APK link.

## Execution record

- Planning: complete. Repository and combat/UI behavior audited; no gameplay edits made before this plan.
- Stage 1 complete: baseline browser captures, 146 original tests, source review, existing-game critique and measured level audit.
- Stage 2 complete: five original source sheets/paintings with saved prompts; normalized 66-frame actor/item atlas, 63 animation aliases, environment props and background; source/crop/anchor manifests and inspected previews.
- Stage 3 complete: committed lunges, cinder arcs, guardian slam/cleave, ground-to-dragon boss attacks, distinct warnings/recovery and focused regressions.
- Stage 4 complete: thrust flame/smoke, dash ghosts, blade arcs, foot/landing effects, portal lifecycle, summons, transformation and audio cues; bounded pools and paused clocks.
- Stage 5 complete: safe practice ledge, cleared first aerial threat, widened aqueduct margin, four useful rewards, local objectives, all four legal chapter completions and legal optional vault return test. Checkpoint/claim identities preserved.
- Stage 6 complete: shared home/HUD/pause/settings/equipment/story/guide theme, saved preferences, responsive checks, accessible return context and secondary-touch Pause/Gear fix.
- Stage 7 complete for available local evidence: 162 simulation tests, production build, both real browser input viewports, isolated renderer lifecycle checks and legal browser campaign replay pass. Zero final browser errors or failed resources. Failed initial QA evidence retained separately. Device and human-playtest gates remain open.
- Stage 8 prepared: version 0.6.0-lantern/code 7, persistent signing/ID checks and verified prerelease workflow. Upload verification and validated merge remain pending.
- Future scope is gated on human review of this chapter. Physical-device testing and commercial readiness are explicitly unverified; no next environment was added.
