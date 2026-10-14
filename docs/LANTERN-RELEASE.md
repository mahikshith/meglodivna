The Last Lantern is a focused Hollow Sanctuary test build: one chapter with a coherent moonlit woodland palette, new courier/creature/NPC art, matching menus, and revised combat feedback.

Stalkers commit to lunges, stone guardians brace before local slams, casters throw falling cinders, and the Regent changes from ground attacks into a fire-breathing wyrm. Added thrust flame and smoke, dash afterimages, separate sword arcs, landing dust, portal formation/closure, and summon arrival effects. The opening includes safe jump practice and better-placed power-ups.

Android 7.0+, version `0.6.0-lantern`, code **7**. Application ID and the persistent v0.3+ signing certificate are preserved. This is an offline debug test APK, not a store release.

Validation includes simulation regressions, legal chapter completions on all four difficulties, the optional vault/return route, actual browser input checks, separate effect fixtures, Android lint/build, and signed embedded-payload verification. Exact source commit, CI URL, APK SHA-256, certificate and bundled file hashes are in the attached `android-report.json`; `SHA256SUMS.txt` identifies the APK. The publishing job downloads the uploaded APK again and compares every byte.

Physical-device comfort, sustained frame pacing, thermals and audio mix remain unmeasured. Human pacing and purchase-worthiness still require playtesting. Some animation states reuse documented poses, and some legacy equipment/effect assets remain. The implementation plan, existing-game critique and current validation report are in the repository.
