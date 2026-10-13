# ASH//SIGNAL: AETHER REVAMP — v0.4

An original 2D action platformer where ancient souls power military machines. Five selectable worlds are authored for more than five minutes of live gameplay each. Exact legal-run durations, retries and check results are maintained in [LEVEL.md](LEVEL.md) and [VALIDATION.md](VALIDATION.md). Automated completion does not establish addictiveness, subjective balance or Android comfort.

| World | Main features |
| --- | --- |
| Verdant — Forest Ruins | Forest, ruins and the Warden/Hex/Regent chain. |
| Aerie — Floating Islands | Sky islands, crosswinds, tunnels and moving platforms. |
| Tempest — Thunder Castle | Storm fortresses, steam, crumble floors and a furnace conduit. |
| Zenith — Sky City | Techno tunnels, maintenance lifts, shutters and missile pressure. |
| Prism — Crystal Caves | Crystal crypts, mirror passages, hostile summons and an ambiguous guide. |

## Play locally

Use Node.js 22 and a modern browser. Runtime: Phaser 3.90.0; build: Vite 6.4.4.

```sh
npm ci
npm run dev
```

Open the printed address, normally `http://127.0.0.1:5173/`. Choose a realm and Ember (easy), Forge (medium/default), Inferno (hard) or Extinction (ultra hard). Tiers affect damage, enemy health, cadence, recovery, missile pressure and deadline. **WORLDS** returns to selection; each realm retains its own relay and encounter save.

## Controls

Gamepad labels follow the standard Xbox-style browser mapping.

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| Move | A/D or left/right arrows | Left stick horizontal |
| Jump / double jump / wall jump | Space; hold for height | A |
| Slash / deflect light shots | J | X |
| Fire | Hold K | Right trigger |
| Aim | Facing; W/up arrow aims up | Left stick direction |
| Dash | Either Shift | B |
| Jetpack | Hold L or E | Right bumper |
| Drop through catwalk | S/down arrow + Space | Stick down + A |
| Spell | Q | Left trigger |
| Talk / use machinery / portal | F | Y |
| Cycle gun / sword / spell | C / V / X | LB / D-pad left / D-pad right |
| Eclipse Nova | Z | Right stick click |
| Pause / resume | Escape | Start |
| Retry at relay | R or Reconnect after death | A confirms death menu |

Touch uses a **floating 112 px analogue stick** and **four curved 72–84 px action buttons** in a reserved bottom gutter. Touch any free gameplay area to place the stick, then drag; releasing stops movement immediately and hides the stick after eight seconds. Action buttons/dialogs retain their own touches. **Attack:** press to slash immediately; hold 120ms to fire. **Jump:** tap for jump/double jump; hold 350ms for thrust. **Power:** tap to cast or interact with a nearby target; hold 450ms to open the paused Sorcery/gear palette. **Dash:** press to dash. A 44 px pause button sits in the center. The stick has a deadzone and independent pointer capture so actions can stay held while steering. Android Back closes the palette or toggles pause; from a non-playing menu it exits. Physical Android comfort still requires device playtesting.

Hold jump for height; release to cut the arc. Jump away from walls to climb. Jet fuel is finite and recharges on solid ground. Melee alternates overhead, horizontal and finisher cuts, with a dash lunge. Ordinary bullets can be parried; heavy rockets and beams need evasion or defenses. EMP disables dash/thrust, fire can burn, and mechanical traps/lasers warn before activating. Incoming missiles use a red edge/lane cue.

## Equipment and powers

| Category | Contents |
| --- | --- |
| Three swords | Rustfang: heavy cut. Storm Katana: fast cuts and third-strike lightning. Soul Saber: stronger cuts with life recovery. |
| Five guns | Ash Carbine, Grave Scattergun, Storm Rail, Cinder Launcher and Oblivion Cannon. Rockets cost four resonance; cannon beams consume earned charges. |
| Three armors | Courier Rig: balanced. Bulwark Plate: more health/defense, less soul energy and higher fuel drain. Wraith Weave: more soul energy and efficient thrust, lower protection. |
| Nine spells | Cinder Plague, Soul Siphon, Skybreaker, Shadow Veil, Stillgrave, Eclipse Nova, Courier Echo, Ash Wolf and Cinder Wyrm. |
| Six relics | Ember Heart, Tide Glass, Storm Seal, Eclipse Fragment, Regent Key and Unbound Soul. |

Cinder burns, Siphon drains/lifesteals, Skybreaker staggers and suppresses sentinel wards, Veil conceals until attacking, Stillgrave slows threats, and Eclipse consumes a finite charge for damage/recovery. Echo calls a ten-second rifle clone, Wolf an eight-second pursuing companion, and Wyrm a seven-second flying fire companion. Summons cost resonance, announce arrival and expire.

**Borrowed Spark** is light-parry recovery: five resonance per successful parry, capped at two rewards per swing. **Break Ward** is Skybreaker's three-second sentinel ward suppression, followed by restoration. These are mechanics, not additional buttons or equipment IDs.

Named capsules restore resources, grant temporary shields/rapid fire/boosts, unlock gear or award relics and finite charges. Crates/caches break; barrels chain and can hurt the courier. Essential floors stay intact. Rafts, currents, steam, crumble floors, valves/conduits and mirror passages affect actual simulation.

