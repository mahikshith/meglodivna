# ASH//SIGNAL: SOULFORGE

An original 2D action platformer in which ancient souls power a fallen empire's military machines. Carry the last unbound soul across Snow Border, Flooded Ruins, Furnace Crypt, Storm Spire, Eclipse Citadel and Soul Reactor. Defeat the Warden, Hex Matriarch and Null Regent before the reactor collapses.

The 65,000-pixel campaign targets roughly five minutes for a skilled first session. Efficient automated runs take about four to five simulated minutes; actual reading, mistakes and retries change the duration. See [VALIDATION.md](VALIDATION.md) and [LEVEL.md](LEVEL.md) for current measured results. Human difficulty, perceived feel and device performance require further playtesting.

## Play

Use Node.js 22 and a modern browser:

```sh
npm ci
npm run dev
```

Open the address printed by Vite, normally `http://127.0.0.1:5173/`. Choose Ember (easy), Forge (medium, default), Inferno (hard) or Extinction (ultra hard) before entering the campaign. Tiers change damage, enemy health, attack cadence, recovery, missile pressure and the reactor deadline; movement geometry stays the same.

## Controls

Gamepad names below follow the standard Xbox-style browser mapping.

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| Move | A/D or left/right arrows | Left stick horizontal |
| Jump / double jump / wall jump | Space; hold for height | A |
| Overhead slash / deflect | J | X |
| Fire equipped gun | Hold K | Right trigger |
| Aim up | W or up arrow | Left stick up |
| Dash | Either Shift | B |
| Jetpack | Hold L or E | Right bumper |
| Drop through catwalk | S or down arrow + Space | Left stick down + A |
| Cast equipped spell | Q | Left trigger |
| Talk / use lever | F | Y |
| Cycle discovered guns | C | Left bumper |
| Cycle discovered swords | V | D-pad left |
| Cycle discovered spells | X | D-pad right |
| Eclipse Nova | Z | Right stick click |
| Pause / resume | Escape | Start |
| Retry at relay | R or Reconnect button after death | A confirms the death menu |

Touch controls appear on touch devices. Landscape clusters support simultaneous movement, jump, fire, thrust and magic, with separate aim-up, platform-drop, interaction, gear-cycle and nova buttons. Targets are at least 44 pixels. Android Back closes the armory or toggles pause; from a non-playing menu it exits the app. Physical touch/controller comfort has not been established by automated input checks.

Hold jump for a higher arc; release to shorten it. Push into a wall and jump away to climb. Jet fuel is finite and recharges on solid ground; thruster boosts improve ascent and fuel efficiency temporarily. Dash protection and spell cooldowns prevent repeated use. EMP slows movement and disables dash/thrust while active; fire can apply burning damage. Read laser windups and the Regent's recurring missile warning lane.

## Equipment, sorcery and story

| Category | Available gear / behavior |
| --- | --- |
| Swords | **Rustfang:** heavy overhead cut. **Storm Katana:** faster cuts and third-strike lightning. **Soul Saber:** stronger cuts with life recovery. |
| Guns | **Ash Carbine:** rapid kinetic fire. **Grave Scattergun:** five close-range pellets. **Storm Rail:** piercing rounds. **Oblivion Cannon:** long piercing beam that consumes an earned charge and destroys breakable cover/projectiles. |
| Armor | **Courier Rig:** balanced resources. **Bulwark Plate:** more health and protection, less soul energy and higher fuel drain. **Wraith Weave:** more soul energy and efficient thrust, lower protection. |
| Sorcery | **Cinder Plague:** timed burning. **Soul Siphon:** drain and lifesteal. **Skybreaker:** lightning and stagger. **Shadow Veil:** concealment until attacking. **Stillgrave:** slow nearby threats. **Eclipse Nova:** consume a finite charge for major damage and recovery. |
| Relics | Ember Heart, Tide Glass, Storm Seal, Eclipse Fragment, Regent Key and Unbound Soul. |

Named capsules restore health, fuel or soul energy, grant rapid fire/shields/boosts, unlock equipment and spells, or award relics and finite cannon/nova charges. Break crates and soul caches; explosive barrels can chain together and hurt the courier. Essential floors remain intact. Gates open through their associated boss defeat or lever.

Mira, Orren and Vesper offer short conversations with two useful reward choices each. Story panels and the **ARMORY** pause the campaign clock. The armory shows discovered and locked gear, equips available items, and records relic lore. Soul-energy, loadout, charge counts, reactor time and missile warnings appear in the HUD. Menus cover pause, death/retry and victory; header controls mute sound, reduce effects and enter browser fullscreen.

