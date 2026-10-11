"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { actionError, actionOk, zodFieldErrors, type ActionResult } from "@/components/admin/action-result";
import { isMediaId } from "@/components/admin/media-ids";

const SLOTS = ["", "knit", "shirt", "tie", "trousers", "shoes"] as const;

const schema = z.object({
  id: z.number().int().positive().nullable(),
  name: z.string().trim().min(2, "اكتب اسم التصنيف").max(60),
  nameEn: z.string().trim().max(60),
  slug: z.string().trim().max(60),
  description: z.string().trim().max(400),
  slot: z.enum(SLOTS),
  imageId: z.string().refine(isMediaId, "صورة غير صالحة").nullable(),
  sortOrder: z.number().int().min(-999).max(999),
  isActive: z.boolean(),
});

export type CategoryInput = z.input<typeof schema>;

export async function saveCategoryAction(input: CategoryInput): Promise<ActionResult> {
  await requireAdmin("manager");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return actionError("تحقق من الحقول", zodFieldErrors(parsed.error));
  const v = parsed.data;
  const slug = slugify(v.slug || v.nameEn || v.name);
  if (!slug) return actionError("الرابط غير صالح", { slug: "استخدم حروفاً أو أرقاماً" });
  const clash = await db
    .select({ id: categories.id })
    .from(categories)
    .where(v.id ? and(eq(categories.slug, slug), ne(categories.id, v.id)) : eq(categories.slug, slug))
    .limit(1);
  if (clash.length) return actionError("الرابط مستخدم لتصنيف آخر", { slug: "اختر رابطاً مختلفاً" });

  const values = { name: v.name, nameEn: v.nameEn, slug, description: v.description, slot: v.slot, imageId: v.imageId, sortOrder: v.sortOrder, isActive: v.isActive };
  if (v.id) await db.update(categories).set(values).where(eq(categories.id, v.id));
  else await db.insert(categories).values(values);
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  return actionOk(v.id ? "حُفظ التصنيف" : "أُضيف التصنيف");
}

export async function deleteCategoryAction(id: number): Promise<ActionResult> {
  await requireAdmin("manager");
  if (!Number.isInteger(id) || id <= 0) return actionError("تصنيف غير صالح");
  await db.delete(categories).where(eq(categories.id, id));
  revalidatePath("/admin/categories");
  revalidatePath("/", "layout");
  return actionOk("حُذف التصنيف — بقيت منتجاته بدون تصنيف");
}
