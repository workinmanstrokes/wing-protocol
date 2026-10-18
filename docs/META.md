# Wing Protocol: meta systems

Branch `feat/meta-menu`. Covers the main menu, gear, store crates, the premium Prism Vault, game modes, missions and the economy. Every number below comes from code. If you change a value, change it here too.

| System | Source |
|---|---|
| Gear catalog, levels, stat math | `src/game/meta/gear.ts` |
| Crates, odds, pity, ad + IAP stubs | `src/game/meta/crates.ts`, `src/game/meta/ads.ts` |
| Modes (Sortie, Elite, Boss Rush) | `src/game/meta/modes.ts` |
| Tower roguelike | `src/game/meta/tower.ts` |
| Daily / weekly missions | `src/game/meta/missions.ts` |
| Save schema v2 + migration | `src/game/meta/save-migrate.ts`, `src/game/save.ts` |
| Menu UI | `src/components/menu/*` |
| Tests | `src/game/meta/meta.test.ts` (unit), `scripts/meta-smoke.mjs` (browser) |

## Main menu

- The game opens straight to the menu, with no splash screen. **Deploy** works within about 1.3 s on a dev build.
- The menu is built for phones. A bottom tab bar holds **Play · Hangar · Store · Pilots**. The **Deploy** button sits in the thumb zone, so a sortie starts in one tap.
- The background is live: a scrolling hangar deck grid, drifting sparks, a searchlight sweep, and the selected mech hovering with its own booster colour. It pauses when the tab is hidden and stays static if the player prefers reduced motion. It dims behind the busier tabs.
- Settings (gear icon): sound on/off, graphics quality (Auto/High/Low), and controls help.
- The top bar shows **credits**, **cores** and **shards**. **Keys** also show on wider screens.

## Currencies

| Currency | Kind | Earned from | Spent on |
|---|---|---|---|
| Credits | soft | Every run (kills, bosses, uplinks, extraction), mission rewards, tower floors | Supply/Command crates, gear upgrades, credit-unlock mechs |
| Keys | soft (existing) | Run drops, bosses, extracting | An alternative price for crates (1 or 2 keys) |
| Shards | upgrade | Duplicate parts, sorties (+10 for extracting, +5 per boss kill), missions, start 30 | Gear upgrades |
| Cores | premium (earned) | Sortie extract +3, +1 per boss kill, missions, elite/rush clears, tower milestones, start 20 | Prism Vault (60) |

**Nothing needs real money.** The real-money Core pack path is stubbed and **switched off**: `CORE_PURCHASES_ENABLED = false` in `crates.ts`. No billing SDK is wired in. The Store shows the packs greyed out as "Not available in this build".

## Gear (Hangar tab)

- There are **5 slots**: Primary weapon, Secondary, Frame, Thrusters, Core.
- There are **4 rarities**: common, rare, epic, legendary.
- The **catalog has 40 original parts**, 2 per slot per rarity. Each part has fixed base stats: damage %, fire rate %, crit, range %, hull, speed %, magnet %, skill haste %.
- **Stats apply in every mode.** `applyGear()` is the same function the combat loop and the Hangar stat preview both use:
  - percentage stats multiply
  - hull adds flat
  - crit adds
  - mode buffs (tower buffs, the Glass Cannon modifier) go through the same path as one extra part
- **Levels:** each level adds 8% of the part's base stats.
  - Max level: common 5, rare 10, epic 15, legendary 20.
  - Upgrade cost from level L: `credits = 50 × m × L` and `shards = ceil(1.5 × m × L)`, where m is 1, 2, 4 or 8 by rarity.
- **Equip and swap:** tap a slot, tap a part, then Equip, Unequip or Upgrade. The stat panel shows the gain over the bare mech.
- **Duplicates:** a part whose catalog template you already own becomes shards instead (common 5, rare 15, epic 40, legendary 100). This applies to crates, the vault and run loot alike.

## Store crates and drop odds

The odds are always shown on each crate card. Play's loot-box policy requires disclosure before purchase.

| Crate | Price | Common | Rare | Epic | Legendary |
|---|---|---|---|---|---|
| Field Drop (free) | Free every 4 h | 60% | 28% | 10% | 2% |
| Sponsor Crate (ad) | Watch an ad, 3/day | 60% | 28% | 10% | 2% |
| Supply Crate | 300 credits or 1 key | 60% | 28% | 10% | 2% |
| Command Crate | 900 credits or 2 keys | 0% | 70% | 24% | 6% |

- Each crate gives one part. Within a rarity, the part is uniform across that rarity's 10 catalog parts.
- **Rewarded ad = stub only.** `src/game/meta/ads.ts` shows a 3-second placeholder ("Test ad, no real ads in this build") and then grants the crate. No ad SDK and no ad unit IDs are in the repo. To go live:
  - use AdMob rewarded ads in release builds only
  - inject the IDs from CI secrets
  - add UMP consent, the same as the other apps

