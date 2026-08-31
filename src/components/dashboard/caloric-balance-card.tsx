"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { fmt } from "@/lib/utils";

export function CaloricBalanceCard({
  caloriesIn,
  caloriesOut,
  target,
}: {
  caloriesIn: number;
  caloriesOut: number;
  target: number;
}) {
  const net = caloriesIn - caloriesOut;
  const budgetLeft = target - net;
  const pct = target > 0 ? (net / target) * 100 : 0;
  const over = budgetLeft < 0;

  return (
    <Card className="border-primary bg-primary text-primary-foreground shadow-[0_14px_34px_hsl(var(--primary)/0.24)]">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">สมดุลวันนี้</h2>
        <span className="text-xs text-foreground/60">เป้า {fmt(target)} kcal</span>
      </div>

      <div className="mt-2 flex items-end gap-1.5">
        <span className={`text-4xl font-bold tabular-nums ${over ? "text-rose-500" : ""}`}>
          {fmt(Math.abs(budgetLeft))}
        </span>
        <span className="mb-1 text-sm text-foreground/60">
          kcal {over ? "เกินเป้า" : "เหลือกินได้"}
        </span>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-foreground/10">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${over ? "bg-rose-500" : "bg-foreground"}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 rounded-xl bg-background/55 px-3 py-2">
          <ArrowUpRight className="size-4 shrink-0 text-rose-500" />
          <div className="min-w-0">
            <div className="text-xs text-foreground/55">กินเข้า</div>
            <div className="font-semibold tabular-nums">{fmt(caloriesIn)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-background/55 px-3 py-2">
          <ArrowDownRight className="size-4 shrink-0 text-primary-strong" />
          <div className="min-w-0">
            <div className="text-xs text-foreground/55">เบิร์นออก</div>
            <div className="font-semibold tabular-nums">{fmt(caloriesOut)}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
