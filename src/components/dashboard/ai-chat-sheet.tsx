"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, RotateCcw, X } from "lucide-react";
import { AppLogo } from "@/components/app-logo";

interface Turn {
  role: "user" | "model";
  content: string;
}

const SUGGESTIONS = [
  "วันนี้กินเกินเป้ายัง",
  "เหลือกินได้อีกกี่แคล",
  "มื้อเย็นกินอะไรดีให้อยู่ในเป้า",
  "สัปดาห์นี้เป็นไงบ้าง",
  "cheat เหลือกี่มื้อ",
  "น้ำหนักช่วงนี้เป็นไง",
  "วันนี้ต้องเดินเพิ่มไหม",
];

export function AiChatSheet({
  open,
  onClose,
  userName,
}: {
  open: boolean;
  onClose: () => void;
  userName: string;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // lock body scroll while the sheet is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // keep the transcript pinned to the bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, loading]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setInput("");
    setError("");
    const next: Turn[] = [...turns, { role: "user", content: q }];
    setTurns(next);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-16) }),
      });
      const data = (await res.json().catch(() => null)) as
        | { reply?: string; message?: string }
        | null;
      if (!res.ok || !data?.reply) {
        throw new Error(data?.message ?? "ตอบไม่ได้ตอนนี้ ลองถามใหม่อีกที");
      }
      setTurns((t) => [...t, { role: "model", content: data.reply as string }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ตอบไม่ได้ตอนนี้ ลองถามใหม่อีกที");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            aria-label="ปิด"
            onClick={onClose}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
          />

          <motion.div
            role="dialog"
            aria-label="ถาม AI โค้ชลาซี่"
            className="absolute inset-x-0 bottom-0 mx-auto flex h-[86dvh] max-w-md flex-col overflow-hidden rounded-t-3xl border border-b-0 border-border bg-background"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
          >
            {/* handle + header */}
            <div className="shrink-0 border-b border-border/70 px-4 pb-3 pt-2.5">
              <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-muted" />
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary">
                  <AppLogo bare className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-tight">โค้ชลาซี่</p>
                  <p className="truncate text-xs text-muted-foreground">
                    ถามเรื่องการกิน–ออกกำลังกายของคุณได้เลย
                  </p>
                </div>
                {turns.length > 0 && (
                  <button
                    type="button"
                    aria-label="เริ่มแชทใหม่"
                    onClick={() => {
                      setTurns([]);
                      setError("");
                    }}
                    className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                  >
                    <RotateCcw className="size-4" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label="ปิด"
                  onClick={onClose}
                  className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* transcript */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {turns.length === 0 && !loading ? (
                <div className="flex flex-col items-center pt-2 text-center">
                  <AppLogo className="size-14 rounded-2xl" />
                  <p className="mt-3 text-sm font-semibold">สวัสดี {userName} 👋</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    ผมดูข้อมูลที่คุณบันทึกไว้แล้วตอบให้ได้ ลองเลือกคำถามด้านล่าง หรือพิมพ์เองก็ได้
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-medium transition-colors hover:border-primary hover:bg-primary/10"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {turns.map((t, i) => (
                <div
                  key={i}
                  className={t.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      t.role === "user"
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md bg-muted text-foreground"
                    }`}
                  >
                    {t.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex gap-1 rounded-2xl rounded-bl-md bg-muted px-3.5 py-3">
                    <Dot delay="0ms" />
                    <Dot delay="150ms" />
                    <Dot delay="300ms" />
                  </div>
                </div>
              )}

              {error && (
                <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-center text-sm text-rose-600">
                  {error}
                </p>
              )}
            </div>

            {/* composer */}
            <div className="shrink-0 border-t border-border/70 bg-background px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2.5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder="พิมพ์คำถาม…"
                  maxLength={1000}
                  className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-3 text-base outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  aria-label="ส่ง"
                  disabled={!input.trim() || loading}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity active:scale-95 disabled:opacity-40"
                >
                  <ArrowUp className="size-5" strokeWidth={2.6} />
                </button>
              </form>
              <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
                AI ประเมินคร่าว ๆ จากข้อมูลที่คุณบันทึก อาจคลาดเคลื่อนได้
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="size-2 animate-bounce rounded-full bg-muted-foreground/60"
      style={{ animationDelay: delay }}
    />
  );
}
