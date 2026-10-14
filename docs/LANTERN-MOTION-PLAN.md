# Lantern motion and soul engine revision

User playtest, 15 October 2026: preserve the approved sanctuary artwork and world. Improve asset quality first. Work inside this chapter, extending its encounters and progression rather than opening a new environment.

## Execution brief

Build real, coherent motion from the approved sprite identities. Feet, arms, cloaks and weapons must articulate during travel and attacks. Give each enemy a reusable movement/attack profile with anticipation, commitment, impact and recovery. Couple animation phases, weapon sockets, visible effects and damage timing; do not slide an idle image or draw an unrelated crescent in space. Preserve fixed-step simulation, save identity, readable collision and the existing art quality.

Use reference-guided whole-strip generation, retain originals/prompts, normalize shared scale and anatomical anchors, inspect animation previews, then integrate. Exhaust, smoke, water, relic rewards and destruction must match the fine pixel density and restrained teal/amber palette of the actors. Keep pause/settings at the top, use thematic icons and typography, and move incidental text out of the playfield center.

## Tasks and acceptance

1. **Baseline and production memory.** Preserve the v0.6 sources; audit the exact causes of static enemy animation, detached cuts, blocky exhaust, unfinished terrain, generic water, center messages and foot rings. Record the approved production method in durable project guidance. Run the existing regression suite.
2. **Enemy motion assets.** Generate distinct locomotion cycles for stalker, caster and heavy guardian from current reference art. Add a new coherent portal minion and a large sanctuary monster identity. Generate multi-stage heavy axe attack frames. Inspect arm/leg/weapon articulation, alpha, stable anatomy and silhouette at runtime scale. Retain the existing wolf/dragon where suitable; add one complementary summon identity.
3. **Movement and attack contracts.** Separate reusable profiles for light lunge, caster locomotion, heavy inertia and giant attacks. Track animation phase/cycle through simulation state. Give the axe a visible lift, committed downswing, ground contact and recovery; emit exact surface/range metadata for cracks/debris. The caster and portal minion must move and attack coherently. Test committed facing, floors, obstacles, recovery and attack bounds.
4. **Sword, thrust and reward effects.** Replace chunky rectangle exhaust with a reference-quality animated flame and drifting smoke. Register horizontal and vertical cut trails to the moving sword/hand; synchronize visible contact and hit window. Refine dash afterimages. Remove arbitrary hurt/foot ellipses and replace relic pickup rings with a short soul-stream reward. Test mirror direction, pause and reduced-effects behavior.
5. **Environment and hazards.** Dress every visible platform, including metal/moving variants and supports, with the sanctuary's materials. Replace flat water fill with layered texture/reflection/foam while retaining its wave motion and accurate boundary. Replace ambiguous vent smoke near the lever with a visible emitter, advance warning and bounded lightning/energy column matching the real damaging area. Axe impact uses grounded cracks and fragments, not arbitrary permanent collision holes.
6. **Automatic portal pairs.** Show the active entrance and dormant destination with matching identity; activate arrival effects on passage. Entering the trigger transports automatically. Remove portal interaction prompts. Require exit/re-entry and cooldown so arrival cannot bounce or chain; clear stale dash/thrust/support state. Test ordinary entry, return, retry and paused overlap.
7. **Soul engine and chapter extension.** Add a larger optional encounter inside the existing chapter and deepen guardian pacing. Defeated major enemies release visible collectible souls; persist each reward once, including uncollected rewards across retry. Spend souls to unlock/upgrade armor and an artifact through a clear Soul Engine equipment surface. Add a visibly different armor with useful protection and a defined tradeoff, plus one new summon. Validate old-save migration, spending guards, stat application and no reward duplication on retry/reload.
8. **UI and typography.** Place pause/settings in a top utility cluster away from action controls/HUD. Redraw icons in the existing fantasy material language; bundle a legible thematic font for offline use if available with clear license. Keep short labels. Move transient notices to an edge and conversational choices to a compact paused edge panel. Remove portal prompts, retain NPC/lever prompts. Integrate soul balance/upgrade feedback and readable equipment comparison.
9. **Integrated QA.** Run unit tests, all supported chapter difficulty routes, optional portal/reward route, real multi-touch/menu/save checks and production build. Capture enemy walk/axe/caster/minion sequences, blade/exhaust motion, water/platforms, automatic portals, soul collection and armor change. Separate isolated fixtures from legal campaigns and user device observations. Fix findings and rerun affected checks.
10. **Delivery.** Increment Android version while preserving application ID/certificate; build/lint/sign/verify offline assets in CI, upload a test APK, verify its download, update README Latest APK and merge validated work. Record remaining device/human evidence gaps accurately.

## Ownership and integration

- Combat/progression specialist: combat.js, physics.js if needed, progress.js, catalog.js, rune-worlds.js, new motion profiles and simulation tests.
- Art specialist: generated enemy/armor/summon source sheets, normalization scripts, public motion atlas/manifest, preview evidence and asset provenance. Do not edit main.js.
- UI specialist: index.html, style.css, ui.js, licensed font assets, UI browser tests. Coordinate upgrade callbacks with combat; root wires main.js handlers.
- Integration lead: effect/terrain/water assets, main.js, lantern-fx.js, terrain.js, asset loading, visual/input QA integration, release and documentation.

Shared contracts are agreed before overlapping integration. Preserve stable existing IDs; additions use explicit IDs after generation. Existing checkpoint indices must not shift.

## Progress

- Plan and asset-production memory written before implementation.
- Tasks 1-8 implemented. Approved art retained; full asset-consistency review also replaced wards, projectiles, lever and relay graphics.
- Task 9: 171 unit tests, nine legal simulation routes and 17 isolated visual fixtures pass. Final browser reports bind source hashes; physical-device claims remain excluded.
- Task 10: version 0.7.0 / Android code 8 prepared; signed CI delivery and README update follow uploaded-artifact verification.
- See LANTERN-MOTION-VALIDATION.md for critique, evidence categories and remaining limitations.
