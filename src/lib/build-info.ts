// Build stamp shown on screen (title, pause, results) so a tester can tell which
// build they are playing. Values are baked in by vite.config.ts `define`:
// GITHUB_SHA in CI, "dev" for local builds, plus the build date (UTC).
declare const __WP_BUILD_SHA__: string;
declare const __WP_BUILD_TIME__: string;

export const BUILD_INFO = {
  sha: __WP_BUILD_SHA__,
  builtAt: __WP_BUILD_TIME__,
  label: `build ${__WP_BUILD_SHA__} \u00b7 ${__WP_BUILD_TIME__}`,
} as const;
