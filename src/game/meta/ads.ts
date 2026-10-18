import { isPortal, portalRewarded } from "../portal";

/**
 * Rewarded-ad STUB. No ad SDK and no ad unit IDs are bundled: the Sponsor
 * Crate shows a short placeholder "test ad" countdown in the UI and then
 * grants the reward. Swapping in AdMob later means replacing this function
 * (release builds only, real IDs from CI secrets — never committed).
 */
export const ADS_MODE: "stub" | "test" | "live" = "stub";

export function rewardedAdAvailable(): boolean {
  return true;
}

/**
 * Resolves true when the ad finished and the reward was earned. On a web
 * portal (Poki / CrazyGames build) this is the portal's rewarded video;
 * otherwise the placeholder countdown.
 */
export function showRewardedAd(seconds = 3): Promise<boolean> {
  if (isPortal) return portalRewarded();
  return new Promise((resolve) => setTimeout(() => resolve(true), seconds * 1000));
}
