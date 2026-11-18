# Wing Protocol — Build Sheet (one page)

**Game:** Wing Protocol — mobile arcade shooter, Android.
**Tester score this sheet answers:** 3.5/10 (grade D); retested by VEX at 2.5/10 (grade F) — the live build had no describable loop. **Status:** wingmen and squad commands shipped; two-phone test still to do; the loop below now describes the shipped build as tested, and the same words appear on the title screen.

## 60-second core loop

**THE 60-SECOND LOOP (verbatim — this is the loop in the live build, and the same words appear on the title screen):** First Sortie: survive 60 seconds against the machine horde. One goal — stay alive until the extraction timer hits zero. One threat — the horde. Win by surviving to extraction; lose by losing your hull. One tap on Retry restarts in under 10 seconds.

*Note: wingmen and squad commands are now in the shipped build (every mode, not only Mission 1). The Mission 2-5 table and the between-mission upgrade list below are still plan targets; the shipped game keeps its twin-stick controls and in-run perks.*

## Control scheme (as shipped)

- **Move:** left thumb, floating stick (WASD / left stick on a pad).
- **Auto-fire, auto-aim:** guns always fire. With aim assist on **Auto** (the
  phone default) they lock the nearest threat, bosses and elites first, so
  the game plays with one thumb. Drag the right thumb (or the mouse) to aim
  yourself; let go and auto aim takes over again.
- **Squad commands:** three thumb-safe buttons above the move stick (1 / 2 / 3
  on a keyboard, X / Y / B on a pad). One tap, both wingmen obey at once:
  - **Focus:** both hit the toughest enemy near your crosshair (cyan bracket).
  - **Spread:** they swing wide and each clears its own targets.
  - **Regroup:** they tuck in, shoot down enemy bullets that reach them and
    cut the damage you take by about a fifth (dashed cyan ring).
- **Visible in the first 30 seconds:** "WINGMEN ONLINE" callout at the start
  and the buttons pulse until the first order.
- **Skill:** one button, ring fills as it charges. **Pause:** top corner.

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
