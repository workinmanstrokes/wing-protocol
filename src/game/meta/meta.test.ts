import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COMMAND_ODDS,
  CRATES,
  SUPPLY_ODDS,
  VAULT_MECHS,
  VAULT_ODDS,
  VAULT_PITY,
  CORE_PURCHASES_ENABLED,
  purchaseCores,
  openGearCrate,
  openVault,
  rollFromOdds,
  adCratesLeft,
  type Odds,
} from "./crates.ts";
import { GEAR_CATALOG, MAX_LEVEL, SLOTS, applyGear, effectiveMods, makeItem, upgradeCost, GEAR_BY_ID } from "./gear.ts";
import { migrateSave, defaultSave, SAVE_VERSION } from "./save-migrate.ts";
import { applyMissionEvents, claimMission, dayKey, newMissionState, refreshMissions, weekKey } from "./missions.ts";
import { towerFloorConfig, roomChoices, isBossFloor, towerMilestoneCores, floorScale } from "./tower.ts";
import { eliteConfig, bossRushConfig, eliteReward, capBossCores, DAILY_BOSS_CORE_CAP } from "./modes.ts";

/** Deterministic PRNG for statistical tests. */
function rng(seed = 42) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const sum = (o: Odds) => o.common + o.rare + o.epic + o.legendary;

/* ---------------------------------- odds ---------------------------------- */

test("every crate's published odds sum to 100%", () => {
  for (const c of Object.values(CRATES)) assert.equal(sum(c.odds), 100, c.id);
  assert.equal(VAULT_ODDS.mech + VAULT_ODDS.legendary + VAULT_ODDS.epic, 100);
});

test("rollFromOdds matches the published odds within 1% over 200k rolls", () => {
  for (const odds of [SUPPLY_ODDS, COMMAND_ODDS]) {
    const r = rng(7);
    const n = 200_000;
    const got = { common: 0, rare: 0, epic: 0, legendary: 0 };
    for (let i = 0; i < n; i++) got[rollFromOdds(odds, r)] += 1;
    for (const k of Object.keys(got) as (keyof Odds)[]) {
      assert.ok(Math.abs((got[k] / n) * 100 - odds[k]) < 1, `${k}: ${(got[k] / n) * 100} vs ${odds[k]}`);
    }
  }
});

test("zero-odds rarities never drop (Command Crate is rare+)", () => {
  const r = rng(3);
  for (let i = 0; i < 20_000; i++) assert.notEqual(rollFromOdds(COMMAND_ODDS, r), "common");
  assert.equal(rollFromOdds(COMMAND_ODDS, () => 0), "rare");
  assert.equal(rollFromOdds(COMMAND_ODDS, () => 0.999999), "legendary");
});

test("duplicate parts convert to shards instead of an item", () => {
  const owned = new Set(GEAR_CATALOG.map((g) => g.id));
  const d = openGearCrate("supply", rng(1), owned);
  assert.equal(d.duplicate, true);
  assert.ok(d.shards > 0);
  const fresh = openGearCrate("supply", rng(1), new Set());
  assert.equal(fresh.duplicate, false);
  assert.equal(fresh.shards, 0);
});

test("vault mech rate is ~8% before pity", () => {
  const r = rng(11);
  let mech = 0;
  const n = 100_000;
  for (let i = 0; i < n; i++) {
    const res = openVault(r, { pity: 0, ownedMechs: [], ownedTpls: new Set() });
    if (res.kind === "mech") mech++;
  }
  assert.ok(Math.abs((mech / n) * 100 - VAULT_ODDS.mech) < 0.6, `${(mech / n) * 100}`);
});

test("ad crates cap at 3 per day and reset the next day", () => {
  assert.equal(adCratesLeft("2026-10-18", { day: "2026-10-18", n: 3 }), 0);
  assert.equal(adCratesLeft("2026-10-18", { day: "2026-10-18", n: 1 }), 2);
  assert.equal(adCratesLeft("2026-10-19", { day: "2026-10-18", n: 3 }), 3);
});

test("real-money Core purchases are switched off", () => {
  assert.equal(CORE_PURCHASES_ENABLED, false);
  assert.deepEqual(purchaseCores("cores_small"), { ok: false, reason: "disabled" });
});

/* ---------------------------------- pity ---------------------------------- */

