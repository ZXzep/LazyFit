"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChartNoAxesCombined, Dumbbell, Home, Sparkles, Utensils, type LucideIcon } from "lucide-react";
import { say } from "@/lib/toast";
import { AppLogo } from "@/components/app-logo";
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
  deleteActivity,
  deleteMeal,
  deleteWorkout,
  logMeal,
  logWeight,
  logWorkout,
} from "@/app/dashboard/actions";
import { greetingTH } from "@/lib/date";
import { SettingsLink } from "@/components/settings-link";
import { ThemeApply } from "@/components/theme-apply";
import { normalizeTheme } from "@/lib/themes";
import { SignOutButton } from "@/components/sign-out-button";
import { AiChatSheet } from "./ai-chat-sheet";
import { CaloricBalanceCard } from "./caloric-balance-card";
import { MealHistory } from "./meal-history";
import { OnboardingSheet } from "./onboarding-sheet";
import { QuickAiEstimator } from "./quick-ai-estimator";
import { WeeklyFlexCard } from "./weekly-flex-card";
import { WeightTrendCard } from "./weight-trend-card";
import { WorkoutCard } from "./workout-card";
import { fmt } from "@/lib/utils";

type AppTab = "home" | "food" | "workout" | "progress";

const TAB_META: Record<AppTab, { label: string; title: string; subtitle: string }> = {
  home: { label: "วันนี้", title: "ภาพรวมวันนี้", subtitle: "ค่อย ๆ ทำ เดี๋ยวก็ถึงเป้า" },
  food: { label: "การกิน", title: "การกิน", subtitle: "บันทึกง่าย ไม่ต้องนับให้ปวดหัว" },
  workout: { label: "ขยับ", title: "ออกกำลังกาย", subtitle: "นิดเดียวก็นับว่าเริ่มแล้ว" },
  progress: { label: "สถิติ", title: "ความคืบหน้า", subtitle: "ดูแนวโน้ม ไม่ตัดสินตัวเองรายวัน" },
};

const TABS: { tab: AppTab; icon: LucideIcon }[] = [
  { tab: "home", icon: Home },
  { tab: "food", icon: Utensils },
  { tab: "workout", icon: Dumbbell },
  { tab: "progress", icon: ChartNoAxesCombined },
];

