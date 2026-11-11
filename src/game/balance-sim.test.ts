import assert from "node:assert/strict";
import test from "node:test";
import { aliveSpread, reportRoster, simulateCarefulRun } from "./balance-sim.ts";
import { MECHS } from "./data.ts";

test("sector 1 spawn pressure is capped and less swingy than the old budget", () => {
  const before = aliveSpread("legacy", 16);
  const after = aliveSpread("current", 16);
  assert.ok(after.meanPeak <= 16, `peak ${after.meanPeak}`);
  assert.ok(after.stdAt40 < before.stdAt40, `std ${after.stdAt40} vs ${before.stdAt40}`);
  assert.ok(before.meanPeak > after.meanPeak + 4, `legacy peak ${before.meanPeak} vs ${after.meanPeak}`);
});

test("a careful pilot clears sector 1 with every suit", () => {
  const report = reportRoster("current", 12);
  const legacy = reportRoster("legacy", 12);
  for (const row of report) {
    assert.ok(row.clearRate >= 0.75, `${row.id} clear ${row.clearRate} endHp ${row.meanEndHp.toFixed(1)}`);
  }
  const mean = (rows: typeof report) => rows.reduce((s, r) => s + r.clearRate, 0) / rows.length;
  assert.ok(mean(report) > mean(legacy) + 0.25, `current ${mean(report)} legacy ${mean(legacy)}`);
  const kite = report.find((r) => r.id === "kite")!;
  const legacyKite = legacy.find((r) => r.id === "kite")!;
  const dune = report.find((r) => r.id === "dune")!;
  const aether = report.find((r) => r.id === "aether")!;
  assert.ok(legacyKite.clearRate < 0.5, "old budget still drops the kite");
  assert.ok(kite.clearRate >= 0.75);
  assert.ok(kite.meanEndHp >= aether.meanEndHp, "moving kite finishes at least as healthy as the glass interceptor");
  assert.ok(dune.meanEndHp > aether.meanEndHp, "vanguard still finishes healthier than the interceptor");
  assert.equal(MECHS.length, report.length);
});

test("a two-thumb storm pilot needs the coil and the cast ward", () => {
  const previous = [];
  const tuned = [];
  for (let s = 1; s <= 12; s++) {
    previous.push(simulateCarefulRun("storm", s * 997, "current", "previous"));
    tuned.push(simulateCarefulRun("storm", s * 997, "current", "current"));
  }
  const rate = (rows: { cleared: boolean; deathTime: number | null; endHp: number }[]) =>
    rows.filter((r) => r.cleared).length / rows.length;
  const meanDeath = (rows: { cleared: boolean; deathTime: number | null }[]) => {
    const deaths = rows.filter((r) => r.deathTime !== null);
    return deaths.length ? deaths.reduce((s, r) => s + (r.deathTime ?? 0), 0) / deaths.length : null;
  };
  const dune = reportRoster("current", 12).find((r) => r.id === "dune")!;
  assert.ok(rate(previous) <= 0.45, `old storm kit clear ${rate(previous)} death ${meanDeath(previous)}`);
  assert.ok(rate(tuned) >= 0.75, `tuned storm clear ${rate(tuned)} death ${meanDeath(tuned)}`);
  assert.ok(rate(tuned) + 0.01 >= dune.clearRate - 0.2, `storm ${rate(tuned)} dune ${dune.clearRate}`);
});

test("tether kite's slipstream is what keeps it alive", () => {
  const moving = simulateCarefulRun("kite", 997, "current");
  assert.equal(moving.cleared, true);
  assert.ok(moving.endHp > 40, `end ${moving.endHp}`);
});
