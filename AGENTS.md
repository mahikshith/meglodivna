# Project delivery instructions

- Work on the user's selected branch. The Runeheart rebuild is on `codex/runeheart-rebuild`; the user has authorized merging it into `main` after validation.
- After every verified Android delivery, update the **Latest APK** link near the top of `README.md`. Link directly to the uploaded APK for that exact version, and keep its version and validation link current.
- Do not point the README at an older APK or a local-only file. Upload and verify the new artifact before marking it as the latest delivery. Test builds may use a clearly labelled GitHub prerelease.
- Preserve the persistent signing certificate and application ID so updates from v0.3 onward retain saves.
- Distinguish isolated visual fixtures, legal simulation campaigns and physical-device tests in documentation. Never claim device comfort or performance without device evidence.

## Persistent art direction

- The user approved the Lantern sanctuary world and asset-production method. Read [the production memory](docs/ASSET-PRODUCTION-MEMORY.md) before creating or replacing game art. Preserve its palette, material language and quality; animate anatomy and register effects instead of sliding static poses or degrading artwork to fit physics.

## Game development skills and feedback

- The user requested persistent use of helpful skills from the three repositories recorded in [the skill memory](docs/GAME-SKILL-MEMORY.md). Read relevant installed skills on demand; retain Ponytail as the default. Keep this project's Phaser version and custom fixed-step simulation unless a migration is explicitly requested.
- Track the October playtest rebuild against [the complete feedback checklist](docs/EPIC-REBUILD-CHECKLIST.md). For an asset, validate artwork, extraction and sockets, physics, locomotion, then attacks and actual gameplay. Parallel work on independent parts is authorized.
