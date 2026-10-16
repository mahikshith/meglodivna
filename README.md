# The Last Lantern — Hollow Sanctuary

**Latest APK:** [Download The Last Lantern v0.8.0 Illustrated Sanctuary Android test build](https://github.com/mahikshith/meglodivna/releases/download/v0.8.0-lantern/ASH-SIGNAL-Lantern-v0.8.0.apk) — 15 October 2026, version `0.8.0-lantern`, code **9**, Android 7.0+.

[Prerelease and checksums](https://github.com/mahikshith/meglodivna/releases/tag/v0.8.0-lantern) · [Passed Android build and upload verification](https://github.com/mahikshith/meglodivna/actions/runs/38731229088) · [Signed payload report](https://github.com/mahikshith/meglodivna/releases/download/v0.8.0-lantern/android-report.json). CI downloaded the uploaded APK again and matched it byte for byte before this link was updated.

The v0.9 working build expands **one connected chapter**: Aether carries the last lantern through Hollow Sanctuary, meets Mira and Orren, and crosses wind, water and ember trials to recover the stolen dawn. An 18-second illustrated introduction establishes the courier's promise and the journey toward Lanternplate knighthood. The story is original fiction inspired by themes from the Ramayana; its characters are not presented as literal epic figures. The APK linked above remains the last verified published delivery until the new build is uploaded and checked.

![The Last Lantern illustrated home screen](artifacts/character-revision/qa/production/01-home.png)

## The rebuild

- Original generated courier, creatures, companions, NPCs, portal and environmental art, extracted into transparent sprites with registered feet/body anchors. Source images, exact prompts and reproducible extraction scripts are included.
- Stalkers commit to close lunges; casters lob falling cinders; stone guardians brace and slam. The rebuilt Minotaur runs, leaps into charges, swings its axe and fires from its rotary gun, then becomes a cannon-bearing dragon with full-body flight poses. Warnings, damage regions and recovery differ by attack.
- Detailed illustrated rendering: 180 character frame keys with 112 animation bindings, 67 Ironfang actor/effect keys with 20 bindings, four revised sanctuary props, a new masonry texture and six story/realm panels. Counts include reused bindings. Smooth sampling preserves source detail while world dimensions and the physics step remain stable.
- Painted muzzle flashes, cannon shells, ground impacts and directional booster exhaust share measured weapon/contact geometry. All six illustrated secondary-villain families have anatomical damage regions. Enemy shield/body circles are removed; touch controls remain visible. Awakened villains keep simulating offscreen.
- Wolf, raven, dragon and Courier Echo each have distinct locomotion, terrain awareness, target selection and attacks. Ground companions handle reachable ledges and unsupported gaps; flying companions route around solid obstacles.
- Three portal crossings add Windward Canopy, Moonlit Causeway and Ember Oath environments, each with its own traversal forces, routes and action puzzles. Automatic return portals, the optional Bellbeast encounter, persistent souls and Soul Engine progression remain part of the chapter.
- The Test Armory makes all 22 weapons, armor sets and powers available for testing, with Soul Engine test upgrades. Its save is separate from earned journey progress; testing gear does not overwrite the normal unlock history.
- Authored masonry and hanging platforms, water aligned to its real boundary, and readable energy emitters near the lever.
- Safe opening jump practice, a more forgiving aqueduct landing, contextual objectives, and useful shield/boost/rapid/fuel rewards. Shooting preserves running or flight movement; crouching brakes horizontal drift.
- A shared sanctuary theme across home, pause, settings, field guide, dialogue, equipment and HUD. Top-edge Pause, Settings and Gear work while another finger holds an action; dialogue and notices stay at the edge. Offline Alegreya typography is bundled.

Fixed 120 Hz simulation, swept collision, variable jump height, coyote time, buffered jumping and finite thrust remain the movement foundation. The implementation plan and current-game critique explain which behavior was preserved and which was rebuilt.

## Controls

| Touch action | Function |
| --- | --- |
| Free playfield | Drag to place and move the floating joystick |
| Jump · 100px | Tap to jump; tap again in air; hold 350ms for thrust |
| Attack · 100px | Tap for sword; hold 120ms for firearm; drag this finger to aim independently |
| Boost · 92px | Tap for forward propulsion on ground or in air; hold 160ms for jet thrust |
| Power · 80px | Tap to interact nearby or cast; hold 450ms for equipment |
| Gear / Pause · 48px | Open equipment or pause; held actions clear immediately |

Keyboard: A/D or arrows move, Space jumps, Shift boosts, J cuts, K fires, L/E thrusts, Q casts, F interacts, C/V/X cycle equipment, Z casts nova, Escape pauses, and R retries. Up aims upward; down crouches on the ground and down+jump drops through one-way platforms. On touch, keep moving with the joystick while dragging the held Attack button to aim downward or upward without steering flight. A gamepad's right stick provides independent aim; the in-game guide covers its other controls. Boost replaces the separate evasive sword dash and consumes booster fuel.

Settings preserve music, effects, reduced motion/effects and touch opacity. Android Back closes the active overlay before pausing. Existing application ID, signing certificate and progress identities are retained; clearing app data removes saves.

## Evidence and remaining work

[Detailed plan and rewritten brief](docs/LANTERN-MOTION-PLAN.md) · [Existing-game critique](docs/LANTERN-MOTION-VALIDATION.md) · [Level audit](docs/HOLLOW-LEVEL-AUDIT.md) · [Current validation](docs/LANTERN-MOTION-VALIDATION.md) · [Asset provenance and limitations](ASSETS.md) | [Persistent art-production memory](docs/ASSET-PRODUCTION-MEMORY.md).

The published v0.8 illustrated revision passed 189 unit tests and nine legal simulation campaigns, including the optional giant/reward/return route, plus its browser and visual checks. [v0.8 validation](artifacts/character-revision/validation.json) and [v0.8 revision scope](docs/ILLUSTRATED-RELEASE.md) describe that delivery. The v0.9 asset integrity report is [here](artifacts/epic-revision/integrity.json); [story and crossings notes](docs/RAMAYANA-STORY-AND-CROSSINGS.md) explain the new chapter material. The [v0.9 integrated validation](artifacts/epic-rebuild/validation.json) records 231 passing tests, nine complete legal routes in 10:52 to 11:43, 53 visual fixtures and eight actual-input scenarios. Android delivery is verified separately before updating the link above. Legal simulations, browser input checks and isolated visual fixtures establish different things; none establishes physical-device comfort. **Physical Android comfort, sustained frame pacing, thermals, audio mix and first-time human pacing remain unverified.** This is a test build, not a commercially validated release. Some animation states reuse poses; the asset report identifies them.

## Run and validate

Use Node.js 22, Phaser 3.90.0 and Vite 6.4.4.

```sh
npm ci
npm run dev
npm test
node scripts/combat-route.mjs forge soulforge
node scripts/combat-route.mjs forge soulforge --bellbeast
npm run build
```

Browser checks require Playwright and Chromium, a dev server on port 5173, and production preview on 4173 for the production smoke test. Set `CHROMIUM_EXECUTABLE` when using an installed Chrome binary.

```sh
npm run test:browser
npm run test:visual
npm run preview -- --port 4173
# In a separate terminal while preview runs:
npm run test:production
node scripts/verify-epic-evidence.mjs
```

Android uses JDK 17, SDK 36, minimum API 24, and an offline landscape WebView. Point `ASH_SIGNAL_DEBUG_KEYSTORE` at the persistent test certificate before building updates.

```sh
npm run android:sync
cd android
./gradlew assembleDebug lintDebug --no-daemon
```

The Android workflow validates the rebuild branch before merging. Tagged Lantern prereleases publish only after build, lint, signature, version and embedded-file checks; the publishing job downloads the uploaded APK and compares it byte for byte. [AGENTS.md](AGENTS.md) defines delivery requirements.
