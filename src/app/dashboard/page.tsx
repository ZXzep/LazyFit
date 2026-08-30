import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { startOfDayISO, startOfWeekISO, todayISO } from "@/lib/date";
import type { Meal, Profile, UserActivity, WeekDay, WeightPoint, Workout } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Profile first (it holds the timezone + week-start used for the rest).
  const { data: profile } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()) as { data: Profile | null };

  const tz = profile?.timezone ?? "Asia/Bangkok";
  const weekStartsOn = profile?.week_starts_on ?? 1;
  const today = todayISO(tz);
  const weekStart = startOfWeekISO(new Date(), weekStartsOn, tz);
  const dayStart = startOfDayISO(today, tz);

  const [mealsRes, workoutsRes, weekRes, weightRes, activitiesRes] = await Promise.all([
    supabase
      .from("meals")
      .select("*")
      .gte("eaten_at", dayStart)
      .order("eaten_at", { ascending: false }),
    supabase
      .from("workouts")
      .select("*")
      .gte("performed_at", dayStart)
      .order("performed_at", { ascending: false }),
    supabase.rpc("get_week_summary", { p_week_start: weekStart }),
    supabase
      .from("weight_logs")
      .select("logged_on, weight_kg")
      .order("logged_on", { ascending: true })
      .limit(60),
    supabase
      .from("user_activities")
      .select("*")
      .order("created_at", { ascending: true }),
  ]);

  return (
    <DashboardClient
      userName={profile?.display_name ?? "เพื่อน"}
      profile={profile}
      today={today}
      weekStart={weekStart}
      initialMeals={(mealsRes.data ?? []) as Meal[]}
      initialWorkouts={(workoutsRes.data ?? []) as Workout[]}
      initialWeek={(weekRes.data ?? []) as WeekDay[]}
      initialWeights={(weightRes.data ?? []) as WeightPoint[]}
      initialActivities={(activitiesRes.data ?? []) as UserActivity[]}
    />
  );
}
