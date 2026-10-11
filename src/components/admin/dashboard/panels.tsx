import Link from "next/link";
import { ArrowLeft, ArrowUpLeft, CircleCheck, Package, PackagePlus, Settings, Shirt, ShoppingBag, Store, TicketPercent } from "lucide-react";
import type { OrderStatus } from "@/db/schema";
import { formatMoney, type Currency } from "@/lib/money";
import { ORDER_STATUS_META } from "@/lib/order-status";
import { cn, formatNumber } from "@/lib/utils";
import { Card, EmptyState, PaymentBadge, StatusBadge, Swatch, Table, TBody, Td, Th, THead, Tr } from "@/components/admin/ui";

const TIME = new Intl.DateTimeFormat("ar-YE-u-nu-latn", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Aden" });
const DAY = new Intl.DateTimeFormat("ar-YE-u-nu-latn", { day: "numeric", month: "short", timeZone: "Asia/Aden" });
const DAY_KEY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Aden" });

/** "اليوم 3:20 م" / "أمس" / "8 أكتوبر" */
export function relativeStamp(d: Date, now = new Date()): string {
  const key = DAY_KEY.format(d);
  if (key === DAY_KEY.format(now)) return `اليوم ${TIME.format(d)}`;
  if (key === DAY_KEY.format(new Date(now.getTime() - 86_400_000))) return `أمس ${TIME.format(d)}`;
  return DAY.format(d);
}

/* ─────────────── Orders by status ─────────────── */

const MUTED: OrderStatus[] = ["cancelled", "returned"];

export function StatusBreakdown({ statuses, total, rangeLabel }: { statuses: { status: OrderStatus; count: number }[]; total: number; rangeLabel: string }) {
  const max = Math.max(1, ...statuses.map((s) => s.count));
  return (
    <Card title="الطلبات حسب الحالة" description={rangeLabel} className="flex flex-col" bodyClassName="flex-1">
      {total === 0 ? (
        <EmptyState compact icon={<ShoppingBag />} title="لا طلبات في هذه الفترة" description="جرّب نطاقاً زمنياً أوسع." />
      ) : (
        <ul className="space-y-1">
          {statuses.map((s) => {
            const share = total ? Math.round((s.count / total) * 100) : 0;
            const muted = MUTED.includes(s.status);
            return (
              <li key={s.status}>
                <Link
                  href={`/admin/orders?status=${s.status}`}
                  className="group -mx-2 block rounded-lg px-2 py-2 transition-colors hover:bg-ivory"
                  aria-label={`${ORDER_STATUS_META[s.status].label}: ${s.count} طلب (${share}%)`}
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className={cn("flex items-center gap-2", s.count ? "text-umber" : "text-mist")}>
                      <StatusDot status={s.status} />
                      {ORDER_STATUS_META[s.status].label}
                    </span>
                    <span className="flex items-baseline gap-2">
                      <span className={cn("font-semibold tabular-nums", s.count ? "text-espresso" : "text-mist")}>{s.count}</span>
                      <span className="w-9 text-end text-[0.7rem] tabular-nums text-taupe">{share}%</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-bone" aria-hidden>
                    <div
                      className={cn("h-full rounded-full transition-[width] duration-700", muted ? "bg-sand" : "bg-copper group-hover:bg-copper-deep")}
                      style={{ width: s.count ? `${Math.max(3, (s.count / max) * 100)}%` : 0 }}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function StatusDot({ status }: { status: OrderStatus }) {
  const tone = ORDER_STATUS_META[status].tone;
  const cls: Record<string, string> = {
    warning: "bg-warning",
    info: "bg-info",
    copper: "bg-copper",
    success: "bg-success",
    danger: "bg-danger",
    neutral: "bg-mist",
  };
  return <span className={cn("size-2 shrink-0 rounded-full", cls[tone] ?? "bg-mist")} aria-hidden />;
}

/* ─────────────── Recent orders ─────────────── */

type RecentOrder = {
  id: number;
  number: string;
  customerName: string;
  city: string;
  total: number;
  status: OrderStatus;
  paymentStatus: string;
  createdAt: Date;
  items: number;
};

export function RecentOrders({ orders, currency }: { orders: RecentOrder[]; currency: Currency }) {
  return (
    <Card
      title="أحدث الطلبات"
      description="آخر ما وصل من المتجر"
      padded={false}
      actions={
        <Link href="/admin/orders" className="group inline-flex items-center gap-1.5 text-[0.8rem] font-medium text-copper-deep hover:text-espresso">
          كل الطلبات
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden />
        </Link>
      }
    >
      {orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag />}
          title="لم تصل طلبات بعد"
          description="شارك رابط المتجر في انستغرام وواتساب — أول طلب سيظهر هنا مباشرة."
        />
      ) : (
        <>
          {/* phones: stacked rows */}
          <ul className="divide-y divide-line/70 md:hidden">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 px-5 py-3.5 active:bg-ivory">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium tabular-nums text-espresso" dir="ltr">
                        {o.number}
                      </span>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="mt-1 truncate text-xs text-taupe">
                      {o.customerName} · {o.city} · {relativeStamp(o.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-espresso">{formatMoney(o.total, currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {/* tablet & desktop: table */}
          <div className="hidden md:block">
            <Table minWidth={620} caption="أحدث الطلبات">
              <THead>
                <tr>
                  <Th>الطلب</Th>
                  <Th>العميل</Th>
                  <Th>الحالة</Th>
                  <Th className="hidden xl:table-cell">الدفع</Th>
                  <Th align="end">الإجمالي</Th>
                </tr>
              </THead>
              <TBody>
                {orders.map((o) => (
                  <Tr key={o.id}>
                    <Td>
                      <Link href={`/admin/orders/${o.id}`} className="font-medium tabular-nums text-espresso underline-offset-4 hover:text-copper-deep hover:underline" dir="ltr">
                        {o.number}
                      </Link>
                      <p className="mt-0.5 text-[0.72rem] text-taupe">{relativeStamp(o.createdAt)}</p>
                    </Td>
                    <Td>
                      <p className="max-w-[12rem] truncate text-espresso">{o.customerName}</p>
                      <p className="mt-0.5 text-[0.72rem] text-taupe">
                        {o.city} · {o.items} {o.items === 1 ? "قطعة" : o.items === 2 ? "قطعتان" : o.items <= 10 ? "قطع" : "قطعة"}
                      </p>
                    </Td>
                    <Td>
                      <StatusBadge status={o.status} />
                    </Td>
                    <Td className="hidden xl:table-cell">
                      <PaymentBadge status={o.paymentStatus} />
                    </Td>
                    <Td align="end" numeric className="font-semibold text-espresso">
                      {formatMoney(o.total, currency)}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
        </>
      )}
    </Card>
  );
}

/* ─────────────── Top products ─────────────── */

export function TopProducts({
  items,
  currency,
  rangeLabel,
}: {
  items: { productId: number | null; name: string; units: number; revenue: number; imageId: string | null }[];
  currency: Currency;
  rangeLabel: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.revenue));
  return (
    <Card title="الأكثر مبيعاً" description={rangeLabel}>
      {items.length === 0 ? (
        <EmptyState compact icon={<Package />} title="لا مبيعات بعد" description="ستظهر القطع الأكثر طلباً هنا." />
      ) : (
        <ol className="space-y-1">
          {items.map((it, i) => {
            const content = (
              <>
                <span className="w-4 shrink-0 text-center font-[family-name:var(--font-latin)] text-base italic text-taupe">{i + 1}</span>
                <span className="studio-frame relative aspect-[4/5] w-11 shrink-0 overflow-hidden rounded-md ring-1 ring-line">
                  {it.imageId && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/media/${it.imageId}/sm`} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-espresso">{it.name}</span>
                  <span className="mt-0.5 block text-[0.72rem] text-taupe">
                    <span className="tabular-nums">{formatNumber(it.units)}</span> {it.units === 1 ? "قطعة" : it.units === 2 ? "قطعتان" : it.units <= 10 ? "قطع" : "قطعة"} مباعة
                  </span>
                  <span className="mt-1.5 block h-1 rounded-full bg-bone" aria-hidden>
                    <span className="block h-full rounded-full bg-copper" style={{ width: `${Math.max(4, (it.revenue / max) * 100)}%` }} />
                  </span>
                </span>
                <span className="shrink-0 self-start pt-0.5 text-[0.82rem] font-semibold tabular-nums text-espresso">{formatMoney(it.revenue, currency)}</span>
              </>
            );
            return (
              <li key={`${it.productId ?? it.name}`}>
                {it.productId ? (
                  <Link href={`/admin/products/${it.productId}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-ivory">
                    {content}
                  </Link>
                ) : (
                  <div className="-mx-2 flex items-center gap-3 px-2 py-2">{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

/* ─────────────── Low stock ─────────────── */

export function LowStock({
  items,
  total,
  threshold,
}: {
  items: { variantId: number; productId: number; name: string; color: string; colorHex: string; size: string; stock: number; imageId: string | null }[];
  total: number;
  threshold: number;
}) {
  return (
    <Card
      id="low-stock"
      title="مخزون يحتاج انتباهك"
      description={`المقاسات التي وصلت إلى ${threshold} قطع أو أقل`}
      padded={false}
      actions={
        total > 0 ? (
          <Link href="/admin/products" className="group inline-flex items-center gap-1.5 text-[0.8rem] font-medium text-copper-deep hover:text-espresso">
            إدارة المخزون
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden />
          </Link>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <EmptyState compact icon={<CircleCheck />} title="المخزون بحالة ممتازة" description="لا توجد مقاسات قاربت على النفاد." />
      ) : (
        <>
          <ul className="grid divide-y divide-line/70 sm:grid-cols-2 sm:divide-y-0 sm:gap-px sm:bg-line/70">
            {items.map((v) => (
              <li key={v.variantId} className="bg-paper">
                <Link href={`/admin/products/${v.productId}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-ivory md:px-6">
                  <span className="studio-frame relative aspect-[4/5] w-10 shrink-0 overflow-hidden rounded-md ring-1 ring-line">
                    {v.imageId && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/media/${v.imageId}/sm`} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-espresso">{v.name}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[0.72rem] text-taupe">
                      {v.color && <Swatch hex={v.colorHex} className="size-2.5" />}
                      {[v.color, v.size && `مقاس ${v.size}`].filter(Boolean).join(" · ") || "المقاس الأساسي"}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[0.72rem] font-semibold tabular-nums ring-1 ring-inset",
                      v.stock <= 0 ? "bg-danger/10 text-danger ring-danger/20" : "bg-warning/10 text-warning ring-warning/25",
                    )}
                  >
                    {v.stock <= 0 ? "نفد" : `متبقٍ ${v.stock}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {total > items.length && (
            <p className="border-t border-line px-5 py-3 text-xs text-taupe md:px-6">
              و<span className="tabular-nums">{total - items.length}</span> مقاسات أخرى منخفضة المخزون.
            </p>
          )}
        </>
      )}
    </Card>
  );
}

/* ─────────────── Quick actions ─────────────── */

export function QuickActions({ canManage }: { canManage: boolean }) {
  const actions = [
    { href: "/admin/products/new", label: "إضافة منتج", hint: "قطعة جديدة للمجموعة", icon: PackagePlus },
    { href: "/admin/looks", label: "تنسيق إطلالة", hint: "طقم كامل بخصم", icon: Shirt },
    { href: "/admin/coupons", label: "كوبون خصم", hint: "عرض لعملائك", icon: TicketPercent },
    canManage
      ? { href: "/admin/settings", label: "إعدادات المتجر", hint: "واتساب، الدفع، الشحن", icon: Settings }
      : { href: "/admin/orders?status=pending", label: "طلبات للتأكيد", hint: "تواصل مع العملاء", icon: ShoppingBag },
  ];
  return (
    <Card title="إجراءات سريعة">
      <div className="grid grid-cols-2 gap-2.5">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className="group relative flex min-h-[6.5rem] flex-col justify-between rounded-xl border border-line bg-ivory/50 p-3.5 transition-[border-color,background-color,box-shadow] duration-300 hover:border-copper/40 hover:bg-paper hover:shadow-[0_10px_24px_-18px_rgba(126,68,35,0.55)]"
            >
              <span className="grid size-9 place-items-center rounded-full bg-paper text-copper-deep ring-1 ring-line transition-colors group-hover:bg-copper group-hover:text-paper group-hover:ring-copper">
                <Icon className="size-4" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-medium text-espresso">{a.label}</span>
                <span className="mt-0.5 block text-[0.7rem] text-taupe">{a.hint}</span>
              </span>
              <ArrowUpLeft className="absolute end-3 top-3.5 size-3.5 text-mist opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
            </Link>
          );
        })}
      </div>
      <a
        href="/"
        target="_blank"
        rel="noopener"
        className="mt-2.5 flex h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-sand text-[0.82rem] text-umber transition-colors hover:border-copper/50 hover:text-espresso"
      >
        <Store className="size-4 text-taupe" aria-hidden />
        معاينة المتجر كما يراه العملاء
        <span className="sr-only">(يفتح في نافذة جديدة)</span>
      </a>
    </Card>
  );
}
