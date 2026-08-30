"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { estimateBurn } from "@/lib/calories";
import { BUILTIN_BY_KEY } from "@/lib/activities";
import { calcDailyTarget, goalFromWeights } from "@/lib/nutrition";
import { todayISO } from "@/lib/date";
import type {
  LogMealInput,
  LogWorkoutInput,
  Meal,
  OnboardingInput,
  UserActivity,
  WeightLog,
  Workout,
} from "@/types/db";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  return { supabase, user };
}

// ---------------------------------------------------------------------------
//  saveOnboarding — welcome sheet: store body stats + computed calorie target
// ---------------------------------------------------------------------------
const CURRENT_YEAR = new Date().getFullYear();

const onboardingSchema = z.object({
  display_name: z.string().trim().min(1).max(40),
  weight_kg: z.number().min(20).max(400),
  height_cm: z.number().min(80).max(260),
  birth_year: z.number().int().min(1920).max(CURRENT_YEAR - 5),
  sex: z.enum(["male", "female"]),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  goal_weight_kg: z.number().min(20).max(400).nullable().optional(),
});

export async function saveOnboarding(input: OnboardingInput): Promise<{ daily_calorie_target: number }> {
  const d = onboardingSchema.parse(input);
  const { supabase, user } = await requireUser();

  const age = CURRENT_YEAR - d.birth_year;
  const goal = goalFromWeights(d.weight_kg, d.goal_weight_kg);
  const daily_calorie_target = calcDailyTarget({
    sex: d.sex,
    weightKg: d.weight_kg,
    heightCm: d.height_cm,
    age,
    activity: d.activity_level,
    goal,
  });

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: d.display_name,
      current_weight_kg: d.weight_kg,
      height_cm: d.height_cm,
      birth_year: d.birth_year,
      sex: d.sex,
      activity_level: d.activity_level,
      goal,
      goal_weight_kg: d.goal_weight_kg ?? null,
      daily_calorie_target,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) throw new Error(error.message);

  // seed the first weight point so the trend chart has something to show
  await supabase
    .from("weight_logs")
    .upsert(
      { user_id: user.id, logged_on: todayISO(), weight_kg: d.weight_kg },
      { onConflict: "user_id,logged_on" },
    );

  revalidatePath("/dashboard");
  return { daily_calorie_target };
}

// ---------------------------------------------------------------------------
//  logMeal — insert a meal (called right after the AI estimate, one tap)
// ---------------------------------------------------------------------------
const logMealSchema = z.object({
  food_name: z.string().min(1).max(120),
  calories: z.number().int().min(0).max(8000),
  protein: z.number().min(0).max(600),
  carbs: z.number().min(0).max(1200),
  fat: z.number().min(0).max(600),
  meal_type: z.enum(["clean", "normal", "cheat"]),
  tip: z.string().max(240).optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.enum(["ai_text", "ai_image", "manual"]).default("ai_text"),
  raw_input: z.string().max(400).optional(),
});

export async function logMeal(input: LogMealInput): Promise<Meal> {
  const data = logMealSchema.parse(input);
  const { supabase, user } = await requireUser();

  const { data: row, error } = await supabase
    .from("meals")
    .insert({
      user_id: user.id,
      food_name: data.food_name,
      calories: data.calories,
      protein_g: data.protein,
      carbs_g: data.carbs,
      fat_g: data.fat,
      meal_type: data.meal_type,
      source: data.source,
      ai_tip: data.tip ?? null,
      ai_confidence: data.confidence ?? null,
      raw_input: data.raw_input ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  return row as Meal;
}

// ---------------------------------------------------------------------------
//  logWorkout — timer session for any activity; burn computed server-side
// ---------------------------------------------------------------------------
const logWorkoutSchema = z
  .object({
    minutes: z.number().int().min(1).max(600),
    builtinKey: z.string().max(40).optional(),
    customId: z.string().uuid().optional(),
  })
  .refine((v) => v.builtinKey || v.customId, { message: "ต้องระบุกิจกรรม" });

export async function logWorkout(input: LogWorkoutInput): Promise<Workout> {
  const d = logWorkoutSchema.parse(input);
  const { supabase, user } = await requireUser();

  // resolve the activity name / emoji / MET (server is the source of truth)
  let name = "ออกกำลังกาย";
  let emoji: string | null = null;
  let met = 4.5;

  if (d.customId) {
    const { data: act } = await supabase
      .from("user_activities")
      .select("name, emoji, met")
      .eq("id", d.customId)
      .eq("user_id", user.id)
      .single();
    if (!act) throw new Error("ไม่พบกิจกรรมนี้");
    name = act.name;
    emoji = act.emoji;
    met = Number(act.met);
  } else if (d.builtinKey) {
    const b = BUILTIN_BY_KEY[d.builtinKey];
    if (!b) throw new Error("กิจกรรมไม่ถูกต้อง");
    name = b.label;
    emoji = b.emoji;
    met = b.met;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_weight_kg")
    .eq("id", user.id)
    .single();

  const caloriesBurned = estimateBurn({
    minutes: d.minutes,
    met,
    weightKg: profile?.current_weight_kg,
  });

  const { data: row, error } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      activity: name,
      activity_emoji: emoji,
      duration_min: d.minutes,
      calories_burned: caloriesBurned,
      source: "timer",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  return row as Workout;
}

// ---------------------------------------------------------------------------
//  Custom activities
// ---------------------------------------------------------------------------
const addActivitySchema = z.object({
  name: z.string().trim().min(1).max(30),
  emoji: z.string().trim().max(8).optional(),
  met: z.number().min(1).max(20),
});

export async function addActivity(input: z.input<typeof addActivitySchema>): Promise<UserActivity> {
  const d = addActivitySchema.parse(input);
  const { supabase, user } = await requireUser();

  const { data: row, error } = await supabase
    .from("user_activities")
    .insert({ user_id: user.id, name: d.name, emoji: d.emoji || null, met: d.met })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("มีกิจกรรมชื่อนี้อยู่แล้ว");
    throw new Error(error.message);
  }
  revalidatePath("/dashboard");
  return row as UserActivity;
}

export async function deleteActivity(id: string): Promise<void> {
  const activityId = z.string().uuid().parse(id);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("user_activities")
    .delete()
    .eq("id", activityId)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
//  Delete log entries (history management)
// ---------------------------------------------------------------------------
export async function deleteMeal(id: string): Promise<void> {
  const mealId = z.string().uuid().parse(id);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("meals").delete().eq("id", mealId).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function deleteWorkout(id: string): Promise<void> {
  const workoutId = z.string().uuid().parse(id);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("workouts")
    .delete()
    .eq("id", workoutId)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
//  logWeight — one entry per day (upsert), also syncs profile.current_weight_kg
// ---------------------------------------------------------------------------
export async function logWeight(weightKg: number): Promise<WeightLog> {
  const kg = z.number().min(20).max(400).parse(Math.round(weightKg * 10) / 10);
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();

  const loggedOn = todayISO(profile?.timezone ?? undefined);

  const { data: row, error } = await supabase
    .from("weight_logs")
    .upsert(
      { user_id: user.id, logged_on: loggedOn, weight_kg: kg },
      { onConflict: "user_id,logged_on" },
    )
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase.from("profiles").update({ current_weight_kg: kg }).eq("id", user.id);
  revalidatePath("/dashboard");
  return row as WeightLog;
}
