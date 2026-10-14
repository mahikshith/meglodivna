# Runeheart: Hollow Sanctuary playable slice review

Reviewed against `main` commit `8d9e65dd273a5c0b5c7e5ab2eb7a10da5da4088a` (14 October 2026). Work in this branch focuses on the Soulforge route and retains the existing five-realm game architecture.

## What was wrong

The touch layout reserved a 164 CSS pixel dark strip in a 360 pixel landscape viewport. That left less than 200 pixels for the game. A jump also shifted the camera upward with the courier's velocity, hiding the landing surface. Ordinary nearby enemies could take control of camera framing, and the opening refuge could be attacked from outside the conversation area. Forge's old 8:30 deadline and the three guardians' large health pools made learning the route costly. These are concrete readability and pacing problems; a dark control strip covering almost half the view is poor action-game behavior.

## Design translation

| Reference | Useful principle | Runeheart decision |
| --- | --- | --- |
| [Ori and the Will of the Wisps](https://www.orithegame.com/) | Emotional stakes, readable traversal in a layered world, music that supports the scene | Keep the lost-souls story and parallax art; show the landing route during ascent; connect Mira and Orren through a reunion line. [Xbox also describes Easy, Normal, and Hard modes.](https://news.xbox.com/en-us/2020/03/11/ori-and-the-will-of-the-wisps-available-now/) |
| [Swordigo](https://play.google.com/store/apps/details?id=com.touchfoo.swordigo) | Mobile sword, spells, treasures, simple touch actions | Give the player a spell before the first gap, preserve discoverable equipment, and place large actions on a translucent overlay. |
| [Contra](https://eu-support.konami.com/hc/en-gb/articles/9647773756311-Contra-Anniversary-Collection) | Fast action, pickups, memorable bosses | Keep gun and sword distinct, make the summon and shield useful before a boss, and shorten guardian health without removing their warning/recovery pattern. |
| Classic Batman-era platformers | Strong hero silhouette, vertical route rhythm, deliberate wall traversal | Retain the authored stepped ascent and wall jump; keep landing geometry visible. No franchise art or characters were copied. |

The main loop is now: meet Mira and learn the three-stone objective; collect an early Wolf spell; cross roots and climb the bell stair; meet Orren and choose a Courier Echo summon or shield; defeat the Keeper during recovery; claim the Ember Heart; then carry that knowledge through Tide and Storm encounters to unbind the engine. Relays, side vaults, portals, caches, gear, dragon magic, soul energy, and Eclipse Nova already exist in the project and remain part of this route.

## Art and asset decision

The current pixel art, animation atlases, layered backgrounds, character effects, synth soundtrack, and responsive SFX are coherent with the 2D camera and collision model. The separate [Mechalord reference repository](https://github.com/mahikshith/mechalord-asset-references) describes three concept PNGs: an armored relic marshal, a wheeled gearling ally, and a tracked rust crawler. Its manifest contains concept references, not usable 3D meshes or animation rigs. Their machine-and-magic attributes informed the existing Orren/echo/sentinel direction; no PNG or third-party model was silently copied into the shipped atlas. The image blobs could not be retrieved in this environment, so visual matching to those three concepts remains unverified.

## Changes and evidence

- The touch controls overlay a full-height canvas with a translucent base. At 740 × 360, the menu's launch button, playfield, controls, jump landing surface, and audio settings were captured in headless Chrome with touch emulation. See `artifacts/runeheart/mobile-menu.png`, `mobile-gameplay.png`, `mobile-jump.png`, and `mobile-settings.png`.
- The camera aims lower while airborne and follows only an active boss for shared framing. Portal travel still snaps to the destination.
- Forge has gentler damage and attack cadence, a 26:28 Soulforge deadline, and shorter guardians. Ember is more forgiving. This does not establish human difficulty: a new-player session on an Android phone is still needed.
- Music and SFX have separate persistent sliders. The menu, pause flow, and compact landscape settings dialog are browser checked.
- The Node suite passes 146/146. A legal Soulforge Forge route reaches victory, all three guardians and seals, the Mira/Orren conversations, and one death/retry. The route is optimized automation; its 91.72 simulated seconds are not a content-duration estimate.

The reviewed v0.5 APK predates this local work. The normal Vite build could not start in this environment because npm failed to retrieve Rollup's Windows optional native binary. A direct esbuild bundle rendered without browser exceptions and provided the screenshots above. There is no new signed APK or physical-device performance/comfort result for these changes.
