import Link from "next/link";
import { Settings } from "lucide-react";

export function SettingsLink() {
  return (
    <Link
      href="/settings"
      aria-label="ตั้งค่า"
      className="flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors active:scale-95"
    >
      <Settings className="size-5" />
    </Link>
  );
}
