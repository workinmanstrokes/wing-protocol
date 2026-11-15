# Wing Protocol — Build Plan

- **Name:** Wing Protocol
- **Kind:** game (update to an existing Android project)
- **Category:** Mobile arcade shooter
- **Platform:** Android
- **Tagline:** Fly, command your wing, survive the first mission — proven on two real phones.
- **Tester review that drives this plan:** score **3.5/10, grade D**. Fixes are
  ordered highest priority first; this plan applies them to the existing project.

## Summary

Wing Protocol is an existing Android arcade shooter scored 3.5/10 (grade D).
This update stops broad polish and rebuilds trust: first a one-page build
sheet, then one playable vertical slice — drag-to-fly, auto-fire, 3 enemy
types, 1 elite/boss, win/lose, and restart in under 10 seconds — tested on
a low-end and a mid-range Android phone. The single differentiator is
wingman/Protocol squad commands, visible in the first 30 seconds; roguelike
in-run upgrades and offline campaign scope are cut. A daylight readability
pass fixes bullets, hitbox, damage feedback, and thumb coverage, and the
store identity is locked in writing before launch.

## The five tester fixes (highest priority first)

1. Send a one-page build sheet before any more polish: 60-second core loop,
   control scheme, first 5 missions/enemies, upgrade list, art style,
   monetization, and minimum Android device. → `docs/build-sheet.md`
2. Ship one vertical slice and test it on two real Android phones (one
   low-end, one mid-range): drag-to-fly, auto-fire, 3 enemy types,
   1 elite/boss, win/lose, and restart in under 10 seconds.
3. Pick one differentiator and cut the rest — **wingman/Protocol squad
   commands** — and make it visible in the first 30 seconds.
4. Run a readability pass on a phone in daylight: enemy bullets vs
   background, player hitbox, damage feedback, and thumb coverage; fix the
   worst three issues first.
5. Lock the store identity before launch: confirm the exact name is not
   colliding with Wingforce Protocol, check ASO keywords, and decide
   free/ads/IAP/offline in writing.

## Features

- Drag-to-fly player ship with auto-fire and a clearly visible hitbox
- Three enemy types with distinct movement and attack patterns
- One elite/boss encounter to end Mission 1, with win and lose states
- Restart in under 10 seconds from the win or lose screen
- Wingman/Protocol squad commands as the single differentiator, usable
  within the first 30 seconds
- First 5 missions and enemy roster defined, with Mission 1 playable in
  the vertical slice
- Small fixed upgrade list for ship damage, wingman strength, and shields
  between missions
- Daylight readability: high-contrast enemy bullets, damage flash and
  shake, uncluttered background, and thumb-safe HUD
- Offline single-player play tuned for the locked minimum Android device
- Local save of mission progress, best results, and settings

## Screens

Main menu / title · Mission select (first 5 missions) · Gameplay — Mission 1
vertical slice · Wingman / Protocol command HUD overlay · Upgrade / loadout ·
Pause · Win screen · Lose / game over screen · Settings (readability,
controls, device)

## Stack

**Godot 4 + GDScript, Android export.** Godot 4 gives a single lightweight
2D codebase that exports directly to Android APK/AAB for fast testing on
low- and mid-range phones without native engine work.

> **Open question #1 (unresolved):** the existing project at the repo root is
> TanStack Start (React 19) + Capacitor, not Godot. This folder's Godot
> skeleton is a starter, not a migration — see `README.md` in this folder.

## Entities

PlayerShip · Wingman · SquadCommand · Mission · EnemyType · EliteBoss ·
Upgrade · MissionResult · SaveData · Settings

## Milestones

1. Playable skeleton on Android: drag-to-fly, auto-fire, one enemy type,
   win/lose, and instant restart
2. One-page build sheet in the repo: 60-second loop, controls, first 5
   missions/enemies, upgrades, art style, monetization, and minimum device
3. Complete the vertical slice: 3 enemy types, elite/boss, Mission 1, and
   squad commands visible in the first 30 seconds; cut roguelike upgrades
   and offline campaign scope
4. Readability pass on a real phone in daylight: enemy bullets vs
   background, hitbox, damage feedback, and thumb coverage; fix the worst
   three issues
5. Test on one low-end and one mid-range Android phone, tune performance,
   and lock the minimum device and API level
6. Lock store identity: name-collision check vs Wingforce Protocol, ASO
   keywords, and free/ads/IAP/offline decision in writing
7. Fix only the worst issues found in retesting and ship the updated build
   for a second tester review

## Open questions

1. Does the existing project already use Godot, or is it Unity/native
   Kotlin — and if not Godot, does the maker want to stay on that codebase
   instead of migrating?
2. Is "Wing Protocol" legally/store-safe versus Wingforce Protocol, or must
   the game be renamed before ASO work?
3. Which low-end and mid-range Android phones and minimum API level are the
   official test targets?
4. Final monetization decision: free with ads, IAP, paid, or fully offline
   with no ads/IAP?

## Complexity

multi-day. **First step:** write `docs/build-sheet.md` as the one-page build
sheet — 60-second loop, controls, first 5 missions/enemies, upgrades, art
style, monetization, and minimum device — before touching any polish.
