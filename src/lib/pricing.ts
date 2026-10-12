/**
 * Pure pricing engine — shared by the client (live estimates) and the server (authoritative totals).
 * All amounts are whole currency units.
 */

export type PricingLine = {
  variantId: number;
  productId: number;
  unitPrice: number;
  quantity: number;
  /** Set when the line was added as part of a curated look (bundle) */
  lookId?: number | null;
  /** Set when the line was added as an add-on of another product (id of that product) */
  addonOf?: number | null;
};

export type LookRule = { id: number; discountPercent: number; productIds: number[] };

/** Add-ons of a product bought together with it get `discountPercent` off (one add-on unit per unit of the product). */
export type AddonRule = { parentId: number; productIds: number[]; discountPercent: number };

export type CouponRule = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  minSubtotal: number;
};

export type Totals = {
  subtotal: number;
  lookDiscount: number;
  /** Discount on add-ons bought with their product */
  addonDiscount: number;
  couponDiscount: number;
  discount: number;
  shipping: number;
  freeShipping: boolean;
  total: number;
  /** Look discount attributed to each line, keyed by `${variantId}:${lookId ?? 0}` */
  lineDiscounts: Record<string, number>;
  appliedLookIds: number[];
  couponError: string | null;
};

export function lineKey(variantId: number, lookId?: number | null, addonOf?: number | null): string {
  return `${variantId}:${lookId ?? 0}${addonOf ? `:a${addonOf}` : ""}`;
}

export function computeTotals(input: {
  lines: PricingLine[];
  looks?: LookRule[];
  addons?: AddonRule[];
  coupon?: CouponRule | null;
  shippingFee?: number;
  freeShippingThreshold?: number;
}): Totals {
  const lines = input.lines.filter((l) => l.quantity > 0);
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  // ── Look (bundle) discounts: only complete sets are discounted ──
  const lineDiscounts: Record<string, number> = {};
  const appliedLookIds: number[] = [];
  let lookDiscount = 0;
  for (const look of input.looks ?? []) {
    if (look.discountPercent <= 0 || look.productIds.length === 0) continue;
    const group = lines.filter((l) => l.lookId === look.id);
    const qtyByProduct = new Map<number, number>();
    for (const l of group) qtyByProduct.set(l.productId, (qtyByProduct.get(l.productId) ?? 0) + l.quantity);
    const sets = Math.min(...look.productIds.map((pid) => qtyByProduct.get(pid) ?? 0));
    if (!Number.isFinite(sets) || sets <= 0) continue;
    appliedLookIds.push(look.id);
    for (const pid of look.productIds) {
      let remaining = sets;
      for (const l of group.filter((g) => g.productId === pid)) {
        if (remaining <= 0) break;
        const units = Math.min(remaining, l.quantity);
        remaining -= units;
        const d = Math.round((l.unitPrice * units * look.discountPercent) / 100);
        const k = lineKey(l.variantId, l.lookId, l.addonOf);
        lineDiscounts[k] = (lineDiscounts[k] ?? 0) + d;
        lookDiscount += d;
      }
    }
  }

  // ── Add-on discounts: only as many add-on units as units of the product they were added with ──
  let addonDiscount = 0;
  for (const rule of input.addons ?? []) {
    const pct = Math.min(90, Math.max(0, rule.discountPercent));
    if (pct <= 0) continue;
    const parentQty = lines.filter((l) => l.productId === rule.parentId && !l.addonOf).reduce((sum, l) => sum + l.quantity, 0);
    if (parentQty <= 0) continue;
    const budget = new Map<number, number>();
    for (const l of lines) {
      if (l.addonOf !== rule.parentId || l.lookId || !rule.productIds.includes(l.productId)) continue;
      const left = budget.get(l.productId) ?? parentQty;
      const units = Math.min(left, l.quantity);
      budget.set(l.productId, left - units);
      if (units <= 0) continue;
      const d = Math.round((l.unitPrice * units * pct) / 100);
      const k = lineKey(l.variantId, l.lookId, l.addonOf);
      lineDiscounts[k] = (lineDiscounts[k] ?? 0) + d;
      addonDiscount += d;
    }
  }

  // ── Coupon ──
  let couponDiscount = 0;
  let couponError: string | null = null;
  const afterLooks = subtotal - lookDiscount - addonDiscount;
  if (input.coupon) {
    const c = input.coupon;
    if (afterLooks < c.minSubtotal) {
      couponError = `هذا الكود يتطلب حداً أدنى للطلب`;
    } else if (c.type === "percent") {
      couponDiscount = Math.round((afterLooks * Math.min(100, Math.max(0, c.value))) / 100);
    } else {
      couponDiscount = Math.min(afterLooks, Math.max(0, c.value));
    }
  }

  const discount = lookDiscount + addonDiscount + couponDiscount;
  const merchandise = Math.max(0, subtotal - discount);
  const threshold = input.freeShippingThreshold ?? 0;
  const freeShipping = threshold > 0 && merchandise >= threshold && subtotal > 0;
  const shipping = subtotal === 0 || freeShipping ? 0 : Math.max(0, input.shippingFee ?? 0);

  return {
    subtotal,
    lookDiscount,
    addonDiscount,
    couponDiscount,
    discount,
    shipping,
    freeShipping,
    total: merchandise + shipping,
    lineDiscounts,
    appliedLookIds,
    couponError,
  };
}

/** Client-side estimate of add-on rules from cart lines (the server re-reads them from the catalogue). */
export function addonRulesFrom(lines: { productId: number; addonOf?: number | null; addonDiscountPercent?: number }[]): AddonRule[] {
  const rules = new Map<number, AddonRule>();
  for (const l of lines) {
    if (!l.addonOf || !l.addonDiscountPercent) continue;
    const r = rules.get(l.addonOf) ?? { parentId: l.addonOf, productIds: [], discountPercent: l.addonDiscountPercent };
    if (!r.productIds.includes(l.productId)) r.productIds.push(l.productId);
    rules.set(l.addonOf, r);
  }
  return [...rules.values()];
}
