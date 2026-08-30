# 🥗 LazyFit

แอปติดตามการลดน้ำหนักและมื้ออาหารแบบยืดหยุ่น (Flexible Diet & Habit Tracker)
สำหรับสายขี้เกียจ — ไม่ต้องนับแคลอรีเอง ให้ AI ช่วยประเมิน แล้วกดปุ่มเดียวบันทึก

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Framer Motion · Lucide
· Supabase (Auth + Postgres + RLS) · Google Gemini API (free tier)

---

## Features

| ฟีเจอร์ | อยู่ที่ไหน |
| --- | --- |
| **Welcome / Onboarding** (2 ขั้น) — เปิดแอปครั้งแรก → ① กล่องทักทายถามชื่อเล่น → ② เพศ/อายุ/ส่วนสูง/น้ำหนัก/กิจกรรม/เป้าหมาย → คำนวณแคลอรีต่อวัน (Mifflin-St Jeor BMR × activity × goal) แสดงผลสด | `src/components/dashboard/onboarding-sheet.tsx` + `src/lib/nutrition.ts` |
| **Quick AI Calorie Estimator** — พิมพ์ชื่ออาหารไทย/อัปโหลดรูป → ได้ JSON แคลอรี+แมโคร → "Log This Meal" | `src/components/dashboard/quick-ai-estimator.tsx` + `src/app/api/estimate-meal/route.ts` |
| **One-Click Stepper Logger** — ปุ่ม `[15] [20] [25] [30]` นาที คำนวณแคลอรีเบิร์นอัตโนมัติ + Streak รายสัปดาห์ | `src/components/dashboard/stepper-logger.tsx` + `src/lib/calories.ts` |
| **80/20 Flexibility Weekly Dashboard** — Progress bar โควตา Cheat Meal, สมดุลแคลอรีรายวัน/สัปดาห์, กราฟน้ำหนัก | `src/components/dashboard/weekly-flex-card.tsx`, `caloric-balance-card.tsx`, `weight-trend-card.tsx` |

Mobile-first, PWA-ready (`src/app/manifest.ts`), รองรับ Dark/Light theme (`next-themes`).

---

## 1. ตั้งค่า Supabase

Schema ทั้งหมดอยู่ในไฟล์เดียว: [`supabase/migrations/20260830150500_init_lazyfit.sql`](supabase/migrations/)

### ทาง A — Cloud (supabase.com) ✅ ง่ายสุด ไม่ต้องลง Docker

1. สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com/dashboard)
2. **SQL Editor → New query** → วางไฟล์ migration ทั้งไฟล์ → **Run**
   (หรือถ้าจะใช้ CLI push: `npx supabase login` → `npx supabase link --project-ref <ref>` → `npm run db:push`)
3. **Project Settings → API** → copy `Project URL` + `anon public key` ใส่ `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
   ```

### ทาง B — Local dev (Supabase CLI + Docker) — ออปชัน

ต้องมี Docker Desktop เปิดอยู่ เหมาะตอนอยากทดสอบ migration/reset บ่อย ๆ โดยไม่แตะ cloud

```bash
npm run db:start     # ดึง image (ครั้งแรก ~2-3GB) + รัน migration + seed
npm run db:status    # โชว์ URL + anon key ของ local → เอาไปใส่ .env.local (URL = http://127.0.0.1:54321)
```
Studio :54323 · กล่องอีเมล (magic link) :54324 · `npm run db:reset` = รันใหม่ทั้งหมด

### Auth (ทั้งสองทาง)

- **Cloud**: **Authentication → URL Configuration** เพิ่ม `http://localhost:3000/auth/callback` (+ โดเมน prod) ใน Redirect URLs
  · เปิด provider **Email** (magic link) และ/หรือ **Google** (redirect URI = `https://<ref>.supabase.co/auth/v1/callback`)
- **Local**: ตั้งไว้ให้แล้วใน `config.toml` · magic link อ่านที่ Mailpit → http://127.0.0.1:54324
  · Google local → ใส่ key ใน `supabase/.env` แล้วเปิด `[auth.external.google] enabled = true`

## 2. ตั้งค่า Gemini

