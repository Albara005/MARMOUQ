"use server";

import { z } from "zod";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { products, productVariants, subscribers } from "@/db/schema";
import { normalizePhone } from "@/lib/utils";
import { clientIp, isThrottled, recordFailedAttempt } from "@/lib/auth";
import type { VariantData } from "@/lib/catalog";

/* ───────────── VIP list (newsletter) ───────────── */

export type SubscribeState = {
  status: "idle" | "success" | "error";
  message: string;
};

const contactSchema = z
  .string({ error: "أدخل رقم جوالك أو بريدك الإلكتروني" })
  .trim()
  .min(1, "أدخل رقم جوالك أو بريدك الإلكتروني")
  .max(120, "المدخل طويل جداً")
  .transform((raw, ctx) => {
    if (raw.includes("@")) {
      const email = raw.toLowerCase();
      if (!z.email().safeParse(email).success) {
        ctx.addIssue({ code: "custom", message: "البريد الإلكتروني غير صحيح" });
        return z.NEVER;
      }
      return email;
    }
    let digits = normalizePhone(raw).replace(/^\+/, "").replace(/^00/, "");
    if (!/^\d+$/.test(digits)) {
      ctx.addIssue({ code: "custom", message: "رقم الجوال غير صحيح" });
      return z.NEVER;
    }
    if (digits.startsWith("7") && digits.length === 9) digits = `967${digits}`;
    if (digits.length < 8 || digits.length > 15) {
      ctx.addIssue({ code: "custom", message: "رقم الجوال غير صحيح" });
      return z.NEVER;
    }
    return `+${digits}`;
  });

export async function subscribeToVip(_prev: SubscribeState, formData: FormData): Promise<SubscribeState> {
  // Honeypot: real visitors never see or fill this field.
  if (String(formData.get("company") ?? "").trim()) {
    return { status: "success", message: "أهلاً بك في قائمة مرموق الخاصة." };
  }

  const key = `vip:${await clientIp()}`;
  if (isThrottled(key)) {
    return { status: "error", message: "محاولات كثيرة خلال وقت قصير، حاول بعد قليل." };
  }
  recordFailedAttempt(key);

  const parsed = contactSchema.safeParse(formData.get("contact") ?? "");
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "تحقق من المدخل" };
  }

  try {
    const inserted = await db.insert(subscribers).values({ contact: parsed.data }).onConflictDoNothing().returning({ id: subscribers.id });
    if (inserted.length === 0) {
      return { status: "success", message: "أنت معنا من قبل ✦ أول ما يوصل الجديد بنكون عندك." };
    }
    return { status: "success", message: "أهلاً بك في قائمة مرموق الخاصة ✦ بنرسل لك الجديد قبل الكل." };
  } catch (err) {
    console.error("[vip] subscribe failed", err);
    return { status: "error", message: "تعذّر التسجيل الآن، حاول مرة أخرى بعد لحظات." };
  }
}

/* ───────────── Variant lookup (look dialog / quick-add) ───────────── */

const idsSchema = z.array(z.number().int().positive()).min(1).max(24);

/**
 * Active variants for a set of active products, keyed by product id.
 * Prices are display-only (the server re-prices at checkout).
 */
export async function getVariantsForProducts(productIds: number[]): Promise<Record<number, VariantData[]>> {
  const parsed = idsSchema.safeParse(productIds);
  if (!parsed.success) return {};
  const ids = [...new Set(parsed.data)];

  const rows = await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      color: productVariants.color,
      colorHex: productVariants.colorHex,
      size: productVariants.size,
      stock: productVariants.stock,
      priceOverride: productVariants.priceOverride,
      basePrice: products.price,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(and(inArray(productVariants.productId, ids), eq(productVariants.isActive, true), eq(products.status, "active")))
    .orderBy(asc(productVariants.sortOrder), asc(productVariants.id));

  const out: Record<number, VariantData[]> = {};
  for (const r of rows) {
    (out[r.productId] ??= []).push({
      id: r.id,
      color: r.color,
      colorHex: r.colorHex,
      size: r.size,
      stock: Math.max(0, r.stock),
      price: r.priceOverride ?? r.basePrice,
    });
  }
  return out;
}
