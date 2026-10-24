// Settings for scripts/build-portal.mjs (Poki / CrazyGames web builds). Run `npm run portal:build`.
// Source is the static SPA from `BUILD_TARGET=capacitor vite build --base ./` (relative asset URLs).
// VITE_PORTAL=1 (set by portal:build) drops the PWA bits / og:image and swaps Google Fonts for portal/fonts,
// so the portal build makes no third-party requests except the portal SDK.
export const CFG = {
  app: "wing-protocol",
  src: "dist/client",
  exclude: ["sw.js", "manifest.webmanifest", "ios.js", "og.jpg", "x-banner.jpg", "icon-180.png", "icon-192.png", "icon-512.png"],
  portalTag: "</head>",
  stripHtml: [],
  // TanStack Start writes "/./assets/…" for base "./": make it document-relative so it runs from any CDN path
  replaceHtml: [[/"\/\.\//g, '"./']],
  copy: [["portal/fonts", "fonts"]],
};
