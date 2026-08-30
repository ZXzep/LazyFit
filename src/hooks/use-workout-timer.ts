"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";

const STORAGE_KEY = "lazyfit:workout-timer:v1";

export type TimerMode = "countdown" | "countup";

/** Persisted so a session survives a reload / the phone screen turning off. */
interface Snapshot {
  mode: TimerMode;
  targetSec: number; // 0 for count-up
  activity: unknown; // opaque payload the caller needs back on finish
  sessionStartMs: number; // first start — never changes (for the "เริ่มเมื่อ" label)
  segmentStartMs: number; // start of the current running segment
  bankedSec: number; // elapsed accumulated before the current segment (from pauses)
  running: boolean;
}

function read(): Snapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return typeof p?.sessionStartMs === "number" ? (p as Snapshot) : null;
  } catch {
    return null;
  }
}

function persist(s: Snapshot | null) {
  try {
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode / disabled storage — timer just won't survive reloads */
  }
}

function elapsedOf(s: Snapshot): number {
  return s.bankedSec + (s.running ? (Date.now() - s.segmentStartMs) / 1000 : 0);
}

export interface WorkoutTimer<A = unknown> {
  active: boolean;
  mode: TimerMode | null;
  running: boolean;
  targetSec: number;
  elapsedSec: number;
  remainingSec: number | null; // null for count-up
  done: boolean; // countdown reached zero
  sessionStartMs: number | null;
  activity: A | null;
  start: (mode: TimerMode, activity: A, minutes?: number) => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  /** clears the timer and returns whole elapsed minutes (>= 1) */
  finish: () => number;
}

export function useWorkoutTimer<A = unknown>(): WorkoutTimer<A> {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const ref = useRef<Snapshot | null>(null);
  const [, tick] = useReducer((n: number) => n + 1, 0);

  const set = useCallback((s: Snapshot | null) => {
    ref.current = s;
    persist(s);
    setSnap(s);
  }, []);

  // rehydrate on mount
  useEffect(() => {
    const s = read();
    ref.current = s;
    setSnap(s);
  }, []);

  // 1s display tick while running
  useEffect(() => {
    if (!snap?.running) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [snap?.running]);

  // recompute the moment the tab comes back to the foreground
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const start = useCallback(
    (mode: TimerMode, activity: A, minutes = 0) => {
      const now = Date.now();
      set({
        mode,
        targetSec: mode === "countdown" ? Math.round(minutes * 60) : 0,
        activity,
        sessionStartMs: now,
        segmentStartMs: now,
        bankedSec: 0,
        running: true,
      });
    },
    [set],
  );

  const pause = useCallback(() => {
    const s = ref.current;
    if (!s || !s.running) return;
    set({ ...s, bankedSec: elapsedOf(s), running: false });
  }, [set]);

  const resume = useCallback(() => {
    const s = ref.current;
    if (!s || s.running) return;
    set({ ...s, segmentStartMs: Date.now(), running: true });
  }, [set]);

  const cancel = useCallback(() => set(null), [set]);

  const finish = useCallback((): number => {
    const s = ref.current;
    const sec = s ? elapsedOf(s) : 0;
    set(null);
    return Math.max(1, Math.round(sec / 60));
  }, [set]);

  const elapsedSec = snap ? Math.floor(elapsedOf(snap)) : 0;
  const remainingSec =
    snap && snap.mode === "countdown" ? Math.max(0, snap.targetSec - elapsedSec) : null;

  return {
    active: !!snap,
    mode: snap?.mode ?? null,
    running: !!snap?.running,
    targetSec: snap?.targetSec ?? 0,
    elapsedSec,
    remainingSec,
    done: snap?.mode === "countdown" && remainingSec === 0,
    sessionStartMs: snap?.sessionStartMs ?? null,
    activity: (snap?.activity ?? null) as A | null,
    start,
    pause,
    resume,
    cancel,
    finish,
  };
}
