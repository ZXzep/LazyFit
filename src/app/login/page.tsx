"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

const AUTH_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("AUTH_TIMEOUT")), AUTH_TIMEOUT_MS);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
}

export default function LoginPage() {
  const supabaseRef = useRef<ReturnType<typeof createClient>>();
  const getSupabase = () => (supabaseRef.current ??= createClient());

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const isSignup = mode === "signup";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    setLoading(true);

    try {
      const supabase = getSupabase();
      const credentials = { email: email.trim().toLowerCase(), password };
      const result = await withTimeout(
        isSignup
          ? supabase.auth.signUp(credentials)
          : supabase.auth.signInWithPassword(credentials),
      );

      if (result.error) {
        throw result.error;
      }

      if (!result.data.session) {
        toast.success("สร้างบัญชีแล้ว — เปิดอีเมลยืนยันก่อนเข้าสู่ระบบ");
        setMode("signin");
        return;
      }

      if (result.data.user) {
        const { error: profileError } = await withTimeout(
          supabase
            .from("profiles")
            .upsert({ id: result.data.user.id }, { onConflict: "id", ignoreDuplicates: true }),
        );
        if (profileError) {
          console.error("[auth] profile bootstrap failed", {
            code: profileError.code,
            message: profileError.message,
          });
        }
      }

      window.location.assign("/dashboard");
    } catch (err) {
      const message = err instanceof Error && err.message === "AUTH_TIMEOUT"
          ? "Supabase ใช้เวลาตอบกลับนานเกินไป กรุณาลองใหม่"
          : err instanceof Error
            ? err.message
            : "ไม่สำเร็จ ลองอีกครั้ง";
      setAuthError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <Image
          src="/icon.svg"
          alt="LazyFit"
          width={64}
          height={64}
          priority
          className="mx-auto mb-3 size-16 rounded-3xl shadow-lg shadow-primary/20"
        />
        <h1 className="text-2xl font-bold">LazyFit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSignup
            ? "สร้างบัญชีใหม่ ใช้เวลาไม่ถึงนาที"
            : "ลดน้ำหนักแบบขี้เกียจ · ยืดหยุ่น 80/20 · ให้ AI นับแคลอรีให้"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          required
          inputMode="email"
          autoComplete="email"
          aria-invalid={Boolean(authError)}
          aria-describedby={authError ? "auth-error" : undefined}
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
            autoComplete={isSignup ? "new-password" : "current-password"}
            aria-invalid={Boolean(authError)}
            aria-describedby={authError ? "auth-error" : undefined}
            placeholder={isSignup ? "ตั้งรหัสผ่าน (อย่างน้อย 6 ตัว)" : "รหัสผ่าน"}
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

        {authError ? (
          <p id="auth-error" role="alert" className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-600">
            {authError}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          {isSignup ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => {
          setAuthError("");
          setMode(isSignup ? "signin" : "signup");
        }}
        className="mt-4 text-center text-sm text-muted-foreground"
      >
        {isSignup ? (
          <>มีบัญชีอยู่แล้ว? <span className="font-medium text-primary-strong">เข้าสู่ระบบ</span></>
        ) : (
          <>ยังไม่มีบัญชี? <span className="font-medium text-primary-strong">สมัครสมาชิก</span></>
        )}
      </button>
    </main>
  );
}
