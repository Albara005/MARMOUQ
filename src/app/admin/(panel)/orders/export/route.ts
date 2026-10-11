import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ORDER_STATUS_META, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_META } from "@/lib/order-status";
import type { OrderStatus, PaymentStatus } from "@/db/schema";
import { exportOrders, parseOrderFilters, STORE_TZ } from "../_lib/query";

export const dynamic = "force-dynamic";

const STAMP = new Intl.DateTimeFormat("en-CA", {
  timeZone: STORE_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function cell(v: string | number): string {
  let s = String(v ?? "");
  // Neutralise spreadsheet formula injection from customer-entered text.
  if (/^[=+\-@\t\r]/.test(s) && typeof v === "string") s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV of the currently filtered orders list (same query params as /admin/orders). */
export async function GET(request: NextRequest) {
  await requireAdmin();
  const sp = Object.fromEntries(request.nextUrl.searchParams.entries());
  const f = parseOrderFilters(sp);
  const rows = await exportOrders(f);

  const header = [
    "رقم الطلب",
    "التاريخ",
    "الحالة",
    "العميل",
    "الجوال",
    "المدينة",
    "العنوان",
    "القطع",
    "عدد القطع",
    "المجموع الفرعي",
    "الخصم",
    "كود الخصم",
    "الشحن",
    "الإجمالي",
    "طريقة الدفع",
    "حالة الدفع",
    "ملاحظات العميل",
  ];
  const lines = rows.map((o) =>
    [
      o.number,
      STAMP.format(o.createdAt).replace(",", ""),
      ORDER_STATUS_META[o.status as OrderStatus]?.label ?? o.status,
      o.customerName,
      o.phone,
      o.city,
      o.address,
      o.itemsLabel,
      o.itemsCount,
      o.subtotal,
      o.discount,
      o.couponCode,
      o.shippingFee,
      o.total,
      PAYMENT_METHOD_LABELS[o.paymentMethod] ?? o.paymentMethod,
      PAYMENT_STATUS_META[o.paymentStatus as PaymentStatus]?.label ?? o.paymentStatus,
      o.notes,
    ]
      .map(cell)
      .join(","),
  );
  // BOM so Excel opens Arabic text as UTF-8.
  const body = `﻿${[header.map(cell).join(","), ...lines].join("\r\n")}\r\n`;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TZ }).format(new Date());
  const suffix = f.status ? `-${f.status}` : "";
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="marmouq-orders${suffix}-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
