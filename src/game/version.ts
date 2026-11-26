/**
 * Build identity (VEX retest item 13): every test build carries a version,
 * not just a commit hash. Single source of truth for the version number —
 * `package.json` carries the same number and the two are bumped together
 * in one commit. A build is identified as `v<version>+<short commit>`.
 */
export const GAME_VERSION = "0.1.0";

/** `v0.1.0`, or `v0.1.0+<short sha>` when the deployed commit is known. */
export function buildLabel(commitSha?: string): string {
  const short = (commitSha ?? "").trim().slice(0, 7);
  return short ? `v${GAME_VERSION}+${short}` : `v${GAME_VERSION}`;
}
