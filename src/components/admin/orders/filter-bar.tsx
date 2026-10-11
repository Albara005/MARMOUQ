"use client";

import Form from "next/form";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { CalendarRange, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Values = { status?: string | null; q?: string; payment?: string | null; method?: string | null; from?: string | null; to?: string | null };

const selectCls =
  "h-10 w-full appearance-none rounded-full border border-line bg-paper bg-[url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237d6b5f' stroke-width='2'><path d='m6 9 6 6 6-6'/></svg>\")] bg-[length:12px] bg-[position:left_0.9rem_center] bg-no-repeat ps-4 pe-9 text-sm text-espresso outline-none transition-colors focus:border-copper focus:ring-2 focus:ring-copper/15";
const dateCls =
  "h-10 w-full min-w-0 rounded-full border border-line bg-paper px-3.5 text-sm text-espresso outline-none transition-colors focus:border-copper focus:ring-2 focus:ring-copper/15 [&::-webkit-calendar-picker-indicator]:opacity-60";

/**
 * Search + filters for the orders list. GET form with client-side navigation (next/form);
 * selects and dates apply instantly, the search applies on Enter.
 */
export function OrderFilterBar({ values, activeCount }: { values: Values; activeCount: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(activeCount > 0);
  const panelId = useId();
  const submit = () => formRef.current?.requestSubmit();
  const clearHref = values.status ? `/admin/orders?status=${values.status}` : "/admin/orders";

  return (
    <Form ref={formRef} action="/admin/orders" scroll={false} replace className="space-y-3">
      {values.status && <input type="hidden" name="status" value={values.status} />}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1 lg:max-w-sm">
          <label htmlFor="orders-q" className="sr-only">
            ابحث برقم الطلب أو اسم العميل أو الجوال
          </label>
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-taupe" aria-hidden />
          <input
            id="orders-q"
            type="search"
            name="q"
            defaultValue={values.q}
            placeholder="رقم الطلب، الاسم أو الجوال…"
            autoComplete="off"
            enterKeyHint="search"
            className="h-10 w-full rounded-full border border-line bg-paper ps-10 pe-4 text-sm text-espresso outline-none transition-colors placeholder:text-mist focus:border-copper focus:ring-2 focus:ring-copper/15 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex h-10 items-center justify-between rounded-full border border-line bg-paper px-4 text-sm text-umber lg:hidden"
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-taupe" aria-hidden />
            تصفية متقدمة
            {activeCount > 0 && <span className="rounded-full bg-espresso px-1.5 py-px text-[0.7rem] tabular-nums text-paper">{activeCount}</span>}
          </span>
          <span className="text-xs text-taupe">{open ? "إخفاء" : "إظهار"}</span>
        </button>

          <div id={panelId} className={cn("grid-cols-2 gap-2.5 lg:flex lg:flex-1 lg:items-center lg:justify-end", open ? "grid" : "hidden")}>
            <div className="lg:w-40">
              <label htmlFor="orders-payment" className="sr-only">
                حالة الدفع
              </label>
              <select id="orders-payment" name="payment" defaultValue={values.payment ?? ""} onChange={submit} className={selectCls}>
                <option value="">كل حالات الدفع</option>
                <option value="unpaid">غير مدفوع</option>
                <option value="paid">مدفوع</option>
                <option value="refunded">مسترد</option>
              </select>
            </div>
            <div className="lg:w-44">
              <label htmlFor="orders-method" className="sr-only">
                طريقة الدفع
              </label>
              <select id="orders-method" name="method" defaultValue={values.method ?? ""} onChange={submit} className={selectCls}>
                <option value="">كل طرق الدفع</option>
                <option value="cod">عند الاستلام</option>
                <option value="transfer">حوالة / محفظة</option>
              </select>
            </div>
            <fieldset className="col-span-2 flex items-center gap-2 lg:w-auto">
              <legend className="sr-only">الفترة الزمنية</legend>
              <CalendarRange className="hidden size-4 shrink-0 text-taupe lg:block" aria-hidden />
              <label className="sr-only" htmlFor="orders-from">
                من تاريخ
              </label>
              <input id="orders-from" type="date" name="from" defaultValue={values.from ?? ""} onChange={submit} className={cn(dateCls, "lg:w-[9.5rem]")} dir="ltr" />
              <span className="text-xs text-taupe">إلى</span>
              <label className="sr-only" htmlFor="orders-to">
                إلى تاريخ
              </label>
              <input id="orders-to" type="date" name="to" defaultValue={values.to ?? ""} onChange={submit} className={cn(dateCls, "lg:w-[9.5rem]")} dir="ltr" />
            </fieldset>
            {activeCount > 0 && (
              <Link
                href={clearHref}
                scroll={false}
                className="col-span-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-3 text-sm text-taupe transition-colors hover:bg-bone hover:text-espresso lg:col-span-1"
              >
                <X className="size-3.5" aria-hidden />
                مسح التصفية
              </Link>
            )}
          </div>
      </div>
      <button type="submit" className="sr-only">
        تطبيق
      </button>
    </Form>
  );
}
