import { toast } from "sonner";

/**
 * App-voiced notifications — casual, warm, non-judgemental, and varied so
 * repeats don't feel canned. Import `say` instead of calling sonner directly.
 */

function pick(arr: readonly string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const say = {
  mealLogged: () =>
    toast(
      pick([
        "จดมื้อนี้ให้แล้ว กินต่อได้เลย 🍽️",
        "บันทึกแล้ว เดี๋ยวรวมยอดให้ตอนสิ้นวัน",
        "เก็บเข้าไดอารี่มื้ออาหารเรียบร้อย",
      ]),
    ),

  workoutLogged: (label: string, kcal: number) =>
    toast(`${label} · เบิร์นไป ${kcal} kcal 🔥`, {
      description: pick([
        "ขยับแล้วก็ดีกว่านั่งเฉย ๆ",
        "ทำแบบนี้เรื่อย ๆ นะ",
        "อีกนิดก็ครบเป้าสัปดาห์นี้แล้ว",
      ]),
    }),

  weightLogged: () =>
    toast(
      pick([
        "ชั่งแล้ว จดลงกราฟให้เรียบร้อย ⚖️",
        "บันทึกน้ำหนักวันนี้แล้ว ไม่ต้องคิดมาก",
        "เก็บให้แล้ว ดูแนวโน้มยาว ๆ พอ",
      ]),
    ),

  welcome: (name: string, target: number) =>
    toast(`ยินดีต้อนรับ ${name}! 🎉`, {
      description: `ตั้งเป้าให้วันละ ${target.toLocaleString()} kcal — ปรับทีหลังได้ที่ตั้งค่า`,
    }),

  accountCreated: () => toast("สร้างบัญชีแล้ว เปิดอีเมลกดยืนยันก่อนเข้าใช้นะ ✉️"),

  activityAdded: (name: string) => toast(`เพิ่ม “${name}” เข้าลิสต์แล้ว พร้อมใช้เลย`),

  removed: () => toast(pick(["ลบออกให้แล้ว", "เอาออกเรียบร้อย"])),

  settingsSaved: () =>
    toast(pick(["อัปเดตให้แล้ว ✅", "จำค่าใหม่ให้แล้ว", "เก็บการตั้งค่าเรียบร้อย"])),

  hint: (msg: string) => toast(msg),

  /** gentle failure — a nudge to retry, never a scary "ERROR" */
  oops: (msg?: string) =>
    toast.error(
      msg ??
        pick([
          "อ๊ะ ยังไม่ผ่าน ลองกดอีกที",
          "มีอะไรสะดุด ลองใหม่นะ",
          "ต่อไม่ติดแป๊บนึง ลองอีกครั้ง",
        ]),
    ),
};
