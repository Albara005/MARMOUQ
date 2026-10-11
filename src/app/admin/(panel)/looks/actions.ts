"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { lookItems, looks } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { actionError, actionOk, zodFieldErrors, type ActionResult } from "@/components/admin/action-result";
import { isMediaId } from "@/components/admin/media-ids";

const schema = z.object({
  id: z.number().int().positive().nullable(),
  title: z.string().trim().min(2, "اكتب عنوان الإطلالة").max(80),
  subtitle: z.string().trim().max(160),
  description: z.string().trim().max(1200),
  slug: z.string().trim().max(80),
  discountPercent: z.number().int().min(0, "0–50").max(50, "الحد الأقصى للخصم 50%"),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(-999).max(999),
  coverId: z.string().refine(isMediaId, "صورة غير صالحة").nullable(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        color: z.string().trim().max(40),
        x: z.number().min(0).max(100),
        y: z.number().min(0).max(100),
      }),
    )
    .max(10, "10 قطع كحد أقصى"),
});

export type LookInput = z.input<typeof schema>;

export async function saveLookAction(input: LookInput): Promise<ActionResult> {
  await requireAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return actionError("تحقق من الحقول", zodFieldErrors(parsed.error));
  const v = parsed.data;
  if (v.isActive && v.items.length < 2) return actionError("الإطلالة المنشورة تحتاج قطعتين على الأقل", { items: "أضف قطعتين على الأقل" });
  if (new Set(v.items.map((i) => i.productId)).size !== v.items.length) return actionError("لا تكرر نفس المنتج في الإطلالة", { items: "منتج مكرر" });
  const slug = slugify(v.slug || v.title);
  if (!slug) return actionError("الرابط غير صالح", { slug: "استخدم حروفاً أو أرقاماً" });
  const clash = await db
    .select({ id: looks.id })
    .from(looks)
    .where(v.id ? and(eq(looks.slug, slug), ne(looks.id, v.id)) : eq(looks.slug, slug))
    .limit(1);
  if (clash.length) return actionError("الرابط مستخدم لإطلالة أخرى", { slug: "اختر رابطاً مختلفاً" });

  const id = await db.transaction(async (tx) => {
    const values = {
      title: v.title,
      subtitle: v.subtitle,
      description: v.description,
      slug,
      discountPercent: v.discountPercent,
      isActive: v.isActive,
      sortOrder: v.sortOrder,
      coverId: v.coverId,
    };
    let lookId = v.id;
    if (lookId) await tx.update(looks).set(values).where(eq(looks.id, lookId));
    else [{ id: lookId }] = await tx.insert(looks).values(values).returning({ id: looks.id });
    await tx.delete(lookItems).where(eq(lookItems.lookId, lookId!));
    if (v.items.length) {
      await tx.insert(lookItems).values(v.items.map((it, i) => ({ lookId: lookId!, productId: it.productId, color: it.color, x: it.x, y: it.y, sortOrder: i })));
    }
    return lookId!;
  });

  revalidatePath("/admin/looks");
  revalidatePath("/", "layout");
  return actionOk(v.id ? "حُفظت الإطلالة" : "أُنشئت الإطلالة", { id });
}

export async function deleteLookAction(id: number): Promise<ActionResult> {
  await requireAdmin();
  if (!Number.isInteger(id) || id <= 0) return actionError("إطلالة غير صالحة");
  await db.delete(looks).where(eq(looks.id, id));
  revalidatePath("/admin/looks");
  revalidatePath("/", "layout");
  return actionOk("حُذفت الإطلالة");
}
