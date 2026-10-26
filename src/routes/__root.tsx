import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "Wing Protocol";
// Relative to the deploy base so the manifest/icons also resolve on sub-path hosts (GitHub Pages test builds).
const BASE = import.meta.env.BASE_URL;
// Poki / CrazyGames build (`npm run portal:build` sets VITE_PORTAL=1): no PWA manifest / service worker helper,
// no third-party requests (self-hosted fonts from portal/fonts), no og:image.
const PORTAL = import.meta.env.VITE_PORTAL === "1";
const GOOGLE_FONTS = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Rajdhani:wght@500;600;700&display=swap";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" },
      { title: APP_NAME },
      { name: "theme-color", content: "#09090b" },
      {
        name: "description",
        content: "Survive timed mech sorties against endless machine hordes. Unlock frames, open crates, and extract legendary gear.",
      },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: APP_NAME },
      { property: "og:type", content: "x:game" },
      {
        property: "og:description",
        content: "Survive timed mech sorties against endless machine hordes. Unlock frames, open crates, and extract legendary gear.",
      },
      ...(PORTAL ? [] : [{ property: "og:image", content: "https://wp2-pi.vercel.app/og.jpg" }]),
    ],
    scripts: [{ src: "/telemetry.js", defer: true }],
    links: [
      { rel: "icon", type: "image/svg+xml", href: `${BASE}favicon.svg` },
      { rel: "stylesheet", href: appCss },
      ...(PORTAL
        ? [{ rel: "stylesheet", href: `${BASE}fonts/fonts.css` }]
        : [
            { rel: "manifest", href: `${BASE}manifest.webmanifest` },
            { rel: "apple-touch-icon", sizes: "180x180", href: `${BASE}icon-180.png` },
            { rel: "preconnect", href: "https://fonts.googleapis.com" },
            { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
            { rel: "stylesheet", href: GOOGLE_FONTS },
          ]),
    ],
    // iOS/PWA helper (offline service worker, WebAudio unlock on first tap, no zoom/rubber-band). Production only.
    scripts: import.meta.env.PROD && !PORTAL ? [{ src: `${BASE}ios.js` }] : [],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
