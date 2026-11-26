# Wing Protocol — Versioning and release path

VEX retest item 13: "No update, versioning, or release path is described
beyond the single commit hash." This doc is the fix: every test build now
carries a version number, and the path from a commit to a build a tester can
install is written down in one place.

## Versioning

- **Scheme:** SemVer-style `MAJOR.MINOR.PATCH`, starting at **0.1.0**
  (first versioned build, 2026-11-26). While the game is pre-launch the
  major stays `0`: bump MINOR for a new playable slice or mode, PATCH for
  fixes and tester-suggested updates.
- **Single source of truth:** `src/game/version.ts` (`GAME_VERSION`).
  `package.json` carries the same number; the two must match — the test in
  `src/game/version.test.ts` pins the format, and any bump changes both
  files in the same commit.
- **Build identity:** a build is identified as `v<version>+<short commit>`,
  e.g. `v0.1.0+81601f1`. The short commit is the live HEAD of `master`
  (see `docs/playtests/blind-playtest-log.md` — every playtest session
  records the deployed commit). A version alone is never the build
  identity; a commit hash alone is never the release identity.

## Release paths (master is the only release branch)

| Channel | How it is produced | Who runs it | Tester gets |
|---|---|---|---|
| PWA (GitHub Pages) | Manual: Actions → **Deploy PWA to GitHub Pages** → Run workflow (`.github/workflows/pages.yml`); source must be GitHub Actions in repo Settings → Pages | Maker | `https://workinmanstrokes.github.io/wing-protocol/` — installable, offline-capable, updates in place (see below) |
| Debug APK | Automatic on every PR touching app code (`.github/workflows/android.yml`); attached to a rolling `<branch>-latest` pre-release on the repo Releases page | CI | `.apk` sideloaded on the phone |
| Signed AAB (Google Play) | Manual: `.github/workflows/release-aab.yml` (needs the keystore secrets) | Maker | Play-track build |

Nothing deploys on its own except the CI debug APK. If the Pages URL 404s,
no PWA build was ever deployed — stop and deploy before handing a build to
a tester (deploy gate in `docs/playtests/blind-playtest-log.md`).

## Updates — no delete-and-re-add

The PWA service worker (`scripts/gen-sw.mjs`) stamps a content-hash cache
version, uses `skipWaiting` + `clients.claim()` and network-first fetch, so
a newly deployed build takes over on the next load and the app shows an
"A new Wing Protocol build is ready — Reload to update" banner. Home-screen
installs do **not** need to be deleted and re-added. The worker is
re-checked every 60 seconds while the page is open and on every
foregrounding. The update only arrives if a new build was actually deployed
(see the PWA row above).

## What is still manual (maker's call)

- **Version bumps** are made by hand in `src/game/version.ts` +
  `package.json` in the same commit as the change they describe.
- **Name, monetization, and minimum device** remain pending maker
  decisions (see `docs/build-sheet.md`); this doc records the release
  mechanics only and does not decide them.
- **Surfacing the build label in the app** (Settings / title screen) is
  not wired yet — testers identify a build by the version + commit in
  this doc and in the playtest log, not from inside the game.
