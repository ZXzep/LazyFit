"use client";

import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-center"
        richColors
        expand={false}
        toastOptions={{ style: { borderRadius: "16px" } }}
      />
    </>
  );
}
