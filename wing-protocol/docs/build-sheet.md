# Wing Protocol — Build Sheet (one page)

**Game:** Wing Protocol — mobile arcade shooter, Android.
**Tester score this sheet answers:** 3.5/10 (grade D). **Status:** vertical
slice in progress; no further polish until the slice is proven on two phones.

## 60-second core loop

Launch Mission 1 → drag to fly, ship auto-fires → destroy the first wave,
issue your first wingman command (visible inside 30 seconds) → survive the
elite at the end of the mission → win screen, spend one upgrade, launch the
next mission. A full loop is about 60 seconds; a lost run restarts in under
10 seconds from the lose screen.

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
