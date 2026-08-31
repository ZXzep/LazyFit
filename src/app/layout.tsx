import type { Metadata, Viewport } from "next";
// Self-hosted Noto Sans Thai (variable, thai + latin subsets with unicode-range).
// Bundled — no Google Fonts fetch at build/runtime, works offline.
import "@fontsource-variable/noto-sans-thai/wght.css";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "LazyFit — ลดน้ำหนักแบบขี้เกียจ",
  description:
    "ติดตามมื้ออาหารและการเบิร์นแบบยืดหยุ่น 80/20 ให้ AI ช่วยประเมินแคลอรี ไม่ต้องนับให้ปวดหัว",
  manifest: "/manifest.webmanifest",
  applicationName: "LazyFit",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "LazyFit" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#bef54e" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1512" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
