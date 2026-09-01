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
  themeColor: "#bef54e",
  colorScheme: "light",
};

// Apply the saved accent theme before first paint (no flash).
const THEME_SCRIPT = `try{var t=localStorage.getItem("lazyfit-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
