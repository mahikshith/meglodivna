# Runeheart integrated input review

The final live input smoke passes at **844×480** and **740×360**, with24 actual captures per size, zero page/console errors, one initial navigation per run and unchanged recorded runtime hashes. [Report](../artifacts/runeheart/live-play/report.json) · [Actual screenshots](../artifacts/runeheart/live-play/) · [Reproducible test](../scripts/runeheart-live-playtest.cjs).

This run uses real keyboard and Chromium touch input. It does not inject a world, player coordinates, resources, invulnerability, unlocks or animation poses. It is a short integrated gameplay/input review, distinct from full legal campaign traces, isolated art fixtures and physical Android testing.

## Verified behavior

- Separate jump and double-jump presses work; held jet thrust consumes fuel, ascends and moves the camera upward.
- Sword inputs produce horizontal, vertical and finisher forms. Attacks do not zoom in.
- Gunfire and dash respond to keyboard input. Touch Attack cuts on press, then becomes held fire; release adds no second cut.
- Floating-stick movement survives independent Jump/jet and Dash releases. Pressed icons show the held gun/jet mode.
- Real movement reaches Mira. Her dialogue pauses the world, shows readable text/choices and grants Soul Siphon through an actual choice. The armory correctly displays the immediately equipped reward.
- A subsequent Power tap casts the legitimately acquired spell, reducing resonance. The first-room encounter changes health through real combat.
- Paused menus and the spell palette stop simulation. Keyboard retry returns to the relay.
- Walking into the first actual gap causes a real fall death. Touch RECONNECT restores the relay and preserves the learned spell.
- All action buttons remain below the actual Phaser canvas. The resource block is48px high and clears the spawn hero. Portrait browser resize and return to landscape do not leave a stuck direction or held action.

## Screenshot review

The red/gold hero is legible against the muted forest. Ground surfaces have visible stone top edges and opaque depth, including raised ledges; they do not blend into the background. Backdrops cover the actual landscape canvas during high jet ascent and threat zoom-out. Dialogue portraits, body text and the two reward choices fit the short phone viewport. The recovery action is visible and reachable in the death menu.

One minor visual limit remains in `740x360-touch-stick-jet.png`: the upper cape can crop at the canvas edge during a rapid ascent and threat zoom-out. The physical body/head remain visible (the recorded body projects about23px below the top edge); this is an art/camera margin observation, not an input failure. The introductory lantern refuge can receive fire from enemies ahead, so it is not completely safe during a prolonged introduction.

The browser portrait view letterboxes, then restores correctly. Native Android requests `sensorLandscape`; physical phone thumb comfort, display insets, latency, sustained frame rate and hand fatigue still require device evidence.

Earlier harness attempts had two corrected assumptions: an instant second jump release intentionally cuts its upward velocity, and NPC equipment rewards equip immediately. An intermediate renderer HMR also restarted a test during integration. The final report records stable source hashes and supersedes those attempts; they were not reproduced as game input defects.
