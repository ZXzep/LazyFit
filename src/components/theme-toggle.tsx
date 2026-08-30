"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label="สลับธีมสว่าง/มืด"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors active:scale-95"
    >
      {mounted ? (
        isDark ? <Sun className="size-5" /> : <Moon className="size-5" />
      ) : (
        <span className="size-5" />
      )}
    </button>
  );
}
