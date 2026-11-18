import { test } from "node:test";
import assert from "node:assert/strict";
import { firstSortieConfig } from "./modes.ts";
import { CORE_LOOP, CORE_LOOP_NAME, CORE_LOOP_SECONDS } from "../core-loop.ts";
import { getSave, loadSave, settleSortie } from "../save.ts";
import { defaultSave, migrateSave } from "./save-migrate.ts";
import type { RunResult } from "../types.ts";

test("First Sortie is a named 60-second loop with one win and one lose state", () => {
  const cfg = firstSortieConfig();
  assert.equal(cfg.duration, 60);
  assert.equal(cfg.label, "First Sortie \u00b7 60 seconds");
  // Win by surviving to the timer: not a boss-kill mode, so reaching the
  // duration wins (combat.ts: time >= duration -> finish(!endWhenBossesDown)).
  assert.equal(cfg.endWhenBossesDown, false);
  // No scripted bosses/uplinks: the horde is the one threat.
  assert.deepEqual(cfg.bosses, []);
  assert.equal(cfg.scripted, false);
});

test("the core loop is written down verbatim and names the 60 seconds", () => {
  assert.equal(CORE_LOOP_NAME, "First Sortie");
  assert.equal(CORE_LOOP_SECONDS, 60);
  assert.match(CORE_LOOP, /60 seconds/);
  assert.match(CORE_LOOP, /Win by surviving/);
  assert.match(CORE_LOOP, /lose by losing your hull/);
  assert.match(CORE_LOOP, /Retry restarts in under 10 seconds/);
});

const sortieRun = (kills: number): RunResult => ({
  survived: true,
  time: 60,
  kills,
  xp: 0,
  level: 1,
  credits: 0,
  keys: 0,
  loot: [],
  bosses: 0,
});

test("First Sortie keeps a persistent best kills score (the replay hook)", () => {
  loadSave(null);
  assert.equal(settleSortie(sortieRun(12), true).newFirstSortieBest, true);
  assert.equal(getSave().firstSortieBestKills, 12);
  // A worse First Sortie does not move the best.
  assert.equal(settleSortie(sortieRun(5), true).newFirstSortieBest, false);
  assert.equal(getSave().firstSortieBestKills, 12);
  // A 5-minute sortie must not move the First Sortie best, however many kills.
  assert.equal(settleSortie(sortieRun(99)).newFirstSortieBest, false);
  assert.equal(getSave().firstSortieBestKills, 12);
  // Beating it updates the stored best.
  assert.equal(settleSortie(sortieRun(13), true).newFirstSortieBest, true);
  assert.equal(getSave().firstSortieBestKills, 13);
});

test("the First Sortie best survives save migration", () => {
  assert.equal(defaultSave().firstSortieBestKills, 0);
  assert.equal(migrateSave({ firstSortieBestKills: 7 }).firstSortieBestKills, 7);
  assert.equal(migrateSave(migrateSave({ firstSortieBestKills: 7 })).firstSortieBestKills, 7);
});
