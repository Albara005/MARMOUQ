import { getSession } from "@/lib/auth";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES, saveImage } from "@/lib/media";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = { "Cache-Control": "no-store" };
const MB = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

function fail(error: string, status: number) {
  return Response.json({ error }, { status, headers: NO_STORE });
}

/**
 * POST multipart/form-data { file: File, alt?: string }
 * → 200 { id, blur, width, height } | 4xx/5xx { error }
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return fail("انتهت الجلسة — سجّل الدخول مجدداً.", 401);

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 512 * 1024) return fail(`حجم الصورة أكبر من ${MB} ميغابايت.`, 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("تعذّرت قراءة الملف المرفوع.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return fail("لم يتم إرفاق أي صورة.", 400);
  if (file.size === 0) return fail("الملف فارغ.", 400);
  if (file.size > MAX_UPLOAD_BYTES) return fail(`حجم الصورة أكبر من ${MB} ميغابايت.`, 413);
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return fail("صيغة غير مدعومة — استخدم JPG أو PNG أو WebP أو AVIF أو HEIC.", 415);

  const altRaw = form.get("alt");
  const alt = typeof altRaw === "string" ? altRaw.replace(/\s+/g, " ").trim().slice(0, 200) : "";

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await saveImage(buffer, alt);
    return Response.json({ id: saved.id, blur: saved.blur, width: saved.width, height: saved.height }, { headers: NO_STORE });
  } catch (err) {
    console.error("[upload]", err);
    return fail("تعذّرت معالجة الصورة — تأكد أن الملف صورة سليمة وحاول مجدداً.", 422);
  }
}
