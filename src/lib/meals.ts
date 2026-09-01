import type { MealType } from "@/types/db";

/**
 * Single source of truth for how a meal_type is shown.
 * `label` is capitalised English so it stays consistent with "Cheat Meal"
 * elsewhere; `emoji` is optional decoration for roomier surfaces.
 */
export const MEAL_TYPE_META: Record<
  MealType,
  { label: string; emoji: string; badgeClass: string }
> = {
  clean: { label: "Clean", emoji: "🥗", badgeClass: "bg-primary/20 text-primary-strong" },
  normal: { label: "Normal", emoji: "🍚", badgeClass: "bg-muted text-muted-foreground" },
  cheat: { label: "Cheat", emoji: "🍔", badgeClass: "bg-rose-500/10 text-rose-600" },
};
