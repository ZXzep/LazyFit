"use client";

import { motion } from "framer-motion";
import { Flame, Footprints } from "lucide-react";
import { Card } from "@/components/ui/card";
import { STEPPER_PRESETS } from "@/lib/calories";

export function StepperLogger({
  todayMinutes,
  streak,
  busy,
  onLog,
}: {
  todayMinutes: number;
  streak: number;
  busy: boolean;
  onLog: (minutes: number) => void;
}) {
  return (
    <Card>
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Footprints className="size-5 text-primary" />
          <h2 className="font-semibold">Stepper วันนี้</h2>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-1 text-xs font-medium text-orange-600 dark:text-orange-400">
          <Flame className="size-3.5" />
          {streak} วันติด
        </span>
      </header>

      <p className="mt-1 text-sm text-muted-foreground">
        {todayMinutes > 0
          ? `วันนี้เหยียบไปแล้ว ${todayMinutes} นาที — เพิ่มอีกได้`
          : "เหยียบเสร็จแล้วแตะปุ่มเดียว บันทึกทันที"}
      </p>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {STEPPER_PRESETS.map((m) => (
          <motion.button
            key={m}
            type="button"
            whileTap={{ scale: 0.9 }}
            disabled={busy}
            onClick={() => onLog(m)}
            className="flex h-16 flex-col items-center justify-center rounded-2xl border border-border bg-muted/40 font-semibold transition-colors hover:bg-primary/10 active:bg-primary/20 disabled:opacity-50"
          >
            <span className="text-lg leading-none tabular-nums">{m}</span>
            <span className="mt-0.5 text-[11px] font-normal text-muted-foreground">นาที</span>
          </motion.button>
        ))}
      </div>
    </Card>
  );
}
