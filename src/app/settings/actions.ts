"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { BUILTIN_ACTIVITIES } from "@/lib/activities";
import { THEME_KEYS, type ThemeKey } from "@/lib/themes";

const BUILTIN_KEYS = BUILTIN_ACTIVITIES.map((a) => a.key);

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  return { supabase, user };
}

/** Which built-in activities appear in the workout picker. */
export async function setActivityKeys(keys: string[]): Promise<void> {
  const clean = Array.from(new Set(z.array(z.string()).parse(keys))).filter((k) =>
    BUILTIN_KEYS.includes(k),
  );
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ activity_keys: clean })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

const profileSchema = z.object({
  display_name: z.string().trim().min(1).max(40).optional(),
  daily_calorie_target: z.number().int().min(800).max(6000).optional(),
  weekly_cheat_quota: z.number().int().min(0).max(21).optional(),
});

export async function setTheme(theme: string): Promise<void> {
  const t = z.enum(THEME_KEYS as [ThemeKey, ...ThemeKey[]]).parse(theme);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ theme: t }).eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function updateProfileSettings(
  input: z.input<typeof profileSchema>,
): Promise<void> {
  const patch = profileSchema.parse(input);
  if (Object.keys(patch).length === 0) return;
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
