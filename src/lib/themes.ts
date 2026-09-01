export const THEMES = [
  { key: "lime", label: "เขียวมะนาว", swatch: "#bef54e" },
  { key: "pink", label: "ชมพู", swatch: "#f871a0" },
] as const;

export type ThemeKey = (typeof THEMES)[number]["key"];

export const THEME_KEYS = THEMES.map((t) => t.key) as ThemeKey[];
export const DEFAULT_THEME: ThemeKey = "lime";

export function normalizeTheme(value: unknown): ThemeKey {
  return THEME_KEYS.includes(value as ThemeKey) ? (value as ThemeKey) : DEFAULT_THEME;
}
