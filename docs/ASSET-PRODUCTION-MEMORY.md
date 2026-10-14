# Approved Lantern asset-production process

Persistent project guidance from the user's v0.6 playtest, 15 October 2026. The user explicitly approved the sanctuary theme, setting and generated asset quality. Preserve this direction in future work. Asset quality is the first constraint; physics must align to it rather than degrading sprites to fit convenient boxes.

## Reference baseline

- Approved source art: `reference/lantern-source/`, exact prompts in `prompts.json`.
- Runtime assets: `public/lantern/`; provenance/limitations in `ASSETS.md`.
- Palette: deep blue-green woodland/stone, ivory edge light, warm lantern amber, restrained spirit teal. Detailed pixel clusters, natural silhouettes, moss, roots and ruined arches.
- Review frames: `artifacts/lantern/ui/740x360-home.png`, `artifacts/lantern/qa/fixture-transformation.png` and source contact sheets.

## Repeatable production sequence

1. Inspect the approved source and in-game frame. Write a production prompt defining identity, material, palette, camera, pixel density, exact poses/cells, transparency and invariants.
2. Generate a complete animation strip from an approved reference in one request. Preserve anatomy, costume and scale. Do not generate every frame independently or substitute translated idle art for walking.
3. Save the original generated image and exact prompt in the repository. The built-in image tool was used successfully; never imply it produced a perfect atlas automatically.
4. Inspect actual alpha and geometry. Generated dimensions/cell boundaries may differ from the prompt. Extract connected silhouettes or verified cells without cutting weapons, limbs or detached details.
5. Use a shared per-family scale with nearest-neighbor resampling. Normalize to stable anatomical pivots/canvases; preserve transparent margins. Record source hashes, crop rectangles, pivots, body and attachment metadata.
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
