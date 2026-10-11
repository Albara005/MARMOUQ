"use client";

import { useState } from "react";
import { Ban, Banknote, Check, PackageCheck, PackageOpen, RotateCcw, Truck, Undo2 } from "lucide-react";
import type { OrderStatus, PaymentStatus } from "@/db/schema";
import { ORDER_STATUSES, ORDER_STATUS_META, STOCK_HOLDING } from "@/lib/order-status";
import { Label, Select, Textarea } from "@/components/ui/field";
import { ActionFieldError, ActionForm, ActionFormError, SubmitButton, ConfirmSubmit } from "@/components/admin/ui-client";
import { addOrderNoteAction, changeOrderStatusAction, setPaymentAction } from "@/app/admin/(panel)/orders/actions";
import { cn } from "@/lib/utils";

/* ─────────────── Quick status actions (header) ─────────────── */

type Quick = { to: OrderStatus; label: string; icon: typeof Check; tone: "primary" | "outline" | "danger"; confirm?: string };

const QUICK: Partial<Record<OrderStatus, Quick[]>> = {
  pending: [
    { to: "confirmed", label: "تأكيد الطلب", icon: Check, tone: "primary" },
    { to: "cancelled", label: "إلغاء", icon: Ban, tone: "danger", confirm: "إلغاء الطلب سيعيد قطعه إلى المخزون. متأكد؟" },
  ],
  confirmed: [{ to: "processing", label: "بدء التجهيز", icon: PackageOpen, tone: "primary" }],
  processing: [{ to: "shipped", label: "تم الشحن", icon: Truck, tone: "primary" }],
  shipped: [
    { to: "delivered", label: "تم التسليم", icon: PackageCheck, tone: "primary" },
    { to: "returned", label: "مرتجع", icon: Undo2, tone: "outline", confirm: "تسجيل الطلب كمرتجع سيعيد القطع إلى المخزون. متأكد؟" },
  ],
  cancelled: [{ to: "pending", label: "إعادة فتح الطلب", icon: RotateCcw, tone: "outline", confirm: "سيُعاد حجز القطع من المخزون. متابعة؟" }],
};

/**
 * One persistent form for every quick action (the clicked button carries `status`), so the result toast
 * survives the re-render that swaps the available actions.
 */
export function QuickStatusActions({ orderId, status }: { orderId: number; status: OrderStatus }) {
  const actions = QUICK[status] ?? [];
  return (
    <ActionForm action={changeOrderStatusAction} className="contents">
      <input type="hidden" name="orderId" value={orderId} />
      {actions.map((a) => {
        const Icon = a.icon;
        return a.confirm ? (
          <ConfirmSubmit
            key={a.to}
            name="status"
            value={a.to}
            message={a.confirm}
            size="sm"
            variant={a.tone === "danger" ? "danger" : "outline"}
            className={a.tone === "outline" ? "border-line" : undefined}
          >
            <Icon className="size-4" aria-hidden />
            {a.label}
          </ConfirmSubmit>
        ) : (
          <SubmitButton key={a.to} name="status" value={a.to} size="sm" variant={a.tone === "primary" ? "primary" : "outline"}>
            <Icon className="size-4" aria-hidden />
            {a.label}
          </SubmitButton>
        );
      })}
    </ActionForm>
  );
}

/* ─────────────── Status workflow (select + note) ─────────────── */

export function StatusWorkflowForm({ orderId, status }: { orderId: number; status: OrderStatus }) {
  const [next, setNext] = useState<OrderStatus>(status);
  const holding = STOCK_HOLDING.includes(status);
  const willHold = STOCK_HOLDING.includes(next);
  const stockHint =
    next === status ? null : holding && !willHold ? "ستعود قطع هذا الطلب إلى المخزون تلقائياً." : !holding && willHold ? "سيُخصم المخزون من جديد — يتطلب توفر الكمية." : null;

  return (
    <ActionForm action={changeOrderStatusAction} className="space-y-4" resetOnSuccess onResult={(r) => r.ok && setNext(status)}>
      <input type="hidden" name="orderId" value={orderId} />
      <div>
        <Label htmlFor="order-status">الحالة الجديدة</Label>
        <Select id="order-status" name="status" defaultValue={status} onChange={(e) => setNext(e.target.value as OrderStatus)} className="h-11">
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_META[s].label}
              {s === status ? " (الحالية)" : ""}
            </option>
          ))}
        </Select>
        <ActionFieldError name="status" />
        {stockHint && (
          <p className={cn("mt-2 rounded-lg px-3 py-2 text-xs leading-5", willHold ? "bg-warning/10 text-warning" : "bg-info/10 text-info")} role="note">
            {stockHint}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="order-status-note">
          ملاحظة <span className="font-normal text-taupe">(اختياري — تظهر في سجل الطلب)</span>
        </Label>
        <Textarea id="order-status-note" name="note" rows={2} maxLength={500} placeholder="مثلاً: تم التأكيد هاتفياً مع العميل" className="min-h-20 text-sm" />
        <ActionFieldError name="note" />
      </div>
      <ActionFormError />
      <SubmitButton className="w-full" pendingLabel="جارٍ التحديث…">
        تحديث الحالة
      </SubmitButton>
    </ActionForm>
  );
}

/* ─────────────── Payment ─────────────── */

const PAY_BUTTONS: Record<PaymentStatus, { label: string; icon: typeof Check }> = {
  paid: { label: "تعليم كمدفوع", icon: Banknote },
  unpaid: { label: "غير مدفوع", icon: RotateCcw },
  refunded: { label: "تسجيل استرداد", icon: Undo2 },
};

export function PaymentActions({ orderId, status }: { orderId: number; status: PaymentStatus }) {
  const options = (["paid", "unpaid", "refunded"] as PaymentStatus[]).filter((p) => p !== status && !(status === "unpaid" && p === "refunded"));
  return (
    <ActionForm action={setPaymentAction} className="flex flex-wrap gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      {options.map((p) => {
        const meta = PAY_BUTTONS[p];
        const Icon = meta.icon;
        return p === "refunded" ? (
          <ConfirmSubmit key={p} name="payment" value={p} message="تسجيل استرداد المبلغ لهذا الطلب؟" size="sm" variant="ghost" className="text-danger hover:bg-danger/10">
            <Icon className="size-4" aria-hidden />
            {meta.label}
          </ConfirmSubmit>
        ) : (
          <SubmitButton key={p} name="payment" value={p} size="sm" variant={p === "paid" ? "copper" : "ghost"} className={p === "paid" ? "flex-1" : undefined}>
            <Icon className="size-4" aria-hidden />
            {meta.label}
          </SubmitButton>
        );
      })}
    </ActionForm>
  );
}

/* ─────────────── Internal note ─────────────── */

export function OrderNoteForm({ orderId }: { orderId: number }) {
  return (
    <ActionForm action={addOrderNoteAction} resetOnSuccess className="space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      <label htmlFor="order-note" className="sr-only">
        ملاحظة داخلية
      </label>
      <Textarea
        id="order-note"
        name="note"
        rows={2}
        maxLength={1000}
        required
        placeholder="ملاحظة داخلية للفريق — لا يراها العميل…"
        className="min-h-20 bg-ivory/60 text-sm"
      />
      <ActionFieldError name="note" />
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.7rem] text-taupe">تُحفظ باسمك في سجل الطلب.</p>
        <SubmitButton size="sm" variant="outline" className="border-line" pendingLabel="جارٍ الحفظ…">
          إضافة ملاحظة
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
