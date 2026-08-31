"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2, Sparkles, X } from "lucide-react";
import { say } from "@/lib/toast";
import type { LogMealInput, MealEstimate, MealType } from "@/types/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/utils";

const MEAL_BADGE: Record<MealType, { label: string; cls: string }> = {
  clean: { label: "Clean 🥗", cls: "bg-primary/20 text-primary-strong" },
  normal: { label: "ปกติ 🍚", cls: "bg-muted text-muted-foreground" },
  cheat: { label: "Cheat 🍔", cls: "bg-rose-500/10 text-rose-600" },
};

interface SelectedImage {
  previewUrl: string;
  base64: string;
  mime: string;
}

export function QuickAiEstimator({
  busy,
  onLog,
}: {
  busy: boolean;
  onLog: (input: LogMealInput) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<SelectedImage | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [result, setResult] = useState<MealEstimate | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      say.hint("รูปใหญ่ไป (เกิน 4MB) ถ่ายใหม่หรือย่อก่อนนะ");
      return;
    }
    const dataUrl = await readAsDataUrl(file);
    setImage({ previewUrl: dataUrl, base64: dataUrl.split(",")[1] ?? "", mime: file.type });
    setResult(null);
  }

  async function handleEstimate() {
    if (!text.trim() && !image) {
      say.hint("พิมพ์ชื่ออาหารหรือแนบรูปก่อนนะ");
      return;
    }
    setEstimating(true);
    setResult(null);
    try {
      const res = await fetch("/api/estimate-meal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: text.trim() || undefined,
          imageBase64: image?.base64,
          imageMimeType: image?.mime,
        }),
      });
      const data = (await res.json()) as MealEstimate & { message?: string };
      if (!res.ok) throw new Error(data.message || "ประเมินไม่สำเร็จ");
      setResult(data);
    } catch (err) {
      say.oops(err instanceof Error ? err.message : undefined);
    } finally {
      setEstimating(false);
    }
  }

  async function handleLog() {
    if (!result) return;
    try {
      await onLog({
        food_name: result.food_name,
        calories: Math.round(result.calories),
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        meal_type: result.meal_type,
        tip: result.tip,
        confidence: result.confidence,
        source: image ? "ai_image" : "ai_text",
        raw_input: text.trim() || (image ? "photo" : undefined),
      });
      say.mealLogged();
      setText("");
      setImage(null);
      setResult(null);
    } catch {
      say.oops();
    }
  }

  return (
    <Card>
      <header className="flex items-center gap-2">
        <Sparkles className="size-5 text-primary-strong" />
        <h2 className="font-semibold">ให้ AI ช่วยนับแคลอรี</h2>
      </header>

      <div className="mt-3 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleEstimate()}
          placeholder="เช่น กะเพราหมูกรอบไข่ดาว"
          enterKeyHint="search"
          className="h-12 flex-1 rounded-xl border border-border bg-background px-3.5 text-base outline-none transition-colors focus:border-primary"
        />
        <button
          type="button"
          aria-label="ถ่ายรูป / เลือกรูปอาหาร"
          onClick={() => fileRef.current?.click()}
          className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border bg-card active:scale-95"
        >
          <Camera className="size-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePickImage}
        />
      </div>

      {image && (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-muted/50 p-2">
          <Image
            src={image.previewUrl}
            alt="อาหารที่แนบ"
            width={48}
            height={48}
            unoptimized
            className="size-12 rounded-lg object-cover"
          />
          <span className="flex-1 text-sm text-muted-foreground">แนบรูปแล้ว</span>
          <button
            type="button"
            aria-label="ลบรูป"
            onClick={() => setImage(null)}
            className="flex size-8 items-center justify-center rounded-lg hover:bg-background"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <Button
        onClick={handleEstimate}
        size="lg"
        className="mt-3 w-full"
        disabled={estimating || busy}
      >
        {estimating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {estimating ? "กำลังประเมิน..." : "ประเมินแคลอรี"}
      </Button>

      {result && (
        <div className="card-in">
          <div className="mt-4 rounded-2xl border border-border bg-background/60 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{result.food_name}</p>
                  <p className="mt-0.5 text-2xl font-bold tabular-nums">
                    {fmt(result.calories)} <span className="text-sm font-normal text-muted-foreground">kcal</span>
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${MEAL_BADGE[result.meal_type].cls}`}
                >
                  {MEAL_BADGE[result.meal_type].label}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                <Macro label="โปรตีน" value={result.protein} />
                <Macro label="คาร์บ" value={result.carbs} />
                <Macro label="ไขมัน" value={result.fat} />
              </div>

              {result.tip && (
                <p className="mt-3 rounded-xl bg-primary/10 px-3 py-2 text-sm text-foreground/90">
                  💡 {result.tip}
                </p>
              )}

              <Button onClick={handleLog} size="lg" className="mt-3 w-full" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                บันทึกมื้อนี้
              </Button>
            {typeof result.confidence === "number" && (
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                ความมั่นใจของ AI ~{Math.round(result.confidence * 100)}% · แก้ตัวเลขเองได้ภายหลัง
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function Macro({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/60 py-2">
      <div className="font-semibold tabular-nums">{value}g</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
