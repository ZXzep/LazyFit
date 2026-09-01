import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { chatWithCoach, GeminiError, type CoachTurn } from "@/lib/gemini";
import { clockLabel, startOfDayISO, startOfWeekISO, todayISO } from "@/lib/date";
import { ageFromBirthYear } from "@/lib/nutrition";
import type { Meal, Profile, WeekDay, WeightPoint, Workout } from "@/types/db";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

/**
 * POST /api/chat
 *
 * Body: { messages: { role: "user" | "model"; content: string }[] }
 *   The full (trimmed) chat history; the last turn must be the user's.
 *
 * 200 -> { reply: string }
 *
 * The user's data (today's meals/workouts, week summary, weight trend) is
 * loaded server-side and folded into the prompt — the client never supplies it.
 */

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        content: z.string().trim().min(1).max(1000),
      }),
    )
    .min(1)
    .max(16),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_request", issues: err instanceof z.ZodError ? err.issues : undefined },
      { status: 400 },
    );
  }

  // Gemini needs the transcript to start with a user turn and end with one.
  const turns = (payload.messages as CoachTurn[]).slice(
    payload.messages.findIndex((m) => m.role === "user"),
  );
  if (turns.length === 0 || turns[turns.length - 1].role !== "user") {
    return NextResponse.json(
      { error: "invalid_request", message: "ข้อความสุดท้ายต้องเป็นของผู้ใช้" },
      { status: 400 },
    );
  }

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

  const [mealsRes, workoutsRes, weekRes, weightRes] = await Promise.all([
    supabase.from("meals").select("*").gte("eaten_at", dayStart).order("eaten_at", { ascending: true }),
    supabase
      .from("workouts")
      .select("*")
      .gte("performed_at", dayStart)
      .order("performed_at", { ascending: true }),
    supabase.rpc("get_week_summary", { p_week_start: weekStart }),
    supabase
      .from("weight_logs")
      .select("logged_on, weight_kg")
      .order("logged_on", { ascending: true })
      .limit(30),
  ]);

  const context = buildContext({
    profile,
    today,
    weekStart,
    tz,
    meals: (mealsRes.data ?? []) as Meal[],
    workouts: (workoutsRes.data ?? []) as Workout[],
    week: (weekRes.data ?? []) as WeekDay[],
    weights: (weightRes.data ?? []) as WeightPoint[],
  });

  try {
    const reply = await chatWithCoach({ turns, context });
    return NextResponse.json({ reply }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof GeminiError) {
      console.error("[chat]", err.status, err.message, err.detail ?? "");
      const message =
        err.status === 429
          ? "คุยกับ AI ถี่ไปหน่อย พักแป๊บนึงแล้วลองใหม่นะ"
          : err.status === 500
            ? "ระบบ AI ยังไม่ถูกตั้งค่า ลองใหม่ทีหลัง"
            : "ตอบไม่ได้ตอนนี้ ลองถามใหม่อีกที";
      return NextResponse.json(
        { error: "chat_failed", message },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 },
      );
    }
    console.error("[chat] unexpected", err);
    return NextResponse.json({ error: "internal_error", message: "มีบางอย่างผิดพลาด ลองใหม่อีกที" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
//  Plain-text snapshot of the user's data for the model
// ---------------------------------------------------------------------------
function buildContext(d: {
  profile: Profile | null;
  today: string;
  weekStart: string;
  tz: string;
  meals: Meal[];
  workouts: Workout[];
  week: WeekDay[];
  weights: WeightPoint[];
}): string {
  const target = d.profile?.daily_calorie_target ?? 1800;
  const cheatQuota = d.profile?.weekly_cheat_quota ?? 3;
  const caloriesIn = d.meals.reduce((s, m) => s + m.calories, 0);
  const caloriesOut = d.workouts.reduce((s, w) => s + w.calories_burned, 0);
  const net = caloriesIn - caloriesOut;
  const remaining = target - net;

  const L: string[] = [];
  L.push(`[ข้อมูลผู้ใช้ • วันนี้ ${d.today} • เขตเวลา ${d.tz}]`);
  if (d.profile?.display_name) L.push(`ชื่อเล่น: ${d.profile.display_name}`);

  const age = d.profile?.birth_year ? ageFromBirthYear(d.profile.birth_year) : null;
  const bio = [
    d.profile?.sex === "male" ? "ชาย" : d.profile?.sex === "female" ? "หญิง" : null,
    age ? `${age} ปี` : null,
    d.profile?.height_cm ? `สูง ${d.profile.height_cm} ซม.` : null,
  ].filter(Boolean);
  if (bio.length) L.push(`ข้อมูลส่วนตัว: ${bio.join(" · ")}`);

  L.push(`เป้าแคลอรีต่อวัน: ${target.toLocaleString()} kcal`);
  L.push(`โควตามื้อ cheat ต่อสัปดาห์: ${cheatQuota} มื้อ`);
  if (d.profile?.goal_weight_kg) L.push(`น้ำหนักเป้าหมาย: ${d.profile.goal_weight_kg} kg`);

  L.push("");
  L.push(`— มื้ออาหารวันนี้: กินไปแล้ว ${caloriesIn.toLocaleString()} kcal (${d.meals.length} รายการ)`);
  if (d.meals.length === 0) {
    L.push("  (ยังไม่ได้บันทึกมื้ออาหารวันนี้)");
  } else {
    for (const m of d.meals) {
      const tag =
        m.meal_type === "cheat" ? " [cheat]" : m.meal_type === "clean" ? " [คลีน]" : "";
      L.push(
        `  • ${clockLabel(m.eaten_at, d.tz)} ${m.food_name} — ${Math.round(m.calories)} kcal (P${Math.round(
          m.protein_g,
        )}/C${Math.round(m.carbs_g)}/F${Math.round(m.fat_g)})${tag}`,
      );
    }
  }

  L.push("");
  L.push(
    `— ออกกำลังกายวันนี้: เบิร์นไป ${caloriesOut.toLocaleString()} kcal (${d.workouts.length} รายการ)`,
  );
  if (d.workouts.length === 0) {
    L.push("  (ยังไม่ได้ออกกำลังกายวันนี้)");
  } else {
    for (const w of d.workouts) {
      L.push(
        `  • ${clockLabel(w.performed_at, d.tz)} ${w.activity_emoji ?? ""}${w.activity} ${w.duration_min} นาที — ${Math.round(
          w.calories_burned,
        )} kcal`,
      );
    }
  }

  L.push("");
  L.push(`— สรุปวันนี้: สุทธิ (กิน − เบิร์น) = ${net.toLocaleString()} kcal`);
  if (remaining >= 0) {
    L.push(`  ยังกินได้อีกประมาณ ${remaining.toLocaleString()} kcal จะถึงเป้าพอดี`);
  } else {
    L.push(`  ตอนนี้เกินเป้าอยู่ประมาณ ${Math.abs(remaining).toLocaleString()} kcal`);
  }

  const cheatUsed = d.week.reduce((s, x) => s + x.cheat_count, 0);
  const workoutDays = d.week.filter((x) => x.calories_out > 0).length;
  const daysLogged = d.week.filter((x) => x.calories_in > 0).length;
  const avgNet = daysLogged
    ? Math.round(d.week.reduce((s, x) => s + x.net, 0) / daysLogged)
    : null;
  L.push("");
  L.push(`— สัปดาห์นี้ (เริ่ม ${d.weekStart}):`);
  L.push(`  มื้อ cheat ใช้ไป ${cheatUsed} / ${cheatQuota} มื้อ`);
  L.push(`  ออกกำลังกาย ${workoutDays} วัน • สตรีก ${weekStreak(d.week, d.today)} วันติด`);
  if (avgNet !== null) L.push(`  เฉลี่ยสุทธิต่อวัน ${avgNet.toLocaleString()} kcal (จาก ${daysLogged} วันที่มีบันทึก)`);

  L.push("");
  if (d.weights.length === 0) {
    L.push("— น้ำหนัก: ยังไม่มีบันทึก");
  } else {
    const latest = d.weights[d.weights.length - 1];
    L.push(`— น้ำหนักล่าสุด ${latest.weight_kg} kg (${latest.logged_on})`);
    const prior = [...d.weights]
      .reverse()
      .find(
        (p) =>
          (new Date(latest.logged_on).getTime() - new Date(p.logged_on).getTime()) / 86_400_000 >= 5,
      );
    if (prior) {
      const delta = Math.round((latest.weight_kg - prior.weight_kg) * 10) / 10;
      const dir = delta < 0 ? "ลดลง" : delta > 0 ? "เพิ่มขึ้น" : "เท่าเดิม";
      L.push(`  เทียบกับ ${prior.logged_on} (${prior.weight_kg} kg): ${dir} ${Math.abs(delta)} kg`);
    }
  }

  return L.join("\n");
}

/** Consecutive days up to today with any logged workout. */
function weekStreak(week: WeekDay[], today: string): number {
  const byDay = new Map(week.map((d) => [d.day, d]));
  const cursor = new Date(`${today}T00:00:00Z`);
  let streak = 0;
  for (let i = 0; i < 8; i++) {
    const key = cursor.toISOString().slice(0, 10);
    const active = (byDay.get(key)?.calories_out ?? 0) > 0;
    if (active) streak += 1;
    else if (i > 0) break;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