### Prism Vault (premium, Cores)

| Price | New vault mech | Legendary part | Epic part |
|---|---|---|---|
| 60 cores | 8% | 32% | 60% |

- **Pity:** the **10th vault in a row without a mech always gives one**, and the counter resets on any mech. The Store shows "Guaranteed new mech within N vaults".
- A mech roll gives a random **unowned** vault mech. Once all three are owned, a mech roll pays a legendary part plus 150 shards.
- Expected vaults per mech (8% with hard pity 10): `Σ_{k=0..9} 0.92^k ≈ 7.1` vaults, or about 425 cores. Worst case is 10 vaults (600 cores) per mech, so 30 vaults for all three.

## Pilots and mechs

There are 8 existing mechs, unlocked with credits as before, plus **3 new original vault mechs** that come only from the Prism Vault. All art is drawn in code in the game's cel-shaded ink style. None of them copy existing franchises: no V-fins, mono-eyes or franchise silhouettes, and no memes or real people.

### Shaded-metal art for the original 8

The 8 credit mechs (Aether Wing, Heavy Forge, Night Scythe, Dune Shield, Jade Serpent, Storm Warden, Iron Vulture, Solar Cross) use the Lead Sprite Designer's **shaded-metal** art: bevelled plates, metallic gradients, rivets and a soft drop shadow, with light from the top-left. None of them uses mobile-suit franchise traits.

- **Source:** `src/game/art/mechs/*.svg`. They are authored top-down, nose right, in a 96-unit box centred on the mech. `src/game/mech-art.ts` inlines them as data URLs, so they work offline, in the PWA and in Capacitor.
- **Sharpness:** each draw rasterises the vector at the destination size. The combat sprite cache renders it at 2x, and the Hangar/Pilots portraits and the menu background render it at device pixel ratio, so it stays sharp on retina.
- **Scale and hitbox:** `MECH_ART_SCALE = 0.75`, so the 96-unit box draws at 72 px. The widest parts (Aether's wing binders, Night Scythe's glaive, Jade Serpent's tail, Solar Cross's lance) stay inside about ±35 px, close to the old roughly 64–72 px footprint. The player hit radius is **unchanged at 16 px**, roughly the size of each mech's solid body (equivalent radius 15–21 px at this scale). Wings, tails and glows are purely visual and extend past the hitbox, which favours the player.
- **Boosters:** `MECH_BOOSTERS` ports sit on each SVG's nozzles at the 0.75 scale.
- **Vault mechs:** the 3 vault mechs are still drawn in code in the older ink style (thick black outlines, flat two-tone fills). They match the metal mechs in size but not in rendering style.
- **Enemies:** grunts have hex heads with three eyes in a triangle, squared shoulders and ribbed back plates. The Ace is a black-and-gold squad leader. The Titan has a triple sensor cluster.
- See `docs/mech-lineup.png`.

| Mech | Pilot | Role | Look | Weapon | Skill |
|---|---|---|---|---|---|
| **Lantern Moth** | Lumen | Controller | Teardrop dust-wings with eye-spots, feathery antennae, glowing lantern abdomen | Light motes: slow, strongly homing, 3+ per volley | **Lure Lamp**: a lamp ahead pulls nearby non-boss hostiles in for 3 s, then bursts (5× damage, 150 radius) |
| **Kiln Tortoise** | Cinder | Juggernaut | Hex-plated furnace dome on four stub legs, chimney, ember-grate snout | Ember spray: short cone of embers that pop in small bursts | **Molten Shell**: 3.5 s invulnerable, scorching everything within 100 every 0.25 s |
| **Tether Kite** | Vesper | Skirmisher | Diamond sail with cross spars, ribbon tail with bows, tethered wingtip blades | Tether blades: fly out and snap back, piercing both ways | **Afterimage**: three decoy images that auto-fire for 4 s |

Their base stats are in `MECHS` in `src/game/data.ts`.

## Modes (Play tab)

All modes reuse the existing enemies, elites, sectors and the three bosses (Titan, Ace, Warden). Each mode is a `RunConfig` passed to the combat loop.

- **Sortie:** the original 5-minute, 3-sector run with uplinks and scripted surges.
  - Rewards: credits and keys as before, plus 3 cores for extracting, 1 core per boss killed, and shards.
- **Tower (roguelike):**
  - Floors are 45 s.
  - After each floor you pick 1 of 3 rooms:
    - **Patrol Deck**: normal floor, more credits
    - **Elite Hangar**: tougher, wins a rare buff
    - **Repair Bay**: +40% hull, easier
    - **Supply Cache**: random buff
  - **Every 5th floor is a guardian boss** (Titan, then Ace, then Warden, repeating), with a rare buff on clear.
  - Enemy hull rises 12% per floor, and spawn rate and starting intensity climb too.
  - Hull carries between floors and buffs stack for the climb.
  - **Best floor is saved.**
  - Banking (or dying) pays `40 + 10 × floor` credits per cleared floor, plus **10 cores the first time you pass each 5-floor milestone**.
