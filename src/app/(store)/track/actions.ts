"use server";

import { z } from "zod";
import { findOrderForTracking } from "@/lib/orders";
import { clientIp, isThrottled, recordFailedAttempt } from "@/lib/auth";
import type { OrderStatus } from "@/db/schema";

/** Customer-safe tracking payload (no token, no full address, no internal notes). */
export type TrackedOrder = {
  number: string;
  customerFirstName: string;
  city: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  itemsCount: number;
  items: { name: string; color: string; size: string; quantity: number; imageId: string | null }[];
  events: { status: string; at: string }[];
  createdAt: string;
  updatedAt: string;
};

export type TrackState =
  | { status: "idle"; values?: { number: string; phone: string } }
  | { status: "error"; message: string; fieldErrors?: { number?: string; phone?: string }; values: { number: string; phone: string } }
  | { status: "found"; order: TrackedOrder; values: { number: string; phone: string } };

const schema = z.object({
  number: z
    .string()
    .trim()
    .min(1, "أدخل رقم الطلب")
    .max(24, "رقم الطلب غير صحيح")
    .transform((v) => {
      const s = v.toUpperCase().replace(/\s+/g, "").replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
      return /^\d+$/.test(s) ? `MRQ-${s}` : s.startsWith("MRQ") && !s.startsWith("MRQ-") ? `MRQ-${s.slice(3)}` : s;
    }),
  phone: z
    .string()
    .trim()
    .min(1, "أدخل رقم الجوال")
    .max(24, "رقم الجوال غير صحيح")
    .refine((v) => v.replace(/[^\d٠-٩]/g, "").length >= 7, "رقم الجوال غير صحيح"),
});

export async function trackOrder(_prev: TrackState, formData: FormData): Promise<TrackState> {
  const values = { number: String(formData.get("number") ?? "").slice(0, 40), phone: String(formData.get("phone") ?? "").slice(0, 40) };
  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: { number?: string; phone?: string } = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as "number" | "phone";
      fieldErrors[k] ??= issue.message;
    }
    return { status: "error", message: "تحقق من البيانات المدخلة", fieldErrors, values };
  }

  const key = `track:${await clientIp()}`;
  if (isThrottled(key)) {
    return { status: "error", message: "محاولات كثيرة خلال وقت قصير، حاول بعد ربع ساعة أو تواصل معنا.", values };
  }

  try {
    const order = await findOrderForTracking(parsed.data.number, parsed.data.phone);
    if (!order) {
      recordFailedAttempt(key);
      return {
        status: "error",
        message: "ما لقينا طلباً بهذه البيانات. تأكد من رقم الطلب ورقم الجوال المستخدم عند الطلب.",
        values,
      };
    }
    const statusEvents = order.events.filter((e) => !e.status.startsWith("payment:") && e.status !== "note");
    return {
      status: "found",
      values,
      order: {
        number: order.number,
        customerFirstName: order.customerName.trim().split(/\s+/)[0] ?? "",
        city: order.city,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        total: order.total,
        itemsCount: order.items.reduce((s, i) => s + i.quantity, 0),
        items: order.items.map((i) => ({ name: i.name, color: i.color, size: i.size, quantity: i.quantity, imageId: i.imageId })),
        events: statusEvents.map((e) => ({ status: e.status, at: e.createdAt.toISOString() })),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      },
    };
  } catch (err) {
    console.error("[track] lookup failed", err);
    return { status: "error", message: "تعذّر البحث الآن، حاول مرة أخرى بعد لحظات.", values };
  }
}
