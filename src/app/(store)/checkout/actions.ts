"use server";

import { z } from "zod";
import { findValidCoupon, placeOrder, type PlaceOrderResult } from "@/lib/orders";
import { clientIp, isThrottled, recordFailedAttempt } from "@/lib/auth";
import { normalizePhone } from "@/lib/utils";
import type { CouponRule } from "@/lib/pricing";

/* ───────────── Coupon preview ───────────── */

export type CouponResult = { ok: true; coupon: CouponRule } | { ok: false; error: string };

const codeSchema = z
  .string()
  .trim()
  .min(1, "أدخل كود الخصم")
  .max(40, "الكود طويل جداً")
  .regex(/^[\p{L}\p{N}_-]+$/u, "كود الخصم غير صالح");

/** Validates a coupon for the live estimate. The order itself re-validates it inside the checkout transaction. */
export async function applyCoupon(code: unknown): Promise<CouponResult> {
  const parsed = codeSchema.safeParse(code);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "كود الخصم غير صالح" };

  const key = `coupon:${await clientIp()}`;
  if (isThrottled(key)) return { ok: false, error: "محاولات كثيرة، جرّب بعد قليل" };

  try {
    const found = await findValidCoupon(parsed.data);
    if (!found.coupon) {
      recordFailedAttempt(key);
      return { ok: false, error: found.error };
    }
    const { code: c, type, value, minSubtotal } = found.coupon;
    return { ok: true, coupon: { code: c, type, value, minSubtotal } };
  } catch (err) {
    console.error("[checkout] coupon lookup failed", err);
    return { ok: false, error: "تعذّر التحقق من الكود الآن" };
  }
}

/* ───────────── Place order ───────────── */

/** Yemeni mobiles typed locally (7XXXXXXXX / 07XXXXXXXX) are stored with the +967 country code. */
function withCountryCode(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  const digits = normalizePhone(raw).replace(/^\+/, "");
  if (/^0?7\d{8}$/.test(digits)) return `+967${digits.replace(/^0/, "")}`;
  if (/^00\d{8,15}$/.test(digits)) return `+${digits.slice(2)}`;
  return raw;
}

/**
 * Checkout submit. `placeOrder` validates everything with zod, locks stock rows,
 * re-prices from the database and re-checks the coupon — client totals are never trusted.
 */
export async function submitOrder(payload: unknown): Promise<PlaceOrderResult> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "تحقق من البيانات المدخلة" };
  }
  const key = `checkout:${await clientIp()}`;
  if (isThrottled(key)) return { ok: false, error: "طلبات كثيرة خلال وقت قصير، حاول بعد دقائق أو تواصل معنا مباشرة." };

  const input = { ...(payload as Record<string, unknown>) };
  input.phone = withCountryCode(input.phone);

  const result = await placeOrder(input);
  // Count only rejected attempts that look like abuse (malformed payloads), not stock or coupon issues.
  if (!result.ok && result.fieldErrors?.lines) recordFailedAttempt(key);
  return result;
}