1. รับ API key ฟรีที่ [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. โมเดลแนะนำสำหรับ free tier: `gemini-2.5-flash` (รองรับทั้ง text + รูปภาพ, ปิด thinking ไว้เพื่อความเร็ว)

## 3. รันโปรเจกต์

```bash
npm install
cp .env.example .env.local   # เติม Supabase URL/anon key + GEMINI_API_KEY
npm run dev                  # (ถ้าใช้ local Supabase: npm run db:start ก่อน)
```

เปิด http://localhost:3000 → กรอกอีเมล → กด "ส่งลิงก์เข้าสู่ระบบ" → เปิดอีเมลกดลิงก์ → เข้า `/dashboard`

### Dev login (ข้ามอีเมล เวลาเทสต์)

ปิด email confirmation ก่อน: **Authentication → Providers → Email → "Confirm email" = off**
แล้ว:

```bash
node --env-file=.env.local scripts/dev-login.mjs your.email@example.com yourpassword
```

สคริปต์จะสร้าง user (ครั้งแรก) + คืน session cookie สำหรับแปะทดสอบใน browser

### Environment variables

| ตัวแปร | ใช้ทำอะไร |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | เชื่อม Supabase (client + server) |
| `GEMINI_API_KEY` | เรียก Gemini จากฝั่ง server เท่านั้น (ไม่ถูก expose) |
| `GEMINI_MODEL` | override โมเดล (ดีฟอลต์ `gemini-2.5-flash`) |
| `NEXT_PUBLIC_SITE_URL` | base URL สำหรับ auth redirect |

---

## API: `POST /api/estimate-meal`

**Request** (ต้องล็อกอิน — ตรวจ session ผ่าน Supabase cookie)

```jsonc
{ "text": "กะเพราหมูกรอบไข่ดาว" }
// หรือ
{ "imageBase64": "data:image/jpeg;base64,...", "imageMimeType": "image/jpeg" }
```

**Response 200**

```json
{
  "food_name": "กะเพราหมูกรอบไข่ดาว",
  "calories": 720,
  "protein": 28,
  "carbs": 65,
  "fat": 38,
  "meal_type": "cheat",
  "tip": "อร่อยได้ ครั้งหน้าลองเปลี่ยนหมูกรอบเป็นหมูสับ จะเบาลงเยอะ",
  "confidence": 0.7
}
```

ใช้ Gemini structured output (`responseSchema`) + ตรวจซ้ำด้วย Zod เสมอ →
การันตีว่า JSON ที่ client ได้รับถูก shape เสมอ

---

## โครงสร้างโปรเจกต์

```
supabase/
├── config.toml                          # local stack config (ports, auth, seed)
├── migrations/
│   ├── *_init_lazyfit.sql               # tables + RLS + trigger + views + RPC
│   └── *_onboarding_profile.sql         # sex / birth_year / activity_level / goal / onboarded_at
└── seed.sql                             # demo data (local only, comment ไว้)
scripts/dev-login.mjs                    # dev helper: email+password → session cookie
src/
├── app/
│   ├── api/estimate-meal/route.ts       # Gemini estimator endpoint
│   ├── auth/callback/route.ts           # OAuth callback (เผื่ออนาคต)
│   ├── dashboard/
│   │   ├── page.tsx                     # Server Component — โหลดข้อมูลเริ่มต้น
│   │   └── actions.ts                   # Server Actions: saveOnboarding / logMeal / logWorkout / logWeight
│   ├── login/page.tsx                   # email + password
│   ├── layout.tsx · globals.css · manifest.ts
├── components/
│   ├── dashboard/                       # การ์ด + onboarding-sheet (mobile view)
│   └── ui/                              # Button / Card / Progress
├── lib/
│   ├── supabase/{client,server,middleware}.ts
│   ├── nutrition.ts                     # BMR / TDEE / daily target
│   ├── gemini.ts                        # ตัวเรียก Gemini + schema + error type
│   ├── calories.ts                      # สูตรคำนวณแคลอรีเบิร์น (MET)
│   └── date.ts                          # week / timezone helpers
└── types/db.ts
```

### npm scripts (DB)

| script | ทำอะไร |
| --- | --- |
| `npm run db:start` / `db:stop` | เปิด/ปิด local Supabase stack |
| `npm run db:status` | โชว์ URL + keys ของ local |
| `npm run db:reset` | drop + รัน migration ทั้งหมด + seed ใหม่ |
| `npm run db:new <name>` | สร้างไฟล์ migration ใหม่ (timestamp อัตโนมัติ) |
| `npm run db:push` | ดัน migration ขึ้น cloud project ที่ link ไว้ |
| `npm run db:diff -f <name>` | สร้าง migration จาก diff ของ schema ปัจจุบัน |
| `npm run db:types` | gen TypeScript types → `src/types/supabase.ts` |

## หมายเหตุ

- `daily_calorie_target` มาจาก onboarding sheet (คำนวณอัตโนมัติ) — อยากคิดใหม่ ให้ set `profiles.onboarded_at = null` แล้วรีเฟรช กล่องจะเด้งอีกครั้ง
- `weekly_cheat_quota` (ดีฟอลต์ 3) ยังไม่มีหน้าตั้งค่า — แก้ผ่าน Supabase table editor ไปก่อน
- ใส่ไอคอน PWA จริงที่ `public/icons/icon-192.png`, `icon-512.png`, `maskable-512.png`
- อยากได้ offline support เต็มรูปแบบ เพิ่ม `@ducanh2912/next-pwa` หรือ service worker เองได้
