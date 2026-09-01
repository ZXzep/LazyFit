"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Plus, Trash2 } from "lucide-react";
import { say } from "@/lib/toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddActivityForm } from "@/components/dashboard/add-activity-form";
import { ThemeApply, applyThemeNow } from "@/components/theme-apply";
import { BUILTIN_ACTIVITIES } from "@/lib/activities";
import { THEMES, normalizeTheme, type ThemeKey } from "@/lib/themes";
import { addActivity, deleteActivity } from "@/app/dashboard/actions";
import { setActivityKeys, setTheme, updateProfileSettings } from "./actions";
import type { Profile, UserActivity } from "@/types/db";

export function SettingsClient({
  profile,
  initialActivities,
}: {
  profile: Profile;
  initialActivities: UserActivity[];
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 pb-16 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <header className="flex items-center gap-2 py-3">
        <Link
          href="/dashboard"
          aria-label="กลับ"
          className="flex size-9 items-center justify-center rounded-full border border-border bg-card"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-xl font-bold">ตั้งค่า</h1>
      </header>

      <div className="mt-1 space-y-4">
        <ProfileSection profile={profile} />
        <ThemeSection initial={normalizeTheme(profile.theme)} />
        <ActivitySection profile={profile} initialActivities={initialActivities} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ThemeSection({ initial }: { initial: ThemeKey }) {
  const [theme, setThemeState] = useState<ThemeKey>(initial);

  async function choose(key: ThemeKey) {
    if (key === theme) return;
    const prev = theme;
    setThemeState(key);
    applyThemeNow(key); // instant
    try {
      await setTheme(key);
      say.settingsSaved();
    } catch {
      setThemeState(prev);
      applyThemeNow(prev);
      say.oops();
    }
  }

  return (
    <Card>
      <ThemeApply theme={theme} />
      <h2 className="font-semibold">ธีมสี</h2>
      <p className="mt-1 text-sm text-muted-foreground">เลือกสีที่ชอบ เปลี่ยนได้ตลอด</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {THEMES.map((t) => {
          const active = t.key === theme;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => choose(t.key)}
              aria-pressed={active}
              className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition-colors ${
                active ? "border-primary bg-primary/10" : "border-border bg-background"
              }`}
            >
              <span
                className="size-7 shrink-0 rounded-full border border-black/10"
                style={{ background: t.swatch }}
              />
              <span className="text-sm font-medium">{t.label}</span>
              {active && <Check className="ml-auto size-4 text-primary-strong" />}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------

function ProfileSection({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.display_name ?? "");
  const [target, setTarget] = useState(String(profile.daily_calorie_target));
  const [quota, setQuota] = useState(String(profile.weekly_cheat_quota));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateProfileSettings({
        display_name: name.trim() || undefined,
        daily_calorie_target: Number(target) || undefined,
        weekly_cheat_quota: Number.isFinite(Number(quota)) ? Number(quota) : undefined,
      });
      say.settingsSaved();
    } catch (e) {
      say.oops(e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="font-semibold">โปรไฟล์</h2>
      <div className="mt-3 space-y-3">
        <Field label="ชื่อเล่น">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base outline-none focus:border-primary"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="เป้าแคลอรี/วัน">
            <input
              inputMode="numeric"
              value={target}
              onChange={(e) => setTarget(e.target.value.replace(/\D/g, ""))}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base tabular-nums outline-none focus:border-primary"
            />
          </Field>
          <Field label="Cheat/สัปดาห์">
            <input
              inputMode="numeric"
              value={quota}
              onChange={(e) => setQuota(e.target.value.replace(/\D/g, ""))}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base tabular-nums outline-none focus:border-primary"
            />
          </Field>
        </div>
      </div>
      <Button onClick={save} size="lg" className="mt-4 w-full" disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        บันทึกโปรไฟล์
      </Button>
    </Card>
  );
}

// ---------------------------------------------------------------------------

function ActivitySection({
  profile,
  initialActivities,
}: {
  profile: Profile;
  initialActivities: UserActivity[];
}) {
  const [keys, setKeys] = useState<Set<string>>(new Set(profile.activity_keys));
  const [customs, setCustoms] = useState<UserActivity[]>(initialActivities);
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState(false);

  async function toggle(key: string) {
    const next = new Set(keys);
    if (next.has(key)) {
      if (next.size === 1 && customs.length === 0) {
        say.hint("เปิดไว้อย่างน้อย 1 อย่างนะ ไม่งั้นไม่มีให้เลือก");
        return;
      }
      next.delete(key);
    } else {
      next.add(key);
    }
    setKeys(next);
    setPending(true);
    try {
      await setActivityKeys([...next]);
    } catch {
      setKeys(keys);
      say.oops();
    } finally {
      setPending(false);
    }
  }

  async function removeCustom(id: string) {
    const snapshot = customs;
    setCustoms((c) => c.filter((a) => a.id !== id));
    try {
      await deleteActivity(id);
      say.removed();
    } catch {
      setCustoms(snapshot);
      say.oops();
    }
  }

  return (
    <Card>
      <h2 className="font-semibold">กิจกรรมออกกำลังกาย</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        เปิดเฉพาะที่เล่นจริง จะได้ไม่รก — หน้าออกกำลังกายจะโชว์แค่ที่เปิดไว้
      </p>

      <ul className="mt-3 divide-y divide-border">
        {BUILTIN_ACTIVITIES.map((a) => (
          <li key={a.key} className="flex items-center gap-3 py-2.5">
            <span className="text-lg">{a.emoji}</span>
            <span className="flex-1 text-sm font-medium">{a.label}</span>
            <Switch on={keys.has(a.key)} disabled={pending} onToggle={() => toggle(a.key)} />
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">กิจกรรมที่เพิ่มเอง</h3>
          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary-strong"
            >
              <Plus className="size-4" /> เพิ่ม
            </button>
          )}
        </div>

        {customs.length === 0 && !adding && (
          <p className="mt-1 text-sm text-muted-foreground">ยังไม่มี</p>
        )}

        <ul className="mt-2 divide-y divide-border">
          {customs.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2.5">
              <span className="text-lg">{a.emoji ?? "•"}</span>
              <span className="flex-1 text-sm font-medium">{a.name}</span>
              <button
                type="button"
                aria-label={`ลบ ${a.name}`}
                onClick={() => removeCustom(a.id)}
                className="text-muted-foreground/60 hover:text-rose-500"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>

        {adding && (
          <div className="mt-3">
            <AddActivityForm
              onCancel={() => setAdding(false)}
              onAdd={addActivity}
              onDone={(row) => {
                setCustoms((c) => [...c, row]);
                setAdding(false);
                say.activityAdded(row.name);
              }}
            />
          </div>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Switch({
  on,
  disabled,
  onToggle,
}: {
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onToggle}
      className={`flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors disabled:opacity-50 ${
        on ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          on ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
