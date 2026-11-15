import { test } from "node:test";
import assert from "node:assert/strict";
import { firstSortieConfig } from "./modes.ts";
import { CORE_LOOP, CORE_LOOP_NAME, CORE_LOOP_SECONDS } from "../core-loop.ts";

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
