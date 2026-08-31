import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LazyFit — ลดน้ำหนักแบบขี้เกียจ",
    short_name: "LazyFit",
    description: "ติดตามมื้ออาหารและการเบิร์นแบบยืดหยุ่น 80/20",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#bef54e",
    categories: ["health", "lifestyle", "fitness"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
