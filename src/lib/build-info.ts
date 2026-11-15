/**
 * On-screen build/commit stamp (Game Test Lab / VEX 232). The commit short
 * SHA is baked in at build time by vite.config.ts (`__WP_BUILD_COMMIT__`);
 * outside a git checkout it reads "dev". Shown on the main menu and the
 * pause screen so a tester can always say which build they are playing.
 */
declare const __WP_BUILD_COMMIT__: string | undefined;

export const BUILD_COMMIT =
  typeof __WP_BUILD_COMMIT__ === "string" && __WP_BUILD_COMMIT__ ? __WP_BUILD_COMMIT__ : "dev";

export const BUILD_DATE = "2026-11-15";

export const BUILD_STAMP = `Wing Protocol \u00b7 build ${BUILD_COMMIT} \u00b7 ${BUILD_DATE} tester update`;
