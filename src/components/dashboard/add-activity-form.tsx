"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { say } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { ACTIVITY_EMOJI_CHOICES, INTENSITY } from "@/lib/activities";
import type { UserActivity } from "@/types/db";

export function AddActivityForm({
  busy,
  onAdd,
  onDone,
  onCancel,
}: {
  busy?: boolean;
  onAdd: (input: { name: string; emoji?: string; met: number }) => Promise<UserActivity>;
  onDone?: (row: UserActivity) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(ACTIVITY_EMOJI_CHOICES[0]);
  const [intensityKey, setIntensityKey] =
    useState<(typeof INTENSITY)[number]["key"]>("moderate");
  const [saving, setSaving] = useState(false);

  const met = INTENSITY.find((i) => i.key === intensityKey)!.met;

  async function submit() {
    setSaving(true);
    try {
      const row = await onAdd({ name: name.trim(), emoji, met });
      onDone?.(row);
    } catch (e) {
      say.oops(e instanceof Error ? e.message : undefined);
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-3">
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
                ? "border-primary bg-primary/15 text-primary-strong"
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
          onClick={submit}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          เพิ่ม
        </Button>
      </div>
    </div>
  );
}
