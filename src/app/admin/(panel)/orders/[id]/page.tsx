import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { ArrowUpLeft, Banknote, CircleDot, MapPin, MessageSquareText, Printer, StickyNote, Ticket, Truck, Wallet } from "lucide-react";
import { db } from "@/db";
import { admins, orders, shippingZones } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getOrderById } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { getMediaRefs } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { CUSTOMER_TIMELINE, ORDER_STATUS_META, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_META, isOrderStatus } from "@/lib/order-status";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";
import { MediaImage } from "@/components/ui/media-image";
import { buttonClasses } from "@/components/ui/button";
import { Avatar, Card, PageHeader, PaymentBadge, StatusBadge, FlashMessage } from "@/components/admin/ui";
import { OrderNoteForm, PaymentActions, QuickStatusActions, StatusWorkflowForm } from "@/components/admin/orders/order-actions";
import { WhatsAppComposer } from "@/components/admin/orders/whatsapp-composer";
import { orderTemplates } from "@/components/admin/orders/templates";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return { title: "طلب" };
  const [row] = await db.select({ number: orders.number }).from(orders).where(eq(orders.id, n)).limit(1);
  return { title: row ? `طلب ${row.number}` : "طلب غير موجود" };
}

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https")}://${host}`;
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

function instagramHandle(url: string): string | null {
  const m = url.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  return m ? `@${m[1]}` : null;
}

const EVENT_META = (status: string) => {
  if (status === "note") return { icon: StickyNote, label: "ملاحظة داخلية", dot: "bg-gold" };
  if (status.startsWith("payment:")) {
    const p = status.slice(8) as keyof typeof PAYMENT_STATUS_META;
    return { icon: Wallet, label: `الدفع: ${PAYMENT_STATUS_META[p]?.label ?? p}`, dot: p === "paid" ? "bg-success" : p === "refunded" ? "bg-taupe" : "bg-warning" };
  }
  if (isOrderStatus(status)) {
    const tone = ORDER_STATUS_META[status].tone;
    const dot = { warning: "bg-warning", info: "bg-info", copper: "bg-copper", success: "bg-success", danger: "bg-danger", neutral: "bg-taupe" }[tone];
    return { icon: CircleDot, label: ORDER_STATUS_META[status].label, dot };
  }
  return { icon: CircleDot, label: status, dot: "bg-taupe" };
};

