"use client";

import { useEffect } from "react";
import type { ThemeKey } from "@/lib/themes";

/**
 * Keeps <html data-theme> and localStorage in sync with the server value.
 * The inline script in the root layout applies localStorage before paint;
 * this reconciles it with the profile (e.g. on a new device).
 */
export function ThemeApply({ theme }: { theme: ThemeKey }) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("lazyfit-theme", theme);
    } catch {
      /* private mode — fine, server value still applies via prop */
    }
  }, [theme]);

  return null;
}

/** Optimistic apply used by the settings picker before the server round-trip. */
export function applyThemeNow(theme: ThemeKey) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("lazyfit-theme", theme);
  } catch {
    /* ignore */
  }
}
