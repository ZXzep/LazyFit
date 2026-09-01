"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, UtensilsCrossed } from "lucide-react";
import { Card } from "@/components/ui/card";
import { addDaysISO, clockLabel, thaiDateLabel } from "@/lib/date";
import { fmt } from "@/lib/utils";
import type { Meal, MealType } from "@/types/db";

const BADGE: Record<MealType, { label: string; cls: string }> = {
  clean: { label: "clean", cls: "bg-primary/20 text-primary-strong" },
  normal: { label: "ปกติ", cls: "bg-muted text-muted-foreground" },
  cheat: { label: "cheat", cls: "bg-rose-500/10 text-rose-600" },
};

const MIN_OFFSET = -400; // ~13 months back is plenty

export function MealHistory({
  meals,
  today,
  tz,
  busy,
  onDelete,
  onFetchDay,
}: {
  meals: Meal[];
  today: string;
  tz: string;
  busy: boolean;
  onDelete: (id: string) => void;
  onFetchDay: (dateISO: string) => Promise<Meal[]>;
}) {
  // 0 = today (live list from props); negative = a past day (fetched + cached)
  const [offset, setOffset] = useState(0);
  const [cache, setCache] = useState<Record<string, Meal[]>>({});
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const isToday = offset === 0;
  const dateISO = isToday ? today : addDaysISO(today, offset);
  const dayMeals = isToday ? meals : (cache[dateISO] ?? []);
  const total = dayMeals.reduce((s, m) => s + m.calories, 0);

  const title = isToday
    ? "มื้อวันนี้"
    : offset === -1
      ? "เมื่อวาน"
      : thaiDateLabel(dateISO);

  async function go(next: number) {
    if (next > 0 || next < MIN_OFFSET) return;
    const iso = next === 0 ? today : addDaysISO(today, next);
    if (next !== 0 && cache[iso] === undefined) {
      setLoading(true);
      setFailed(false);
      try {
        const rows = await onFetchDay(iso);
        setCache((c) => ({ ...c, [iso]: rows }));
      } catch {
        setFailed(true);
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    setOffset(next);
  }

  return (
    <Card>
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="size-5 shrink-0 text-primary-strong" />
            <h2 className="truncate font-semibold">{title}</h2>
          </div>
          {!loading && dayMeals.length > 0 && (
            <p className="ml-7 mt-0.5 text-xs text-muted-foreground">{dayMeals.length} รายการ</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="วันก่อนหน้า"
            onClick={() => go(offset - 1)}
            disabled={loading || offset <= MIN_OFFSET}
            className="flex size-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          {!isToday && (
            <button
              type="button"
              onClick={() => go(0)}
              disabled={loading}
              className="h-7 rounded-full px-2 text-xs font-semibold text-primary-strong disabled:opacity-40"
            >
              วันนี้
            </button>
          )}
          <button
            type="button"
            aria-label="วันถัดไป"
            onClick={() => go(offset + 1)}
            disabled={loading || isToday}
            className="flex size-7 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </header>

      {loading ? (
        <ul className="mt-3 space-y-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-2.5">
              <div className="skeleton h-3 w-10 rounded" />
              <div className="skeleton h-3 flex-1 rounded" />
              <div className="skeleton h-3 w-9 rounded" />
            </li>
          ))}
        </ul>
      ) : failed ? (
        <div className="mt-3 text-sm text-muted-foreground">
          โหลดไม่สำเร็จ{" "}
          <button
            type="button"
            onClick={() => go(offset - 1)}
            className="font-semibold text-primary-strong"
          >
            ลองอีกครั้ง
          </button>
        </div>
      ) : dayMeals.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {isToday
            ? "ยังไม่ได้บันทึกมื้อไหนวันนี้ — ใช้ช่อง AI ด้านบนได้เลย"
            : "วันนี้ไม่มีบันทึกการกิน"}
        </p>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-border">
            {dayMeals.map((m) => {
              const typed =
                m.raw_input && m.raw_input !== "photo" && m.raw_input !== m.food_name
                  ? m.raw_input
                  : null;
              return (
                <li key={m.id} className="flex items-start gap-2.5 py-2.5">
                  <time className="mt-0.5 w-10 shrink-0 text-xs tabular-nums text-muted-foreground">
                    {clockLabel(m.eaten_at, tz)}
                  </time>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium">{m.food_name}</span>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${BADGE[m.meal_type].cls}`}
                      >
                        {BADGE[m.meal_type].label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.protein_g}p · {m.carbs_g}c · {m.fat_g}f
                      {typed ? ` · พิมพ์ว่า “${typed}”` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 pt-0.5 text-sm font-semibold tabular-nums">
                    {fmt(m.calories)}
                  </span>
                  {isToday && (
                    <button
                      type="button"
                      onClick={() => onDelete(m.id)}
                      disabled={busy}
                      aria-label={`ลบ ${m.food_name}`}
                      className="mt-0.5 shrink-0 text-muted-foreground/50 transition-colors hover:text-rose-500 disabled:opacity-40"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm">
            <span className="text-muted-foreground">รวมกินเข้า</span>
            <span className="font-semibold tabular-nums">{fmt(total)} kcal</span>
          </div>
        </>
      )}
    </Card>
  );
}
