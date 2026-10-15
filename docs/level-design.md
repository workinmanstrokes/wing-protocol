# Wing Protocol: level and arena design research and proposal

Branch `mecha-levels` (stacked on `android-wrapper`, PR #6). Date: 2026-10-13.

## 1. What proven horde and mech games do

### Pacing is authored, not random (Vampire Survivors, 20 Minutes Till Dawn)
- **Vampire Survivors** uses a fixed wave table for each stage, one row per minute. Each row sets the enemy roster, a minimum number of enemies alive, and a spawn interval. The spawner tops up to the minimum, and scripted bosses and map events fire at set seconds. Periodic spawning stops at 300 enemies alive. [1][2]
- In Mad Forest these numbers fall into clear bands:
  - 0–4 min: one enemy type at a time, 15–40 alive. This is the learning phase.
  - 5–10 min: about 100 alive, and the first bosses drop chests.
  - 11–20 min: new types are layered on top of the old ones.
  - 21–29 min: 200–300 alive, held there.
  - 30 min: the screen is cleared and a finale enemy ends the run. [2]
- Map events "trigger at the same second marks every time", so players can learn and plan for them. [1]
- **20 Minutes Till Dawn** spawns in timed "sessions". Each session has an enemy type, a start and end time, a max alive count, a spawn cooldown, and a count per spawn.
  - Mini-bosses arrive at fixed times (Elder at 3:00, Spawner at 8:00).
  - Bosses are at 5:00 and 15:00 (Forest).
  - When a boss spawns, an electric barrier encloses the fight for one minute. [3][4]

### Elite and boss cadence: alternate them on a fixed rhythm (Halls of Torment, Brotato)
- **Halls of Torment** (Haunted Caverns, a 30-minute run) alternates elite → boss → elite → boss. Elites spawn at 2:20, 10:15 and 18:20 elapsed, and bosses at 6:00, 14:00 and 22:00, with the Lord at 30:00. Each elite comes about 4 minutes before the next boss and drops loot that prepares you for it. [5]
- Forgotten Viaduct speeds this up near the end: two elites spawn 20 seconds apart, just before the Lord. [6]
- **Brotato** has 20 waves:
  - Waves 1–8 grow from 20 s to 55 s.
  - Waves 9–19 are 60 s each.
  - Wave 20 is a 90 s boss wave.
  - On higher difficulty, "horde" or "elite" waves land in fixed windows (11–12, 14–15, 17–18). Elites drop a legendary crate. Horde waves bring 35% fewer materials per kill, but the extra enemies usually mean more in total. [7][8]
- Brotato's arena is a plain 2000×1500 rectangle. Variety comes from the waves, not from the terrain. [9]

### Tension and relief (Left 4 Dead AI Director)
- Valve's Director cycles through **Build Up → Sustain Peak (3–5 s) → Peak Fade → Relax (30–45 s)**, because "constant, unchanging combat is fatiguing" and "long periods of inactivity are boring". [10]
- It tracks player intensity from damage taken and nearby kills, and pulls major threats back after a peak. [10][11]

### Arena, obstacles, chokepoints (Armored Core VI, Into the Breach, Brotato mods)
- **Armored Core VI** arenas use walls, cliffs and structures to break up boss attacks and open routes. Critics note that its flat, coverless boss arenas are the weak spots. [12][13]
- **Into the Breach** (GDC postmortem):
  - Maps are hand-built to stay solvable.
  - Terrain and hazards create choices rather than randomness.
  - Bonus objectives give extra resources at a positional risk. [14][15]
- Brotato players built a whole arena-variant mod: circle, hexagon, shrinking, maze, cave and hazard layouts. This shows the demand for terrain variety on top of the same waves. [16]

### Takeaways for a 5-minute mobile run
1. **Write the timeline by hand** so runs can be learned: fixed beats at fixed seconds. Keep randomness in positions and enemy mix, not in the schedule. (VS, 20MTD, HoT)
2. **Alternate elite and boss**, with an elite about 15–20 s before each boss as a preparation spike that drops loot. (HoT, Brotato)
3. **Add breathers after peaks**: a few seconds of low spawns after each boss or sector change, plus short surges that create peaks. (L4D)
4. **Make each sector look and play differently through terrain**, not just colour. Obstacles that funnel the horde let auto-fire builds farm chokepoints and give kiting players a route to read. (AC6, ITB, Brotato Arenas)
5. **Objectives as risk for reward**: holding a zone should cost something (more pressure) and pay well. (ITB bonus objectives)

## 2. Current code before this branch

| Area | Current (`combat.ts`) | Gap |
|---|---|---|
| Sectors | 3 × 100 s; each differs in floor colour, grid tint and hazard rate | Same open layout in every sector |
| Obstacles | 18 wrecks in one fixed ring around world centre, never changed | No chokepoints; sectors play the same |
| Spawn pacing | One linear ramp: interval 0.85 s → 0.12 s, batch 1→3 | No peaks or valleys; boss fights are crowded by trash |
| Elites | Random 5–19% chance per spawn after 15% of the run | No scheduled elite moments to anticipate |
| Bosses | 88 / 188 / 270 s (Titan, Ace, Warden) | Good cadence; trash pressure doesn't ease off |
| Uplinks | 40 / 140 / 228 s, hold 7–9 s inside 32 s | Reward is good, but holding adds no risk |
| Hazards | S2 ion strikes every ~2 s, S3 reactor vents ×3 | Good sector identity |

## 3. Proposal for the three sectors

| | S1 · Outer Yard (0–100 s) | S2 · Ion Storm (100–200 s) | S3 · Reactor Core (200–300 s) |
|---|---|---|---|
| Role | Learn and build | Pressure and routing | Siege and finale |
| Layout | Loose **wreck clusters**, open ground for learning to kite | **Diagonal pylon lanes** with 2 gaps per lane, which funnel the horde through chokepoints | **Reactor ring wall** (r = 420) with **4 gates** and inner cover blocks: hold the gates or get flanked |
| Roster | drones → walkers/swarms → chargers | adds snipers and shielders | adds crawlers (quad artillery) |
| Hazards | none | ion strikes | reactor vents |
| Beats | 22 s elite · 40 s uplink · 58 s surge · 72 s elite · 88 s Titan | 100 s breather · 118 s elite · 140 s uplink · 158 s surge · 172 s elite · 188 s Ace | 200 s breather · 212 s elite · 228 s uplink · 245 s surge · 258 s elite · 270 s Warden · 286 s FINAL STAND surge |

Each sector's layout is generated around the player when the sector starts, using a seeded PRNG, so it has the same learnable shape every run and always leaves a 150 px clear radius around the player.

## 4. Implemented on this branch (low risk, high impact)

- `src/game/levels.ts` (new, pure, unit-tested in `levels.test.ts`):
  - `sectorLayout(sector, cx, cy, world)` builds the wreck clusters, pylon lanes (with gaps) or reactor ring (with gates).
  - `PACE_EVENTS` is the authored timeline: 6 scheduled elites (2 per sector), 3 swarm surges and the final stand. A test checks that no event lands within 6 s of a boss or uplink.
  - `paceMultiplier(time, {bossAlive, uplinkActive})`:
    - 0.45× for 7 s after each sector change (relax).
    - 2.2× during surges (peak).
    - 0.6× while a boss is alive, so boss fights read clearly.
    - 1.25× while an uplink is active (risk; the existing chest, heal and EMP are the reward).
- `combat.ts`:
  - The obstacle layout is rebuilt on every sector change.
  - Spawn interval is divided by the pace multiplier.
  - Scheduled elites (walker, sniper or crawler by sector), each with an "ELITE SIGNAL" banner.
  - Surges get a "SWARM SURGE" banner plus a ring of swarms; the last one is "FINAL STAND · HOLD OUT".
  - Enemy-vs-obstacle collision now does a cheap box reject first.
- `sprites.ts` `drawObstacle`: new ion pylon (blue core) and reactor barrier (hazard-striped block) art. Wrecks stay in S1.
- Performance with 340+ mobs and a 4× CPU throttle on Low: 16 fps on this branch vs 15–17 fps on `android-wrapper`, measured in the same session on the box, so no regression. Absolute numbers on the box are lower today than in earlier sessions.

## 5. Next steps (not done; need Michael's call)

1. **Boss arena lock** (20MTD-style barrier for 30–45 s around each boss). Strong drama, but it changes difficulty a lot, so it needs playtesting.
2. **Uplinks placed inside the terrain**: put S2 uplinks in a lane gap and S3 uplinks in the reactor core, so the objective uses the chokepoints.
3. **Intensity-driven director** (L4D): end the relax early when the player takes no damage, extend it after heavy damage.
4. **Sector modifiers for replay**: a random "storm front" or "overclock" modifier per run with a credit multiplier, like Curse in VS or Danger in Brotato.
5. **Endless / Hard mode**: loop the timeline with +HP and +rate per cycle, as in VS Endless.

## Sources
1. Vampire Survivors Wiki: Enemies (waves, events, 300 cap). https://vampire.survivors.wiki/w/Enemies
2. Game Design Lab: Vampire Survivors spawn director (Mad Forest bands). https://teemo.dev/game-design/vampire-survivors/systems/spawn-director/
3. 20 Minutes Till Dawn Wiki: Enemies (sessions, mini-bosses, boss barrier). https://20minutestilldawn.wiki.gg/wiki/Enemies
4. 20 Minutes Till Dawn Wiki: Forest (spawn table). https://20minutestilldawn.wiki.gg/wiki/Forest
5. Halls of Torment Wiki: Haunted Caverns (elite/boss timeline). https://hot.fandom.com/wiki/Haunted_Caverns
6. Halls of Torment Wiki: Forgotten Viaduct. https://hot.fandom.com/wiki/Forgotten_Viaduct
7. Game Design Lab: Brotato wave scripting and spawns. https://teemo.dev/game-design/brotato/systems/wave-scripting-and-spawns/
8. Brotato Wiki: Elite and Horde Waves. https://brotato.wiki.spellsandguns.com/Elite_and_Horde_Waves
9. Brotato Wiki: Waves. https://brotato.wiki.spellsandguns.com/Waves
10. Michael Booth (Valve), GDC 2009, "Replayable Cooperative Game Design: Left 4 Dead". https://cdn.akamai.steamstatic.com/apps/valve/2009/GDC2009_ReplayableCooperativeGameDesign_Left4Dead.pdf
11. Left 4 Dead Wiki: The Director. https://left4deadwiki.com/wiki/The_Director
12. One More Game: Armored Core VI hands-on (boss arenas using structures). https://onemoregame.ph/2023/07/armored-core-vi-fires-of-rubicon-hands-on-preview/
13. The Gemsbok: A Mechanical Critique of Armored Core VI. https://thegemsbok.com/art-reviews-and-articles/armored-core-vi-6-fromsoftware-critique-mechanics-analysis/
14. GDC Vault: "Into the Breach" Design Postmortem. https://www.gdcvault.com/play/1025772/-Into-the-Breach-Design
15. Game Developer: Reimagining failure in strategy game design in Into the Breach. https://www.gamedeveloper.com/design/reimagining-failure-in-strategy-game-design-in-i-into-the-breach-i-
16. Brotato Arenas mod (circle, hexagon, shrinking, maze, cave and hazard layouts). https://github.com/liamstewart23/brotato-arenas