Boss variants advance, retreat, leap and recover, with shielded, weakened and enraged states. Directional shots/beams start at visible weapons/chest cores. Hex/Regent portal blinks announce exits before arrival. Survivors offer reward choices; some disclose an ambush or curse. Story and **ARMORY** pause the clock. Menus cover selection, pause, retry and victory; HUD shows soul energy, loadout, charges and deadline. Sound mute and reduced effects are available.

Revamp imports the actual Aether, Rift Crawler, Hexwing Raider, Crimson Mecha and Aether-Rocket Wyrm pixels from the four supplied boards. Aether has a forgiving 28×60 body inside a larger visible silhouette; foot anchors, hand shots and enemy weapon origins follow explicit geometry. The Regent transforms into a flying Wyrm below 35% health, with an announced recovery window before mouth beams, rockets and volleys. Backgrounds, foreground materials, NPCs, items and effects also use the extracted art. The accepted robots and spellcasters remain alongside these families.

Discoveries/equipment/relics are shared; relay, claims, destroyed props, bosses and gates are saved per world. Retry returns to that world's relay without duplicating rewards or restoring spent charges. Replaying a completed world resets its encounters while retaining discoveries. Existing Soulforge saves remain valid. Clearing browser/app data removes saves. Focus loss pauses and clears held input; sound starts after user interaction.

## Checks and build

```sh
npm test
npm run test:game -- forge soulforge
npm run test:game -- forge tide
npm run test:game -- forge pyre
npm run test:game -- forge neon
npm run test:game -- forge veil
npm run build
npm run preview
```

`test:game` also accepts ember/inferno/extinction; default is Forge/Verdant. Internal world IDs stay `soulforge`, `tide`, `pyre`, `neon`, `veil` to preserve saves. Reports/traces go to `artifacts/`. `npm run test:deep` runs the configured 30-minute wall-clock harness; its retained development history predates Revamp. Browser checks need Playwright available to Node and matching Chromium; `CHROMIUM_EXECUTABLE` can select an existing browser. With development at 5173 and production preview at 4173, run `npm run test:browser`, `npm run test:replay -- veil` and `npm run test:art`. Art/action fixtures are distinct from legal campaign proofs.

`dist/` bundles content for static HTTP hosting, without accounts, backend, CDN, telemetry or paid assets. Production omits development test hooks. Notices under `public/licenses/` include Phaser MIT and AndroidX Apache2.0.

## Android debug APK

Delivery: **ASH-SIGNAL-Aether-Revamp-debug.apk**, versionName `0.4.0-aether-revamp`, versionCode **4**, app ID `com.meglodivna.ashsignal`. Native output: `android/app/build/outputs/apk/debug/app-debug.apk`. It uses landscape/immersive presentation and bundled local WebView assets. Gameplay works offline; the manifest requests no Internet permission. Minimum Android 7.0/API 24, with a sufficiently recent System WebView.

Rebuild with JDK 17, SDK platform 36, build-tools 36.0.0 and platform-tools. Configure JAVA_HOME/ANDROID_HOME and accept SDK licenses through SDK tools. First build downloads build dependencies.

```sh
npm ci
npm run android:sync
```

From `android/`, run `./gradlew assembleDebug lintDebug --no-daemon` on macOS/Linux, or:

```powershell
.\gradlew.bat assembleDebug lintDebug --no-daemon
```

Repeat android:sync after web changes. Install using the device package installer or USB debugging:

```sh
adb install -r ASH-SIGNAL-Aether-Revamp-debug.apk
adb shell am start -n com.meglodivna.ashsignal/.MainActivity
```

Revamp uses the persistent certificate from the delivered v0.3 Fractured Realms APK, allowing an in-place update. The earlier v0.2 Soulforge APK used a different certificate and must be uninstalled before installing this build, removing that older app's local save. CI restores its key from the repository's encrypted `ASH_SIGNAL_DEBUG_KEYSTORE_BASE64` secret. Local builds need `ASH_SIGNAL_DEBUG_KEYSTORE` pointed at that same key to update a CI installation. Package build/inspection does not prove sustained Android performance or comfort.

## CI and architecture

[Android CI](.github/workflows/android.yml) runs on main/Revamp pushes, pull requests and manual dispatch. It checks unit tests, all four Verdant tiers and Forge runs in the other worlds, builds offline assets, assembles/lints and uploads **ASH-SIGNAL-Aether-Revamp-debug-APK** plus evidence. It restores its test signing key from the repository secret. Fork pull requests do not receive that secret and cannot produce a signed APK.

```sh
gh workflow run android.yml --ref Revamp
gh run list --workflow android.yml
gh run download --name ASH-SIGNAL-Aether-Revamp-debug-APK --dir artifacts/ci-apk
```

Simulation is fixed 120 Hz with swept collision/interpolation. physics.js owns movement; combat.js owns encounters/resources/weapon origins; level.js/worlds.js provide authored routes; catalog.js/progress.js define gear/validated saves. main.js connects Phaser to DOM UI, input and synthesized audio. Android hosts the production build without another simulation.

[REVAMP.md](REVAMP.md) contains the 24 small implementation tasks; [LEVEL.md](LEVEL.md) and [VALIDATION.md](VALIDATION.md) record current scope/evidence. [ASSETS.md](ASSETS.md), `artifacts/reference/` and `artifacts/assets/` document 174 extracted frames in 49 animations and 343 generated/composed textures. The source boards stay outside the runtime bundle. Earlier roadmaps and harness reports describe prior development phases.
