/** All day math is done in the user's local zone; default = Bangkok. */
export const APP_TZ = "Asia/Bangkok";

/** "YYYY-MM-DD" for *now* in the given timezone. */
export function todayISO(tz: string = APP_TZ): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}

/** "YYYY-MM-DD" of the start of the week that contains `date`. weekStartsOn: 0=Sun, 1=Mon. */
export function startOfWeekISO(
  date: Date = new Date(),
  weekStartsOn = 1,
  tz: string = APP_TZ,
): string {
  const localISO = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(date);
  const d = new Date(`${localISO}T00:00:00Z`); // treat the local calendar date as a UTC anchor
  const dow = d.getUTCDay(); // 0..6
  const diff = (dow - weekStartsOn + 7) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

/** Current UTC-offset of a timezone, e.g. "+07:00". */
export function tzOffset(tz: string = APP_TZ, at: Date = new Date()): string {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = name?.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!m) return "+00:00";
  return `${m[1]}${m[2]}:${m[3] ?? "00"}`;
}

/** ISO instant for local midnight of `dateISO` in `tz`, e.g. "2026-08-30T00:00:00+07:00". */
export function startOfDayISO(dateISO: string, tz: string = APP_TZ): string {
  return `${dateISO}T00:00:00${tzOffset(tz)}`;
}

/** Add days to a "YYYY-MM-DD" string, returns "YYYY-MM-DD". */
export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Thai short weekday label for a "YYYY-MM-DD" string. */
export function thaiWeekday(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"][d.getUTCDay()];
}

/** "อ. 26 ส.ค." for a plain "YYYY-MM-DD" (weekday + day + short month). */
export function thaiDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const md = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  }).format(d);
  return `${thaiWeekday(iso)}. ${md}`;
}

/** "18:30" — 24h clock for a Date or ISO string, in the given timezone. */
export function clockLabel(d: Date | string, tz: string = APP_TZ): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function greetingTH(tz: string = APP_TZ): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: tz }).format(new Date()),
  );
  if (hour < 12) return "สวัสดีตอนเช้า";
  if (hour < 17) return "สวัสดีตอนบ่าย";
  return "สวัสดีตอนค่ำ";
}
