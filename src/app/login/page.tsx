"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();

  // Created lazily so the page still prerenders before Supabase env vars exist.
  const supabaseRef = useRef<ReturnType<typeof createClient>>();
  const getSupabase = () => (supabaseRef.current ??= createClient());

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = getSupabase();
    const creds = { email: email.trim(), password };

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword(creds);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp(creds);
        if (error) throw error;
        if (!data.session) {
          toast.success("สร้างบัญชีแล้ว — ยืนยันอีเมลก่อนเข้าสู่ระบบ");
          setMode("signin");
          setLoading(false);
          return;
        }
      }
      // cookie is set by @supabase/ssr — let the server pick it up, then go.
      router.refresh();
      router.replace("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-3xl bg-primary text-3xl shadow-lg shadow-primary/20">
          🥗
        </div>
        <h1 className="text-2xl font-bold">LazyFit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ลดน้ำหนักแบบขี้เกียจ · ยืดหยุ่น 80/20 · ให้ AI นับแคลอรีให้
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          required
          inputMode="email"
          autoComplete="email"
          placeholder="อีเมล"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base outline-none transition-colors focus:border-primary"
        />

        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            required
            minLength={6}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder="รหัสผ่าน"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 w-full rounded-xl border border-border bg-background px-4 pr-11 text-base outline-none transition-colors focus:border-primary"
          />
          <button
            type="button"
            aria-label={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-1 top-1 flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          {mode === "signin" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
        className="mt-4 text-center text-sm text-muted-foreground"
      >
        {mode === "signin" ? (
          <>ยังไม่มีบัญชี? <span className="font-medium text-primary">สมัครสมาชิก</span></>
        ) : (
          <>มีบัญชีอยู่แล้ว? <span className="font-medium text-primary">เข้าสู่ระบบ</span></>
        )}
      </button>
    </main>
  );
}
