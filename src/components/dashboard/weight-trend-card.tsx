"use client";

import { useState } from "react";
import { Plus, Scale } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { WeightPoint } from "@/types/db";

export function WeightTrendCard({
  points,
  goalKg,
  busy,
  onLog,
}: {
  points: WeightPoint[];
  goalKg: number | null;
  busy: boolean;
  onLog: (kg: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const latest = points.at(-1)?.weight_kg ?? null;
  const first = points[0]?.weight_kg ?? null;
  const delta = latest != null && first != null ? latest - first : 0;
  const toGoal = latest != null && goalKg != null ? latest - goalKg : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const kg = parseFloat(value.replace(",", "."));
    if (!Number.isFinite(kg) || kg < 20 || kg > 400) return;
    onLog(kg);
    setValue("");
    setOpen(false);
  }

  return (
    <Card>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="size-5 text-primary" />
          <h2 className="font-semibold">น้ำหนัก</h2>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
          <Plus className="size-4" />
          บันทึก
        </Button>
      </header>

      {open && (
        <form onSubmit={submit} className="mt-3 flex gap-2">
          <input
            inputMode="decimal"
            autoFocus
            placeholder="เช่น 68.5"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-base outline-none focus:border-primary"
          />
          <Button type="submit" className="h-11" disabled={busy}>
            บันทึก
          </Button>
        </form>
      )}

      <div className="mt-3">
        <Sparkline values={points.map((p) => p.weight_kg)} />
      </div>

      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          ล่าสุด{" "}
          <span className="font-semibold text-foreground">
            {latest != null ? `${latest} กก.` : "—"}
          </span>
        </span>
        <span
          className={delta <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}
        >
          {delta > 0 ? "+" : ""}
          {delta.toFixed(1)} กก.
          {toGoal != null ? ` · เหลือถึงเป้า ${toGoal.toFixed(1)}` : ""}
        </span>
      </div>
    </Card>
  );
}

/** Minimal dependency-free line chart. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return (
      <div className="flex h-16 items-center justify-center rounded-xl bg-muted/40 text-xs text-muted-foreground">
        บันทึกอย่างน้อย 2 ครั้ง เพื่อดูแนวโน้ม
      </div>
    );
  }

  const W = 320;
  const H = 64;
  const P = 6;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = (W - P * 2) / (values.length - 1);

  const pts = values.map((v, i) => {
    const x = P + i * stepX;
    const y = H - P - ((v - min) / span) * (H - P * 2);
    return [x, y] as const;
  });

  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L ${pts.at(-1)![0].toFixed(1)} ${H} L ${pts[0][0].toFixed(1)} ${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full" preserveAspectRatio="none">
      <path d={area} fill="hsl(var(--primary))" fillOpacity={0.12} />
      <path
        d={line}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r={3} fill="hsl(var(--primary))" />
    </svg>
  );
}
