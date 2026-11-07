import { Capacitor } from "@capacitor/core";
import { isPortal, portalRewarded } from "../portal";
import { ADMOB } from "./ad-config";

/**
 * Rewarded ads.
 * - Android app: Google AdMob rewarded video, behind Google's UMP consent form.
 * - Web portals (Poki / CrazyGames): the portal's own rewarded video (unchanged).
 * - Plain web: no ad network, so rewarded rewards are unavailable.
 * The reward is granted ONLY when the network reports it was earned.
 */
const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

export type AdResult = "rewarded" | "skipped" | "unavailable";

export function rewardedAdAvailable(): boolean {
  return isPortal || isNativeAndroid;
}

let ready: Promise<boolean> | null = null;

/** Init AdMob + UMP consent once. Resolves whether ads may be requested. */
export function initAds(): Promise<boolean> {
  if (!isNativeAndroid) return Promise.resolve(false);
  ready ??= (async () => {
    try {
      const { AdMob, AdmobConsentStatus } = await import("@capacitor-community/admob");
      await AdMob.initialize({ initializeForTesting: ADMOB.useTestIds });
      let info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
        info = await AdMob.showConsentForm();
      }
      return info.canRequestAds;
    } catch {
      ready = null; // retry on next attempt
      return false;
    }
  })();
  return ready;
}

/** Re-open the UMP privacy options form (for users in consent regions). */
export async function showAdPrivacyOptions(): Promise<void> {
  if (!isNativeAndroid) return;
  const { AdMob } = await import("@capacitor-community/admob");
  await AdMob.showPrivacyOptionsForm().catch(() => {});
}

async function admobRewarded(): Promise<AdResult> {
  if (!(await initAds())) return "unavailable";
  const { AdMob, RewardAdPluginEvents } = await import("@capacitor-community/admob");
  let earned = false;
  const sub = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
    earned = true;
  });
  try {
    await AdMob.prepareRewardVideoAd({ adId: ADMOB.rewardedUnitId, isTesting: ADMOB.useTestIds });
  } catch {
    await sub.remove();
    return "unavailable";
  }
  try {
    await AdMob.showRewardVideoAd();
  } catch {
    await sub.remove();
    return "unavailable";
  }
  await sub.remove();
  return earned ? "rewarded" : "skipped";
}

/** Full result, for UIs that explain why no reward was given. */
export async function playRewardedAd(): Promise<AdResult> {
  if (isPortal) return (await portalRewarded()) ? "rewarded" : "skipped";
  if (isNativeAndroid) return admobRewarded();
  return "unavailable";
}

/** Resolves true only when the ad finished and the reward was earned. */
export async function showRewardedAd(): Promise<boolean> {
  return (await playRewardedAd()) === "rewarded";
}