test("pity: the 10th vault without a mech always gives one", () => {
  const never = () => 0.99; // never rolls a mech on its own
  let pity = 0;
  const owned: string[] = [];
  for (let i = 1; i <= VAULT_PITY; i++) {
    const res = openVault(never, { pity, ownedMechs: owned as never, ownedTpls: new Set() });
    if (i < VAULT_PITY) {
      assert.equal(res.kind, "gear", `opening ${i}`);
      assert.equal(res.pity, i);
    } else {
      assert.equal(res.kind, "mech", "pity opening");
      assert.equal(res.pity, 0);
    }
    pity = res.pity;
  }
});

test("pity resets after a natural mech hit and gives an unowned mech", () => {
  const res = openVault(() => 0.01, { pity: 5, ownedMechs: ["moth"], ownedTpls: new Set() });
  assert.equal(res.kind, "mech");
  if (res.kind === "mech") {
    assert.notEqual(res.mech, "moth");
    assert.ok(VAULT_MECHS.includes(res.mech));
  }
  assert.equal(res.pity, 0);
});

test("all vault mechs owned: a mech roll pays a legendary part + shards", () => {
  const res = openVault(() => 0.01, { pity: 9, ownedMechs: [...VAULT_MECHS], ownedTpls: new Set() });
  assert.equal(res.kind, "gear");
  if (res.kind === "gear") {
    assert.equal(res.drop.item.rarity, "legendary");
    assert.ok(res.bonusShards > 0);
  }
});

test("a mech is guaranteed within 30 vaults for all 3 mechs (worst case)", () => {
  const never = () => 0.99;
  let pity = 0;
  const owned: string[] = [];
  let opens = 0;
  while (owned.length < VAULT_MECHS.length && opens < 100) {
    const res = openVault(never, { pity, ownedMechs: owned as never, ownedTpls: new Set() });
    opens++;
    pity = res.pity;
    if (res.kind === "mech") owned.push(res.mech);
  }
  assert.equal(opens, VAULT_PITY * VAULT_MECHS.length);
});

/* --------------------------------- gear ----------------------------------- */

test("catalog: 5 slots x 4 rarities x 2 parts, unique ids, no trademark names", () => {
  assert.equal(GEAR_CATALOG.length, 40);
  assert.equal(new Set(GEAR_CATALOG.map((g) => g.id)).size, 40);
  for (const s of SLOTS) assert.equal(GEAR_CATALOG.filter((g) => g.slot === s).length, 8);
  for (const g of GEAR_CATALOG) assert.ok(!/gundam|titanfall|mechwarrior|zaku|eva/i.test(g.name), g.name);
});

test("gear stats apply to mission stats (multiplicative %, flat hull, additive crit)", () => {
  const base = { hp: 100, speed: 200, fire: 4, dmg: 10, range: 400, magnet: 88, skillHaste: 1, crit: 0.06 };
  const items = [
    { mods: { damage: 0.2, crit: 0.05 }, level: 1 },
    { mods: { hp: 30, speed: 0.1 }, level: 1 },
  ];
  const s = applyGear(base, items);
  assert.equal(s.dmg, 12);
  assert.equal(s.hp, 130);
  assert.ok(Math.abs(s.speed - 220) < 1e-9);
  assert.ok(Math.abs(s.crit - 0.11) < 1e-9);
  assert.equal(s.fire, 4);
  // no gear -> unchanged
  assert.deepEqual(applyGear(base, []), base);
});

test("upgrading raises stats by 8% of base per level", () => {
  const t = GEAR_BY_ID["w-ion-barrel"]!;
  const it = makeItem(t);
  const l5 = effectiveMods({ ...it, level: 5 });
  assert.ok(Math.abs(l5.damage! - 0.14 * 1.32) < 1e-3);
  const f = makeItem(GEAR_BY_ID["f-reactive-mail"]!);
  assert.equal(effectiveMods({ ...f, level: 11 }).hp, Math.round(26 * 1.8));
});

test("upgrade costs scale with level and rarity and stop at max level", () => {
  const c1 = upgradeCost({ rarity: "rare", level: 1 })!;
  const c5 = upgradeCost({ rarity: "rare", level: 5 })!;
  assert.ok(c5.credits > c1.credits && c5.shards > c1.shards);
  assert.ok(upgradeCost({ rarity: "legendary", level: 1 })!.credits > c1.credits);
  assert.equal(upgradeCost({ rarity: "common", level: MAX_LEVEL.common }), null);
});

