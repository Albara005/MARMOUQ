"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orders, shippingZones } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { actionError, actionOk, zodFieldErrors, type ActionResult } from "@/components/admin/action-result";

const intSchema = (msg: string, max: number) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(/[,\s]/g, ""))
    .refine((v) => /^\d+$/.test(v), msg)
    .transform(Number)
    .refine((v) => v <= max, msg);

const zoneSchema = z.object({
  name: z.string().trim().min(2, "اسم المنطقة مطلوب").max(60, "الاسم طويل"),
  fee: intSchema("أدخل رسوماً صحيحة", 10_000_000),
  eta: z.string().trim().max(40, "مدة التوصيل طويلة"),
  sortOrder: intSchema("رقم ترتيب غير صالح", 9999),
  isActive: z.boolean(),
});

function read(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    fee: String(formData.get("fee") ?? ""),
    eta: String(formData.get("eta") ?? ""),
    sortOrder: String(formData.get("sortOrder") ?? "0") || "0",
    isActive: formData.get("isActive") === "on",
  };
}

function refresh() {
  revalidatePath("/admin/shipping");
  revalidatePath("/checkout");
}

/** Save (intent=save) or delete (intent=delete) one zone row. */
export async function updateZoneAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = z.coerce.number().int().positive().safeParse(formData.get("id"));
  if (!id.success) return actionError("طلب غير صالح");

  if (formData.get("intent") === "delete") {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(orders).where(eq(orders.shippingZoneId, id.data));
    const [row] = await db.delete(shippingZones).where(eq(shippingZones.id, id.data)).returning({ name: shippingZones.name });
    if (!row) return actionError("المنطقة غير موجودة");
    refresh();
    return actionOk(n > 0 ? `حُذفت ${row.name} — طلباتها السابقة محفوظة كما هي` : `حُذفت ${row.name}`);
  }

  const parsed = zoneSchema.safeParse(read(formData));
  if (!parsed.success) return actionError("راجع بيانات المنطقة", zodFieldErrors(parsed.error));
  const [row] = await db.update(shippingZones).set(parsed.data).where(eq(shippingZones.id, id.data)).returning({ name: shippingZones.name });
  if (!row) return actionError("المنطقة غير موجودة");
  refresh();
  return actionOk(`حُفظت ${row.name}`);
}

export async function createZoneAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const raw = read(formData);
  if (!formData.get("sortOrder")) {
    const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${shippingZones.sortOrder}), 0)::int` }).from(shippingZones);
    raw.sortOrder = String(max + 1);
  }
  const parsed = zoneSchema.safeParse({ ...raw, isActive: true });
  if (!parsed.success) return actionError("راجع بيانات المنطقة", zodFieldErrors(parsed.error));
  await db.insert(shippingZones).values(parsed.data);
  refresh();
  return actionOk(`أُضيفت ${parsed.data.name} إلى مناطق التوصيل`);
}
