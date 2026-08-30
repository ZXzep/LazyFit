export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose" | "maintain" | "gain";

/** TDEE multipliers (Harris-Benedict activity factors). */
export const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Calorie adjustment vs. TDEE. -15% deficit = lazy-friendly, sustainable weight loss. */
export const GOAL_DELTA: Record<Goal, number> = {
  lose: -0.15,
  maintain: 0,
  gain: 0.1,
};

export const ACTIVITY_LABEL_TH: Record<ActivityLevel, string> = {
  sedentary: "แทบไม่ขยับ (นั่งทำงาน)",
  light: "ออกกำลังเบา ๆ 1–3 วัน/สัปดาห์",
  moderate: "ออกกำลังปานกลาง 3–5 วัน/สัปดาห์",
  active: "ออกกำลังหนัก 6–7 วัน/สัปดาห์",
  very_active: "ออกกำลังหนักมาก / ใช้แรงงาน",
};

/** Mifflin-St Jeor basal metabolic rate (kcal/day). */
export function mifflinStJeorBMR(p: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
}): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === "male" ? base + 5 : base - 161;
}

/** Full daily calorie target: BMR → TDEE → goal adjustment, clamped + rounded to 10. */
export function calcDailyTarget(p: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  activity: ActivityLevel;
  goal: Goal;
}): number {
  const bmr = mifflinStJeorBMR(p);
  const tdee = bmr * ACTIVITY_FACTOR[p.activity];
  const target = tdee * (1 + GOAL_DELTA[p.goal]);
  return Math.max(1000, Math.min(6000, Math.round(target / 10) * 10));
}

export function ageFromBirthYear(birthYear: number, now: Date = new Date()): number {
  return now.getFullYear() - birthYear;
}

/** Pick a goal from current vs. target weight. */
export function goalFromWeights(currentKg: number, goalKg: number | null | undefined): Goal {
  if (goalKg == null) return "maintain";
  if (goalKg < currentKg - 0.5) return "lose";
  if (goalKg > currentKg + 0.5) return "gain";
  return "maintain";
}
