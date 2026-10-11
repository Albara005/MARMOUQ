"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { addOrderNote, setPaymentStatus, updateOrderStatus } from "@/lib/orders";
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