/* ----------------------------- save migration ------------------------------ */

test("v1 save migrates: balances kept, slots remapped, levels + templates added", () => {
  const v1 = {
    version: 1,
    credits: 1234,
    keys: 7,
    unlocked: ["aether", "forge"],
    selected: "forge",
    inventory: [
      { id: "a", name: "Issue Rifle", slot: "weapon", rarity: "common", mods: { damage: 0.1 } },
      { id: "b", name: "Gundam Weave", slot: "armor", rarity: "epic", mods: { hp: 40 } },
      { id: "c", name: "Oracle Suite", slot: "system", rarity: "legendary", mods: { skillHaste: 0.3 } },
    ],
    equipped: { weapon: "a", armor: "b", system: "c" },
    highKills: 300,
    bestTime: 200,
    sorties: 12,
  };
  const s = migrateSave(v1, new Date(2026, 9, 18));
  assert.equal(s.version, SAVE_VERSION);
  assert.equal(s.credits, 1234);
  assert.equal(s.keys, 7);
  assert.equal(s.selected, "forge");
  assert.deepEqual(s.unlocked, ["aether", "forge"]);
  assert.equal(s.sorties, 12);
  assert.deepEqual(
    s.inventory.map((g) => [g.id, g.slot, g.level]),
    [
      ["a", "weapon", 1],
      ["b", "frame", 1],
      ["c", "core", 1],
    ],
  );
  // v1 random mods are preserved, not re-rolled
  assert.equal(s.inventory[0]!.mods.damage, 0.1);
  assert.equal(s.inventory[0]!.tpl, "w-issue-rifle");
  assert.equal(s.inventory[1]!.name, "Mirror Weave"); // trademark rename
  assert.equal(s.inventory[2]!.tpl, "c-oracle");
  assert.deepEqual(s.equipped, { weapon: "a", frame: "b", core: "c" });
  assert.equal(s.cores, 20);
  assert.equal(s.shards, 30);
  assert.equal(s.missions.daily.length, 3);
});

test("migration tolerates garbage and unknown fields", () => {
  assert.deepEqual(migrateSave(null).unlocked, ["aether"]);
  const s = migrateSave({ credits: "lots", unlocked: ["nope", "kite"], selected: "nope", inventory: [{ junk: 1 }], equipped: { weapon: "zzz" } });
  assert.equal(s.credits, defaultSave().credits);
  assert.deepEqual(s.unlocked, ["aether", "kite"]);
  assert.equal(s.selected, "aether");
  assert.equal(s.inventory.length, 0);
  assert.deepEqual(s.equipped, {});
});

test("migration is idempotent on a v2 save", () => {
  const once = migrateSave({ credits: 50, inventory: [{ id: "x", name: "Plate Vest", slot: "armor", rarity: "common", mods: { hp: 5 } }] });
  const twice = migrateSave(JSON.parse(JSON.stringify(once)));
  assert.deepEqual(twice.inventory, once.inventory);
  assert.equal(twice.credits, once.credits);
});

/* -------------------------------- missions -------------------------------- */

test("missions: same board for the same day, new board next day", () => {
  const a = newMissionState(new Date(2026, 9, 18, 9));
  const b = newMissionState(new Date(2026, 9, 18, 22));
  assert.deepEqual(a.daily.map((m) => m.id), b.daily.map((m) => m.id));
  assert.equal(a.daily.length, 3);
  assert.equal(a.weekly.length, 3);
  assert.equal(new Set(a.daily.map((m) => m.kind)).size, 3);
  const next = refreshMissions(a, new Date(2026, 9, 19, 9));
  assert.notEqual(next.dayKey, a.dayKey);
  // Oct 18 2026 is a Sunday; Oct 19 starts a new week
  assert.equal(weekKey(new Date(2026, 9, 18)), "2026-10-12");
  assert.equal(weekKey(new Date(2026, 9, 19)), "2026-10-19");
  assert.equal(dayKey(new Date(2026, 0, 5)), "2026-01-05");
});

