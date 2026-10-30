// Generated alongside scripts/audio/*.py — variant counts per SFX and exact loop lengths (s).
export const SFX = {
  "fire_beam": 3,
  "fire_gatling": 3,
  "fire_melee": 2,
  "fire_shotgun": 2,
  "fire_fang": 2,
  "fire_arc": 3,
  "fire_mortar": 2,
  "fire_lance": 2,
  "fire_mote": 2,
  "fire_ember": 2,
  "fire_tether": 2,
  "fire_default": 2,
  "hit": 3,
  "death": 3,
  "explode_big": 1,
  "explode": 2,
  "hurt": 1,
  "slam": 1,
  "pickup_xp": 3,
  "pickup_hp": 1,
  "pickup_loot": 1,
  "level": 1,
  "skill": 1,
  "overdrive": 1,
  "boss_alert": 1,
  "alert": 1,
  "ui_click": 2,
  "ui_confirm": 1,
  "ui_back": 1
} as const;

export const MUSIC = {
  "menu": 32.0,
  "combat_base": 26.301360544217687,
  "combat_top": 26.301360544217687
} as const;

export type SfxId = keyof typeof SFX;
export type MusicId = keyof typeof MUSIC;
