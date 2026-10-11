"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { actionError, actionOk, zodFieldErrors, type ActionResult } from "@/components/admin/action-result";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const optionalDate = z
  .string()
  .trim()
  .refine((v) => v === "" || DATE.test(v), "تاريخ غير صالح");
const optionalInt = (msg: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d+$/.test(v.replace(/,/g, "")), msg)
    .transform((v) => (v === "" ? null : Number(v.replace(/,/g, ""))));

const couponSchema = z
  .object({
    id: z.string().trim().optional(),
    code: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase().replace(/\s+/g, ""))
      .pipe(z.string().regex(/^[A-Z0-9_-]{3,24}$/, "من 3 إلى 24 حرفاً لاتينياً أو رقماً (بدون مسافات)")),
    type: z.enum(["percent", "fixed"], { message: "اختر نوع الخصم" }),
    value: z
      .string()
      .trim()
      .transform((v) => Number(v.replace(/,/g, "")))
      .pipe(z.number({ message: "أدخل قيمة صحيحة" }).int("أدخل رقماً صحيحاً").min(1, "القيمة يجب أن تكون أكبر من صفر")),
    minSubtotal: optionalInt("أدخل مبلغاً صحيحاً"),
    maxUses: optionalInt("أدخل عدداً صحيحاً").refine((v) => v === null || v >= 1, "الحد الأدنى استخدام واحد"),
    startsAt: optionalDate,
    endsAt: optionalDate,
    isActive: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "percent" && v.value > 90) ctx.addIssue({ code: "custom", path: ["value"], message: "النسبة القصوى 90%" });
    if (v.startsAt && v.endsAt && v.endsAt < v.startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "تاريخ الانتهاء قبل تاريخ البدء" });
  });

/** Dates are entered in the store's local time (Asia/Aden, UTC+3). */
const startOfDay = (d: string) => new Date(`${d}T00:00:00+03:00`);
const endOfDay = (d: string) => new Date(`${d}T23:59:59+03:00`);

export async function saveCouponAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = couponSchema.safeParse({
    id: String(formData.get("id") ?? ""),
    code: String(formData.get("code") ?? ""),
    type: formData.get("type"),
    value: String(formData.get("value") ?? ""),
    minSubtotal: String(formData.get("minSubtotal") ?? ""),
    maxUses: String(formData.get("maxUses") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return actionError("راجع الحقول المظلّلة", zodFieldErrors(parsed.error));
  const v = parsed.data;
  const id = v.id && /^\d+$/.test(v.id) ? Number(v.id) : null;

  const clash = await db.query.coupons.findFirst({
    where: id ? and(eq(coupons.code, v.code), ne(coupons.id, id)) : eq(coupons.code, v.code),
    columns: { id: true },
  });
  if (clash) return actionError("الكود مستخدم مسبقاً", { code: "هذا الكود موجود — اختر كوداً آخر" });

  const values = {
    code: v.code,
    type: v.type,
    value: v.value,
    minSubtotal: v.minSubtotal ?? 0,
    maxUses: v.maxUses,
    startsAt: v.startsAt ? startOfDay(v.startsAt) : null,
    endsAt: v.endsAt ? endOfDay(v.endsAt) : null,
    isActive: v.isActive,
  };
  try {
    if (id) {
      const [row] = await db.update(coupons).set(values).where(eq(coupons.id, id)).returning({ id: coupons.id });
      if (!row) return actionError("الكوبون غير موجود");
    } else {
      await db.insert(coupons).values(values);
    }
  } catch (err) {
    console.error("[coupons] save", err);
    return actionError("تعذّر حفظ الكوبون");
  }
  revalidatePath("/admin/coupons");
  return actionOk(id ? `حُفظ الكوبون ${v.code}` : `أُنشئ الكوبون ${v.code} ✨`);
}

const idOnly = z.object({ id: z.coerce.number().int().positive() });

export async function deleteCouponAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = idOnly.safeParse({ id: formData.get("id") });
  if (!parsed.success) return actionError("طلب غير صالح");
  const [row] = await db.delete(coupons).where(eq(coupons.id, parsed.data.id)).returning({ code: coupons.code });
  if (!row) return actionError("الكوبون غير موجود");
  revalidatePath("/admin/coupons");
  return actionOk(`حُذف الكوبون ${row.code}`);
}

export async function toggleCouponAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = idOnly.extend({ active: z.enum(["0", "1"]) }).safeParse({ id: formData.get("id"), active: formData.get("active") });
  if (!parsed.success) return actionError("طلب غير صالح");
  const active = parsed.data.active === "1";
  const [row] = await db.update(coupons).set({ isActive: active }).where(eq(coupons.id, parsed.data.id)).returning({ code: coupons.code });
  if (!row) return actionError("الكوبون غير موجود");
  revalidatePath("/admin/coupons");
  return actionOk(active ? `فُعّل الكوبون ${row.code}` : `أُوقف الكوبون ${row.code}`);
}
