"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  ActivityRef,
  LogMealInput,
  Meal,
  Profile,
  UserActivity,
  WeekDay,
  WeightPoint,
  Workout,
} from "@/types/db";
import {
  addActivity,
  deleteActivity,
  deleteMeal,
  deleteWorkout,
  logMeal,
  logWeight,
  logWorkout,
} from "@/app/dashboard/actions";
import { greetingTH } from "@/lib/date";
import { ThemeToggle } from "@/components/theme-toggle";
import { CaloricBalanceCard } from "./caloric-balance-card";
import { MealHistory } from "./meal-history";
import { OnboardingSheet } from "./onboarding-sheet";
import { QuickAiEstimator } from "./quick-ai-estimator";
import { WeeklyFlexCard } from "./weekly-flex-card";
import { WeightTrendCard } from "./weight-trend-card";
import { WorkoutCard } from "./workout-card";

interface Props {
  userName: string;
  nameConfirmed: boolean;
  profile: Profile | null;
  today: string;
  weekStart: string;
  initialMeals: Meal[];
  initialWorkouts: Workout[];
  initialWeek: WeekDay[];
  initialWeights: WeightPoint[];
  initialActivities: UserActivity[];
}

export function DashboardClient({
  userName,
  nameConfirmed,
  profile,
  today,
  initialMeals,
  initialWorkouts,
  initialWeek,
  initialWeights,
  initialActivities,
}: Props) {
  // ----- local state (seeded from the server, updated optimistically) -------
  const [name, setName] = useState(userName);
  const [meals, setMeals] = useState<Meal[]>(initialMeals);
  const [workouts, setWorkouts] = useState<Workout[]>(initialWorkouts);
  const [activities, setActivities] = useState<UserActivity[]>(initialActivities);
  const [week, setWeek] = useState<WeekDay[]>(initialWeek);
  const [weights, setWeights] = useState<WeightPoint[]>(initialWeights);
  const [target, setTarget] = useState(profile?.daily_calorie_target ?? 1800);
  const [showOnboarding, setShowOnboarding] = useState(!profile?.onboarded_at);
  const [busy, setBusy] = useState(false);

  const cheatQuota = profile?.weekly_cheat_quota ?? 3;
  const tz = profile?.timezone ?? "Asia/Bangkok";

  // ----- derived numbers ---------------------------------------------------
  const caloriesIn = useMemo(() => meals.reduce((s, m) => s + m.calories, 0), [meals]);
  const caloriesOut = useMemo(
    () => workouts.reduce((s, w) => s + w.calories_burned, 0),
    [workouts],
  );
  const streak = useMemo(() => computeStreak(week, today), [week, today]);

  // ----- meal mutations --------------------------------------------------------
  const handleLogMeal = useCallback(
    async (input: LogMealInput) => {
      setBusy(true);
      try {
        const row = await logMeal(input);
        setMeals((prev) => [row, ...prev]);
        setWeek((prev) => {
          let next = bumpDay(prev, today, "calories_in", row.calories);
          if (row.meal_type === "cheat") next = bumpDay(next, today, "cheat_count", 1);
          return next;
        });
      } finally {
        setBusy(false);
      }
    },
    [today],
  );

  const handleDeleteMeal = useCallback(
    async (id: string) => {
      const target = meals.find((m) => m.id === id);
      if (!target) return;
      const prevMeals = meals;
      const prevWeek = week;
      setMeals((p) => p.filter((m) => m.id !== id));
      setWeek((p) => {
        let n = bumpDay(p, today, "calories_in", -target.calories);
        if (target.meal_type === "cheat") n = bumpDay(n, today, "cheat_count", -1);
        return n;
      });
      try {
        await deleteMeal(id);
      } catch {
        setMeals(prevMeals);
        setWeek(prevWeek);
        toast.error("ลบไม่สำเร็จ");
      }
    },
    [meals, week, today],
  );

  // ----- workout mutations ----------------------------------------------------
  const handleLogWorkout = useCallback(
    async ({ minutes, activity }: { minutes: number; activity: ActivityRef }) => {
      setBusy(true);
      try {
        const row = await logWorkout({
          minutes,
          builtinKey: activity.kind === "builtin" ? activity.key : undefined,
          customId: activity.kind === "custom" ? activity.id : undefined,
        });
        setWorkouts((prev) => [row, ...prev]);
        setWeek((prev) => bumpDay(prev, today, "calories_out", row.calories_burned));
        toast.success(
          `${activity.emoji ?? "🔥"} ${activity.label} ${minutes} นาที · เบิร์น ${row.calories_burned} kcal`,
        );
      } catch {
        toast.error("บันทึกไม่สำเร็จ ลองอีกครั้ง");
      } finally {
        setBusy(false);
      }
    },
    [today],
  );

  const handleDeleteWorkout = useCallback(
    async (id: string) => {
      const target = workouts.find((w) => w.id === id);
      if (!target) return;
      const prevWorkouts = workouts;
      const prevWeek = week;
      setWorkouts((p) => p.filter((w) => w.id !== id));
      setWeek((p) => bumpDay(p, today, "calories_out", -target.calories_burned));
      try {
        await deleteWorkout(id);
      } catch {
        setWorkouts(prevWorkouts);
        setWeek(prevWeek);
        toast.error("ลบไม่สำเร็จ");
      }
    },
    [workouts, week, today],
  );

  const handleAddActivity = useCallback(
    async (input: { name: string; emoji?: string; met: number }) => {
      const row = await addActivity(input);
      setActivities((prev) => [...prev, row]);
      toast.success(`เพิ่ม ${row.emoji ?? ""} ${row.name} แล้ว`);
      return row;
    },
    [],
  );

  const handleDeleteActivity = useCallback(
    async (id: string) => {
      const prev = activities;
      setActivities((p) => p.filter((a) => a.id !== id));
      try {
        await deleteActivity(id);
      } catch {
        setActivities(prev);
        toast.error("ลบไม่สำเร็จ");
      }
    },
    [activities],
  );

  // ----- weight --------------------------------------------------------------
  const handleLogWeight = useCallback(
    async (kg: number) => {
      setBusy(true);
      try {
        await logWeight(kg);
        setWeights((prev) => {
          const rest = prev.filter((p) => p.logged_on !== today);
          return [...rest, { logged_on: today, weight_kg: Math.round(kg * 10) / 10 }].sort((a, b) =>
            a.logged_on.localeCompare(b.logged_on),
          );
        });
        toast.success("บันทึกน้ำหนักแล้ว 👍");
      } catch {
        toast.error("บันทึกไม่สำเร็จ ลองอีกครั้ง");
      } finally {
        setBusy(false);
      }
    },
    [today],
  );

  const handleOnboardingDone = useCallback(
    (r: { daily_calorie_target: number; weight_kg: number; display_name: string }) => {
      setTarget(r.daily_calorie_target);
      setName(r.display_name);
      setShowOnboarding(false);
      setWeights((prev) => {
        const rest = prev.filter((p) => p.logged_on !== today);
        return [...rest, { logged_on: today, weight_kg: r.weight_kg }].sort((a, b) =>
          a.logged_on.localeCompare(b.logged_on),
        );
      });
    },
    [today],
  );

  // ----- layout --------------------------------------------------------------
  const cards = [
    <CaloricBalanceCard key="balance" caloriesIn={caloriesIn} caloriesOut={caloriesOut} target={target} />,
    <QuickAiEstimator key="ai" busy={busy} onLog={handleLogMeal} />,
    <MealHistory key="meals" meals={meals} tz={tz} busy={busy} onDelete={handleDeleteMeal} />,
    <WorkoutCard
      key="workout"
      streak={streak}
      busy={busy}
      workouts={workouts}
      activities={activities}
      tz={tz}
      onLog={handleLogWorkout}
      onDeleteWorkout={handleDeleteWorkout}
      onAddActivity={handleAddActivity}
      onDeleteActivity={handleDeleteActivity}
    />,
    <WeeklyFlexCard key="flex" week={week} cheatQuota={cheatQuota} />,
    <WeightTrendCard
      key="weight"
      points={weights}
      goalKg={profile?.goal_weight_kg ?? null}
      busy={busy}
      onLog={handleLogWeight}
    />,
  ];

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-[max(0.75rem,env(safe-area-inset-top))] safe-bottom">
      <header className="flex items-center justify-between py-3">
        <div>
          <p className="text-sm text-muted-foreground">{greetingTH(tz)} 👋</p>
          <h1 className="text-xl font-bold leading-tight">{name}</h1>
        </div>
        <ThemeToggle />
      </header>

      <div className="mt-1 space-y-4">
        {cards.map((card, i) => (
          <div key={card.key} className="card-in" style={{ animationDelay: `${i * 55}ms` }}>
            {card}
          </div>
        ))}
      </div>

      {showOnboarding && (
        <OnboardingSheet
          defaultName={userName}
          skipNameStep={nameConfirmed}
          onDone={handleOnboardingDone}
        />
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        กินให้พอดี 80% · ยืดหยุ่นได้ 20% · ขยับนิดหน่อยก็ยังดี
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  pure helpers
// ---------------------------------------------------------------------------
type BumpKey = "calories_in" | "calories_out" | "cheat_count";

function bumpDay(week: WeekDay[], day: string, key: BumpKey, by: number): WeekDay[] {
  let found = false;
  const next = week.map((d) => {
    if (d.day !== day) return d;
    found = true;
    const updated = { ...d, [key]: Math.max(0, d[key] + by) };
    updated.net = updated.calories_in - updated.calories_out;
    return updated;
  });
  if (!found) {
    const base: WeekDay = { day, calories_in: 0, calories_out: 0, net: 0, cheat_count: 0 };
    base[key] = Math.max(0, by);
    base.net = base.calories_in - base.calories_out;
    next.push(base);
    next.sort((a, b) => a.day.localeCompare(b.day));
  }
  return next;
}

/** Consecutive days (ending today, or yesterday if today is not done yet) with any activity. */
function computeStreak(week: WeekDay[], today: string): number {
  const byDay = new Map(week.map((d) => [d.day, d]));
  const cursor = new Date(`${today}T00:00:00Z`);
  let streak = 0;

  for (let i = 0; i < 8; i++) {
    const key = cursor.toISOString().slice(0, 10);
    const day = byDay.get(key);
    const active = (day?.calories_out ?? 0) > 0;

    if (active) {
      streak += 1;
    } else if (i > 0) {
      break; // a gap before today ends the streak
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
