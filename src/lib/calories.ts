/**
 * Calorie-burn helpers.
 *
 * Uses the standard ACSM MET equation:
 *   kcal/min = (MET * 3.5 * bodyWeightKg) / 200
 *
 * A mini stepper at an easy "lazy" pace sits around MET 4.0–5.0.
 * We default to 4.5 and let the user tune it in their profile.
 */

export const DEFAULT_STEPPER_MET = 4.5;
export const DEFAULT_BODY_WEIGHT_KG = 70;

export function estimateStepperBurn(params: {
  minutes: number;
  weightKg?: number | null;
  met?: number | null;
}): number {
  const minutes = Math.max(0, params.minutes);
  const weightKg = params.weightKg ?? DEFAULT_BODY_WEIGHT_KG;
  const met = params.met ?? DEFAULT_STEPPER_MET;
  const kcalPerMin = (met * 3.5 * weightKg) / 200;
  return Math.round(kcalPerMin * minutes);
}

/** The 4 one-tap options shown on the dashboard. */
export const STEPPER_PRESETS = [15, 20, 25, 30] as const;