test("mission progress accumulates, tower floor tracks the best, claims pay once", () => {
  let st = newMissionState(new Date(2026, 9, 18));
  // force a known board
  st = {
    ...st,
    daily: [
      { id: "k", kind: "kills", label: "", target: 100, progress: 0, claimed: false, reward: { cores: 5 } },
      { id: "t", kind: "tower_floor", label: "", target: 5, progress: 0, claimed: false, reward: { credits: 10 } },
    ],
  };
  st = applyMissionEvents(st, [{ kind: "kills", amount: 60 }, { kind: "tower_floor", amount: 3 }]);
  st = applyMissionEvents(st, [{ kind: "kills", amount: 60 }, { kind: "tower_floor", amount: 2 }]);
  assert.equal(st.daily[0]!.progress, 100); // capped at target
  assert.equal(st.daily[1]!.progress, 3); // best, not sum
  const c = claimMission(st, "k");
  assert.deepEqual(c.reward, { cores: 5 });
  assert.equal(claimMission(c.state, "k").reward, null); // no double claim
  assert.equal(claimMission(c.state, "t").reward, null); // incomplete
});

/* --------------------------------- modes ---------------------------------- */

test("tower: boss every 5th floor, three distinct rooms otherwise, difficulty climbs", () => {
  assert.ok(isBossFloor(5) && isBossFloor(10) && !isBossFloor(4));
  assert.deepEqual(roomChoices(5, rng()).map((r) => r.kind), ["boss"]);
  const rooms = roomChoices(3, rng(9));
  assert.equal(rooms.length, 3);
  assert.equal(new Set(rooms.map((r) => r.kind)).size, 3);
  assert.ok(floorScale(10) > floorScale(2));
  const f1 = towerFloorConfig(1, "fight", [], 1);
  const f9 = towerFloorConfig(9, "fight", [], 1);
  assert.ok(f9.enemyHp > f1.enemyHp && f9.intensity0 > f1.intensity0);
  const b5 = towerFloorConfig(5, "boss", [], 0.5);
  assert.deepEqual(b5.bosses, ["titan"]);
  assert.equal(b5.endWhenBossesDown, true);
  assert.equal(towerFloorConfig(3, "repair", [], 0.3).startHpFrac, 0.7);
  const buffed = towerFloorConfig(2, "fight", [{ id: "x", name: "", desc: "", mods: { damage: 0.12 } }], 1);
  assert.equal(buffed.playerMods.damage, 0.12);
});

test("tower milestone cores pay once per 5 floors", () => {
  assert.deepEqual(towerMilestoneCores(7, 0), { cores: 10, paidFloor: 5 });
  assert.deepEqual(towerMilestoneCores(7, 5), { cores: 0, paidFloor: 5 });
  assert.deepEqual(towerMilestoneCores(11, 5), { cores: 10, paidFloor: 10 });
});

test("elite fights and boss rush configs + capped rewards", () => {
  const e = eliteConfig("warden", ["overcharged", "glass"]);
  assert.deepEqual(e.bosses, ["warden"]);
  assert.ok(e.bossHp > eliteConfig("warden").bossHp);
  assert.equal(e.playerMods.damage, 0.25);
  assert.deepEqual(bossRushConfig().bosses, ["titan", "ace", "warden"]);
  assert.equal(eliteReward("titan", 0, []).cores, 20);
  assert.equal(eliteReward("titan", 3, ["glass"]).cores, 6);
  assert.equal(capBossCores(6, false, DAILY_BOSS_CORE_CAP - 2), 2);
  assert.equal(capBossCores(30, true, DAILY_BOSS_CORE_CAP), 30);
});

test("art and content sources carry no mobile-suit franchise names or signature parts", async () => {
  const { readFileSync } = await import("node:fs");
  const banned =
    /gundam|mobile[ -]suit|mobile[ -]armou?r|zaku|zeon|\bRX-\d|deathscythe|heavyarms|sandrock|shenlong|wing zero|zero buster|dragon fang|v-?fin|mono-?eye|newtype|funnels?\b/i;
  for (const f of ["../data.ts", "../mecha.ts", "./gear.ts", "./crates.ts", "../../components/menu/pilots-tab.tsx"]) {
    const src = readFileSync(new URL(f, import.meta.url), "utf8");
    const hit = src.match(banned);
    assert.equal(hit, null, `${f}: ${hit?.[0]}`);
  }
});
