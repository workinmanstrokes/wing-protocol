# Wing Protocol

Mech action game: survive timed sorties against endless machine hordes, unlock new mech frames, open
crates and extract legendary gear. Modes include Sortie, Tower, Elite and Rush, with frames such as
Aether Wing, Heavy Forge and Night Scythe.

- Android app ID: `com.diddlerrr.wingprotocol`

## Stack

- TanStack Start (React 19, TanStack Router/Query), Vite 8, Tailwind CSS 4, TypeScript
- Game code in `src/game/` (combat, levels, rendering, audio, mech art) with meta systems in
  `src/game/meta/` (gear, crates, missions, modes, tower, saves)
- Audio assets in `public/audio/` (licenses in `AUDIO_LICENSES.md`)
- Android wrapper with Capacitor 8 around the static SPA build (`dist/client`)
- Web portal builds (CrazyGames, Poki) via `scripts/build-portal.mjs`
- Node 24.x

## Commands

```bash
npm install
npm run dev              # dev server on 0.0.0.0:8080
npm run typecheck
npm test                 # node --test (scripts + game/meta tests)
npm run test:smoke       # meta smoke test
npm run lint
npm run build            # production build (+ db:migrate)
npm run build:android    # static SPA build + cap sync android
npm run build:pwa        # static PWA build with service worker
npm run portal:build     # portal zips in /workspace/out
```

## CI

- `.github/workflows/android.yml`: Android build on PRs touching app code and on manual runs
- `.github/workflows/release-aab.yml`: manual signed release `.aab` for Google Play

## Docs

- `ANDROID-APP.md`: installing as a PWA or building an APK
- `AGENTS.md`: workspace rules for coding agents
- `docs/qa/`, `docs/visual-qa/`: QA notes and screenshots
