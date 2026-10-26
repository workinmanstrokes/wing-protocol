/**
 * AdMob config: the ONE place to swap Google's test IDs for real ones.
 * Real IDs: set ADMOB.rewardedUnitId here AND admob_app_id in
 * android/app/src/main/res/values/strings.xml, then set ADMOB.useTestIds=false.
 * Rewarded ads only; this app never shows interstitials, banners or app-open ads.
 */
export const ADMOB = {
  /** Google's official sample App ID (mirrored in strings.xml admob_app_id). */
  appId: "ca-app-pub-3940256099942544~3347511713",
  /** Google's official sample rewarded ad unit ID. */
  rewardedUnitId: "ca-app-pub-3940256099942544/5224354917",
  /** true while on Google's test IDs; marks requests as test ads. */
  useTestIds: true,
} as const;
