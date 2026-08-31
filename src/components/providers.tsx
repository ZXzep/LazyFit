"use client";

import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-center"
        offset={14}
        expand={false}
        toastOptions={{
          style: {
            borderRadius: "16px",
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
            color: "hsl(var(--card-foreground))",
            fontFamily: "var(--font-sans)",
            fontSize: "0.875rem",
            boxShadow: "0 10px 30px hsl(var(--foreground) / 0.12)",
          },
        }}
      />
    </>
  );
}
