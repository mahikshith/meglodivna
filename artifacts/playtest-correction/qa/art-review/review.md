# v0.10 art review

Status: revised after the expanded 58-case capture run. Its Veil-theme assertion currently fails; the preceding 56-case suite passed. Review remains open for the scrolling correction and Veil recapture below.

Evidence is desktop Chrome rendered at 740 × 360. Story screenshots use real input for the opening and isolated later-chapter fixtures. These images do not establish legal campaign completion, physical-device comfort, or device performance.

## Findings

1. **High - scrolling continuity.** `createRuneheartParallax` currently assigns fixed mirror states to the two views but resets horizontal offset modulo one panorama width. At each width boundary, the visible mirrored image switches abruptly to the original orientation. Spatial joins in `world-neon-wrap.png` look continuous, but that static capture does not exercise the reset. Keep mirror parity tied to the absolute tile index (`floor(cameraX * speed / width) + viewIndex`) and verify captures immediately before/after the boundary. Sent to root.
2. **Evidence gap - Veil theme.** `world-veil-wrap.png` actually shows Pyre lava, and its report records `rh-bg-pc-pyre`; the fixture expects `rh-bg-pc-veil`. Player x=4800 lands in a crypt room, whose theme overrides worldId in `drawWorld`. Move the target fixture to a Veil room while holding the wrap camera position, or adjust theme precedence if the current room behavior is unintended. Actual Veil artwork still needs its targeted runtime capture.
3. **Resolved - foreground separation and secondary framing.** The background alpha reduction and clearer ivory platform edge improve the latest 740 x 360 fixtures without flattening the paintings. Raised guardian/stalker/caster/knight/drone captures show their bodies above the gun control, allowing their illustrated silhouettes to be reviewed. No obvious legacy pixel-art fallback or enemy halo was found.

## Verified observations

- New scene paintings are 1536 × 864 and use smooth cover scaling; old small native panorama upscaling is removed from the new mapping.
- `public/painted-correction/courier-portrait.png` matches the current blue hood, ivory mask and ochre scarf. It resolves the previous unrelated anime portrait identity.
- The latest `../story/wind-returned-hub.png` shows the corrected Heart Gate banner and Chapter 2 lit-gate objective together.
- Wind/Water paintings retain detailed masonry, foliage and the approved amber/blue-green palette; no pixel clusters were evident in the reviewed phone-sized scene captures.
- The preceding 56-case visual report passed with no page errors, no visible enemy shield sprites and zero ground-warning line calls. The expanded report contains 58 captures and fails the Veil theme assertion described above; do not cite it as a complete pass yet.
- Reviewed Minotaur walk/charge/cannon, dragon flight/cannon, slam and slash screenshots show sharp gold/red anatomy, complete silhouettes, warm cannon rounds and registered warm effects. No opaque dragon-source background or obvious source-cell clipping remains visible in these frames. The dragon's flight poses change body, tail and wings; this remains finite authored animation.
- Wolf, raven, dragon and clone companion screenshots use coherent illustrated art. Wolf/raven light details separate well from the scene. These single captures do not establish complete attack animation timing.
- Bellbeast is clear and consistent with the guardian material language. Refreshed guardian, stalker, caster, knight and drone subjects are now unobscured and retain detailed silhouettes at phone size.
- Refreshed `slam.png` shows broad ground dust/debris and a bright registered contact; cannon rounds and muzzle effects remain attached to the Minotaur/dragon weapon region in both directions. The small hero slash is visible and stays close to the blade. No warning-line substitute or blue circular enemy shield was observed.
- Atlas pages remain within the stated 2048-pixel cap. The fixture report calculates 221,979,924 bytes (about 211.7 MiB) for one RGBA copy of loaded texture sources. This is not process/device RAM or evidence of device memory headroom.

## Outstanding

Scrolling mirror-parity correction and boundary verification; the correctly targeted Veil painting capture. Portal readability is represented by the corrected story hub image; no dedicated repeated-entry/closure visual sequence was reviewed. Physical-device comfort/performance and complete animation timing remain outside this screenshot review.
