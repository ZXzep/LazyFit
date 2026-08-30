"use client";

import { useMemo } from "react";
import { PartyPopper } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { thaiWeekday } from "@/lib/date";
import { fmt } from "@/lib/utils";
import type { WeekDay } from "@/types/db";

export function WeeklyFlexCard({ week, cheatQuota }: { week: WeekDay[]; cheatQuota: number }) {
  const { cheatUsed, remaining, pct, netWeek, activeDays } = useMemo(() => {
    const cheatUsed = week.reduce((s, d) => s + d.cheat_count, 0);
    return {
      cheatUsed,
      remaining: Math.max(0, cheatQuota - cheatUsed),
      pct: cheatQuota > 0 ? (cheatUsed / cheatQuota) * 100 : 0,
      netWeek: week.reduce((s, d) => s + d.net, 0),
      activeDays: week.filter((d) => d.calories_out > 0).length,
    };
  }, [week, cheatQuota]);

  const overQuota = cheatUsed > cheatQuota;

  return (
    <Card>
      <header className="flex items-center gap-2">
        <PartyPopper className="size-5 text-amber-500" />
        <h2 className="font-semibold">ยืดหยุ่น 80/20 สัปดาห์นี้</h2>
      </header>

      <div className="mt-3">
        <div className="flex items-end justify-between text-sm">
          <span className="text-muted-foreground">โควตา Cheat Meal</span>
          <span className="font-semibold tabular-nums">
            {cheatUsed}/{cheatQuota}
          </span>
        </div>
        <Progress
          value={pct}
          className="mt-2"
          indicatorClassName={overQuota ? "bg-rose-500" : "bg-amber-500"}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          {overQuota
            ? "เกินโควตานิดหน่อย ไม่เป็นไร สัปดาห์หน้าเริ่มใหม่"
            : remaining > 0
              ? `เหลืออีก ${remaining} มื้อ กินให้สนุกแบบไม่ต้องรู้สึกผิด`
              : "ใช้ครบพอดี เป๊ะมาก 👏"}
        </p>
      </div>

      {/* tiny 7-day net-calorie bar strip */}
      <div className="mt-4 flex items-end justify-between gap-1">
        {(() => {
          const max = Math.max(1, ...week.map((x) => Math.abs(x.net)));
          return week.map((d) => {
            const h = Math.max(4, (Math.abs(d.net) / max) * 36);
            const deficit = d.net <= 0;
            return (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`w-full rounded-md ${deficit ? "bg-primary/70" : "bg-rose-400/70"}`}
                  style={{ height: `${h}px` }}
                />
                <span className="text-[10px] text-muted-foreground">{thaiWeekday(d.day)}</span>
              </div>
            );
          });
        })()}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-muted/50 px-3 py-2">
          <div className="text-xs text-muted-foreground">สมดุลทั้งสัปดาห์</div>
          <div
            className={`font-semibold tabular-nums ${netWeek <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}
          >
            {netWeek > 0 ? "+" : ""}
            {fmt(netWeek)} kcal
          </div>
        </div>
        <div className="rounded-xl bg-muted/50 px-3 py-2">
          <div className="text-xs text-muted-foreground">วันที่ขยับ</div>
          <div className="font-semibold tabular-nums">{activeDays}/7 วัน</div>
        </div>
      </div>
    </Card>
  );
}
