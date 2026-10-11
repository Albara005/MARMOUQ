import type { OrderStatus, PaymentStatus } from "@/db/schema";

export const ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];

/** Statuses that hold stock (everything except cancelled/returned). */
export const STOCK_HOLDING: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered"];

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; tone: "neutral" | "info" | "warning" | "success" | "danger" | "copper"; hint: string }> = {
  pending: { label: "قيد المراجعة", tone: "warning", hint: "استلمنا طلبك وسنتواصل معك للتأكيد" },
  confirmed: { label: "مؤكَّد", tone: "info", hint: "تم تأكيد الطلب" },
  processing: { label: "قيد التجهيز", tone: "copper", hint: "نجهّز قطعك ونغلّفها بعناية" },
  shipped: { label: "تم الشحن", tone: "info", hint: "طلبك في الطريق إليك" },
  delivered: { label: "تم التسليم", tone: "success", hint: "وصل الطلب — نتمنى أن ينال إعجابك" },
  cancelled: { label: "ملغي", tone: "danger", hint: "تم إلغاء الطلب" },
  returned: { label: "مرتجع", tone: "neutral", hint: "تم إرجاع الطلب" },
};

/** The happy-path timeline shown to customers. */
export const CUSTOMER_TIMELINE: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered"];

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: "neutral" | "success" | "warning" | "danger" }> = {
  unpaid: { label: "غير مدفوع", tone: "warning" },
  paid: { label: "مدفوع", tone: "success" },
  refunded: { label: "مسترد", tone: "neutral" },
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: "الدفع عند الاستلام",
  transfer: "حوالة / محفظة إلكترونية",
};

export function isOrderStatus(v: string): v is OrderStatus {
  return (ORDER_STATUSES as string[]).includes(v);
}
