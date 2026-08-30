"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveOnboarding } from "@/app/dashboard/actions";
import {
  ACTIVITY_LABEL_TH,
  calcDailyTarget,
  goalFromWeights,
  type ActivityLevel,
  type Sex,
} from "@/lib/nutrition";
import type { OnboardingInput } from "@/types/db";

const CURRENT_YEAR = new Date().getFullYear();
const ACTIVITIES: ActivityLevel[] = ["sedentary", "light", "moderate", "active", "very_active"];

export interface OnboardingResult {
  daily_calorie_target: number;
  weight_kg: number;
  display_name: string;
}

export function OnboardingSheet({
  defaultName,
  onDone,
}: {
  defaultName: string;
  onDone: (result: OnboardingResult) => void;
}) {
  const [step, setStep] = useState<0 | 1>(0);

  const [name, setName] = useState(defaultName === "เพื่อน" ? "" : defaultName);
  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [goalWeight, setGoalWeight] = useState("");
  const [activity, setActivity] = useState<ActivityLevel>("light");
  const [saving, setSaving] = useState(false);

  const nameOk = name.trim().length >= 1 && name.trim().length <= 40;

  const parsed = useMemo(() => {
    const a = Number(age);
    const h = Number(height);
    const w = Number(weight);
    const g = goalWeight ? Number(goalWeight) : null;
    const ok =
      sex !== null &&
      a >= 13 && a <= 100 &&
      h >= 120 && h <= 230 &&
      w >= 30 && w <= 300 &&
      (g === null || (g >= 30 && g <= 300));
    return { a, h, w, g, ok };
  }, [sex, age, height, weight, goalWeight]);

  const preview = useMemo(() => {
    if (!parsed.ok || sex === null) return null;
    return calcDailyTarget({
      sex,
      age: parsed.a,
      heightCm: parsed.h,
      weightKg: parsed.w,
      activity,
      goal: goalFromWeights(parsed.w, parsed.g),
    });
  }, [parsed, sex, activity]);

  async function handleSubmit() {
    if (!nameOk || !parsed.ok || sex === null) return;
    setSaving(true);
    try {
      const payload: OnboardingInput = {
        display_name: name.trim(),
        weight_kg: parsed.w,
        height_cm: parsed.h,
        birth_year: CURRENT_YEAR - parsed.a,
        sex,
        activity_level: activity,
        goal_weight_kg: parsed.g,
      };
      const res = await saveOnboarding(payload);
      onDone({
        daily_calorie_target: res.daily_calorie_target,
        weight_kg: parsed.w,
        display_name: name.trim(),
      });
      toast.success(`ยินดีต้อนรับ ${name.trim()}! เป้า ${res.daily_calorie_target.toLocaleString()} kcal/วัน 🎯`);
    } catch {
      toast.error("บันทึกไม่สำเร็จ ลองอีกครั้ง");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
      <motion.div
        initial={{ y: 24 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
      >
        {/* progress dots */}
        <div className="mb-4 flex justify-center gap-1.5">
          {[0, 1].map((s) => (
            <span
              key={s}
              className={`h-1.5 rounded-full transition-all ${s === step ? "w-6 bg-primary" : "w-1.5 bg-muted"}`}
            />
          ))}
        </div>

        {step === 0 ? (
          <div>
            <div className="mb-5 text-center">
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-2xl">
                👋
              </div>
              <h2 className="text-lg font-bold">ยินดีต้อนรับสู่ LazyFit</h2>
              <p className="mt-1 text-sm text-muted-foreground">ให้เราเรียกคุณว่าอะไรดี?</p>
            </div>

            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && nameOk && setStep(1)}
              placeholder="ชื่อเล่นของคุณ"
              maxLength={40}
              className="h-12 w-full rounded-xl border border-border bg-background px-4 text-center text-base outline-none focus:border-primary"
            />

            <Button
              onClick={() => setStep(1)}
              size="lg"
              className="mt-4 w-full"
              disabled={!nameOk}
            >
              ต่อไป <ArrowRight className="size-4" />
            </Button>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => setStep(0)}
              className="mb-3 flex items-center gap-1 text-sm text-muted-foreground"
            >
              <ArrowLeft className="size-4" /> กลับ
            </button>

            <div className="mb-4">
              <h2 className="text-lg font-bold">สวัสดี {name.trim()} 🙌</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                บอกข้อมูลนิดหน่อย เดี๋ยวคำนวณแคลอรีต่อวันให้พอดีตัว
              </p>
            </div>

            <label className="mb-1.5 block text-sm font-medium">เพศ</label>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {(["male", "female"] as Sex[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSex(s)}
                  className={`h-11 rounded-xl border text-sm font-medium transition-colors ${
                    sex === s ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"
                  }`}
                >
                  {s === "male" ? "ชาย" : "หญิง"}
                </button>
              ))}
            </div>

            <div className="mb-3 grid grid-cols-3 gap-2">
              <Field label="อายุ" unit="ปี" value={age} onChange={setAge} placeholder="28" />
              <Field label="ส่วนสูง" unit="ซม." value={height} onChange={setHeight} placeholder="170" />
              <Field label="น้ำหนัก" unit="กก." value={weight} onChange={setWeight} placeholder="68" />
            </div>

            <label className="mb-1.5 block text-sm font-medium">ระดับกิจกรรม</label>
            <div className="mb-3 space-y-1.5">
              {ACTIVITIES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setActivity(a)}
                  className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                    activity === a ? "border-primary bg-primary/10" : "border-border bg-background"
                  }`}
                >
                  <span
                    className={`size-2 shrink-0 rounded-full ${activity === a ? "bg-primary" : "bg-muted-foreground/40"}`}
                  />
                  {ACTIVITY_LABEL_TH[a]}
                </button>
              ))}
            </div>

            <Field
              label="น้ำหนักเป้าหมาย (ไม่ใส่ก็ได้)"
              unit="กก."
              value={goalWeight}
              onChange={setGoalWeight}
              placeholder="ปล่อยว่าง = รักษาน้ำหนัก"
              wide
            />

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-primary/10 px-4 py-3">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Sparkles className="size-4 text-primary" /> แคลอรีต่อวัน
              </span>
              <span className="text-lg font-bold tabular-nums">
                {preview ? `≈ ${preview.toLocaleString()} kcal` : "—"}
              </span>
            </div>

            <Button
              onClick={handleSubmit}
              size="lg"
              className="mt-3 w-full"
              disabled={!parsed.ok || saving}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              เริ่มใช้งาน
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function Field({
  label,
  unit,
  value,
  onChange,
  placeholder,
  wide,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "block" : undefined}>
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <span className="flex items-center rounded-xl border border-border bg-background px-3 focus-within:border-primary">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(",", "."))}
          placeholder={placeholder}
          className="h-11 w-full bg-transparent text-base outline-none placeholder:text-xs placeholder:text-muted-foreground/60"
        />
        <span className="ml-1 shrink-0 text-xs text-muted-foreground">{unit}</span>
      </span>
    </label>
  );
}
