export type MealType = "clean" | "normal" | "cheat";
export type MealSource = "ai_text" | "ai_image" | "manual";
export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose" | "maintain" | "gain";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  daily_calorie_target: number;
  weekly_cheat_quota: number;
  week_starts_on: number;
  current_weight_kg: number | null;
  goal_weight_kg: number | null;
  height_cm: number | null;
  stepper_met: number;
  sex: Sex | null;
  birth_year: number | null;
  activity_level: ActivityLevel;
  goal: Goal;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingInput {
  display_name: string;
  weight_kg: number;
  height_cm: number;
  birth_year: number;
  sex: Sex;
  activity_level: ActivityLevel;
  goal_weight_kg?: number | null;
}

export interface Meal {
  id: string;
  user_id: string;
  eaten_at: string;
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_type: MealType;
  source: MealSource;
  ai_tip: string | null;
  ai_confidence: number | null;
  raw_input: string | null;
  created_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  performed_at: string;
  activity: string;
  activity_emoji: string | null;
  duration_min: number;
  calories_burned: number;
  source: "quick_button" | "timer" | "manual";
  created_at: string;
}

export interface UserActivity {
  id: string;
  user_id: string;
  name: string;
  emoji: string | null;
  met: number;
  created_at: string;
}

/** What the workout card hands back when a timer finishes. */
export type ActivityRef =
  | { kind: "builtin"; key: string; label: string; emoji: string; met: number }
  | { kind: "custom"; id: string; label: string; emoji: string | null; met: number };

export interface LogWorkoutInput {
  minutes: number;
  builtinKey?: string;
  customId?: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  logged_on: string;
  weight_kg: number;
  note: string | null;
  created_at: string;
}

/** A single point returned to the weight chart. */
export interface WeightPoint {
  logged_on: string;
  weight_kg: number;
}

/** One row from the get_week_summary() RPC. */
export interface WeekDay {
  day: string;
  calories_in: number;
  calories_out: number;
  net: number;
  cheat_count: number;
}

/** Structured output of POST /api/estimate-meal (and the Gemini call). */
export interface MealEstimate {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal_type: MealType;
  tip: string;
  confidence?: number;
}

/** Payload accepted by the logMeal() server action. */
export interface LogMealInput {
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal_type: MealType;
  tip?: string;
  confidence?: number;
  source?: MealSource;
  raw_input?: string;
}
