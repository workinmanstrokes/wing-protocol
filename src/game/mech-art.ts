/**
 * Player mech art for the 8 original mechs: the Lead Sprite Designer's
 * reference-themed shaded-metal set (`src/game/art/mechs/*.svg`).
 * The SVGs are authored top-down, nose right (+x), in a 96x96 box centred on the
 * mech (1 unit = 1 CSS px). They are inlined as data URLs so they work offline,
 * in the PWA and in the Capacitor build. Each draw rasterises the vector at the
 * destination size, so the art stays sharp on retina canvases and in big
 * Hangar/Pilots portraits.
 */
import type { MechId } from "./types";
import aetherSvg from "./art/mechs/aether_wing.svg?raw";
import forgeSvg from "./art/mechs/heavy_forge.svg?raw";
import scytheSvg from "./art/mechs/night_scythe.svg?raw";
import duneSvg from "./art/mechs/dune_shield.svg?raw";
import serpentSvg from "./art/mechs/jade_serpent.svg?raw";
import stormSvg from "./art/mechs/storm_warden.svg?raw";
import vultureSvg from "./art/mechs/iron_vulture.svg?raw";
import crossSvg from "./art/mechs/solar_cross.svg?raw";

const SVG: Partial<Record<MechId, string>> = {
  aether: aetherSvg,
  forge: forgeSvg,
  scythe: scytheSvg,
  dune: duneSvg,
  serpent: serpentSvg,
  storm: stormSvg,
  vulture: vultureSvg,
  cross: crossSvg,
};

/** Authored box size in art units. */
export const MECH_ART_BOX = 96;
/**
 * World scale for the art. At 0.75 every mech's solid parts (wings, capes,
 * glaives, lances, rifles) stay inside about ±35 px, close to the old roughly
 * 64–72 px footprint. Each mech's solid body
 * is about the same size as the unchanged 16 px player hit radius.
 */
export const MECH_ART_SCALE = 0.75;

const images = new Map<MechId, HTMLImageElement>();
const listeners = new Set<() => void>();
let version = 0;

export function hasMechArt(id: MechId): boolean {
  return id in SVG;
}

function load(id: MechId): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  const src = SVG[id];
  if (!src) return null;
  let img = images.get(id);
  if (!img) {
    img = new Image();
    img.decoding = "async";
    img.onload = () => {
      version++;
      for (const l of listeners) l();
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(src)}`;
    images.set(id, img);
  }
  return img;
}

/** The decoded image, or null while it is still loading (or on the server). */
export function mechArtImage(id: MechId): HTMLImageElement | null {
  const img = load(id);
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

/** Bumps every time another mech image finishes loading. Use it in sprite cache keys. */
export function mechArtVersion(): number {
  return version;
}

export function onMechArtLoad(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Start decoding all mech art. Resolves when every image is ready (or failed). */
export function preloadMechArt(): Promise<void> {
  if (typeof Image === "undefined") return Promise.resolve();
  const all = (Object.keys(SVG) as MechId[]).map((id) => {
    const img = load(id)!;
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return img.decode().catch(() => undefined);
  });
  return Promise.all(all).then(() => undefined);
}

/** Draw the mech art centred on the origin, facing +x, at world scale. Returns false if not ready. */
export function drawMechArt(ctx: CanvasRenderingContext2D, id: MechId): boolean {
  const img = mechArtImage(id);
  if (!img) return false;
  const s = MECH_ART_BOX * MECH_ART_SCALE;
  ctx.drawImage(img, -s / 2, -s / 2, s, s);
  return true;
}

if (typeof window !== "undefined") void preloadMechArt();
