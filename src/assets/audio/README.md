# Bundled audio — src/assets/audio/

Audio files for Wing Protocol belong here, not in `public/audio/`.

`src/game/audio.ts` loads sound in this order:

1. **Bundled (this folder):** Vite emits these files as hashed assets next to
   the JS bundle (`import.meta.glob(..., { query: "?url" })`), so they load
   wherever the bundle loads — including the live test site's snapshot route,
   which does not serve `public/audio/`.
2. `public/audio/` (Vite base, plus a page-relative candidate for snapshot
   sub-paths).
3. The same files hosted on `raw.githubusercontent.com` for this repo
   (last resort only).

## Moving the files here

This is a binary move — do it with git, not through the text-only GitHub
connector:

```bash
git mv public/audio/sfx src/assets/audio/sfx
git mv public/audio/music src/assets/audio/music
```

Keep the same layout (`sfx/<id>_<variant>.ogg|.mp3`,
`music/<menu|combat_base|combat_top>.ogg|.mp3`, plus
`sfx/thruster_loop`). The loader keys files by that layout, so no code
changes are needed after the move; until the move happens this folder stays
empty, the glob matches nothing, and sound keeps coming from
`public/audio/` / the hosted fallback.
