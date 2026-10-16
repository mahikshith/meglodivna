# Approved Lantern asset-production process

Persistent project guidance from the user's v0.6 playtest, 15 October 2026. The user explicitly approved the sanctuary theme, setting and generated asset quality. Preserve this direction in future work. Asset quality is the first constraint; physics must align to it rather than degrading sprites to fit convenient boxes.

## Reference baseline

- Approved source art: `reference/lantern-source/`, exact prompts in `prompts.json`.
- Runtime assets: `public/lantern/`; provenance/limitations in `ASSETS.md`.
- Palette: deep blue-green woodland/stone, ivory edge light, warm lantern amber, restrained spirit teal. Natural silhouettes, moss, roots and ruined arches. The user subsequently approved a detailed illustrated finish instead of pixel clusters; see the illustrated revision below.
- Review frames: `artifacts/lantern/ui/740x360-home.png`, `artifacts/lantern/qa/fixture-transformation.png` and source contact sheets.

## Repeatable production sequence

1. Inspect the approved source and in-game frame. Write a production prompt defining identity, material, palette, camera, pixel density, exact poses/cells, transparency and invariants.
2. Generate a complete animation strip from an approved reference in one request. Preserve anatomy, costume and scale. Do not generate every frame independently or substitute translated idle art for walking.
3. Save the original generated image and exact prompt in the repository. The built-in image tool was used successfully; never imply it produced a perfect atlas automatically.
4. Inspect actual alpha and geometry. Generated dimensions/cell boundaries may differ from the prompt. Extract connected silhouettes or verified cells without cutting weapons, limbs or detached details.
5. Use a shared per-family scale. For the approved illustrated direction, preserve source detail with Lanczos reduction and smooth runtime sampling, not nearest-neighbor pixelation. Normalize to stable anatomical pivots/canvases; retain trimmed-frame source coordinates. Record source hashes, crop rectangles, pivots, body and attachment metadata.
6. Inspect contact sheets AND animated previews at gameplay scale. Check visible limb movement, silhouette stability, foot sliding, weapon reach and frame order. Regenerate failed artwork; do not hide faults behind particle effects.
7. Integrate animation states with simulation phases. Register sword/axe trails, muzzle/fire sockets and ground contacts. Collision is authoritative, but effect placement must explain the real attack.
8. Review the actual phone-sized scene, including transitions, death, summons and repeated portals. Separate visual fixtures from legal play. Record reused poses honestly.

## Lessons from the first delivered pass

Static enemy state poses were insufficient for locomotion. Coarse rectangle flame/smoke, detached sword crescents, foot ellipses, flat water and untextured platform variants weakened otherwise approved art. Portal minions and armor also need the same production treatment as main actors. Keep menu notices out of the center and use thematic, legible offline typography.

Future acceptance requires complete motion and integration, not just an attractive source sheet. Device feel/performance and paid-release value still require real user/device evidence.

## October motion revision lessons

- Preserve approved identities during death, transformation, armor, summon and retry states. Never allow a fallback to silently change species or armor.
- Contact sockets come from inspected artwork, then inform reusable physics profile ratios. Both mirrored directions must agree.
- Share anticipation/contact/recovery timing with damage; locomotion follows distance traveled, and charge uses moving poses rather than a planted slam.
- Keep transparency gradients for wisps even when solid sprites use crisp alpha. Use a shared effect canvas and fixed emitter anchor.
- Review every live asset family together; remaining legacy wards, lever, projectiles and relay blocks can undermine otherwise coherent art.
- Save source prompts and rejected-pose reasoning. The v0.7 motion/FX packets and reproducible scripts are the concrete reference for this refinement.

## Approved illustrated revision

The user explicitly selected the detailed source-sheet style during the v0.8 revision. Preserve the new courier, Lanternplate, NPC, guardian and stalker/caster identities in `reference/character-revision/`. The illustrated sanctuary retains the approved composition, palette and architecture. Do not return to forced pixel rendering or downsample source art to tiny native sprites.

- Keep the fixed-step physics and authored level. Raising texture resolution must not enlarge bodies, move feet or change collision dimensions.
- `scripts/atlas_pack.py` trims only empty canvas margins and publishes original source-size metadata. Texture pages are capped at 2048px. `character-geometry.js` and `ironfang-geometry.js` are generated from the same measured sockets as rendering.
- The four companions have distinct locomotion and attack controllers. Flying paths require full-body clearance; ground creatures jump reachable ledges and brake before unsupported gaps. Attacks require clear paths and committed contact poses.
- Once awakened, villains keep simulating outside the camera. Culling is only a rendering decision.
- Interface controls use illustrated objects on transparent faces, maintaining their existing touch sizes and multi-touch behavior. Keep thematic offline typography and edge HUD placement.
- Detailed source sheets still contain finite authored poses. Do not claim skeletal animation, unlimited directional firing poses or device performance without corresponding implementation/evidence.
- Stone guardians must not have circular shield, hand or body auras. Preserve axe anticipation, grounded contact and accepted-hit feedback without adding those halos back.
- Environment display dimensions are world units, independent of texture resolution. Crop tiled platform images in source coordinates while retaining their original 225-by-97 world size.

## October playtest rebuild

- The v0.9 sources in `reference/epic-revision/` preserve this illustrated direction. Keep the new full-body Minotaur and dragon poses, airborne/crouching rifle poses, painted effects, scenery and story panels when changing mechanics.
- Rendering and projectile collision share `villainFrame`, measured anatomical hurtboxes and mirrored weapon sockets. Exclude carried weapons from damage anatomy; include visible heads and legs outside the old logical body boxes.
- Boost replaces the separate player sword dash. It is fuel-powered propulsion, including in the air. Shooting must retain its directional pose during thrust, and aim must remain independent of movement.
- All circular enemy shield/core/hand halos and melee ground-warning lines are intentionally removed. Explain attacks through anatomical anticipation, registered impact art and debris. The circular touch buttons are controls, not enemy effects.
- Generated strips have finite authored poses. The current Minotaur-to-dragon transition stages those poses rather than performing continuous anatomical deformation. Preserve that distinction in reviews and release claims.
- The test armory remains separate from earned saves until the user requests normal progression again. Do not silently remove testing access to equipment, special charges or Soul Engine tiers.
