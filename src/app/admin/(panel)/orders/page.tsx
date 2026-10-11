import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Download, ShoppingBag } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUSES, ORDER_STATUS_META, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_META } from "@/lib/order-status";
import { formatNumber } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Pagination, PaymentBadge, StatusBadge, TabsNav, Table, TBody, Td, Th, THead, Tr, hrefWith } from "@/components/admin/ui";
import { relativeStamp } from "@/components/admin/dashboard/panels";
import { OrderFilterBar } from "@/components/admin/orders/filter-bar";
import { filtersToParams, listOrders, parseOrderFilters, statusCounts } from "./_lib/query";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "الطلبات" };

const SHORT_METHOD: Record<string, string> = { cod: "عند الاستلام", transfer: "حوالة" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const f = parseOrderFilters(sp);
  const [{ rows, total, pageCount, page }, counts, settings] = await Promise.all([listOrders(f), statusCounts(f), getSettings()]);
  const money = (n: number) => formatMoney(n, settings.currency);

  const base = filtersToParams(f, { status: false });
  const tabs = [
    { label: "الكل", href: hrefWith("/admin/orders", base, {}), count: counts.all, active: !f.status },
    ...ORDER_STATUSES.map((s) => ({
      label: ORDER_STATUS_META[s].label,
      href: hrefWith("/admin/orders", base, { status: s }),
      count: counts.byStatus[s] ?? 0,
      active: f.status === s,
    })),
  ];
  const activeFilters = [f.q, f.payment, f.method, f.from, f.to].filter(Boolean).length;
  const linkParams = filtersToParams(f);
  const exportHref = hrefWith("/admin/orders/export", linkParams, {});

  const chips: { label: string; href: string }[] = [];
  if (f.q) chips.push({ label: `بحث: «${f.q}»`, href: hrefWith("/admin/orders", linkParams, { q: null }) });
  if (f.payment) chips.push({ label: PAYMENT_STATUS_META[f.payment].label, href: hrefWith("/admin/orders", linkParams, { payment: null }) });
  if (f.method) chips.push({ label: PAYMENT_METHOD_LABELS[f.method], href: hrefWith("/admin/orders", linkParams, { method: null }) });
  if (f.from || f.to)
    chips.push({ label: `${f.from ? `من ${f.from}` : ""}${f.from && f.to ? " " : ""}${f.to ? `إلى ${f.to}` : ""}`, href: hrefWith("/admin/orders", linkParams, { from: null, to: null }) });

  const pendingCount = counts.byStatus.pending ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="ORDERS"
        title="الطلبات"
        description={
          pendingCount > 0 ? (
            <>
              لديك <span className="font-semibold text-warning">{formatNumber(pendingCount)}</span> {pendingCount === 1 ? "طلب ينتظر" : "طلبات تنتظر"} التأكيد — تواصل مع العملاء عبر واتساب ثم حدّث الحالة.
            </>
          ) : (
            "كل الطلبات مؤكدة. تابع التجهيز والشحن من هنا."
          )
        }
        actions={
          <a href={exportHref} download className={buttonClasses("outline", "sm", "border-line")}>
            <Download className="size-4" aria-hidden />
            تصدير CSV
          </a>
        }
      />

      <Card padded={false}>
        <div className="px-4 pt-2 md:px-6">
          <TabsNav tabs={tabs} label="تصفية حسب الحالة" />
        </div>
        <div className="space-y-3 border-b border-line px-4 py-4 md:px-6">
          <OrderFilterBar values={{ status: f.status, q: f.q, payment: f.payment, method: f.method, from: f.from, to: f.to }} activeCount={activeFilters} />
          {chips.length > 0 && (
            <ul className="flex flex-wrap items-center gap-2" aria-label="عوامل التصفية النشطة">
              {chips.map((c) => (
                <li key={c.label}>
                  <Link
                    href={c.href}
                    scroll={false}
                    className="inline-flex items-center gap-1.5 rounded-full bg-bone px-3 py-1 text-xs text-umber transition-colors hover:bg-sand"
                    aria-label={`إزالة ${c.label}`}
                  >
                    {c.label}
                    <span aria-hidden className="text-taupe">
                      ×
                    </span>
                  </Link>
                </li>
              ))}
              <li className="text-xs text-taupe">
                <span className="tabular-nums">{formatNumber(total)}</span> نتيجة
              </li>
            </ul>
          )}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag />}
            title={activeFilters || f.status ? "لا طلبات تطابق التصفية" : "لا طلبات بعد"}
            description={
              activeFilters || f.status
                ? "جرّب كلمة بحث أخرى أو وسّع الفترة الزمنية."
                : "عندما يطلب أول عميل من المتجر ستظهر طلباته هنا مباشرة مع تنبيه فوري."
            }
            action={
              activeFilters || f.status ? (
                <Link href="/admin/orders" className={buttonClasses("outline", "sm")}>
                  عرض كل الطلبات
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Phones: stacked cards */}
            <ul className="divide-y divide-line md:hidden">
              {rows.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-start gap-3 px-4 py-4 active:bg-ivory">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold tabular-nums text-espresso" dir="ltr">
                          {o.number}
                        </span>
                        <span className="font-semibold tabular-nums text-espresso">{money(o.total)}</span>
                      </div>
                      <p className="mt-1 truncate text-sm text-umber">
                        {o.customerName}
                        <span className="text-taupe"> · {o.city}</span>
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={o.status} />
                        <PaymentBadge status={o.paymentStatus} />
                        <span className="ms-auto text-xs text-taupe">{relativeStamp(o.createdAt)}</span>
                      </div>
                    </div>
                    <ChevronLeft className="mt-1 size-4 shrink-0 text-mist" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>

            {/* Tablet & desktop: table */}
            <div className="hidden md:block">
              <Table minWidth={960} caption="قائمة الطلبات">
                <THead>
                  <tr>
                    <Th>الطلب</Th>
                    <Th>العميل</Th>
                    <Th>المدينة</Th>
                    <Th align="center">القطع</Th>
                    <Th align="end">الإجمالي</Th>
                    <Th>الدفع</Th>
                    <Th>الحالة</Th>
                    <Th align="end">التاريخ</Th>
                  </tr>
                </THead>
                <TBody>
                  {rows.map((o) => (
                    <Tr key={o.id} className="relative">
                      <Td>
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="font-semibold tabular-nums text-espresso outline-none before:absolute before:inset-0 before:content-[''] hover:text-copper-deep focus-visible:before:ring-2 focus-visible:before:ring-inset focus-visible:before:ring-copper/40"
                          dir="ltr"
                        >
                          {o.number}
                        </Link>
                        {o.couponCode && <p className="mt-0.5 text-[0.7rem] text-copper-deep" dir="ltr">{o.couponCode}</p>}
                      </Td>
                      <Td>
                        <p className="max-w-[12rem] truncate font-medium text-espresso">{o.customerName}</p>
                        <p className="text-xs tabular-nums text-taupe" dir="ltr" style={{ textAlign: "right" }}>
                          {o.phone}
                        </p>
                      </Td>
                      <Td className="whitespace-nowrap">{o.city}</Td>
                      <Td align="center" numeric>
                        {o.itemsCount}
                      </Td>
                      <Td align="end" numeric className="font-semibold text-espresso">
                        {money(o.total)}
                      </Td>
                      <Td>
                        <div className="flex flex-col items-start gap-1">
                          <PaymentBadge status={o.paymentStatus} />
                          <span className="text-[0.7rem] text-taupe">{SHORT_METHOD[o.paymentMethod] ?? o.paymentMethod}</span>
                        </div>
                      </Td>
                      <Td>
                        <StatusBadge status={o.status} />
                      </Td>
                      <Td align="end" className="whitespace-nowrap text-xs text-taupe">
                        {relativeStamp(o.createdAt)}
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
          </>
        )}
        {rows.length > 0 && (
          <div className="border-t border-line px-4 py-3 md:px-6">
            <Pagination page={page} pageCount={pageCount} basePath="/admin/orders" searchParams={linkParams} total={total} />
          </div>
        )}
      </Card>
    </div>
  );
}
