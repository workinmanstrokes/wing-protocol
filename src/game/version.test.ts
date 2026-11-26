import test from "node:test";
import assert from "node:assert/strict";
import { GAME_VERSION, buildLabel } from "./version.ts";

test("GAME_VERSION is a SemVer-style version and matches package.json", async () => {
  assert.match(GAME_VERSION, /^\d+\.\d+\.\d+$/);
  const pkg = JSON.parse(
    await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    ),
  ) as { version?: string };
  assert.equal(pkg.version, GAME_VERSION);
});

test("buildLabel identifies a build as version + short commit", () => {
  assert.equal(buildLabel(), `v${GAME_VERSION}`);
  assert.equal(buildLabel("81601f108da850253c991491c7ebc44b31607169"), `v${GAME_VERSION}+81601f1`);
  assert.equal(buildLabel("  abc1234  "), `v${GAME_VERSION}+abc1234`);
});
