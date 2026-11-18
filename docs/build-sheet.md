# Wing Protocol — Build Sheet (one page)

**Game:** Wing Protocol — mobile arcade shooter, Android.
**Tester score this sheet answers:** 3.5/10 (grade D); retested by VEX at 2.5/10 (grade F) — the live build had no describable loop. **Status:** vertical slice in progress; the loop below now describes the shipped build as tested, and the same words appear on the title screen.

## 60-second core loop

**THE 60-SECOND LOOP (verbatim — this is the loop in the live build, and the same words appear on the title screen):** First Sortie: survive 60 seconds against the machine horde. One goal — stay alive until the extraction timer hits zero. One threat — the horde. Win by surviving to extraction; lose by losing your hull. One tap on Retry restarts in under 10 seconds.

*Note: the Mission 1 drag-to-fly / wingman-command slice in the rest of this sheet is still the plan target; the First Sortie loop above is what the shipped build actually plays today — a 60-second mode, with the 5-minute sortie as the longer run.*

## Control scheme

- **Drag-to-fly:** one thumb drags the ship anywhere on the playfield; the
  ship follows the finger with a small offset so your thumb never covers it.
- **Auto-fire:** always on — no fire button, no second thumb needed.
- **Squad commands:** three large thumb-safe buttons on the command HUD —
  Focus Fire, Spread, Regroup. One tap, wingmen obey immediately.
- **Pause:** one button, top corner, outside the thumb-rest zones.

## First 5 missions / enemies

| Mission | Enemies | Twist |
|---|---|---|
| 1 — First Sortie | Drifter, Weaver, Diver + **Elite: Rook** | Vertical slice: win/lose + restart |
| 2 — Crosswind | Drifters in staggered lines, first Weavers | Wind push on player drift |
| 3 — Flak Field | Divers dive in pairs, flak bursts | Dense bullet patterns |
| 4 — Twin Fangs | Weavers + Divers mixed, **Elite: Vex** | Two-phase elite |
| 5 — Protocol Run | All three types, **Elite: Warden** | Timed extraction ending |

**Enemy roster:** **Drifter** (slow, straight down, single shot) ·
**Weaver** (sine-wave path, 3-shot spread) · **Diver** (locks on, dives at
the player, no shots) · **Elite/Boss** (large HP bar, patterned bullet
phases, one per mission finale).

## Upgrade list (small, fixed — between missions only)

1. **Ship damage** +15% per level (max 5) — main gun.
2. **Wingman strength** +1 wingman fire rate / +1 wingman (max 2 wingmen).
3. **Shields** +1 hit absorbed per mission (max 3).
No roguelike in-run upgrades — cut by design (see BUILD-PLAN.md).

## Art style

Clean flat-shaded vector ships on a dark, low-detail starfield; enemies in
warm orange/red, player and wingmen in cyan/white so friend vs foe reads at
a glance. Enemy bullets are large, bright magenta with a white core on the
dark background. Damage feedback: white flash + short screen shake + hit
spark. The player hitbox is a small visible cyan ring, smaller than the
ship sprite.

## Monetization — decision pending (to be locked in writing before launch)

Options on the table: free with ads, IAP, paid, or fully offline with no
ads/IAP. **No decision has been made yet** — this sheet records the options,
not a choice. The vertical slice ships with no ads and no IAP.

## Minimum Android device — to be locked after the two-phone test

**Test targets (to be named):** one low-end and one mid-range Android phone,
plus the minimum API level. The slice is tuned for the low-end phone first:
60 fps target, no per-frame allocations in the hot loop, capped particle
counts, and a "Low detail" setting that drops background layers. The minimum
device and API level are locked in writing once both test phones pass.

## Tester fix list — Game Test Lab 2.5/10 (grade F)

The retest verdict was: a live but undescribed TypeScript build with no
stated core loop, no sound, and a manual-reinstall update. The loop is now
named above and on the title screen; the other two items were fixed as
follows (this section is the build note for the replay hook too).

**1. Audio delivery — bundled first, hosted as fallback.** The audio
loader (`src/game/audio.ts`) now tries, in order: bundled assets from
`src/assets/audio/` (Vite emits them as hashed files next to the JS bundle,
so they load wherever the bundle loads, with no separate `/audio` route);
`public/audio/` (Vite base, plus the page-relative candidate for snapshot
sub-paths); then the same files hosted on `raw.githubusercontent.com` for
this repo, as a last resort only — offline PWA and Capacitor builds still
use local audio first. The binary move of the `.ogg`/`.mp3` files from
`public/audio/` into `src/assets/audio/` is still pending (it needs a
`git mv` — see `src/assets/audio/README.md`); until it happens the glob
matches nothing and sound comes from the local/hosted candidates.

**2. Home-screen update path — version check, no delete-and-re-add.** The
service worker was already v2 with an update prompt (`public/sw.js`,
`public/ios.js`); this update bumps the runtime worker to v3 (activating
deletes every old cache) and adds a version check that does not depend on
the worker at all: `public/ios.js` fetches the live page HTML with the
cache bypassed every 60 seconds and on foregrounding, compares the hashed
build assets (`/_build/assets/*.js|css`) it references with the ones the
running page loaded, and shows the same one-tap "Reload to update" banner
when they differ. Verify by installing the old build on the home screen,
then loading the new one — the banner should appear without deleting and
re-adding the icon.

**3. Replay hook — persistent First Sortie best score.** Every First
Sortie run now records its kills as a persistent best
(`firstSortieBestKills`, saved in localStorage with the rest of the save).
The First Sortie card on the Play tab shows "Best N kills" once a best
exists, and the results screen shows a "Best" stat plus "Mission complete ·
new best" when a run beats it. A 5-minute sortie never moves this best.
Test: `src/game/meta/first-sortie.test.ts` (best updates, worse runs and
5-minute sorties leave it alone, migration preserves it).

**Still to verify on the test site (not verified by this push):** sound on
a fresh load, and the install-old / load-new update check above.