export default async function OrderDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) notFound();
  const order = await getOrderById(orderId);
  if (!order) notFound();

  const adminIds = [...new Set(order.events.map((e) => e.adminId).filter((x): x is number => x != null))];
  const imageIds = [...new Set(order.items.map((i) => i.imageId).filter((x): x is string => !!x))];
  const [settings, adminRows, mediaRefs, zone, [others], origin] = await Promise.all([
    getSettings(),
    adminIds.length ? db.select({ id: admins.id, name: admins.name }).from(admins).where(inArray(admins.id, adminIds)) : Promise.resolve([]),
    getMediaRefs(imageIds),
    order.shippingZoneId ? db.query.shippingZones.findFirst({ where: eq(shippingZones.id, order.shippingZoneId), columns: { eta: true, name: true } }) : Promise.resolve(undefined),
    order.customerId
      ? db.select({ n: sql<number>`count(*)::int` }).from(orders).where(and(eq(orders.customerId, order.customerId), ne(orders.id, order.id)))
      : Promise.resolve([{ n: 0 }]),
    siteOrigin(),
  ]);
  const adminName = new Map(adminRows.map((a) => [a.id, a.name]));
  const mediaById = new Map(mediaRefs.map((m) => [m.id, m]));
  const money = (n: number) => formatMoney(n, settings.currency);
  const itemsCount = order.items.reduce((s, i) => s + i.quantity, 0);
  const lineDiscounts = order.items.reduce((s, i) => s + i.lineDiscount, 0);
  const couponDiscount = Math.max(0, order.discount - lineDiscounts);
  const trackUrl = `${origin}/order/${order.number}?t=${order.accessToken}`;
  const { templates, initialId } = orderTemplates({
    number: order.number,
    customerName: order.customerName,
    city: order.city,
    address: order.address,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    totalLabel: order.displayCurrency ? formatMoney(order.total, order.displayCurrency) : money(order.total),
    trackUrl,
    storeName: settings.storeName,
    instagramHandle: instagramHandle(settings.instagram),
    transferAccounts: settings.payments.transfer.accounts,
    eta: zone?.eta || null,
  });

  const stepIndex = CUSTOMER_TIMELINE.indexOf(order.status);
  const closed = order.status === "cancelled" || order.status === "returned";
  const events = [...order.events].reverse();

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "الطلبات", href: "/admin/orders" }, { label: order.number }]}
        title={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-2">
            <span>
              طلب{" "}
              <span dir="ltr" className="tabular-nums">
                {order.number}
              </span>
            </span>
            <StatusBadge status={order.status} className="!text-[0.78rem]" />
            <PaymentBadge status={order.paymentStatus} className="!text-[0.78rem]" />
          </span>
        }
        description={`استُلم ${formatDateTime(order.createdAt)} · ${formatNumber(itemsCount)} ${itemsCount === 1 ? "قطعة" : itemsCount === 2 ? "قطعتان" : itemsCount <= 10 ? "قطع" : "قطعة"} · ${money(order.total)}`}
        actions={
          <>
            <QuickStatusActions orderId={order.id} status={order.status} />
            <Link href={`/admin/orders/${order.id}/invoice?print=1`} className={buttonClasses("outline", "sm", "border-line")}>
              <Printer className="size-4" aria-hidden />
              طباعة الفاتورة
            </Link>
          </>
        }
      />

      {/* Progress */}
      {closed ? (
        <FlashMessage
          type={order.status === "cancelled" ? "error" : "warning"}
          title={order.status === "cancelled" ? "هذا الطلب ملغي" : "هذا الطلب مرتجع"}
          message="أُعيدت قطعه إلى المخزون ولا يدخل في إجمالي المبيعات. يمكنك إعادة فتحه من مسار الحالة إن لزم."
        />
      ) : (
        <ol className="grid grid-cols-5 gap-1.5 rounded-2xl border border-line bg-paper p-3 md:gap-3 md:p-4" aria-label="مراحل الطلب">
          {CUSTOMER_TIMELINE.map((s, i) => {
            const done = i <= stepIndex;
            const current = i === stepIndex;
            return (
              <li key={s} className="min-w-0" aria-current={current ? "step" : undefined}>
                <span className={cn("block h-1 rounded-full transition-colors", done ? (current ? "bg-copper" : "bg-espresso") : "bg-bone")} aria-hidden />
                <span className={cn("mt-2 block truncate text-[0.68rem] md:text-xs", current ? "font-semibold text-espresso" : done ? "text-umber" : "text-mist")}>
                  {ORDER_STATUS_META[s].label}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
        {/* ── Main column ── */}
        <div className="contents min-w-0 lg:block lg:space-y-6">
          <Card className="order-1" title="القطع" description={`${formatNumber(itemsCount)} ${itemsCount === 1 ? "قطعة" : "قطع"} في هذا الطلب`} padded={false}>
            <ul className="divide-y divide-line/70">
              {order.items.map((it) => {
                const lineTotal = it.unitPrice * it.quantity - it.lineDiscount;
                return (
                  <li key={it.id} className="flex gap-4 px-5 py-4 md:px-6">
                    <div className="studio-frame w-16 shrink-0 overflow-hidden rounded-lg md:w-[4.5rem]">
                      <MediaImage media={it.imageId ? (mediaById.get(it.imageId) ?? { id: it.imageId }) : null} alt={it.name} sizes="80px" className="aspect-[4/5]" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 sm:flex-row sm:items-start">
                      <div className="min-w-0">
                        {it.productId ? (
                          <Link href={`/admin/products/${it.productId}`} className="font-medium text-espresso underline-offset-4 hover:text-copper-deep hover:underline">
                            {it.name}
                          </Link>
                        ) : (
                          <p className="font-medium text-espresso">{it.name}</p>
                        )}
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-taupe">
                          {it.color && <span>اللون: <span className="text-umber">{it.color}</span></span>}
                          {it.size && <span>المقاس: <span className="text-umber" dir="ltr">{it.size}</span></span>}
                        </p>
                        {it.lineDiscount > 0 && <p className="mt-1 text-xs text-copper-deep">خصم الإطلالة −{money(it.lineDiscount)}</p>}
                      </div>
                      <div className="flex items-baseline justify-between gap-4 sm:block sm:text-end">
                        <p className="text-xs tabular-nums text-taupe">
                          {formatNumber(it.quantity)} × {money(it.unitPrice)}
                        </p>
                        <p className="font-semibold tabular-nums text-espresso">{money(lineTotal)}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <dl className="space-y-2 border-t border-line bg-ivory/50 px-5 py-4 text-sm md:px-6">
              <div className="flex justify-between gap-4">
                <dt className="text-taupe">المجموع الفرعي</dt>
                <dd className="tabular-nums text-umber">{money(order.subtotal)}</dd>
              </div>
              {lineDiscounts > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-taupe">خصم الإطلالات</dt>
                  <dd className="tabular-nums text-copper-deep">−{money(lineDiscounts)}</dd>
                </div>
              )}
              {(couponDiscount > 0 || order.couponCode) && (
                <div className="flex justify-between gap-4">
                  <dt className="flex items-center gap-2 text-taupe">
                    كود الخصم
                    {order.couponCode && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-copper/10 px-2 py-px text-[0.7rem] font-semibold text-copper-deep" dir="ltr">
                        <Ticket className="size-3" aria-hidden />
                        {order.couponCode}
                      </span>
                    )}
                  </dt>
                  <dd className="tabular-nums text-copper-deep">−{money(couponDiscount)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-taupe">الشحن</dt>
                <dd className="tabular-nums text-umber">{order.shippingFee > 0 ? money(order.shippingFee) : <span className="text-success">مجاني</span>}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
                <dt className="font-semibold text-espresso">الإجمالي</dt>
                <dd className="text-xl font-semibold tabular-nums tracking-tight text-espresso">{money(order.total)}</dd>
              </div>
              {order.displayCurrency && (
                <div className="flex items-baseline justify-between gap-4 rounded-xl bg-copper/10 px-3 py-2.5">
                  <dt className="text-sm text-copper-deep">المبلغ بعملة العميل ({order.displayCurrency.code})</dt>
                  <dd className="text-lg font-semibold tabular-nums text-copper-deep">{formatMoney(order.total, order.displayCurrency)}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card className="order-6" title="سجل الطلب" description="كل تغيير على الحالة والدفع، مع الملاحظات الداخلية للفريق.">
            <OrderNoteForm orderId={order.id} />
            <ol className="relative mt-6 space-y-5 before:absolute before:inset-y-1 before:start-[7px] before:w-px before:bg-line">
              {events.map((e) => {
                const meta = EVENT_META(e.status);
                const who = e.adminId ? adminName.get(e.adminId) ?? "عضو سابق في الفريق" : e.status === "pending" ? "العميل · من المتجر" : "النظام";
                return (
                  <li key={e.id} className="relative ps-7">
                    <span className={cn("absolute start-0 top-1.5 size-[15px] rounded-full ring-4 ring-paper", meta.dot)} aria-hidden />
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <p className={cn("text-sm font-medium", e.status === "note" ? "text-copper-deep" : "text-espresso")}>{meta.label}</p>
                      <time dateTime={e.createdAt.toISOString()} className="text-[0.72rem] tabular-nums text-taupe">
                        {formatDateTime(e.createdAt)}
                      </time>
                    </div>
                    {e.note && (
                      <p className={cn("mt-1 whitespace-pre-line text-sm leading-relaxed", e.status === "note" ? "rounded-lg bg-gold/10 px-3 py-2 text-umber" : "text-umber")}>{e.note}</p>
                    )}
                    <p className="mt-1 text-[0.72rem] text-taupe">{who}</p>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        {/* ── Side column ── */}
        <div className="contents min-w-0 lg:block lg:space-y-6">
          <Card className="order-2" title="العميل">
            <div className="flex items-center gap-3">
              <Avatar name={order.customerName} className="size-11 text-sm" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-espresso">{order.customerName}</p>
                <a href={`tel:${order.phone}`} className="text-sm tabular-nums text-taupe hover:text-espresso" dir="ltr">
                  {order.phone}
                </a>
              </div>
            </div>
            {order.customerId && (
              <Link
                href={`/admin/customers/${order.customerId}`}
                className="mt-4 flex items-center justify-between rounded-xl bg-ivory px-3.5 py-2.5 text-sm text-umber transition-colors hover:bg-bone"
              >
                <span>{others.n > 0 ? `${formatNumber(others.n)} ${others.n === 1 ? "طلب آخر" : "طلبات أخرى"} لهذا العميل` : "أول طلب لهذا العميل ✨"}</span>
                <ArrowUpLeft className="size-4 text-taupe" aria-hidden />
              </Link>
            )}
            <div className="mt-5 border-t border-line pt-4">
              <p className="mb-3 flex items-center gap-2 text-xs font-medium text-taupe">
                <MessageSquareText className="size-3.5" aria-hidden />
                رسالة جاهزة للعميل
              </p>
              <WhatsAppComposer phone={order.phone} templates={templates} initialId={initialId} />
            </div>
          </Card>

          <Card className="order-3" title="التوصيل">
            <div className="space-y-3 text-sm">
              <p className="flex items-start gap-2.5 text-umber">
                <MapPin className="mt-0.5 size-4 shrink-0 text-copper" aria-hidden />
                <span>
                  <span className="font-medium text-espresso">{order.city}</span>
                  <br />
                  {order.address}
                </span>
              </p>
              {zone?.eta && (
                <p className="flex items-center gap-2.5 text-umber">
                  <Truck className="size-4 shrink-0 text-copper" aria-hidden />
                  مدة التوصيل المتوقعة: {zone.eta}
                </p>
              )}
              {order.notes && (
                <div className="rounded-xl border border-gold/30 bg-gold/[0.07] px-3.5 py-3">
                  <p className="text-[0.72rem] font-medium text-copper-deep">ملاحظة العميل</p>
                  <p className="mt-1 whitespace-pre-line leading-relaxed text-umber">{order.notes}</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="order-4" title="الدفع" actions={<PaymentBadge status={order.paymentStatus} />}>
            <div className="space-y-4">
              <p className="flex items-center gap-2.5 text-sm text-umber">
                <Banknote className="size-4 shrink-0 text-copper" aria-hidden />
                {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
              </p>
              {order.paymentMethod === "transfer" && order.paymentStatus === "unpaid" && (
                <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs leading-5 text-warning">بانتظار إيصال الحوالة من العميل قبل التجهيز.</p>
              )}
              {order.paymentMethod === "cod" && order.paymentStatus === "unpaid" && order.status === "delivered" && (
                <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs leading-5 text-warning">سُلّم الطلب — أكّد استلام المبلغ من المندوب.</p>
              )}
              <PaymentActions orderId={order.id} status={order.paymentStatus} />
            </div>
          </Card>

          <Card className="order-5" title="مسار الحالة" description="غيّر الحالة يدوياً مع ملاحظة اختيارية.">
            <StatusWorkflowForm orderId={order.id} status={order.status} />
          </Card>
        </div>
      </div>
    </div>
  );
}
