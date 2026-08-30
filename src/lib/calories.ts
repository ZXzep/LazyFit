/**
 * Calorie-burn helper.
 *
 * Standard ACSM MET equation:
 *   kcal/min = (MET * 3.5 * bodyWeightKg) / 200
 */

export const DEFAULT_MET = 4.5;
export const DEFAULT_BODY_WEIGHT_KG = 70;

export function estimateBurn(params: {
  minutes: number;
  met?: number | null;
  weightKg?: number | null;
}): number {
  const minutes = Math.max(0, params.minutes);
  const met = params.met ?? DEFAULT_MET;
  const weightKg = params.weightKg ?? DEFAULT_BODY_WEIGHT_KG;
  const kcalPerMin = (met * 3.5 * weightKg) / 200;
  return Math.round(kcalPerMin * minutes);
}

/** One-tap duration options for the timer. */
export const DURATION_PRESETS = [15, 20, 25, 30] as const;
