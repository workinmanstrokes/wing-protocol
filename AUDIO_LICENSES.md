# Audio credits & licenses

All audio in `public/audio/` is free to use commercially. Nothing here needs a paid licence.

## Music — original (Wing Protocol)
`music/menu`, `music/combat_base`, `music/combat_top` are original compositions,
synthesized offline from code in `scripts/audio/music.py` (no samples, no third-party
material). They are owned by the Wing Protocol project.

| File | Style | Loop |
|---|---|---|
| `menu` | 92 BPM, A minor, ambient synthwave: pads, pluck arp, bell melody | 16 bars, 41.7 s, seamless |
| `combat_base` | 132 BPM, D minor: drums, driving bass, supersaw pads | 16 bars, 29.1 s, seamless |
| `combat_top` | same grid: lead, 16th arp, shaker. Fades in with fight intensity | 16 bars, 29.1 s, seamless |

## Sound effects: Kenney (CC0 1.0)
Made from samples by **Kenney (www.kenney.nl)**, licensed **Creative Commons Zero (CC0 1.0)**:
http://creativecommons.org/publicdomain/zero/1.0/. Credit isn't required, but we give it.

- **Sci-Fi Sounds (1.0)**: https://opengameart.org/content/sci-fi-sounds · https://kenney.nl/assets/sci-fi-sounds
- **Interface Sounds**: https://opengameart.org/content/interface-sounds · https://kenney.nl/assets/interface-sounds

The samples were trimmed, re-pitched, layered, normalised and re-encoded by `scripts/audio/sfx.py`.
Some layers are original procedural synthesis, also from `sfx.py`. Those are: thumps, swooshes,
the arc crackle, the klaxon and risers.

| SFX | Built from |
|---|---|
| `fire_beam` | laserSmall_001/002 + noise transient |
| `fire_gatling` | laserRetro_004 + synth thump + noise click |
| `fire_melee` | synth swoosh + forceField_000/002 |
| `fire_shotgun` | explosionCrunch_000/002 + synth thump |
| `fire_fang` | laserLarge_001/003 |
| `fire_arc` | original synth (crackle + buzz) |
| `fire_mortar` | synth thump + impactMetal_002 + filtered noise |
| `fire_lance` | laserLarge_000/004 (pitched down) |
| `fire_mote` | forceField_001/003 + Interface glass_002/006 |
| `fire_ember` | thrusterFire_001/003 + synth thump |
| `fire_tether` | forceField_002/004 |
| `fire_default` | laserSmall_000/004 |
| `hit` | impactMetal_000/003/004 + noise tick |
| `death` | explosionCrunch_000/001/002 + synth thump |
| `explode` | explosionCrunch_001/003 + lowFrequency_explosion_001 |
| `explode_big` | lowFrequency_explosion_001 + explosionCrunch_004 + reverb |
| `hurt` | impactMetal_001 + Interface error_008 + noise |
| `slam` | lowFrequency_explosion_000 + impactMetal_001 |
| `pickup_xp` | Interface glass_002/003/006 |
| `pickup_hp` | Interface confirmation_003 |
| `pickup_loot` | Interface maximize_007 + glass_001 |
| `level` | Interface confirmation_002 + synth riser |
| `skill` | forceField_000 + laserLarge_003 |
| `overdrive` | synth riser + forceField_004 |
| `boss_alert` | original synth klaxon + thump |
| `alert` | synth tone + Interface question_003 |
| `ui_click` / `ui_confirm` / `ui_back` | Interface select_001/002, confirmation_001, back_002 |
| `thruster_loop` | spaceEngineSmall_000 (crossfaded into a seamless loop) |

## Rebuilding
```
# Download the two Kenney zips above and unzip them into $AUDIO_SRC, then:
cd scripts/audio && AUDIO_SRC=/path/to/kenney python3 sfx.py && python3 music.py
```
This needs Python 3 + numpy + scipy and ffmpeg (libvorbis, libmp3lame). Every sound is
written as `.ogg` (Vorbis) and `.mp3`. The game loads ogg and falls back to mp3 where ogg
isn't supported (older iOS Safari).