- **Elite Boss Fights:**
  - Pick Titan, Ace or Warden. The boss has 1.6× hull, light escorts and a 150 s limit.
  - Optional modifiers, each worth **+2 cores**:
    - Overcharged: boss hull +50%
    - Escort Wing: spawns +60%
    - Glass Cannon: enemies hit +50%, you deal +25%
    - Afterburn: hostiles 25% faster
  - First clear of each boss: **20 cores** and 250 credits. Repeats: 4 cores (+mods).
- **Boss Rush:** all three bosses back to back, 300 s limit. First clear **30 cores**, repeats 8, plus 600 credits.
- **Daily cap:** repeat-clear cores from Elite and Rush are capped at **24 per day**. First clears always pay in full.

## Missions

- **3 daily and 3 weekly** missions, drawn from a pool by a seed of the date. Everyone gets the same board on the same day.
  - Daily missions reset at local midnight.
  - Weekly missions reset on Monday.
- Kinds: destroy hostiles, defeat bosses, extract from sorties, reach tower floor N (tracks your best), open crates, upgrade gear, win elite fights, hold uplinks, play runs.
- Rewards:
  - Daily: 150–300 credits plus 4–6 cores, or shards
  - Weekly: 1,200–1,500 credits plus 30–40 cores, or 120 shards
- Claim from the Play tab. A red dot on Play means something is ready to claim.

## Economy check (everything is reachable by playing)

| Source | Cores per day (active player) |
|---|---|
| 3 dailies | ~15 |
| Weeklies (≈105 a week) | ~15 |
| 2 sortie extracts with 2–3 boss kills | ~10 |
| Elite/Rush repeats (capped) | up to 24 |
| **Total** | **~35–60 a day**: one vault every 1–2 days |

- New players also get one-time core bursts: 60 from first elite clears, 30 from the first rush clear, and 10 per tower milestone.
- At that rate a mech takes about 7 vaults on average (about 1–2 weeks). Pity caps every mech at 10 vaults, so all three vault mechs are guaranteed within roughly 4–7 weeks of normal play.
- **Credits:** a sortie extract pays roughly 900–1,400 credits. So a Supply Crate costs about a third of a run and a Command Crate about one run. Upgrades are the long-term credit and shard sink.
- **Shards:** about 10–25 per sortie plus duplicates. Mid-level rare upgrades cost 3–15 shards each, and the top legendary levels cost ~200–230 each.

## Save migration

- The storage key stays the same (`wing-protocol-save-v1`), so existing players keep their saves. The `version` field inside moves from 1 to 2.
- v1 to v2 changes:
  - Credits, keys, owned and selected mechs, best kills/time and sorties are all kept.
  - Gear slots are remapped: `weapon→weapon`, `armor→frame`, `system→core`. Equipped items stay equipped.
  - Old random-rolled parts keep their stats. They get `level 1`, and a catalog template id when the name matches, otherwise `legacy:<name>`.
  - Gear named "Gundam Weave" is renamed **Mirror Weave**, to remove a trademarked name.
  - New fields get defaults: 20 cores and 30 shards (the same starter amounts as new players), pity 0, tower best 0, and a fresh missions board.
- The migration ignores junk values and unknown mech ids, and running it twice gives the same result. These cases are covered by unit tests.

## Tests

- `npm test` runs the unit tests, including `src/game/meta/meta.test.ts` (23 tests):
  - odds sum to 100 and match over 200k rolls
  - zero-odds rarities never drop
  - duplicates become shards
  - vault mech rate is about 8%
  - pity triggers exactly on the 10th vault, resets, and handles the all-owned case; the worst case for 3 mechs is 30 vaults
  - gear stat application and level scaling
  - upgrade costs and max level
  - v1 to v2 migration, garbage input, idempotence
  - mission seeding and rollover, progress, best-floor tracking, single claim
  - tower rooms, boss floors and scaling
  - elite and rush configs, rewards and the daily cap
  - IAP switched off
- `node scripts/meta-smoke.mjs [url]` is the Playwright smoke test on a phone viewport. Set `CHROMIUM_PATH` if Playwright's own Chromium isn't installed. It checks:
  - the menu becomes interactive in under 3 s with Deploy in the thumb zone
  - all tabs work
  - odds are visible
  - free, supply (credits and keys) and ad crates open
  - equipping a part updates the stats
  - the vault charges cores and updates pity
  - Sortie, Elite (with a modifier) and Boss Rush each start
  - Tower clears floor 1, a room can be picked, floor 2 starts, and the best floor is saved
  - each vault mech deploys and casts its skill
  - no page errors
