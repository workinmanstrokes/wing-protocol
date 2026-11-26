# Wing Protocol — Tester submission sheet

What a tester needs to judge this build, in one place. This sheet answers
the VEX 2.5/10 retest items that were about the submission, not the code:
no loop, goal, verbs, enemies, or win/lose state described; no controls,
visuals, performance figures, content volume, monetization, or
replay/progression details supplied; no playtest, device, or player
evidence. Ship this sheet with every test build.

## The game in one paragraph

Wing Protocol is a mobile arcade mech shooter (Android, also playable as an
installable web app). You fly a mech with two wingmen you command. The
60-second core loop, shown verbatim on the Play tab next to the First
Sortie mode and in `src/game/core-loop.ts`:

> First Sortie: survive 60 seconds against the machine horde. One goal —
> stay alive until the extraction timer hits zero. One threat — the horde.
> Win by surviving to extraction; lose by losing your hull. One tap on
> Retry restarts in under 10 seconds.

## Controls

- **Move:** left thumb, floating stick (WASD / left stick on a pad).
- **Fire:** automatic — guns fire on their own and auto-aim the nearest
  threat, bosses and elites first. Drag the right thumb (or mouse) to aim
  yourself; let go and auto-aim takes over.
- **Squad commands** (the differentiator, usable in the first 30 seconds):
  three thumb-safe buttons above the move stick — **Focus** (both wingmen
  hit the toughest enemy near your crosshair), **Spread** (wingmen swing
  wide, each clears its own targets), **Regroup** (wingmen tuck in, shoot
  down enemy bullets, cut damage taken by about a fifth). Keys 1 / 2 / 3,
  or X / Y / B on a pad. A "WINGMEN ONLINE" callout and pulsing buttons
  introduce them at the start of a run.
- **Skill:** one button, ring fills as it charges. **Pause:** top corner.
- A first-run "How to move" brief appears on the first combat run and
  dismisses with "Got it".

## Enemies and win/lose

- **Drifter** (slow, straight down, single shot) · **Weaver** (sine-wave
  path, 3-shot spread) · **Diver** (locks on, dives at the player, no
  shots) · **Elite/Boss** (large HP bar, patterned bullet phases, one per
  mission finale — e.g. Rook in Mission 1).
- **Win:** survive to extraction. **Lose:** lose your hull. Both end on a
  results screen with one-tap Retry in under 10 seconds.

## Content volume and progression

- **Modes:** First Sortie (60-second run), Sortie (5-minute run, 3
  sectors), Tower (roguelike climb, guardian boss every 5th floor), Elite
  Boss (duel + modifiers, 3 bosses), Boss Rush (all three back to back).
- **Frames:** Aether Wing, Heavy Forge, Night Scythe (unlockable mech
  frames). **Meta:** daily/weekly missions, crates, gear, in-run Protocol
  upgrade picks, local save of mission progress, best results, and settings.
- **First 5 missions and the fixed between-mission upgrade list** (ship
  damage, wingman strength, shields) are defined in
  `docs/build-sheet.md`.

## Visuals

Clean flat-shaded vector ships on a dark, low-detail starfield; enemies in
warm orange/red, player and wingmen in cyan/white. Enemy bullets are large,
bright magenta with a white core. Damage feedback: white flash, short
screen shake, hit spark. The player hitbox is a small visible cyan ring,
smaller than the ship sprite.

## Audio

- Original music loops (menu + two combat stems that crossfade with fight
  intensity) and 29 SFX (weapons, hits, explosions, pickups, UI, boss
  alert) in `public/audio/`, listed in `src/game/audio-manifest.ts`.
- Audio unlocks on the first tap (mobile autoplay rules) and a mute toggle
  lives in the menu and pause screen. Volumes persist in localStorage; if
  audio files fail to load on a host, the failure is surfaced in Settings
  and retried on the next gesture.
- **Fix in this update:** the menu music loop never started — the menu
  scene is set before the first gesture, while no AudioContext exists yet,
  so the music sync returned early and nothing re-synced it after unlock.
  `unlock()` in `src/game/audio.ts` now starts the current scene's music
  once audio is unlocked. A tester on the menu previously heard nothing at
  all; after this fix the menu loop starts on the first tap.

## Performance

- **Target:** 60 fps on the low-end test phone; no per-frame allocations in
  the hot loop, capped particle counts, a "Low detail" setting that drops
  background layers.
- **Measured figures: none yet.** No fps, load-time, or device figures have
  been measured on the two test phones — the two-phone test has not run.
  Measure on the low-end and mid-range phones during the blind playtests
  (`docs/playtests/blind-playtest-log.md`) and record the figures here;
  do not quote targets as results.

## Updates (no delete-and-re-add)
## Versioning

First versioned build is **0.1.0** (2026-11-26). A build is identified as
`v<version>+<short commit>` — see `docs/release.md` for the versioning
scheme and the three release paths (PWA, debug APK, signed AAB). The
version lives in `src/game/version.ts` and `package.json` (kept in sync).

- The PWA service worker uses a content-hash cache version, `skipWaiting`
  + `clients.claim()`, and network-first fetch, so a new build takes over
  on the next load. When a new build is waiting, the app shows an
  "A new Wing Protocol build is ready — Reload to update" banner; one tap
  reloads into the new build. Home-screen installs do **not** need to be
  deleted and re-added. The worker is re-checked every 60 seconds while
  the page is open and on every foregrounding.
- **Caveat:** the update only arrives if a new build was actually deployed.
  The PWA deploy is manual (Actions → Deploy PWA to GitHub Pages). The
  Pages URL returned GitHub's 404 page when checked live on 2026-11-19 —
  Pages was never deployed for this repo — so testers must deploy first
  (gate in `docs/playtests/blind-playtest-log.md`).

## Monetization

Undecided — free with ads, IAP, paid, or fully offline with no ads/IAP.
No decision has been made; the vertical slice ships with no ads and no
IAP. The decision is locked in writing before launch (see
`docs/build-sheet.md`).

## Name collision

Search for "Wing Protocol" is dominated by Wing API, WingMan Protocol,
Wings.io, Wing Commander, and Wingpath; no coverage of this Wing Protocol
was found. The name is not yet store-safe — rename vs. disambiguating
subtitle/ASO keywords is a pending maker decision (see
`docs/build-sheet.md`). No rename is made in this update.

## Playtest evidence

None yet. Five blind playtests are the gate before further content work —
protocol and empty log in `docs/playtests/blind-playtest-log.md`. Do not
claim playtest evidence until rows there are filled from real blind
sessions.