Relays, discoveries, choices, consumed charges, defeated bosses and opened gates are saved locally. Retry keeps that progress without duplicating rewards. Starting another campaign after victory preserves discovered equipment and relics while resetting campaign encounters. Clearing browser/app data removes the local save. Focus loss pauses and clears held inputs; sound begins after a user action.

## Verify and build the web game

```sh
npm test
npm run test:game
npm run test:game -- ember
npm run test:game -- inferno
npm run test:game -- extinction
npm run build
npm run preview
```

`test:game` defaults to Forge and writes legal-input traces and reports in `artifacts/`. Browser checks require Playwright available to Node and a matching Chromium installation; set `CHROMIUM_EXECUTABLE` when using an existing executable. With the development server on 5173 and production preview on 4173 in separate terminals:

```sh
npm run test:browser
npm run test:replay
```

The standalone `dist/` build bundles Phaser and all game content. Serve it over HTTP. There is no account, backend, CDN, telemetry or paid asset dependency. The development test API is omitted from production.

Bundled notices are in `public/licenses/`: Phaser uses MIT; AndroidX uses Apache 2.0.

## Android APK

The delivery APK is `ASH-SIGNAL-Soulforge-debug.apk`. The native build produces `android/app/build/outputs/apk/debug/app-debug.apk`. This is a signed debug package for testing, with landscape presentation, immersive system bars and a WebView that loads bundled game files through a local asset loader. Installed gameplay works offline; the manifest does not request Internet access. Minimum Android version is 7.0/API 24; a sufficiently recent Android System WebView is needed for the browser features used by the game.

To rebuild, install JDK 17, Android SDK platform 36, build-tools 36.0.0 and platform-tools; configure `JAVA_HOME` and `ANDROID_HOME` and accept the SDK licenses through the SDK tools. The first build downloads its build dependencies.

```sh
npm ci
npm run android:sync
```

Then, from `android/`:

```powershell
.\gradlew.bat assembleDebug lintDebug --no-daemon
```

On macOS/Linux use `./gradlew assembleDebug lintDebug --no-daemon`. `android:sync` builds the web game and copies `dist/` into the APK's assets; repeat it after web changes.

Copy the delivery APK to an Android device and install it using that device's package installer, or use a connected device with USB debugging:

```sh
adb install -r ASH-SIGNAL-Soulforge-debug.apk
adb shell am start -n com.meglodivna.ashsignal/.MainActivity
```

The application ID is `com.meglodivna.ashsignal`. Local and CI debug signing keys may differ; switching signing sources can require uninstalling the old app, which removes its local save. Prefer the CI-produced APK for successive CI updates. Android hardware execution and sustained device performance are separate from building and inspecting the package.

## CI and project structure

[The Android workflow](.github/workflows/android.yml) runs on pushes to `main`, pull requests and manual dispatch. It installs Node 22/JDK 17/SDK 36, runs unit tests and all four difficulty campaign proofs, builds offline assets, assembles/lints the debug APK and uploads **ASH-SIGNAL-Soulforge-debug-APK** plus test evidence. Its cached debug keystore preserves CI update signing. From an authenticated GitHub CLI in this repository:

```sh
gh workflow run android.yml --ref main
gh run list --workflow android.yml
gh run download --name ASH-SIGNAL-Soulforge-debug-APK --dir artifacts/ci-apk
```

Simulation uses fixed 120 Hz steps, swept collision and render interpolation. `physics.js` owns movement; `combat.js` owns encounters/resources; `level.js` defines the route; `catalog.js` and `progress.js` define gear and validated saves. `main.js` connects Phaser rendering to DOM UI, input and synthesized audio. The Android activity hosts the production build; it does not replace the game simulation.

- [ROADMAP.md](ROADMAP.md): completed build sequence and remaining evaluation.
- [INTERFACES.md](INTERFACES.md): current module and coordinate contracts.
- [CAMPAIGN.md](CAMPAIGN.md), [LEVEL.md](LEVEL.md), [VALIDATION.md](VALIDATION.md): features, route and measured checks.
- [ASSETS.md](ASSETS.md): provenance, dimensions and anchors.
- `artifacts/campaign-art-sheet.png`, `artifacts/campaign-biomes.png`, `artifacts/assets/`: original art previews, PNGs and manifest.
- `artifacts/`: campaign traces, reports and browser screenshots.
