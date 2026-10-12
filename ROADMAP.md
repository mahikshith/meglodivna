# ASH//SIGNAL: SOULFORGE — completed build roadmap

The original foundry slice has expanded into a 65,000 × 720-pixel campaign across six connected biomes. Ancient soul magic powers military machinery; the courier must sever three tyrants' engines and escape with the last unbound soul. The presentation stays 2D at 960 × 540 with original pixel artwork, layered scenery and copper, ivory, ultraviolet, crimson and electric accents.

The content targets a roughly five-minute skilled session. Efficient legal-input campaign proofs take about four to five simulated minutes. Current timing, test counts, browser evidence, APK inspection and CI status belong in [VALIDATION.md](VALIDATION.md); automated completion does not establish human challenge or hardware feel.

## Completed implementation sequence

1. **Art and presentation:** 121 deterministic pixel textures, consistent feet anchors, a large overhead blade pose, six biome background pairs, distinct Warden/Hex/Regent silhouettes, powered enemy types, friendly portraits/bodies, named pickup capsules and 22 equipment/relic glyphs. Export and inspect art alongside scene screenshots.
2. **Movement and combat:** fixed 120 Hz physics; acceleration, jump cut, coyote time, buffering, double/wall jump, dash and finite jet fuel. Add thruster boosts, damage/death/retry, parries, three swords, four guns, armor tradeoffs, six resource-limited sorceries and pooled projectiles. Keep sprite size independent from hurt boxes.
3. **Campaign and story:** Snow Border → Flooded Ruins → Furnace Crypt → Storm Spire → Eclipse Citadel → Soul Reactor. Authored traversal alternates elevation, hazards and enemy powers, with safe relays, destructible props, lever/boss gates and three survivor conversations with reward choices. Prove required landings through actual movement inputs.
4. **Menus and persistence:** four difficulty tiers; armory/catalogue; soul-energy, loadout, charge and threat HUD; paused story choices; once-only rewards; validated local discoveries, relics and encounter progress. Keep ordinary retries from restoring spent charges or duplicating claims.
5. **Renderer, input and effects:** Phaser rendering/interpolation, biome weather/light, attack telegraphs, reactor urgency, missile warning lanes, brief camera effects, bounded particles and synthesized audio. Preserve keyboard/gamepad edges, focus pause and simultaneous touch controls; provide reduced effects and landscape safe-area layouts.
6. **Packaging and checks:** unit and legal-route/live-campaign tests, browser controls/UI/replay checks, art exports and production build. Bundle the production assets into a native offline Android WebView debug APK, assemble/lint it, and configure GitHub CI with downloadable APK/test artifacts. Record what actually passed before release claims.

## Architecture and ownership

Atlas work used disjoint asset/presentation, movement/combat and campaign files; the lead integrated rendering, Android packaging, CI and final validation. `physics.js` and `combat.js` remain Node-testable plain JavaScript. `level.js` is authored data, `catalog.js` defines equipment, and `progress.js` validates saved state. DOM UI reads those states through callbacks; it does not import combat. Phaser renders the simulation rather than supplying a second competing physics system.

No franchise artwork or code was copied. Phaser is the only runtime package. This campaign does not require Unity, Unreal, Blender, a backend, paid generation, multiplayer or additional skill installations. The Android package contains the web build and uses local asset loading.

## Evaluation still needed

Human first-run balance, perceived attack/jump feel, physical controller calibration, speaker mix and sustained performance on actual Android hardware require playtesting. The included debug APK is a test delivery; production signing and store distribution are separate work. Keep future changes small and use the existing simulation, route and UI checks before adding content.
