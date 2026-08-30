"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <Toaster
        position="top-center"
        richColors
        expand={false}
        toastOptions={{ style: { borderRadius: "16px" } }}
      />
    </ThemeProvider>
  );
}
