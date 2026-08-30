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
    background_color: "#0d1512",
    theme_color: "#16a34a",
    categories: ["health", "lifestyle", "fitness"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
