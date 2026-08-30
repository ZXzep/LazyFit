"use client";

import { Trash2, UtensilsCrossed } from "lucide-react";
import { Card } from "@/components/ui/card";
import { clockLabel } from "@/lib/date";
import { fmt } from "@/lib/utils";
import type { Meal, MealType } from "@/types/db";

const BADGE: Record<MealType, { label: string; cls: string }> = {
  clean: { label: "clean", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  normal: { label: "ปกติ", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  cheat: { label: "cheat", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
};

export function MealHistory({
  meals,
  tz,
  busy,
  onDelete,
}: {
  meals: Meal[];
  tz: string;
  busy: boolean;
  onDelete: (id: string) => void;
}) {
  const total = meals.reduce((s, m) => s + m.calories, 0);

  return (
    <Card>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="size-5 text-primary" />
          <h2 className="font-semibold">มื้อวันนี้</h2>
        </div>
        {meals.length > 0 && (
          <span className="text-xs text-muted-foreground">{meals.length} รายการ</span>
        )}
      </header>

      {meals.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          ยังไม่ได้บันทึกมื้อไหนวันนี้ — ใช้ช่อง AI ด้านบนได้เลย
        </p>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-border">
            {meals.map((m) => {
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
                  <button
                    type="button"
                    onClick={() => onDelete(m.id)}
                    disabled={busy}
                    aria-label={`ลบ ${m.food_name}`}
                    className="mt-0.5 shrink-0 text-muted-foreground/50 transition-colors hover:text-rose-500 disabled:opacity-40"
                  >
                    <Trash2 className="size-4" />
                  </button>
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
