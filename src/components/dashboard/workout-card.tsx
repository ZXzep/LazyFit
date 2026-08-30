"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Flame, Loader2, Pause, Play, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DURATION_PRESETS } from "@/lib/calories";
import {
  ACTIVITY_EMOJI_CHOICES,
  BUILTIN_ACTIVITIES,
  INTENSITY,
} from "@/lib/activities";
import { clockLabel } from "@/lib/date";
import { useWorkoutTimer } from "@/hooks/use-workout-timer";
import type { ActivityRef, UserActivity, Workout } from "@/types/db";

function mmss(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function sameActivity(a: ActivityRef, b: ActivityRef) {
  if (a.kind === "builtin" && b.kind === "builtin") return a.key === b.key;
  if (a.kind === "custom" && b.kind === "custom") return a.id === b.id;
  return false;
}

export function WorkoutCard({
  streak,
  busy,
  workouts,
  activities,
  tz,
  onLog,
  onDeleteWorkout,
  onAddActivity,
  onDeleteActivity,
}: {
  streak: number;
  busy: boolean;
  workouts: Workout[];
  activities: UserActivity[];
  tz: string;
  onLog: (payload: { minutes: number; activity: ActivityRef }) => void;
  onDeleteWorkout: (id: string) => void;
  onAddActivity: (input: { name: string; emoji?: string; met: number }) => Promise<UserActivity>;
  onDeleteActivity: (id: string) => void;
}) {
  const options: ActivityRef[] = useMemo(
    () => [
      ...BUILTIN_ACTIVITIES.map((b) => ({ kind: "builtin" as const, key: b.key, label: b.label, emoji: b.emoji, met: b.met })),
      ...activities.map((a) => ({ kind: "custom" as const, id: a.id, label: a.name, emoji: a.emoji, met: Number(a.met) })),
    ],
    [activities],
  );

  const [selected, setSelected] = useState<ActivityRef>(options[0]);
  const [adding, setAdding] = useState(false);
  const timer = useWorkoutTimer<ActivityRef>();
  const { active: timerActive, done: timerDone, activity: timerActivity, finish: timerFinish } = timer;
  const finishing = useRef(false);

  // keep the selection valid if a custom activity gets deleted
  useEffect(() => {
    if (!options.some((o) => sameActivity(o, selected))) setSelected(options[0]);
  }, [options, selected]);

  const todayMin = workouts.reduce((s, w) => s + w.duration_min, 0);

  const submit = useCallback(() => {
    if (finishing.current) return;
    finishing.current = true;
    const activity = timerActivity ?? selected;
    const minutes = timerFinish();
    onLog({ minutes, activity });
  }, [timerActivity, timerFinish, onLog, selected]);

  // auto-log a completed countdown
  useEffect(() => {
    if (!timerActive) {
      finishing.current = false;
      return;
    }
    if (timerDone) submit();
  }, [timerActive, timerDone, submit]);

  return (
    <Card>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">{selected.emoji ?? "🏃"}</span>
          <h2 className="font-semibold">ออกกำลังกาย</h2>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-1 text-xs font-medium text-orange-600 dark:text-orange-400">
          <Flame className="size-3.5" />
          {streak} วันติด
        </span>
      </header>

      {timer.active ? (
        <TimerView timer={timer} tz={tz} onFinish={submit} />
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            {todayMin > 0 ? `วันนี้ขยับไปแล้ว ${todayMin} นาที` : "เลือกกิจกรรม แล้วเริ่มจับเวลา"}
          </p>

          {/* activity picker */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {options.map((o) => {
              const active = sameActivity(o, selected);
              return (
                <button
                  key={o.kind === "builtin" ? `b-${o.key}` : `c-${o.id}`}
                  type="button"
                  onClick={() => setSelected(o)}
                  className={`group inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-sm transition-colors ${
                    active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"
                  }`}
                >
                  <span>{o.emoji ?? "•"}</span>
                  {o.label}
                  {o.kind === "custom" && active && (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`ลบ ${o.label}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteActivity(o.id);
                      }}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-rose-500/15"
                    >
                      <X className="size-3" />
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1.5 text-sm text-muted-foreground"
            >
              <Plus className="size-3.5" /> เพิ่ม
            </button>
          </div>

          {adding && (
            <AddActivityForm
              busy={busy}
              onCancel={() => setAdding(false)}
              onAdd={async (input) => {
                try {
                  const row = await onAddActivity(input);
                  setSelected({
                    kind: "custom",
                    id: row.id,
                    label: row.name,
                    emoji: row.emoji,
                    met: Number(row.met),
                  });
                  setAdding(false);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "เพิ่มไม่สำเร็จ");
                }
              }}
            />
          )}

          {/* duration presets */}
          <div className="mt-3 grid grid-cols-4 gap-2">
            {DURATION_PRESETS.map((m) => (
              <motion.button
                key={m}
                type="button"
                whileTap={{ scale: 0.9 }}
                disabled={busy}
                onClick={() => timer.start("countdown", selected, m)}
                className="flex h-16 flex-col items-center justify-center rounded-2xl border border-border bg-muted/40 font-semibold transition-colors hover:bg-primary/10 active:bg-primary/20 disabled:opacity-50"
              >
                <span className="text-lg leading-none tabular-nums">{m}</span>
                <span className="mt-0.5 text-[11px] font-normal text-muted-foreground">นาที</span>
              </motion.button>
            ))}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => timer.start("countup", selected)}
            className="mt-2 w-full rounded-2xl border border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/40 disabled:opacity-50"
          >
            ไม่กำหนดเวลา — นับขึ้นจนกว่าจะพอ
          </button>
        </>
      )}

      {workouts.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-border pt-3">
          {workouts.map((w) => (
            <li key={w.id} className="flex items-center gap-2 text-sm">
              <span className="w-10 shrink-0 text-xs tabular-nums text-muted-foreground">
                {clockLabel(w.performed_at, tz)}
              </span>
              <span className="flex-1 truncate">
                {w.activity_emoji ? `${w.activity_emoji} ` : ""}
                {w.activity} · {w.duration_min} นาที
              </span>
              <span className="shrink-0 tabular-nums text-emerald-600 dark:text-emerald-400">
                −{w.calories_burned}
              </span>
              <button
                type="button"
                onClick={() => onDeleteWorkout(w.id)}
                disabled={busy}
                aria-label="ลบ"
                className="shrink-0 text-muted-foreground/50 hover:text-rose-500 disabled:opacity-40"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function TimerView({
  timer,
  tz,
  onFinish,
}: {
  timer: ReturnType<typeof useWorkoutTimer<ActivityRef>>;
  tz: string;
  onFinish: () => void;
}) {
  const isCountdown = timer.mode === "countdown";
  const shownSec = isCountdown ? timer.remainingSec ?? 0 : timer.elapsedSec;
  const progress =
    isCountdown && timer.targetSec > 0 ? 1 - (timer.remainingSec ?? 0) / timer.targetSec : 0;
  const activity = timer.activity;

  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <div className="mt-3 flex flex-col items-center">
      <div className="text-sm font-medium">
        {activity?.emoji ? `${activity.emoji} ` : ""}
        {activity?.label ?? "ออกกำลังกาย"}
      </div>

      <div className="relative mt-2 flex size-40 items-center justify-center">
        <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
          <circle cx="60" cy="60" r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          {isCountdown && (
            <circle
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              className="transition-[stroke-dashoffset] duration-500 ease-linear"
            />
          )}
        </svg>
        <div className="text-center">
          <div className="text-4xl font-bold tabular-nums">{mmss(shownSec)}</div>
          <div className="text-[11px] text-muted-foreground">
            {isCountdown ? "เหลือ" : "นับขึ้น"}
          </div>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        เริ่มเมื่อ {timer.sessionStartMs ? clockLabel(new Date(timer.sessionStartMs), tz) : "—"}
        {!timer.running && " · พักอยู่ ⏸"}
      </p>

      <div className="mt-3 grid w-full grid-cols-2 gap-2">
        {timer.running ? (
          <Button variant="outline" size="lg" onClick={timer.pause}>
            <Pause className="size-4" /> พัก
          </Button>
        ) : (
          <Button variant="outline" size="lg" onClick={timer.resume}>
            <Play className="size-4" /> เล่นต่อ
          </Button>
        )}
        <Button size="lg" onClick={onFinish}>
          <Check className="size-4" /> {isCountdown ? "จบเลย" : "พอแล้ว"}
        </Button>
      </div>
      <button
        type="button"
        onClick={timer.cancel}
        className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-500"
      >
        <X className="size-3.5" /> ยกเลิก (ไม่บันทึก)
      </button>
    </div>
  );
}

function AddActivityForm({
  busy,
  onAdd,
  onCancel,
}: {
  busy: boolean;
  onAdd: (input: { name: string; emoji?: string; met: number }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(ACTIVITY_EMOJI_CHOICES[0]);
  const [intensityKey, setIntensityKey] = useState<(typeof INTENSITY)[number]["key"]>("moderate");
  const [saving, setSaving] = useState(false);

  const met = INTENSITY.find((i) => i.key === intensityKey)!.met;

  return (
    <div className="mt-3 rounded-2xl border border-border bg-muted/30 p-3">
      <div className="flex gap-2">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-lg">
          {emoji}
        </span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ชื่อกิจกรรม เช่น ฮูลาฮูป"
          maxLength={30}
          className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-base outline-none focus:border-primary"
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {ACTIVITY_EMOJI_CHOICES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEmoji(e)}
            className={`flex size-8 items-center justify-center rounded-lg text-base ${
              emoji === e ? "bg-primary/15 ring-1 ring-primary" : "hover:bg-background"
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {INTENSITY.map((i) => (
          <button
            key={i.key}
            type="button"
            onClick={() => setIntensityKey(i.key)}
            className={`h-9 rounded-xl border text-sm transition-colors ${
              intensityKey === i.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background"
            }`}
          >
            {i.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <Button variant="ghost" size="sm" className="flex-1" onClick={onCancel}>
          ยกเลิก
        </Button>
        <Button
          size="sm"
          className="flex-1"
          disabled={busy || saving || name.trim().length === 0}
          onClick={async () => {
            setSaving(true);
            await onAdd({ name: name.trim(), emoji, met });
            setSaving(false);
          }}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          เพิ่ม
        </Button>
      </div>
    </div>
  );
}
