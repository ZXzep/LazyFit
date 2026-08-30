import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { estimateMeal, GeminiError } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

/**
 * POST /api/estimate-meal
 *
 * Body (JSON):
 *   { "text": "กะเพราหมูกรอบไข่ดาว" }
 *   { "imageBase64": "<base64 or data-URL>", "imageMimeType": "image/jpeg" }
 *   (text + image may be combined)
 *
 * 200 -> MealEstimate:
 *   {
 *     "food_name": "กะเพราหมูกรอบไข่ดาว",
 *     "calories": 720, "protein": 28, "carbs": 65, "fat": 38,
 *     "meal_type": "cheat",
 *     "tip": "อร่อยได้ ครั้งหน้าลองเปลี่ยนหมูกรอบเป็นหมูสับ จะเบาขึ้นเยอะ",
 *     "confidence": 0.7
 *   }
 */

const bodySchema = z
  .object({
    text: z.string().trim().min(1).max(200).optional(),
    imageBase64: z.string().min(1).optional(),
    imageMimeType: z
      .enum(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"])
      .optional(),
  })
  .refine((v) => v.text || v.imageBase64, {
    message: "ต้องส่ง text หรือ imageBase64 อย่างน้อยหนึ่งอย่าง",
  });

// base64 length ~= 1.37 * bytes  ->  ~4 MB decoded
const MAX_IMAGE_BASE64_LEN = 5_600_000;

export async function POST(req: Request) {
  // 1) Auth — only signed-in users may spend our Gemini quota.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2) Parse + validate the body.
  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      {
        error: "invalid_request",
        issues: err instanceof z.ZodError ? err.issues : undefined,
      },
      { status: 400 },
    );
  }

  // 3) Guard image size.
  const imageBase64 = payload.imageBase64 ? stripDataUrl(payload.imageBase64) : undefined;
  if (imageBase64 && imageBase64.length > MAX_IMAGE_BASE64_LEN) {
    return NextResponse.json({ error: "image_too_large", message: "รูปใหญ่เกินไป (เกิน ~4MB)" }, { status: 413 });
  }

  // 4) Call Gemini.
  try {
    const estimate = await estimateMeal({
      text: payload.text,
      image: imageBase64
        ? { data: imageBase64, mimeType: payload.imageMimeType ?? "image/jpeg" }
        : undefined,
    });

    return NextResponse.json(estimate, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof GeminiError) {
      console.error("[estimate-meal]", err.status, err.message, err.detail ?? "");
      return NextResponse.json(
        { error: "estimate_failed", message: err.publicMessage },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 },
      );
    }
    console.error("[estimate-meal] unexpected", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

/** Accepts either a bare base64 string or a full `data:image/...;base64,XXX` URL. */
function stripDataUrl(input: string): string {
  const marker = "base64,";
  const idx = input.indexOf(marker);
  return idx === -1 ? input : input.slice(idx + marker.length);
}
