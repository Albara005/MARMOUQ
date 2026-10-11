"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { hashPassword, requireAdmin, verifyPassword } from "@/lib/auth";
import { actionError, actionOk, zodFieldErrors, type ActionResult } from "@/components/admin/action-result";

const profileSchema = z.object({
  name: z.string().trim().min(2, "الاسم مطلوب").max(60, "الاسم طويل"),
  email: z.string().trim().toLowerCase().pipe(z.email("بريد إلكتروني غير صحيح")),
});

export async function updateProfileAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const parsed = profileSchema.safeParse({ name: formData.get("name") ?? "", email: formData.get("email") ?? "" });
  if (!parsed.success) return actionError("راجع البيانات", zodFieldErrors(parsed.error));
  const clash = await db.query.admins.findFirst({ where: and(eq(admins.email, parsed.data.email), ne(admins.id, me.id)), columns: { id: true } });
  if (clash) return actionError("البريد مستخدم", { email: "هذا البريد مسجّل لعضو آخر" });
  await db.update(admins).set(parsed.data).where(eq(admins.id, me.id));
  revalidatePath("/admin", "layout");
  return actionOk("حُفظت بياناتك");
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "أدخل كلمة المرور الحالية"),
    next: z
      .string()
      .min(10, "10 أحرف على الأقل")
      .max(72, "كلمة المرور طويلة")
      .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "استخدم حروفاً وأرقاماً معاً"),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "التأكيد لا يطابق كلمة المرور الجديدة" })
  .refine((v) => v.next !== v.current, { path: ["next"], message: "اختر كلمة مرور مختلفة عن الحالية" });

export async function changePasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const parsed = passwordSchema.safeParse({
    current: String(formData.get("current") ?? ""),
    next: String(formData.get("next") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) return actionError("لم تتغير كلمة المرور", zodFieldErrors(parsed.error));
  const row = await db.query.admins.findFirst({ where: eq(admins.id, me.id), columns: { passwordHash: true } });
  if (!row || !(await verifyPassword(parsed.data.current, row.passwordHash))) {
    return actionError("كلمة المرور الحالية غير صحيحة", { current: "كلمة المرور الحالية غير صحيحة" });
  }
  await db.update(admins).set({ passwordHash: await hashPassword(parsed.data.next) }).where(eq(admins.id, me.id));
  return actionOk("تم تغيير كلمة المرور بنجاح");
}
