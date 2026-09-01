import { z } from "zod";
import type { MealEstimate } from "@/types/db";

/**
 * Thin wrapper around the Gemini REST API (no SDK dependency).
 * Uses structured output (responseSchema) so we always get valid JSON back.
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// ---------------------------------------------------------------------------
//  Validation of the model's output
// ---------------------------------------------------------------------------
export const mealEstimateSchema = z.object({
  food_name: z.string().min(1).max(120),
  calories: z.number().finite().min(0).max(8000),
  protein: z.number().finite().min(0).max(600),
  carbs: z.number().finite().min(0).max(1200),
  fat: z.number().finite().min(0).max(600),
  meal_type: z.enum(["clean", "normal", "cheat"]),
  tip: z.string().min(1).max(240),
  confidence: z.number().min(0).max(1).optional(),
});

// JSON schema handed to Gemini so it returns exactly this shape.
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    food_name: { type: "string", description: "ชื่ออาหารที่เข้าใจง่าย ภาษาไทย" },
    calories: { type: "number", description: "พลังงานรวมโดยประมาณ หน่วย kcal" },
    protein: { type: "number", description: "โปรตีน หน่วยกรัม" },
    carbs: { type: "number", description: "คาร์โบไฮเดรต หน่วยกรัม" },
    fat: { type: "number", description: "ไขมัน หน่วยกรัม" },
    meal_type: { type: "string", enum: ["clean", "normal", "cheat"] },
    tip: { type: "string", description: "คำแนะนำสั้น ๆ ให้กำลังใจ ไม่เกิน 120 ตัวอักษร" },
    confidence: { type: "number", description: "ความมั่นใจ 0 ถึง 1" },
  },
  required: ["food_name", "calories", "protein", "carbs", "fat", "meal_type", "tip"],
} as const;

const SYSTEM_PROMPT = `คุณเป็นผู้ช่วยประเมินโภชนาการของ "อาหารไทยและอาหารทั่วไป" สำหรับแอปลดน้ำหนักสายขี้เกียจ

หลักการ:
- ประเมินค่าของอาหาร 1 จาน / 1 ที่ ตามปริมาณที่เสิร์ฟจริงโดยทั่วไปในประเทศไทย
- ถ้าผู้ใช้ระบุรายละเอียดเพิ่ม (เช่น "ไข่ดาว 2 ฟอง", "พิเศษ", "ไม่เอาข้าว", "หวานน้อย") ให้ปรับตัวเลขตามนั้น
- ตัวเลขเป็นค่าประมาณที่สมเหตุสมผลก็พอ เอาค่ากลาง ๆ ที่ใช้ตัดสินใจได้ ไม่ต้องกลัวคลาดเคลื่อน
- ถ้าเป็นรูปภาพและมีหลายอย่างในภาพ ให้รวมเป็น "หนึ่งมื้อ"

การจัดประเภท meal_type:
- "clean" = โปรตีนไม่ติดมัน + ผัก น้ำมัน/น้ำตาลน้อย (อกไก่ย่าง, สลัดน้ำใส, ต้มยำน้ำใส, ยำ)
- "normal" = อาหารจานเดียวทั่วไป ข้าว + กับข้าวผัดน้ำมันปกติ
- "cheat" = ของทอด, ฟาสต์ฟู้ด, ของหวาน, เบเกอรี, ชานม/น้ำหวาน, เหล้า/เบียร์ หรืออาหารมัน/หวาน/พลังงานสูงชัดเจน

tip: ภาษาไทย 1 ประโยค โทนให้กำลังใจ ไม่ตัดสิน ไม่สั่งให้อดอาหาร
     (แนะแบบเบา ๆ เช่น เพิ่มผัก, เลี่ยงน้ำหวาน, ครั้งหน้าลดข้าวนิดนึง, ดื่มน้ำเพิ่ม) ไม่เกิน 120 ตัวอักษร

ตอบเป็น JSON ตาม schema เท่านั้น หน่วยของ protein/carbs/fat เป็นกรัม, calories เป็น kcal`;

// ---------------------------------------------------------------------------
//  Error type
// ---------------------------------------------------------------------------
export class GeminiError extends Error {
  status: number;
  detail?: string;
  constructor(message: string, status = 502, detail?: string) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
    this.detail = detail;
  }
  /** Safe message to show the end user (never leaks internals). */
  get publicMessage(): string {
    if (this.status === 500) return "ระบบ AI ยังไม่ถูกตั้งค่า ลองใหม่ภายหลัง";
    if (this.status === 429) return "ใช้ AI บ่อยเกินไป พักสักครู่แล้วลองใหม่";
    return "ประเมินไม่สำเร็จ ลองพิมพ์ใหม่ หรือกรอกค่าเอง";
  }
}

