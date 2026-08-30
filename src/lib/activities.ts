export interface BuiltinActivity {
  key: string;
  label: string; // Thai
  emoji: string;
  met: number;
}

/**
 * Built-in exercises. MET values are rough averages for a "lazy" pace
 * (Compendium of Physical Activities). Users add their own in the app.
 */
export const BUILTIN_ACTIVITIES: BuiltinActivity[] = [
  { key: "stepper", label: "มินิสเต็ปเปอร์", emoji: "🦵", met: 4.5 },
  { key: "hula_hoop", label: "ฮูลาฮูป", emoji: "🌀", met: 4.0 },
  { key: "walk", label: "เดิน", emoji: "🚶", met: 3.5 },
  { key: "run", label: "วิ่ง", emoji: "🏃", met: 8.0 },
  { key: "bike", label: "ปั่นจักรยาน", emoji: "🚴", met: 6.0 },
  { key: "jump_rope", label: "กระโดดเชือก", emoji: "🪢", met: 10.0 },
  { key: "dance", label: "เต้น", emoji: "💃", met: 5.0 },
  { key: "yoga", label: "โยคะ / ยืดเหยียด", emoji: "🧘", met: 3.0 },
];

export const BUILTIN_BY_KEY: Record<string, BuiltinActivity> = Object.fromEntries(
  BUILTIN_ACTIVITIES.map((a) => [a.key, a]),
);

/** Intensity presets for a custom activity, so users don't have to know METs. */
export const INTENSITY = [
  { key: "light", label: "เบา", met: 3.0 },
  { key: "moderate", label: "ปานกลาง", met: 5.0 },
  { key: "hard", label: "หนัก", met: 8.0 },
] as const;

export const ACTIVITY_EMOJI_CHOICES = ["🌀", "🤸", "🏋️", "🏊", "🚣", "⛹️", "🧗", "🛹", "⚽", "🏸", "🥊", "🔥"];
