# Getting Wing Protocol on your Android phone

There are two ways. Both give you a full-screen app icon on your home screen.

## Option A: install the web app (PWA) from GitHub Pages

The game builds as a static, offline-capable web app (manifest, maskable icon,
service worker), so GitHub Pages can host it at
`https://workinmanstrokes.github.io/wing-protocol/`.

One-time setup (on github.com):

1. Repo **Settings → Pages → Build and deployment → Source**: pick **GitHub Actions**.

Each time you want to publish the current `master`:

1. **Actions → Deploy PWA to GitHub Pages → Run workflow**. Nothing deploys
   on its own; it only runs when you start it.
2. When it finishes, open the Pages address above in Chrome on your phone.
3. Tap **Install app** (or ⋮ menu → **Add to Home screen**).

After that the game works offline, and when you publish a new build it shows
an "update available" prompt the next time you open it.

To build the same thing locally:

```bash
npm ci
PWA_BASE=/wing-protocol/ npm run build:pwa   # output in dist/client
```

The Vercel deployment (repo homepage) also installs the same way.

## Option B: a real APK

Every pull request that touches app code runs `.github/workflows/android.yml`,
which builds a debug APK and attaches it to a rolling `<branch>-latest`
pre-release on the repo's **Releases** page. Download the `.apk` on your phone
and open it to install (Android will ask you to allow installs from your
browser once).

For Google Play, run `.github/workflows/release-aab.yml` by hand to get a
signed `.aab` (needs the keystore secrets).

## Local Android Studio build

```bash
npm ci
npm run build:android      # static SPA build + cap sync android
npx cap open android       # then Run / Build APK in Android Studio
```
