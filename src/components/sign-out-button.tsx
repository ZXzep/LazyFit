"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    try {
      await createClient().auth.signOut({ scope: "local" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      aria-label="ออกจากระบบ"
      title="ออกจากระบบ"
      onClick={signOut}
      disabled={loading}
      className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors active:scale-95 disabled:opacity-50"
    >
      <LogOut className="size-5" />
    </button>
  );
}
