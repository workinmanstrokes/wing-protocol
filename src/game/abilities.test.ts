import assert from "node:assert/strict";
import test from "node:test";
import { MECHS } from "./data.ts";
import {
  ABILITY,
  aegisBlocks,
  distToSegment,
  fireIntervalMul,
  inWake,
  incomingDamageMul,
  moveMul,
  weaponDamageMul,
} from "./abilities.ts";

test("every suit has a unique skill, passive, and a fair cooldown", () => {
  assert.equal(MECHS.length, 11);
  const skills = new Set(MECHS.map((m) => m.skill.name));
  const passives = new Set(MECHS.map((m) => m.passive.name));
  const roles = new Set(MECHS.map((m) => m.role));
  assert.equal(skills.size, MECHS.length);
  assert.equal(passives.size, MECHS.length);
  assert.equal(roles.size, MECHS.length);
  for (const m of MECHS) {
    assert.ok(m.skill.cooldown >= 6 && m.skill.cooldown <= 14, m.id);
    assert.ok(m.skill.desc.length > 24, m.id);
    assert.ok(m.passive.desc.length > 16, m.id);
    assert.notEqual(m.skill.name, m.passive.name);
  }
});

test("passives apply the documented tradeoffs", () => {
  assert.equal(weaponDamageMul("aether"), ABILITY.aether.weaponMul);
  assert.equal(weaponDamageMul("forge"), 1);
  assert.equal(incomingDamageMul("aether", { bulwark: false, brace: false, ward: false }), 1);
  assert.ok(incomingDamageMul("forge", { bulwark: false, brace: false, ward: false }) < 1);
  const braced = incomingDamageMul("forge", { bulwark: false, brace: true, ward: false });
  assert.ok(braced < ABILITY.forge.takenMul);
  assert.equal(incomingDamageMul("dune", { bulwark: true, brace: false, ward: false }), 0.5);
  assert.equal(incomingDamageMul("dune", { bulwark: false, brace: false, ward: false }), 1);
  assert.equal(incomingDamageMul("cross", { bulwark: false, brace: false, ward: true }), ABILITY.cross.wardMul);
  // brace on a non-forge suit does nothing
  assert.equal(incomingDamageMul("kite", { bulwark: false, brace: true, ward: true }), 1);
});

test("movement and fire modifiers stay on the suits that own them", () => {
  assert.ok(moveMul("scythe", { tempo: true, rooted: false, sealed: false }) > 1);
  assert.ok(moveMul("forge", { tempo: false, rooted: true, sealed: false }) < 0.3);
  assert.ok(moveMul("kiln", { tempo: false, rooted: false, sealed: true }) < 1);
  assert.equal(moveMul("aether", { tempo: true, rooted: true, sealed: true }), 1);
  assert.ok(fireIntervalMul("kite", 200, 262) < 1);
  assert.equal(fireIntervalMul("kite", 40, 262), 1);
  assert.equal(fireIntervalMul("aether", 300, 248), 1);
});

test("aegis catches shots from the front and ignores the rear", () => {
  const face = 0; // aiming +x, front is to the right, incoming shots travel -x
  assert.equal(aegisBlocks(face, -10, 0), true);
  assert.equal(aegisBlocks(face, -8, 2), true);
  assert.equal(aegisBlocks(face, 10, 0), false);
  assert.equal(aegisBlocks(face, 0, 10), false);
});

test("fragile suits outlast a careful sector 1 without catching the vanguard", () => {
  const hp = Object.fromEntries(MECHS.map((m) => [m.id, m.stats.hp]));
  assert.ok(hp.aether >= 118 && hp.aether < hp.dune);
  assert.ok(hp.storm >= 120 && hp.storm < hp.dune);
  assert.ok(hp.kite >= 130 && hp.kite > hp.aether && hp.kite < hp.dune);
  assert.equal(ABILITY.aether.takenMul, 1);
  assert.ok(ABILITY.aether.glideFrac >= 0.02);
  assert.equal(incomingDamageMul("kite", { bulwark: false, brace: false, ward: false }), 1);
  assert.ok(incomingDamageMul("kite", { bulwark: false, brace: false, ward: false, slip: true }) <= 0.7);
  assert.ok(ABILITY.kite.slip <= 0.5, "slipstream engages while kiting, not only at top speed");
  assert.ok(ABILITY.kite.buffer >= 10);
  assert.ok(ABILITY.kite.iFrame >= 0.3);
  assert.equal(incomingDamageMul("storm", { bulwark: false, brace: false, ward: false }), 1);
  assert.ok(incomingDamageMul("storm", { bulwark: false, brace: false, ward: false, net: true }) <= 0.7);
  assert.ok(hp.storm <= 136 && hp.storm + ABILITY.storm.coil < hp.dune, "storm stays lighter than the vanguard");
  assert.ok(ABILITY.storm.coil >= 16 && ABILITY.storm.net >= 4 && ABILITY.storm.netR >= 130);
});

test("dust wake and ribbon segment math", () => {
  assert.equal(inWake(0, 0, 0, -40, 0, 78), true);
  assert.equal(inWake(0, 0, 0, 40, 0, 78), false);
  assert.equal(inWake(0, 0, 0, -200, 0, 78), false);
  assert.ok(distToSegment(0, 5, -20, 0, 20, 0) < 6);
  assert.ok(distToSegment(0, 40, -20, 0, 20, 0) > 30);
});
