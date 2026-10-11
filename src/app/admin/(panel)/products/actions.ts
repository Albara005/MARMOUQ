"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, like, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categories, media, orderItems, productImages, products, productVariants } from "@/db/schema";
import { hasRole, requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { actionError, actionOk, zodFieldErrors, type ActionResult } from "@/components/admin/action-result";
import { isMediaId } from "@/components/admin/media-ids";
import { normalizeDetails, variantKey } from "@/components/admin/product-editor/types";

/* ───────────── Validation ───────────── */

const SLUG_RE = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;
const HEX_RE = /^(#[0-9a-fA-F]{6})?$/;

const text = (max: number) => z.string().trim().max(max, `الحد الأقصى ${max} حرفاً`);
const money = (label = "المبلغ") =>
  z
    .number({ message: `أدخل ${label} بالأرقام` })
    .int("أدخل رقماً صحيحاً بدون كسور")
    .min(0, "لا يمكن أن يكون المبلغ سالباً")
    .max(100_000_000, "المبلغ كبير جداً");

const variantSchema = z.object({
  id: z.number().int().positive().nullable(),
  color: text(40),
  colorHex: z.string().trim().regex(HEX_RE, "رمز لون غير صالح"),
  size: text(20),
  sku: text(60),
  stock: z.number({ message: "أدخل الكمية بالأرقام" }).int("الكمية رقم صحيح").min(0, "الكمية لا تقل عن صفر").max(100_000, "الكمية كبيرة جداً"),
  priceOverride: money("السعر").min(1, "السعر الخاص يجب أن يكون أكبر من صفر").nullable(),
  isActive: z.boolean(),
});

const payloadSchema = z
  .object({
    id: z.number().int().positive().nullable(),
    intent: z.enum(["save", "draft"]),
    name: text(120).min(2, "اكتب اسم المنتج (حرفان على الأقل)"),
    subtitle: text(160),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(2, "الرابط قصير جداً")
      .max(80, "الرابط طويل — 80 حرفاً كحد أقصى")
      .regex(SLUG_RE, "استخدم حروفاً وأرقاماً تفصل بينها شرطات فقط"),
    categoryId: z.number().int().positive().nullable(),
    description: text(5000),
    details: z.array(text(220)).max(20, "20 نقطة كحد أقصى"),
    material: text(200),
    origin: text(120),
    care: text(600),
    sizeGuide: z.enum(["tops", "bottoms", "shoes", "none"]),
    price: money("السعر").min(1, "حدّد سعر البيع"),
    compareAtPrice: money("سعر المقارنة").nullable(),
    status: z.enum(["active", "draft", "archived"]),
    isFeatured: z.boolean(),
    isNew: z.boolean(),
    badge: text(30),
    sortOrder: z.number().int("رقم صحيح").min(-9999).max(9999),
    images: z.array(z.object({ id: z.string().refine(isMediaId, "صورة غير صالحة"), color: text(40) })).max(24, "24 صورة كحد أقصى"),
    variants: z.array(variantSchema).max(400, "عدد الخيارات كبير جداً"),
  })
  .superRefine((v, ctx) => {
    if (v.compareAtPrice != null && v.compareAtPrice > 0 && v.compareAtPrice <= v.price) {
      ctx.addIssue({ code: "custom", path: ["compareAtPrice"], message: "سعر ما قبل الخصم يجب أن يكون أعلى من سعر البيع" });
    }
    const seen = new Set<string>();
    for (const variant of v.variants) {
      const k = variantKey(variant.color, variant.size);
      if (seen.has(k)) {
        ctx.addIssue({ code: "custom", path: ["variants"], message: `الخيار «${[variant.color, variant.size].filter(Boolean).join(" / ") || "الافتراضي"}» مكرر` });
        break;
      }
      seen.add(k);
    }
    const effectiveStatus = v.intent === "draft" ? "draft" : v.status;
    if (effectiveStatus === "active" && !v.variants.some((x) => x.isActive)) {
      ctx.addIssue({
        code: "custom",
        path: ["status"],
        message: "لا يمكن نشر المنتج بدون خيار متاح واحد على الأقل — فعّل لوناً ومقاساً أو احفظه كمسودة",
      });
    }
  });

/* ───────────── Helpers ───────────── */

function revalidateCatalog(productId?: number | null) {
  revalidatePath("/admin/products");
  if (productId) revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/looks");
  revalidatePath("/admin");
  // Storefront: home, shop, product pages, looks, sitemap…
  revalidatePath("/", "layout");
}

async function slugTaken(slug: string, exceptId: number | null): Promise<boolean> {
  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(exceptId ? and(eq(products.slug, slug), ne(products.id, exceptId)) : eq(products.slug, slug))
    .limit(1);
  return rows.length > 0;
}

/** base, base-2, base-3 … — first free slug. */
async function freeSlug(base: string, exceptId: number | null = null): Promise<string> {
  const clean = slugify(base) || "product";
  const rows = await db
    .select({ id: products.id, slug: products.slug })
    .from(products)
    .where(or(eq(products.slug, clean), like(products.slug, `${clean}-%`)));
  const taken = new Set(rows.filter((r) => r.id !== exceptId).map((r) => r.slug));
  if (!taken.has(clean)) return clean;
  for (let i = 2; i < 500; i++) {
    const s = `${clean}-${i}`.slice(0, 80);
    if (!taken.has(s)) return s;
  }
  return `${clean}-${Date.now().toString(36)}`;
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}

/* ───────────── Slug availability (live check in the editor) ───────────── */

export async function checkProductSlugAction(slug: string, id: number | null): Promise<{ available: boolean; suggestion: string; normalized: string }> {
  await requireAdmin();
  const parsedId = typeof id === "number" && Number.isInteger(id) && id > 0 ? id : null;
  const normalized = slugify(String(slug ?? "").slice(0, 120));
  if (normalized.length < 2) return { available: false, suggestion: "", normalized };
  const taken = await slugTaken(normalized, parsedId);
  return { available: !taken, suggestion: taken ? await freeSlug(normalized, parsedId) : normalized, normalized };
}

/* ───────────── Save (create / update) ───────────── */

export async function saveProductAction(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = payloadSchema.safeParse(input);
  if (!parsed.success) {
    const fe = zodFieldErrors(parsed.error);
    const variantErr = Object.entries(fe).find(([k]) => k.startsWith("variants."));
    if (variantErr && !fe.variants) fe.variants = variantErr[1];
    return actionError("راجع الحقول المظلّلة قبل الحفظ", fe);
  }
  const v = parsed.data;
  const status = v.intent === "draft" ? "draft" : v.status;
  const details = v.details.map((d) => d.trim()).filter(Boolean);

  if (await slugTaken(v.slug, v.id)) {
    const suggestion = await freeSlug(v.slug, v.id);
    return actionError("رابط المنتج مستخدم", { slug: `هذا الرابط مستخدم لمنتج آخر — جرّب «${suggestion}»` });
  }
  if (v.categoryId) {
    const [cat] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, v.categoryId)).limit(1);
    if (!cat) return actionError("التصنيف المختار لم يعد موجوداً", { categoryId: "اختر تصنيفاً آخر" });
  }

  // Only keep media that really exists; colour tags must match a variant colour.
  const imageIds = [...new Set(v.images.map((i) => i.id))];
  const existingMedia = imageIds.length ? await db.select({ id: media.id }).from(media).where(inArray(media.id, imageIds)) : [];
  const mediaSet = new Set(existingMedia.map((m) => m.id));
  const colorNames = new Set(v.variants.map((x) => x.color).filter(Boolean));
  const seenImg = new Set<string>();
  const images = v.images.filter((i) => mediaSet.has(i.id) && !seenImg.has(i.id) && seenImg.add(i.id)).map((i) => ({ id: i.id, color: colorNames.has(i.color) ? i.color : "" }));

  const colorOrder: string[] = [];
  for (const x of v.variants) if (!colorOrder.includes(x.color)) colorOrder.push(x.color);

  let productId = v.id;
  let archivedCombos = 0;
  try {
    await db.transaction(async (tx) => {
      const values = {
        slug: v.slug,
        name: v.name,
        subtitle: v.subtitle,
        description: v.description,
        details,
        material: v.material,
        origin: v.origin,
        care: v.care,
        categoryId: v.categoryId,
        price: v.price,
        compareAtPrice: v.compareAtPrice && v.compareAtPrice > 0 ? v.compareAtPrice : null,
        status,
        isFeatured: v.isFeatured,
        isNew: v.isNew,
        badge: v.badge,
        sizeGuide: v.sizeGuide,
        sortOrder: v.sortOrder,
        updatedAt: new Date(),
      };

      if (productId) {
        const res = await tx.update(products).set(values).where(eq(products.id, productId)).returning({ id: products.id });
        if (!res.length) throw new Error("NOT_FOUND");
      } else {
        const [row] = await tx.insert(products).values(values).returning({ id: products.id });
        productId = row.id;
      }
      const pid = productId!;

      // Images: replace the ordered list (first = cover)
      await tx.delete(productImages).where(eq(productImages.productId, pid));
      if (images.length) {
        await tx.insert(productImages).values(images.map((im, i) => ({ productId: pid, mediaId: im.id, color: im.color, sortOrder: i })));
      }

      // Variants: upsert by (colour, size), keep ids, renames keep their row
      const existing = await tx.select().from(productVariants).where(eq(productVariants.productId, pid));
      const byKey = new Map(existing.map((e) => [variantKey(e.color, e.size), e]));
      const used = new Set<number>();
      const plan: { input: (typeof v.variants)[number]; targetId: number | null; sortOrder: number }[] = [];
      v.variants.forEach((input, i) => {
        const hit = byKey.get(variantKey(input.color, input.size));
        if (hit && !used.has(hit.id)) {
          used.add(hit.id);
          plan.push({ input, targetId: hit.id, sortOrder: i * 10 });
        } else plan.push({ input, targetId: null, sortOrder: i * 10 });
      });
      for (const step of plan) {
        if (step.targetId || !step.input.id) continue;
        const own = existing.find((e) => e.id === step.input.id);
        if (own && !used.has(own.id)) {
          used.add(own.id);
          step.targetId = own.id;
        }
      }

      // Removed combos: delete if never ordered, else switch off (keeps order history intact)
      const leftovers = existing.filter((e) => !used.has(e.id));
      if (leftovers.length) {
        const ids = leftovers.map((e) => e.id);
        const orderedRows = await tx.selectDistinct({ id: orderItems.variantId }).from(orderItems).where(inArray(orderItems.variantId, ids));
        const ordered = new Set(orderedRows.map((r) => r.id));
        const toDelete = ids.filter((id) => !ordered.has(id));
        const toDisable = ids.filter((id) => ordered.has(id));
        if (toDelete.length) await tx.delete(productVariants).where(inArray(productVariants.id, toDelete));
        if (toDisable.length) await tx.update(productVariants).set({ isActive: false }).where(inArray(productVariants.id, toDisable));
        archivedCombos = toDisable.length;
      }

      const skuFor = (color: string, size: string, sku: string) => {
        if (sku) return sku;
        const ci = colorOrder.indexOf(color) + 1;
        return [`MRQ-${pid}`, color ? String(ci).padStart(2, "0") : "", size ? size.replace(/\s+/g, "").toUpperCase() : "OS"].filter(Boolean).join("-");
      };

      for (const step of plan) {
        const x = step.input;
        const row = {
          color: x.color,
          colorHex: x.color ? x.colorHex || "#8E8E93" : "",
          size: x.size,
          sku: skuFor(x.color, x.size, x.sku),
          stock: x.stock,
          priceOverride: x.priceOverride,
          isActive: x.isActive,
          sortOrder: step.sortOrder,
        };
        if (step.targetId) await tx.update(productVariants).set(row).where(eq(productVariants.id, step.targetId));
        else await tx.insert(productVariants).values({ ...row, productId: pid });
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") return actionError("هذا المنتج لم يعد موجوداً — ربما حُذف من جهاز آخر");
    if (isUniqueViolation(err)) return actionError("تعارض في البيانات — الرابط أو أحد الخيارات مكرر", { slug: "تأكد أن الرابط غير مستخدم" });
    console.error("[admin products] save", err);
    return actionError("تعذّر حفظ المنتج — حاول مجدداً بعد لحظات");
  }

  revalidateCatalog(productId);
  const isNew = !v.id;
  const msg =
    status === "draft"
      ? isNew
        ? "حُفظ المنتج كمسودة"
        : "حُفظت التغييرات كمسودة"
      : status === "archived"
        ? "حُفظ المنتج في الأرشيف"
        : isNew
          ? "نُشر المنتج في المتجر ✦"
          : "تم حفظ التغييرات";
  return actionOk(archivedCombos ? `${msg} — عُطّل ${archivedCombos} خيار مرتبط بطلبات سابقة بدلاً من حذفه` : msg, {
    id: productId,
    slug: v.slug,
    status,
    created: isNew,
  });
}

/* ───────────── Row actions ───────────── */

const idSchema = z.number().int().positive();

export async function duplicateProductAction(id: number): Promise<ActionResult> {
  await requireAdmin();
  const pid = idSchema.safeParse(id);
  if (!pid.success) return actionError("منتج غير صالح");
  const [src] = await db.select().from(products).where(eq(products.id, pid.data)).limit(1);
  if (!src) return actionError("المنتج غير موجود");
  const slug = await freeSlug(`${src.slug}-copy`);
  let newId = 0;
  try {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(products)
        .values({
          slug,
          name: `${src.name} — نسخة`,
          subtitle: src.subtitle,
          description: src.description,
          details: normalizeDetails(src.details),
          material: src.material,
          origin: src.origin,
          care: src.care,
          categoryId: src.categoryId,
          price: src.price,
          compareAtPrice: src.compareAtPrice,
          status: "draft",
          isFeatured: false,
          isNew: src.isNew,
          badge: src.badge,
          sizeGuide: src.sizeGuide,
          sortOrder: src.sortOrder,
        })
        .returning({ id: products.id });
      newId = row.id;
      const imgs = await tx.select().from(productImages).where(eq(productImages.productId, src.id));
      if (imgs.length) await tx.insert(productImages).values(imgs.map((i) => ({ productId: newId, mediaId: i.mediaId, color: i.color, sortOrder: i.sortOrder })));
      const vars = await tx.select().from(productVariants).where(eq(productVariants.productId, src.id));
      if (vars.length) {
        await tx.insert(productVariants).values(
          vars.map((x) => ({
            productId: newId,
            color: x.color,
            colorHex: x.colorHex,
            size: x.size,
            sku: "",
            stock: 0,
            priceOverride: x.priceOverride,
            isActive: x.isActive,
            sortOrder: x.sortOrder,
          })),
        );
      }
    });
  } catch (err) {
    console.error("[admin products] duplicate", err);
    return actionError("تعذّر نسخ المنتج");
  }
  revalidatePath("/admin/products");
  return actionOk("أُنشئت نسخة كمسودة — المخزون يبدأ من صفر", { id: newId });
}

export async function setProductStatusAction(id: number, next: "archived" | "draft" | "active"): Promise<ActionResult> {
  await requireAdmin();
  const pid = idSchema.safeParse(id);
  const st = z.enum(["archived", "draft", "active"]).safeParse(next);
  if (!pid.success || !st.success) return actionError("طلب غير صالح");
  if (st.data === "active") {
    const active = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(and(eq(productVariants.productId, pid.data), eq(productVariants.isActive, true)))
      .limit(1);
    if (!active.length) return actionError("أضف خياراً متاحاً (لون ومقاس) قبل النشر");
  }
  const res = await db.update(products).set({ status: st.data, updatedAt: new Date() }).where(eq(products.id, pid.data)).returning({ id: products.id });
  if (!res.length) return actionError("المنتج غير موجود");
  revalidateCatalog(pid.data);
  return actionOk(st.data === "archived" ? "نُقل المنتج إلى الأرشيف" : st.data === "active" ? "نُشر المنتج في المتجر" : "أُعيد المنتج كمسودة");
}

export async function deleteProductAction(id: number): Promise<ActionResult> {
  const session = await requireAdmin();
  const pid = idSchema.safeParse(id);
  if (!pid.success) return actionError("منتج غير صالح");
  if (!hasRole(session, "manager")) return actionError("الحذف متاح للمدير والمالك فقط — يمكنك أرشفة المنتج بدلاً من ذلك");
  const [p] = await db.select({ id: products.id, name: products.name }).from(products).where(eq(products.id, pid.data)).limit(1);
  if (!p) return actionError("المنتج غير موجود");
  const ordered = await db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.productId, p.id)).limit(1);
  if (ordered.length) {
    await db.update(products).set({ status: "archived", updatedAt: new Date() }).where(eq(products.id, p.id));
    revalidateCatalog(p.id);
    return actionOk("المنتج مرتبط بطلبات سابقة، لذا أُرشف بدلاً من حذفه حفاظاً على السجلات", { archived: true });
  }
  await db.delete(products).where(eq(products.id, p.id));
  revalidateCatalog(p.id);
  return actionOk(`حُذف «${p.name}» نهائياً`, { archived: false });
}
