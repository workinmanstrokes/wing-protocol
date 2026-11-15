# Wing Protocol — App Builder starter plan

> **This folder is the App Builder plan drop, not the live game.**
> The live Wing Protocol project lives at the repository root: a
> TanStack Start (React 19) + Capacitor Android app (`com.diddlerrr.wingprotocol`).
> See the root `README.md` for the real build commands.

## What is in here

This folder holds the starter build for the App Builder project
**"Wing Protocol"** (project 13), planned around a game-tester review that
scored the build **3.5/10 (grade D)**. The plan stops broad polish and
rebuilds trust: a one-page build sheet first, then one playable vertical
slice tested on two real Android phones.

- [`BUILD-PLAN.md`](BUILD-PLAN.md) — the full plan: tagline, features,
  screens, stack, milestones, and open questions.
- [`docs/build-sheet.md`](docs/build-sheet.md) — the one-page build sheet
  (fix #1 from the tester review): 60-second loop, controls, first 5
  missions/enemies, upgrades, art style, monetization, minimum device.
- [`project.godot`](project.godot), [`export_presets.cfg`](export_presets.cfg),
  [`scenes/`](scenes/), [`scripts/`](scripts/) — a Godot 4 + GDScript
  starter skeleton for the vertical slice: drag-to-fly, auto-fire, 3 enemy
  types, 1 elite/boss, win/lose, restart in under 10 seconds, and
  wingman/Protocol squad commands in the first 30 seconds.

## Why this is a subfolder

The plan's starter skeleton assumes Godot 4, but the existing project at the
repo root is TypeScript/React/Capacitor — that is the plan's own open
question #1 ("Does the existing project already use Godot … or does the
maker want to stay on that codebase instead of migrating?"). Until the maker
answers it, the Godot skeleton lives here so it cannot clobber or confuse
the real, working codebase at the root. If the maker chooses Godot, this
folder is the starting point; if they stay on the current stack, port the
vertical-slice scope (not the engine files) into `src/game/`.

## First step

Write (done) and review `docs/build-sheet.md` before touching any polish.
Then build the vertical slice in `scenes/game.tscn` + `scripts/game.gd`
and test it on one low-end and one mid-range Android phone.
