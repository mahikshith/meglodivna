# ASH//SIGNAL

A playable original 2D action platformer set in a frozen weapons foundry. One long level, five sectors, and an industrial boss. Mature pixel artwork, snow and fire, sword combos and bullet deflection, rifle fire, enemy missiles, lasers, timed EMP fields, and temporary upgrades.

## Play locally

Requires Node.js 20.19+ or 22+ and a modern desktop browser.

```sh
npm install
npm run dev
```

Open the local address printed by the server. During this delivery it is http://127.0.0.1:5173/.

## Controls

| Action | Keyboard | Standard gamepad |
| --- | --- | --- |
| Move | A/D or left/right arrows | Left stick |
| Jump / double jump / wall jump | Space (hold for height) | A |
| Slash / deflect incoming shots | J | X |
| Fire rifle | Hold K | Right trigger |
| Aim up | W or up arrow | Stick up |
| Dash | Shift | B |
| Jetpack | Hold L or E | Right bumper |
| Drop through catwalk | S + Space | Stick down + A |
| Pause | Escape | Start |
| Retry at checkpoint | R | Menu button |

Jet fuel recharges while grounded. A dash briefly protects from damage; its cooldown prevents repeated invulnerability. Blade swings have three combo strengths and can redirect bullets and missiles. Amber pickups grant rapid fire or shield; red restores health; cyan restores fuel. Relay checkpoints restore some health and all fuel. EMP interrupts dash and jet until the impairment expires. Read the laser warning and cross on the dark pulse. Destroy the Warden, then reach the extraction gate on the right.

Touch controls are included for compact screens. Keyboard/gamepad is the intended play experience. Sound starts after a user action; the header controls mute audio and reduce camera shake/flashes. Browser blur pauses and clears held inputs.

## Verify / package

```sh
npm test
npm run test:game
npm run build
npm run preview
```

`dist/` is the standalone static production build. It has no account, backend, CDN, telemetry, or paid asset dependency. Serve it over HTTP; do not double-click the HTML file. `ASH-SIGNAL-build.zip` includes this production build.

`npm run test:browser` additionally uses Playwright from an available local tooling installation, with the dev server running at port5173. If the available browser revision differs, set `CHROMIUM_EXECUTABLE` to its executable. This project does not add Playwright as a runtime dependency.

## Project files

- `ROADMAP.md`: build order and scope.
- `INTERFACES.md`: module/coordinate contracts.
- `LEVEL.md`: route, pacing, and encounters.
- `ASSETS.md`: asset sizes, anchors, provenance, and validation.
- `research/NOTES.md`: retained design guidance and sources.
- `artifacts/asset-sheet.png`: labeled art sheet.
- `artifacts/assets/`: every original exported PNG and manifest.
- `artifacts/`: browser screenshots and test report.

The simulation uses fixed 120 Hz steps, swept solid and projectile collision, and render interpolation. Phaser handles the scene, camera, sprites, and batching; game state is plain JavaScript. The complete movement route is verified using legal inputs; isolated combat tests cover damage, upgrades, boss states, checkpoints, and death/victory. `test:game` additionally verifies a full run with live enemies and hazards and writes its input trace/report. The final tuning completes in54.48 simulated seconds with two legitimate checkpoint retries; the11.44-second boss encounter exposes all three attacks. Browser tests are additional evidence, not a claim of completed human difficulty testing or target-hardware performance.
