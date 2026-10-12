"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { addOrderNote, setOrderShipment, setPaymentStatus, updateOrderStatus } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { buildTrackingUrl } from "@/lib/carriers";
import { normalizePhone } from "@/lib/utils";
import { ORDER_STATUSES, ORDER_STATUS_META } from "@/lib/order-status";
import { actionError, actionOk, zodFieldErrors, type ActionResult } from "@/components/admin/action-result";
import type { OrderStatus } from "@/db/schema";

const idSchema = z.coerce.number().int().positive();

function refresh(orderId: number) {
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

const statusSchema = z.object({
  orderId: idSchema,
  status: z.enum(ORDER_STATUSES as [OrderStatus, ...OrderStatus[]], { message: "اختر حالة صحيحة" }),
  note: z.string().trim().max(500, "الملاحظة أطول من 500 حرف").optional().default(""),
});

export async function changeOrderStatusAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = statusSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return actionError("تحقق من البيانات", zodFieldErrors(parsed.error));
  const { orderId, status, note } = parsed.data;
  const res = await updateOrderStatus(orderId, status, note, admin.id);
  if (!res.ok) return actionError(res.error ?? "تعذّر تحديث حالة الطلب");
  refresh(orderId);
  return actionOk(`أصبحت حالة الطلب: ${ORDER_STATUS_META[status].label}`);
}

const paymentSchema = z.object({
  orderId: idSchema,
  payment: z.enum(["unpaid", "paid", "refunded"], { message: "حالة دفع غير صحيحة" }),
});

const PAYMENT_TOAST = { paid: "تم تعليم الطلب كمدفوع", unpaid: "تم تعليم الطلب كغير مدفوع", refunded: "تم تسجيل الاسترداد" } as const;

export async function setPaymentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = paymentSchema.safeParse({ orderId: formData.get("orderId"), payment: formData.get("payment") });
  if (!parsed.success) return actionError("تحقق من البيانات", zodFieldErrors(parsed.error));
  try {
    await setPaymentStatus(parsed.data.orderId, parsed.data.payment, admin.id);
  } catch (err) {
    console.error("[orders] payment", err);
    return actionError("تعذّر تحديث حالة الدفع");
  }
  refresh(parsed.data.orderId);
  return actionOk(PAYMENT_TOAST[parsed.data.payment]);
}

const noteSchema = z.object({
  orderId: idSchema,
  note: z.string().trim().min(2, "اكتب الملاحظة أولاً").max(1000, "الملاحظة أطول من 1000 حرف"),
});

export async function addOrderNoteAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = noteSchema.safeParse({ orderId: formData.get("orderId"), note: formData.get("note") ?? "" });
  if (!parsed.success) return actionError("لم تُحفظ الملاحظة", zodFieldErrors(parsed.error));
  try {
    await addOrderNote(parsed.data.orderId, parsed.data.note, admin.id);
  } catch (err) {
    console.error("[orders] note", err);
    return actionError("تعذّر حفظ الملاحظة");
  }
  refresh(parsed.data.orderId);
  return actionOk("أُضيفت الملاحظة إلى سجل الطلب");
}

const shipmentSchema = z
  .object({
    orderId: idSchema,
    intent: z.enum(["save", "clear"]),
    /** a carrier id from settings, or "other" */
    carrierId: z.string().trim().max(40).optional().default(""),
    customName: z.string().trim().max(40, "الحد الأقصى 40 حرفاً").optional().default(""),
    customUrl: z
      .string()
      .trim()
      .max(500, "الرابط طويل")
      .optional()
      .default("")
      .refine((v) => v === "" || /^https:\/\/[^\s]+\.[^\s]+$/i.test(v), "الرابط يجب أن يبدأ بـ https://"),
    trackingNumber: z
      .string()
      .trim()
      .max(60, "رقم التتبع طويل")
      .optional()
      .default("")
      .transform((v) => v.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)))
      .refine((v) => v === "" || /^[A-Za-z0-9 _./-]+$/.test(v), "رقم التتبع يحتوي على رموز غير مقبولة"),
    markShipped: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  })
  .superRefine((v, ctx) => {
    if (v.intent === "clear") return;
    if (!v.carrierId) ctx.addIssue({ code: "custom", path: ["carrierId"], message: "اختر شركة الشحن" });
    if (v.carrierId === "other" && v.customName.length < 2) ctx.addIssue({ code: "custom", path: ["customName"], message: "اكتب اسم الشركة" });
    if (!v.trackingNumber && !(v.carrierId === "other" && v.customUrl)) ctx.addIssue({ code: "custom", path: ["trackingNumber"], message: "أدخل رقم التتبع (البوليصة)" });
  });

export async function saveShipmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = shipmentSchema.safeParse({
    orderId: formData.get("orderId"),
    intent: formData.get("intent") ?? "save",
    carrierId: formData.get("carrierId") ?? "",
    customName: formData.get("customName") ?? "",
    customUrl: formData.get("customUrl") ?? "",
    trackingNumber: formData.get("trackingNumber") ?? "",
    markShipped: formData.get("markShipped") ?? "",
  });
  if (!parsed.success) return actionError("لم تُحفظ بيانات الشحن", zodFieldErrors(parsed.error));
  const v = parsed.data;

  let input = { carrierName: "", trackingNumber: "", trackingUrl: "", carrierPhone: "" };
  if (v.intent === "save") {
    if (v.carrierId === "other") {
      input = { carrierName: v.customName, trackingNumber: v.trackingNumber, trackingUrl: buildTrackingUrl(v.customUrl, v.trackingNumber) || v.customUrl, carrierPhone: "" };
    } else {
      const carrier = (await getSettings()).carriers.find((c) => c.id === v.carrierId);
      if (!carrier) return actionError("شركة الشحن غير موجودة — حدّث الصفحة", { carrierId: "اختر شركة من القائمة" });
      input = {
        carrierName: carrier.name,
        trackingNumber: v.trackingNumber,
        trackingUrl: buildTrackingUrl(carrier.trackingUrl, v.trackingNumber),
        carrierPhone: carrier.phone ? normalizePhone(carrier.phone) : "",
      };
    }
  }

  const res = await setOrderShipment(v.orderId, input, v.markShipped, admin.id);
  if (!res.ok) return actionError(res.error ?? "تعذّر حفظ بيانات الشحن");
  refresh(v.orderId);
  revalidatePath("/order", "layout");
  return actionOk(v.intent === "clear" ? "حُذفت بيانات الشحن" : v.markShipped ? "حُفظ رقم التتبع وأصبح الطلب «تم الشحن»" : "حُفظ رقم التتبع — يظهر للعميل الآن");
}