// ---------------------------------------------------------------------------
//  Main entry point
// ---------------------------------------------------------------------------
export async function estimateMeal(input: {
  text?: string;
  image?: { data: string; mimeType: string };
}): Promise<MealEstimate> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError("GEMINI_API_KEY is not set", 500);

  const parts: Array<Record<string, unknown>> = [];

  if (input.image) {
    parts.push({
      inline_data: { mime_type: input.image.mimeType, data: input.image.data },
    });
  }

  parts.push({
    text: input.text?.trim()
      ? `ประเมินเมนูนี้: "${input.text.trim()}"`
      : "ประเมินอาหารในรูปภาพนี้ (คิดเป็น 1 มื้อ ตามที่เห็นในภาพ)",
  });

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.3,
      topP: 0.9,
      // Disable "thinking" — this task is simple and latency matters (Gemini 2.5+ flash).
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    throw new GeminiError("ต่อ Gemini ไม่ได้ (timeout / network)", 504, String(err));
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new GeminiError(`Gemini API responded ${res.status}`, res.status === 429 ? 429 : 502, detail);
  }

  const json = (await res.json()) as GeminiGenerateResponse;
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    const finish = json?.candidates?.[0]?.finishReason;
    throw new GeminiError(`Gemini returned no content (finishReason=${finish ?? "unknown"})`, 502);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new GeminiError("Gemini output was not valid JSON", 502, rawText.slice(0, 500));
  }

  const result = mealEstimateSchema.safeParse(coerceNumbers(parsed));
  if (!result.success) {
    throw new GeminiError("Gemini output failed schema validation", 502, result.error.message);
  }

  return {
    ...result.data,
    calories: Math.round(result.data.calories),
    protein: round1(result.data.protein),
    carbs: round1(result.data.carbs),
    fat: round1(result.data.fat),
  };
}

// ---------------------------------------------------------------------------
//  Coach chat — free-form Q&A grounded in the user's own tracked data
// ---------------------------------------------------------------------------
export interface CoachTurn {
  role: "user" | "model";
  content: string;
}

const COACH_SYSTEM = `คุณคือ "โค้ชลาซี่" ผู้ช่วยในแอป LazyFit — แอปลดน้ำหนักสายขี้เกียจ แบบยืดหยุ่น 80/20

หน้าที่: ตอบคำถามของผู้ใช้เรื่องการกิน การออกกำลังกาย น้ำหนัก และเป้าหมาย โดยอิงจาก "ข้อมูลผู้ใช้" ที่แนบมาด้านล่างนี้เท่านั้น

วิธีตอบ:
- เป็นกันเองเหมือนเพื่อนที่พอรู้เรื่องโภชนาการ ไม่ใช่หมอหรือเทรนเนอร์ดุ ๆ
- ให้กำลังใจ ไม่ตัดสิน ไม่ดุเรื่อง cheat ไม่สั่งให้อดอาหาร
- สั้น กระชับ 1–4 ประโยค ตอบให้ตรงคำถาม เป็นข้อความธรรมดา ไม่ต้องใส่หัวข้อหรือ bullet ยาว ๆ
- ใช้ตัวเลขจาก "ข้อมูลผู้ใช้" เท่านั้น ห้ามเดาตัวเลขที่ไม่มี ถ้าข้อมูลไม่พอให้บอกตรง ๆ ว่ายังไม่มีข้อมูล และชวนให้ไปบันทึกเพิ่ม
- เวลาแนะนำเมนู ให้คำนึงถึงแคลที่ "เหลือกินได้" ของวันนี้ และเสนอเป็นอาหารไทยหากินง่าย
- ตอบเป็นภาษาไทย เรียกผู้ใช้ด้วยชื่อเล่นได้ถ้ามี ใช้อีโมจิได้บ้างแต่พองาม

ขอบเขต:
- ถ้าถามนอกเรื่องสุขภาพ/อาหาร/ออกกำลังกาย/แอป ให้บอกน่ารัก ๆ ว่าช่วยได้เฉพาะเรื่องพวกนี้
- เรื่องอาการป่วย ยา หรือโรคประจำตัว ให้แนะนำไปปรึกษาแพทย์ ไม่วินิจฉัยเอง
- ไม่แนะนำให้กินต่ำกว่า ~1,200 kcal/วัน หรือการอดอาหารสุดโต่ง`;

/**
 * One-shot (non-streaming) chat completion for the in-app coach. `context`
 * is a plain-text snapshot of the user's data, folded into the system prompt.
 */
export async function chatWithCoach(input: {
  turns: CoachTurn[];
  context: string;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError("GEMINI_API_KEY is not set", 500);

  const body = {
    system_instruction: {
      parts: [{ text: `${COACH_SYSTEM}\n\n---\n${input.context}` }],
    },
    contents: input.turns.map((t) => ({
      role: t.role,
      parts: [{ text: t.content }],
    })),
    generationConfig: {
      temperature: 0.6,
      topP: 0.95,
      thinkingConfig: { thinkingBudget: 0 },
      maxOutputTokens: 600,
    },
  };

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    throw new GeminiError("ต่อ Gemini ไม่ได้ (timeout / network)", 504, String(err));
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new GeminiError(
      `Gemini API responded ${res.status}`,
      res.status === 429 ? 429 : 502,
      detail,
    );
  }

  const json = (await res.json()) as GeminiGenerateResponse;
  const text = json?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) {
    const finish = json?.candidates?.[0]?.finishReason;
    throw new GeminiError(`Gemini returned no content (finishReason=${finish ?? "unknown"})`, 502);
  }
  return text;
}

// ---------------------------------------------------------------------------
//  helpers
// ---------------------------------------------------------------------------
function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/** Models sometimes return "350 kcal" or "12g" as strings — normalise to numbers. */
function coerceNumbers(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const obj = { ...(value as Record<string, unknown>) };
  for (const key of ["calories", "protein", "carbs", "fat", "confidence"]) {
    const v = obj[key];
    if (typeof v === "string") {
      const n = parseFloat(v.replace(/[^0-9.]/g, ""));
      if (!Number.isNaN(n)) obj[key] = n;
    }
  }
  return obj;
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string }> };
  }>;
}
