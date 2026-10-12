import "server-only";
import { z } from "zod";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  coupons,
  customers,
  lookItems,
  looks,
  orderEvents,
  orderItems,
  orders,
  productImages,
  products,
  productVariants,
  shippingZones,
  type OrderStatus,
  type PaymentStatus,
} from "@/db/schema";
import { computeTotals, lineKey, type AddonRule, type CouponRule, type LookRule } from "@/lib/pricing";
import { getSettings, resolveDisplayCurrency } from "@/lib/settings";
import { normalizePhone, randomToken } from "@/lib/utils";
import { formatMoney, isForeign } from "@/lib/money";
import { notifyTelegram } from "@/lib/notify";
import { STOCK_HOLDING, ORDER_STATUS_META } from "@/lib/order-status";
import { formatSetSize } from "@/lib/size-guides";

/* ───────────── Checkout input ───────────── */

export const checkoutSchema = z.object({
  name: z.string().trim().min(2, "الاسم مطلوب").max(80),
  phone: z
    .string()
    .trim()
    .transform((v) => normalizePhone(v))
    .refine((v) => v.replace(/^\+/, "").length >= 7 && v.replace(/^\+/, "").length <= 15, "رقم الجوال غير صحيح"),
  zoneId: z.coerce.number().int().positive("اختر المدينة"),
  address: z.string().trim().min(4, "العنوان مطلوب").max(300),
  notes: z.string().trim().max(500).optional().default(""),
  paymentMethod: z.enum(["cod", "transfer"]),
  couponCode: z.string().trim().max(40).optional().default(""),
  /** Display currency chosen by the customer (validated against settings server-side) */
  currencyCode: z.string().trim().max(8).optional().default(""),
  lines: z
    .array(
      z.object({
        variantId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().min(1).max(20),
        lookId: z.coerce.number().int().positive().nullable().optional(),
        /** product this line was added with as an add-on (discount re-checked against the catalogue) */
        addonOf: z.coerce.number().int().positive().nullable().optional(),
      }),
    )
    .min(1, "السلة فارغة")
    .max(50),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;

export type PlaceOrderResult =
  | { ok: true; number: string; token: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; stockIssues?: { variantId: number; available: number }[] };

class CheckoutError extends Error {
  constructor(
    message: string,
    public stockIssues?: { variantId: number; available: number }[],
  ) {
    super(message);
  }
}

/* ───────────── Coupons ───────────── */

export async function findValidCoupon(code: string): Promise<{ coupon: CouponRule & { id: number }; error: null } | { coupon: null; error: string }> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { coupon: null, error: "أدخل الكود" };
  const c = await db.query.coupons.findFirst({ where: eq(coupons.code, normalized) });
  const now = new Date();
  if (!c || !c.isActive) return { coupon: null, error: "كود الخصم غير صالح" };
  if (c.startsAt && c.startsAt > now) return { coupon: null, error: "كود الخصم لم يبدأ بعد" };
  if (c.endsAt && c.endsAt < now) return { coupon: null, error: "انتهت صلاحية كود الخصم" };
  if (c.maxUses != null && c.usedCount >= c.maxUses) return { coupon: null, error: "تم استنفاد كود الخصم" };
  return { coupon: { id: c.id, code: c.code, type: c.type, value: c.value, minSubtotal: c.minSubtotal }, error: null };
}

/* ───────────── Place order ───────────── */

export async function placeOrder(raw: unknown): Promise<PlaceOrderResult> {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0] ?? "form");
      fieldErrors[k] ??= issue.message;
    }
    return { ok: false, error: "تحقق من البيانات المدخلة", fieldErrors };
  }
  const input = parsed.data;
  const settings = await getSettings();
  const display = resolveDisplayCurrency(settings, input.currencyCode || settings.currency.code);
  if (input.paymentMethod === "cod" && !settings.payments.cod.enabled) return { ok: false, error: "طريقة الدفع غير متاحة" };
  if (input.paymentMethod === "transfer" && !settings.payments.transfer.enabled) return { ok: false, error: "طريقة الدفع غير متاحة" };

  // Merge duplicate lines (same variant + look + add-on parent)
  const merged = new Map<string, { variantId: number; quantity: number; lookId: number | null; addonOf: number | null }>();
  for (const l of input.lines) {
    const addonOf = l.lookId ? null : (l.addonOf ?? null);
    const k = lineKey(l.variantId, l.lookId ?? null, addonOf);
    const prev = merged.get(k);
    merged.set(k, { variantId: l.variantId, lookId: l.lookId ?? null, addonOf, quantity: Math.min(20, (prev?.quantity ?? 0) + l.quantity) });
  }
  const lines = [...merged.values()];

  try {
    const result = await db.transaction(async (tx) => {
      const variantIds = [...new Set(lines.map((l) => l.variantId))];
      // Lock the variant rows so concurrent checkouts cannot oversell.
      const variantRows = await tx
        .select({
          id: productVariants.id,
          productId: productVariants.productId,
          color: productVariants.color,
          size: productVariants.size,
          stock: productVariants.stock,
          priceOverride: productVariants.priceOverride,
          isActive: productVariants.isActive,
          productName: products.name,
          productPrice: products.price,
          productStatus: products.status,
          setParts: products.setParts,
        })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(inArray(productVariants.id, variantIds))
        .for("update", { of: productVariants });

      const byId = new Map(variantRows.map((v) => [v.id, v]));
      const stockIssues: { variantId: number; available: number }[] = [];
      const needed = new Map<number, number>();
      for (const l of lines) needed.set(l.variantId, (needed.get(l.variantId) ?? 0) + l.quantity);
      for (const [vid, qty] of needed) {
        const v = byId.get(vid);
        if (!v || !v.isActive || v.productStatus !== "active") stockIssues.push({ variantId: vid, available: 0 });
        else if (v.stock < qty) stockIssues.push({ variantId: vid, available: Math.max(0, v.stock) });
      }
      if (stockIssues.length) throw new CheckoutError("بعض القطع لم تعد متوفرة بالكمية المطلوبة", stockIssues);

      const zone = await tx.query.shippingZones.findFirst({ where: and(eq(shippingZones.id, input.zoneId), eq(shippingZones.isActive, true)) });
      if (!zone) throw new CheckoutError("مدينة التوصيل غير متاحة");

      const lookIds = [...new Set(lines.map((l) => l.lookId).filter((x): x is number => !!x))];
      let lookRules: LookRule[] = [];
      if (lookIds.length) {
        const lr = await tx.select().from(looks).where(and(inArray(looks.id, lookIds), eq(looks.isActive, true)));
        const li = await tx.select().from(lookItems).where(inArray(lookItems.lookId, lookIds));
        lookRules = lr.map((l) => ({ id: l.id, discountPercent: l.discountPercent, productIds: li.filter((i) => i.lookId === l.id).map((i) => i.productId) }));
      }

      // Add-on discounts come from the catalogue, never from the browser
      const parentIds = [...new Set(lines.map((l) => l.addonOf).filter((x): x is number => !!x))];
      let addonRules: AddonRule[] = [];
      if (parentIds.length) {
        const parents = await tx
          .select({ id: products.id, addonIds: products.addonIds, addonDiscount: products.addonDiscount })
          .from(products)
          .where(and(inArray(products.id, parentIds), eq(products.status, "active")));
        addonRules = parents
          .filter((p) => p.addonDiscount > 0 && Array.isArray(p.addonIds) && p.addonIds.length)
          .map((p) => ({ parentId: p.id, productIds: p.addonIds, discountPercent: p.addonDiscount }));
      }

      let couponRow: (CouponRule & { id: number }) | null = null;
      if (input.couponCode) {
        const found = await findValidCoupon(input.couponCode);
        if (!found.coupon) throw new CheckoutError(found.error);
        couponRow = found.coupon;
      }

      const pricingLines = lines.map((l) => {
        const v = byId.get(l.variantId)!;
        return { variantId: v.id, productId: v.productId, unitPrice: v.priceOverride ?? v.productPrice, quantity: l.quantity, lookId: l.lookId, addonOf: l.addonOf };
      });
      const totals = computeTotals({
        lines: pricingLines,
        looks: lookRules,
        addons: addonRules,
        coupon: couponRow,
        shippingFee: zone.fee,
        freeShippingThreshold: settings.freeShippingThreshold,
      });
      if (couponRow && totals.couponError) throw new CheckoutError(totals.couponError);

      // Customer (by phone)
      const [customer] = await tx
        .insert(customers)
        .values({ name: input.name, phone: input.phone, city: zone.name, address: input.address })
        .onConflictDoUpdate({ target: customers.phone, set: { name: input.name, city: zone.name, address: input.address } })
        .returning({ id: customers.id });

      const token = randomToken(16);
      const [order] = await tx
        .insert(orders)
        .values({
          number: `TMP-${token.slice(0, 12)}`,
          accessToken: token,
          customerId: customer.id,
          customerName: input.name,
          phone: input.phone,
          city: zone.name,
          address: input.address,
          notes: input.notes ?? "",
          status: "pending",
          paymentMethod: input.paymentMethod,
          paymentStatus: "unpaid",
          subtotal: totals.subtotal,
          discount: totals.discount,
          shippingFee: totals.shipping,
          total: totals.total,
          couponCode: couponRow?.code ?? "",
          // only when it is still the currency the customer saw at checkout
          displayCurrency: isForeign(display) && display.code === (input.currencyCode || "").toUpperCase() ? display : null,
          shippingZoneId: zone.id,
        })
        .returning({ id: orders.id });
      const number = `MRQ-${10000 + order.id}`;
      await tx.update(orders).set({ number }).where(eq(orders.id, order.id));

      // Cover image per line (colour-matched when possible)
      const productIds = [...new Set(pricingLines.map((p) => p.productId))];
      const imgs = await tx
        .select({ productId: productImages.productId, mediaId: productImages.mediaId, color: productImages.color })
        .from(productImages)
        .where(inArray(productImages.productId, productIds))
        .orderBy(asc(productImages.sortOrder), asc(productImages.id));

      await tx.insert(orderItems).values(
        lines.map((l) => {
          const v = byId.get(l.variantId)!;
          const img = imgs.find((i) => i.productId === v.productId && i.color && i.color === v.color) ?? imgs.find((i) => i.productId === v.productId);
          return {
            orderId: order.id,
            productId: v.productId,
            variantId: v.id,
            name: v.productName,
            color: v.color,
            // sets keep the piece names on the order: "القميص L · البنطلون 32"
            size: formatSetSize(v.setParts, v.size),
            imageId: img?.mediaId ?? null,
            unitPrice: v.priceOverride ?? v.productPrice,
            quantity: l.quantity,
            lineDiscount: totals.lineDiscounts[lineKey(v.id, l.lookId, l.addonOf)] ?? 0,
          };
        }),
      );

      for (const [vid, qty] of needed) {
        await tx
          .update(productVariants)
          .set({ stock: sql`${productVariants.stock} - ${qty}` })
          .where(eq(productVariants.id, vid));
      }
      if (couponRow) {
        await tx
          .update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1` })
          .where(eq(coupons.id, couponRow.id));
      }
      await tx.insert(orderEvents).values({ orderId: order.id, status: "pending", note: "تم استلام الطلب من المتجر" });

      return { number, token, total: totals.total, itemsCount: lines.reduce((s, l) => s + l.quantity, 0), zone: zone.name };
    });

    void notifyTelegram(
      `🛍️ طلب جديد ${result.number}\n👤 ${input.name} — ${input.phone}\n📍 ${result.zone}\n🧾 ${result.itemsCount} قطعة · ${formatMoney(result.total, settings.currency)}${isForeign(display) ? ` (${formatMoney(result.total, display)})` : ""}\n💳 ${input.paymentMethod === "cod" ? "عند الاستلام" : "حوالة"}`,
    );
    return { ok: true, number: result.number, token: result.token };
  } catch (err) {
    if (err instanceof CheckoutError) return { ok: false, error: err.message, stockIssues: err.stockIssues };
    console.error("[checkout] failed:", err);
    return { ok: false, error: "تعذّر إتمام الطلب، حاول مرة أخرى" };
  }
}

/* ───────────── Read ───────────── */

export type OrderView = typeof orders.$inferSelect & {
  items: (typeof orderItems.$inferSelect)[];
  events: (typeof orderEvents.$inferSelect)[];
};

async function loadOrder(where: ReturnType<typeof eq>): Promise<OrderView | null> {
  const order = await db.query.orders.findFirst({ where });
  if (!order) return null;
  const [items, events] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).orderBy(asc(orderItems.id)),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, order.id)).orderBy(asc(orderEvents.createdAt), asc(orderEvents.id)),
  ]);
  return { ...order, items, events };
}

export async function getOrderById(id: number): Promise<OrderView | null> {
  return loadOrder(eq(orders.id, id));
}

/** Customer-facing access: order number + secret token from the confirmation link. */
export async function getOrderByToken(number: string, token: string): Promise<OrderView | null> {
  const order = await loadOrder(eq(orders.number, number.trim().toUpperCase()));
  if (!order || !token || order.accessToken !== token) return null;
  return order;
}

/** Tracking form: order number + phone used at checkout. */
export async function findOrderForTracking(number: string, phone: string): Promise<OrderView | null> {
  const order = await loadOrder(eq(orders.number, number.trim().toUpperCase()));
  if (!order) return null;
  const a = normalizePhone(order.phone).replace(/\D/g, "").slice(-9);
  const b = normalizePhone(phone).replace(/\D/g, "").slice(-9);
  return a.length >= 7 && a === b ? order : null;
}

/* ───────────── Admin mutations ───────────── */

export async function updateOrderStatus(orderId: number, next: OrderStatus, note: string, adminId: number | null): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
      if (!order) throw new CheckoutError("الطلب غير موجود");
      if (order.status === next && !note) return;
      const wasHolding = STOCK_HOLDING.includes(order.status);
      const willHold = STOCK_HOLDING.includes(next);
      if (wasHolding !== willHold) {
        const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
        for (const it of items) {
          if (!it.variantId) continue;
          if (!willHold) {
            await tx
              .update(productVariants)
              .set({ stock: sql`${productVariants.stock} + ${it.quantity}` })
              .where(eq(productVariants.id, it.variantId));
          } else {
            const [v] = await tx.select().from(productVariants).where(eq(productVariants.id, it.variantId)).for("update");
            if (!v || v.stock < it.quantity) throw new CheckoutError(`لا يوجد مخزون كافٍ لإعادة تفعيل الطلب (${it.name})`);
            await tx
              .update(productVariants)
              .set({ stock: sql`${productVariants.stock} - ${it.quantity}` })
              .where(eq(productVariants.id, it.variantId));
          }
        }
      }
      await tx.update(orders).set({ status: next, updatedAt: new Date() }).where(eq(orders.id, orderId));
      await tx.insert(orderEvents).values({ orderId, status: next, note: note || ORDER_STATUS_META[next].hint, adminId });
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof CheckoutError) return { ok: false, error: err.message };
    console.error("[orders] status update failed:", err);
    return { ok: false, error: "تعذّر تحديث حالة الطلب" };
  }
}

export type ShipmentInput = { carrierName: string; trackingNumber: string; trackingUrl: string; carrierPhone: string };

/**
 * Saves (or clears, when trackingNumber is empty) the courier & tracking number of an order,
 * logs it in the order history, and optionally moves the order to «shipped».
 */
export async function setOrderShipment(orderId: number, input: ShipmentInput, markShipped: boolean, adminId: number | null): Promise<{ ok: boolean; error?: string }> {
  const clearing = !input.trackingNumber && !input.carrierName;
  try {
    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId), columns: { id: true, status: true, shippedAt: true } });
    if (!order) return { ok: false, error: "الطلب غير موجود" };
    await db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({
          carrierName: input.carrierName,
          trackingNumber: input.trackingNumber,
          trackingUrl: input.trackingUrl,
          carrierPhone: input.carrierPhone,
          shippedAt: clearing ? null : (order.shippedAt ?? new Date()),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));
      const note = clearing
        ? "حُذفت بيانات الشحن"
        : [input.carrierName && `الشركة: ${input.carrierName}`, input.trackingNumber && `رقم التتبع: ${input.trackingNumber}`].filter(Boolean).join(" · ");
      await tx.insert(orderEvents).values({ orderId, status: "tracking", note, adminId });
    });
    if (!clearing && markShipped && ["pending", "confirmed", "processing"].includes(order.status)) {
      return await updateOrderStatus(orderId, "shipped", input.carrierName ? `شُحن مع ${input.carrierName}` : "", adminId);
    }
    return { ok: true };
  } catch (err) {
    console.error("[orders] shipment update failed:", err);
    return { ok: false, error: "تعذّر حفظ بيانات الشحن" };
  }
}

export async function setPaymentStatus(orderId: number, status: PaymentStatus, adminId: number | null): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.update(orders).set({ paymentStatus: status, updatedAt: new Date() }).where(eq(orders.id, orderId));
    const label = status === "paid" ? "تم تأكيد استلام الدفع" : status === "refunded" ? "تم استرداد المبلغ" : "تم تعليم الطلب كغير مدفوع";
    await tx.insert(orderEvents).values({ orderId, status: `payment:${status}`, note: label, adminId });
  });
}

export async function addOrderNote(orderId: number, note: string, adminId: number | null): Promise<void> {
  await db.insert(orderEvents).values({ orderId, status: "note", note: note.slice(0, 1000), adminId });
}
