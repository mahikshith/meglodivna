# The Last Lantern — Hollow Sanctuary

**Latest APK:** [Download The Last Lantern v0.7.0 Android test build](https://github.com/mahikshith/meglodivna/releases/download/v0.7.0-lantern/ASH-SIGNAL-Lantern-v0.7.0.apk) — 14 October 2026, version `0.6.0-lantern`, code **7**, Android 7.0+.

[Prerelease and checksums](https://github.com/mahikshith/meglodivna/releases/tag/v0.7.0-lantern) · [Passed Android build and upload verification](https://github.com/mahikshith/meglodivna/actions/runs/38624576624) · [Signed payload report](https://github.com/mahikshith/meglodivna/releases/download/v0.7.0-lantern/android-report.json). The uploaded APK was downloaded again and matched byte for byte before this link was updated.

The current rebuild focuses on **one chapter**: a courier carries the last lantern through a failing sanctuary, meets Mira and Orren, recovers three lost runes, and unbinds its heart. Other realm data remains for save compatibility; the game presents Hollow Sanctuary.

![The Last Lantern home screen](artifacts/lantern-motion/qa/production/01-home.png)

## The rebuild

- Original generated courier, creatures, companions, NPCs, portal and environmental art, extracted into transparent sprites with registered feet/body anchors. Source images, exact prompts and reproducible extraction scripts are included.
- Stalkers commit to close lunges; casters lob falling cinders; stone guardians brace and slam. The Regent changes from ground attacks into a fire-breathing wyrm. Warnings, damage bounds and recovery differ by attack.
- 79 new motion frames with articulated enemy strides and axe lift/contact/recovery. Sword poses and measured sockets share damage timing; fine flame/smoke, grounded fractures and coherent wards/projectiles replace mismatched effects.
- Automatic paired portals, dormant destinations, an optional Bellbeast encounter, collectible persistent souls, Soul Engine upgrades, visible Lantern Plate armor and a raven summon.
- Authored masonry and hanging platforms, water aligned to its real boundary, and readable energy emitters near the lever.
- Safe opening jump practice, a more forgiving aqueduct landing, contextual objectives, and useful shield/boost/rapid/fuel rewards. Optional treasure and return portals are tested.
- A shared sanctuary theme across home, pause, settings, field guide, dialogue, equipment and HUD. Top-edge Pause, Settings and Gear work while another finger holds an action; dialogue and notices stay at the edge. Offline Alegreya typography is bundled.

Fixed 120 Hz simulation, swept collision, variable jump height, coyote time, buffered jumping and finite thrust remain the movement foundation. The implementation plan and current-game critique explain which behavior was preserved and which was rebuilt.

## Controls

| Touch action | Function |
| --- | --- |
| Free playfield | Drag to place and move the floating joystick |
| Jump · 100px | Tap to jump; tap again in air; hold 350ms for thrust |
| Attack · 100px | Tap for sword; hold 120ms for equipped firearm |
| Dash · 92px | Commit to an evasive sword dash |
| Power · 80px | Tap to interact nearby or cast; hold 450ms for equipment |
| Gear / Pause · 48px | Open equipment or pause; held actions clear immediately |

Keyboard: A/D or arrows move, Space jumps, Shift dashes, J cuts, K fires, L/E thrusts, Q casts, F interacts, C/V/X cycle equipment, Z casts nova, Escape pauses, and R retries. Up aims upward; down+jump drops through one-way platforms. The in-game guide covers gamepad controls.

Settings preserve music, effects, reduced motion/effects and touch opacity. Android Back closes the active overlay before pausing. Existing application ID, signing certificate and progress identities are retained; clearing app data removes saves.

## Evidence and remaining work

[Detailed plan and rewritten brief](docs/LANTERN-MOTION-PLAN.md) · [Existing-game critique](docs/LANTERN-MOTION-VALIDATION.md) · [Level audit](docs/HOLLOW-LEVEL-AUDIT.md) · [Current validation](docs/LANTERN-MOTION-VALIDATION.md) · [Asset provenance and limitations](ASSETS.md) ? [Persistent art-production memory](docs/ASSET-PRODUCTION-MEMORY.md).

171 unit tests and nine legal simulation campaigns pass, including the optional giant/reward/return route. Final browser input, UI, Soul Engine, 17 isolated visual fixtures and production smoke pass. Legal simulations establish chapter completion and reward/portal behavior. Browser input tests establish menu and multitouch behavior. Isolated visual fixtures inspect specific attacks and effects separately. **Physical Android comfort, sustained frame pacing, thermals, audio mix and first-time human pacing remain unverified.** This is a test build, not a commercially validated release. Some animation states reuse poses; the asset report identifies them.

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

Browser checks require Playwright and Chromium, a dev server on port 5173, and production preview on 4173 for replay. Set `CHROMIUM_EXECUTABLE` when using an installed Chrome binary.

```sh
node tests/hollow-ui.browser.cjs
node tests/runeheart-controls.browser.cjs
node tests/soul-engine.browser.cjs
node scripts/motion-playtest.cjs
node scripts/motion-visual.cjs
node scripts/replay.cjs soulforge
```

Android uses JDK 17, SDK 36, minimum API 24, and an offline landscape WebView. Point `ASH_SIGNAL_DEBUG_KEYSTORE` at the persistent test certificate before building updates.

```sh
npm run android:sync
cd android
./gradlew assembleDebug lintDebug --no-daemon
```

The Android workflow validates the rebuild branch before merging. Tagged Lantern prereleases publish only after build, lint, signature, version and embedded-file checks; the publishing job downloads the uploaded APK and compares it byte for byte. [AGENTS.md](AGENTS.md) defines delivery requirements.
