/**
 * Rewarded "extract with 2x loot": after a SUCCESSFUL sortie extraction the
 * player may watch an optional rewarded ad to bank the run's haul a second
 * time (credits, keys and salvage; the second copy of each part becomes shards,
 * same as any duplicate). Premium Cores are never doubled. Once per run,
 * EXTRACT_ADS_PER_DAY per day.
 */
import type { RunResult } from "../types";

export const EXTRACT_ADS_PER_DAY = 3;

export function extractAdsLeft(today: string, rec: { day: string; n: number } | undefined): number {
  if (!rec || rec.day !== today) return EXTRACT_ADS_PER_DAY;
  return Math.max(0, EXTRACT_ADS_PER_DAY - rec.n);
}

/** Only a sortie you extracted from (survived) qualifies, and only if it carried something home. */
export function canDoubleExtract(r: RunResult): boolean {
  return (r.mode ?? "sortie") === "sortie" && r.survived && (r.credits > 0 || r.keys > 0 || r.loot.length > 0);
}

export function bumpExtract(today: string, rec: { day: string; n: number } | undefined): { day: string; n: number } {
  const n = rec && rec.day === today ? rec.n : 0;
  return { day: today, n: Math.min(EXTRACT_ADS_PER_DAY, n + 1) };
}