interface Props {
  userName: string;
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
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [chatOpen, setChatOpen] = useState(false);

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
        say.oops();
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
        say.workoutLogged(
          `${activity.emoji ?? "🔥"} ${activity.label} ${minutes} นาที`,
          row.calories_burned,
        );
      } catch {
        say.oops();
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
        say.oops();
      }
    },
    [workouts, week, today],
  );


  const handleDeleteActivity = useCallback(
    async (id: string) => {
      const prev = activities;
      setActivities((p) => p.filter((a) => a.id !== id));
      try {
        await deleteActivity(id);
      } catch {
        setActivities(prev);
        say.oops();
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
        say.weightLogged();
      } catch {
        say.oops();
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

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background shadow-[0_0_48px_hsl(var(--foreground)/0.06)]">
      <ThemeApply theme={normalizeTheme(profile?.theme)} />
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <AppLogo className="size-10 shrink-0 rounded-xl" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-strong">LazyFit</p>
              <p className="truncate text-sm text-muted-foreground">{greetingTH(tz)}, {name}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <SettingsLink />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main aria-busy={busy} className="px-4 pb-28 pt-5">
        {busy ? <div className="fixed inset-x-0 top-0 z-[60] mx-auto h-1 max-w-md overflow-hidden bg-primary/20"><span className="loading-bar block h-full w-1/2 bg-primary-strong" /></div> : null}
        <div className="mb-5">
          <p className="text-sm text-muted-foreground">{TAB_META[activeTab].subtitle}</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight">{TAB_META[activeTab].title}</h1>
        </div>

        <div key={activeTab} className="card-in space-y-4">
          {activeTab === "home" ? (
            <>
              <CaloricBalanceCard caloriesIn={caloriesIn} caloriesOut={caloriesOut} target={target} />
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("food")}
                  className="rounded-3xl bg-primary p-4 text-left text-primary-foreground shadow-sm transition-transform active:scale-[0.98]"
                >
                  <span className="flex size-9 items-center justify-center rounded-2xl bg-background/70"><Utensils className="size-4" /></span>
                  <span className="mt-5 block text-xs opacity-70">กินวันนี้</span>
                  <span className="block text-xl font-bold tabular-nums">{fmt(caloriesIn)} <small className="text-xs font-medium">kcal</small></span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("workout")}
                  className="rounded-3xl border border-border bg-card p-4 text-left shadow-sm transition-transform active:scale-[0.98]"
                >
                  <span className="flex size-9 items-center justify-center rounded-2xl bg-primary/20"><Dumbbell className="size-4 text-primary-strong" /></span>
                  <span className="mt-5 block text-xs text-muted-foreground">เบิร์นวันนี้</span>
                  <span className="block text-xl font-bold tabular-nums">{fmt(caloriesOut)} <small className="text-xs font-medium">kcal</small></span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("food")}
                className="flex w-full items-center gap-3 rounded-3xl border border-primary/60 bg-primary/10 p-4 text-left transition-colors active:bg-primary/20"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary"><Sparkles className="size-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">กินอะไรมา ให้ AI ช่วยดู</span>
                  <span className="block text-sm text-muted-foreground">พิมพ์ชื่อเมนูแล้วประเมินได้เลย</span>
                </span>
                <span aria-hidden="true" className="text-xl">›</span>
              </button>
              <div className="rounded-3xl bg-muted/65 p-4 text-sm text-muted-foreground">
                ดูน้ำหนักและภาพรวมรายสัปดาห์ได้ที่แท็บ <button type="button" onClick={() => setActiveTab("progress")} className="font-semibold text-primary-strong">สถิติ</button>
              </div>
            </>
          ) : null}

          {activeTab === "food" ? (
            <>
              <QuickAiEstimator busy={busy} onLog={handleLogMeal} />
              <MealHistory meals={meals} tz={tz} busy={busy} onDelete={handleDeleteMeal} />
            </>
          ) : null}

          {activeTab === "workout" ? (
            <WorkoutCard
              streak={streak}
              busy={busy}
              workouts={workouts}
              activities={activities}
              activityKeys={profile?.activity_keys ?? ["stepper"]}
              tz={tz}
              onLog={handleLogWorkout}
              onDeleteWorkout={handleDeleteWorkout}
              onDeleteActivity={handleDeleteActivity}
            />
          ) : null}

          {activeTab === "progress" ? (
            <>
              <WeightTrendCard
                points={weights}
                goalKg={profile?.goal_weight_kg ?? null}
                busy={busy}
                onLog={handleLogWeight}
              />
              <WeeklyFlexCard week={week} cheatQuota={cheatQuota} />
            </>
          ) : null}
        </div>
      </main>

      <BottomNav
        activeTab={activeTab}
        onSelect={setActiveTab}
        onOpenChat={() => setChatOpen(true)}
      />

      <AiChatSheet open={chatOpen} onClose={() => setChatOpen(false)} userName={name} />

      {showOnboarding && (
        <OnboardingSheet defaultName={userName} onDone={handleOnboardingDone} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Bottom navigation — 2 tabs + a permanent raised AI button + 2 tabs. The
//  SVG bar's top edge cups around the centre AI button.
// ---------------------------------------------------------------------------
const NAV_H = 62;

const NOTCH_R = 34; // fixed centre cup — the AI button (size-14, r28) sits in it

/** Bar outline with a deep round cup notched into the centre of the top edge. */
function navPath(w: number, h: number): string {
  const r = 16; // outer corner radius
  const cx = w / 2;
  const cy = 4;
  const bl = 9;
  const R = NOTCH_R;
  return [
    `M ${r} 0`,
    `L ${(cx - R - bl).toFixed(2)} 0`,
    `Q ${(cx - R).toFixed(2)} 0 ${(cx - R).toFixed(2)} ${cy}`,
    `A ${R} ${R} 0 0 0 ${(cx + R).toFixed(2)} ${cy}`,
    `Q ${(cx + R).toFixed(2)} 0 ${(cx + R + bl).toFixed(2)} 0`,
    `L ${w - r} 0`,
    `A ${r} ${r} 0 0 1 ${w} ${r}`,
    `L ${w} ${h - r}`,
    `A ${r} ${r} 0 0 1 ${w - r} ${h}`,
    `L ${r} ${h}`,
    `A ${r} ${r} 0 0 1 0 ${h - r}`,
    `L 0 ${r}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,
    `Z`,
  ].join(" ");
}

function BottomNav({
  activeTab,
  onSelect,
  onOpenChat,
}: {
  activeTab: AppTab;
  onSelect: (tab: AppTab) => void;
  onOpenChat: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))]"
    >
      <div ref={wrapRef} className="relative" style={{ height: NAV_H }}>
        {w > 0 && (
          <svg
            width={w}
            height={NAV_H}
            viewBox={`0 0 ${w} ${NAV_H}`}
            className="absolute inset-0 drop-shadow-[0_12px_30px_hsl(var(--foreground)/0.16)]"
            aria-hidden
          >
            <path
              d={navPath(w, NAV_H)}
              fill="hsl(var(--background))"
              stroke="hsl(var(--border))"
              strokeWidth={1.25}
            />
          </svg>
        )}

        {/* AI button — permanent centrepiece, seated in the cup */}
        <button
          type="button"
          onClick={onOpenChat}
          aria-label="ถาม AI"
          className="absolute left-1/2 top-[-24px] z-10 grid size-14 -translate-x-1/2 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-strong text-primary-foreground shadow-[0_12px_26px_hsl(var(--primary)/0.55)] transition-transform active:scale-95"
        >
          <Sparkles className="size-6" strokeWidth={2.4} />
        </button>

        <div className="relative flex h-full">
          <TabGroup tabs={left} activeTab={activeTab} onSelect={onSelect} />
          <span className="pointer-events-none w-16 shrink-0" aria-hidden />
          <TabGroup tabs={right} activeTab={activeTab} onSelect={onSelect} />
        </div>
      </div>
    </nav>
  );
}

function TabGroup({
  tabs,
  activeTab,
  onSelect,
}: {
  tabs: { tab: AppTab; icon: LucideIcon }[];
  activeTab: AppTab;
  onSelect: (tab: AppTab) => void;
}) {
  return (
    <div className="flex flex-1 justify-around">
      {tabs.map(({ tab, icon: Icon }) => {
        const active = tab === activeTab;
        return (
          <button
            key={tab}
            type="button"
            aria-label={TAB_META[tab].label}
            aria-current={active ? "page" : undefined}
            onClick={() => onSelect(tab)}
            className="flex flex-col items-center justify-end gap-1 px-2 pb-2"
          >
            <Icon
              className={`size-[22px] transition-colors ${active ? "text-primary-strong" : "text-muted-foreground"}`}
              strokeWidth={active ? 2.6 : 2}
            />
            <span
              className={`text-[11px] transition-colors ${
                active ? "font-bold text-primary-strong" : "font-semibold text-muted-foreground"
              }`}
            >
              {TAB_META[tab].label}
            </span>
          </button>
        );
      })}
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
