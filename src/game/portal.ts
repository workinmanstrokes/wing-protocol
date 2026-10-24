/**
 * Web portal adapter (Poki SDK v2 / CrazyGames SDK v3).
 *
 * Active only in a portal build (`window.PORTAL_BUILD`, injected by
 * scripts/build-portal.mjs), with `?portal=poki|crazygames` for testing, or on
 * the portal's own domain. Everywhere else (Android app, test site, Vercel)
 * every call is a cheap no-op.
 *
 * Events: loadingFinished once the menu can take input; gameplayStart/Stop
 * around real combat (deduplicated); commercialBreak only at natural breaks
 * (before a new run from the results screen), never mid-play; rewarded is
 * opt-in only (a button the player taps).
 */
type Id = "poki" | "crazygames";
const SDK_URL: Record<Id, string> = {
  poki: "https://game-cdn.poki.com/scripts/v2/poki-sdk.js",
  crazygames: "https://sdk.crazygames.com/crazygames-sdk-v3.js",
};
type W = Window & { PORTAL_BUILD?: string; PokiSDK?: any; CrazyGames?: { SDK?: any }; __portalLog?: string[] };

function detect(): Id | null {
  if (typeof window === "undefined") return null;
  const w = window as W;
  try {
    const q = new URLSearchParams(location.search).get("portal");
    if (q === "poki" || q === "crazygames") return q;
  } catch {
    /* ignore */
  }
  if (w.PORTAL_BUILD === "poki" || w.PORTAL_BUILD === "crazygames") return w.PORTAL_BUILD;
  const h = location.hostname;
  if (/(^|\.)poki(-gdn)?\.(com|io|dev)$/.test(h) || /poki-gdn\.com$/.test(h)) return "poki";
  if (/(^|\.)crazygames\.(com|io)$/.test(h)) return "crazygames";
  return null;
}

export const portalId = detect();
export const isPortal = portalId !== null;
const log: string[] = typeof window !== "undefined" ? ((window as W).__portalLog = []) : [];
let sdk: any = null;
let ready: Promise<void> | null = null;
let playing = false;
let loaded = false;
let busy = false;

const timeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<void>((r) => setTimeout(r, ms))]);
const loadScript = (src: string) =>
  new Promise<void>((res, rej) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error("sdk load failed"));
    document.head.appendChild(s);
  });

export function initPortal(): Promise<void> {
  if (!portalId) return Promise.resolve();
  if (ready) return ready;
  const w = window as W;
  ready = (async () => {
    try {
      if (portalId === "poki") {
        if (!w.PokiSDK) await timeout(loadScript(SDK_URL.poki), 3000);
        if (w.PokiSDK) {
          await timeout(Promise.resolve(w.PokiSDK.init()).catch(() => {}), 3000);
          sdk = w.PokiSDK;
        }
      } else {
        if (!w.CrazyGames?.SDK) await timeout(loadScript(SDK_URL.crazygames), 3000);
        const S = w.CrazyGames?.SDK;
        if (S) {
          await timeout(Promise.resolve(S.init()), 3000);
          sdk = S;
          try {
            S.game.loadingStart();
          } catch {
            /* older sdk */
          }
        }
      }
    } catch (e) {
      console.warn("portal sdk unavailable", e);
    }
    // In the portal's iframe, arrow keys / space / wheel must not scroll the host page.
    window.addEventListener("keydown", (ev) => {
      if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", " "].includes(ev.key) && ev.target === document.body) ev.preventDefault();
    });
  })();
  return ready;
}

function call(ev: "loadingFinished" | "gameplayStart" | "gameplayStop") {
  log.push(ev);
  if (!sdk) return;
  try {
    if (portalId === "poki") {
      if (ev === "loadingFinished") sdk.gameLoadingFinished();
      else if (ev === "gameplayStart") sdk.gameplayStart();
      else sdk.gameplayStop();
    } else {
      if (ev === "loadingFinished") sdk.game.loadingStop();
      else if (ev === "gameplayStart") sdk.game.gameplayStart();
      else sdk.game.gameplayStop();
    }
  } catch (e) {
    console.warn("portal", ev, e);
  }
}

export async function portalLoadingFinished() {
  if (!portalId || loaded) return;
  loaded = true;
  await initPortal();
  call("loadingFinished");
}
export async function portalGameplay(on: boolean) {
  if (!portalId || on === playing) return;
  playing = on;
  await initPortal();
  call(on ? "gameplayStart" : "gameplayStop");
}
/** Natural-break ad slot (Poki only; CrazyGames gets no midgame ads). Resolves when the game may continue. */
export async function portalCommercialBreak(): Promise<void> {
  if (!portalId || busy) return;
  await initPortal();
  busy = true;
  log.push("commercialBreak");
  if (playing) await portalGameplay(false);
  try {
    if (sdk && portalId === "poki") await sdk.commercialBreak();
    // CrazyGames: rewarded ads only, never midgame/interstitial ads.
  } catch {
    /* no ad */
  }
  busy = false;
}
/** Opt-in rewarded video on the portal. Resolves true only if the reward was earned. */
export async function portalRewarded(): Promise<boolean> {
  if (!portalId || busy) return false;
  await initPortal();
  busy = true;
  log.push("rewarded");
  const was = playing;
  if (was) await portalGameplay(false);
  let ok = false;
  try {
    if (sdk && portalId === "poki") ok = !!(await sdk.rewardedBreak());
    else if (sdk)
      ok = await new Promise<boolean>((res) =>
        sdk.ad.requestAd("rewarded", { adFinished: () => res(true), adError: () => res(false) }),
      );
  } catch {
    ok = false;
  }
  busy = false;
  if (was) await portalGameplay(true);
  return ok;
}
