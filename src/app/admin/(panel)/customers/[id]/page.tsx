import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { CalendarDays, ChevronLeft, MapPin, Phone, ReceiptText, ShoppingBag, Wallet } from "lucide-react";
import { db } from "@/db";
import { customers, orders } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { formatDate, formatNumber, whatsappLink } from "@/lib/utils";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { buttonClasses } from "@/components/ui/button";
import { Avatar, Card, EmptyState, PageHeader, PaymentBadge, StatCard, StatusBadge, Table, TBody, Td, Th, THead, Tr } from "@/components/admin/ui";
import { relativeStamp } from "@/components/admin/dashboard/panels";
import { CustomerNotesForm } from "./notes-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function load(idRaw: string) {
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return db.query.customers.findFirst({ where: eq(customers.id, id) });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const c = await load(id);
  return { title: c ? c.name : "عميل" };
}

export default async function CustomerPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const customer = await load(id);
  if (!customer) notFound();

  const [settings, list] = await Promise.all([
    getSettings(),
    db
      .select({
        id: orders.id,
        number: orders.number,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        total: orders.total,
        city: orders.city,
        createdAt: orders.createdAt,
        itemsCount: sql<number>`(select coalesce(sum(oi.quantity), 0)::int from order_items oi where oi.order_id = ${orders.id})`,
      })
      .from(orders)
      .where(eq(orders.customerId, customer.id))
      .orderBy(desc(orders.createdAt)),
  ]);
  const money = (n: number) => formatMoney(n, settings.currency);
  const counted = list.filter((o) => o.status !== "cancelled" && o.status !== "returned");
  const spend = counted.reduce((s, o) => s + o.total, 0);
  const aov = counted.length ? Math.round(spend / counted.length) : 0;
  const last = list[0];
  const firstName = customer.name.trim().split(/\s+/)[0] || customer.name;
  const vip = counted.length >= 3 || spend >= 150_000;

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        breadcrumbs={[{ label: "العملاء", href: "/admin/customers" }, { label: customer.name }]}
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            {customer.name}
            {vip && <span className="rounded-full bg-espresso px-2.5 py-0.5 font-[family-name:var(--font-latin)] text-xs tracking-[0.2em] text-paper">VIP</span>}
          </span>
        }
        description={`عميل منذ ${formatDate(customer.createdAt)}${customer.city ? ` · ${customer.city}` : ""}`}
        actions={
          <>
            <a
              href={whatsappLink(customer.phone, `أهلاً ${firstName} 🌿 معك ${settings.storeName}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("primary", "sm", "!bg-[#1f7a55] hover:!bg-[#196447]")}
            >
              <WhatsAppIcon className="size-4" />
              واتساب
            </a>
            <a href={`tel:${customer.phone}`} className={buttonClasses("outline", "sm", "border-line")}>
              <Phone className="size-4" aria-hidden />
              اتصال
            </a>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard label="الطلبات" value={formatNumber(list.length)} icon={<ShoppingBag />} hint={list.length !== counted.length ? `${formatNumber(list.length - counted.length)} ملغي أو مرتجع` : "كلها محتسبة"} />
        <StatCard label="إجمالي الإنفاق" value={<span className="whitespace-nowrap text-[1.3rem] md:text-[1.75rem]">{money(spend)}</span>} icon={<Wallet />} hint="بدون الملغي والمرتجع" />
        <StatCard label="متوسط الطلب" value={<span className="whitespace-nowrap text-[1.3rem] md:text-[1.75rem]">{money(aov)}</span>} icon={<ReceiptText />} />
        <StatCard label="آخر طلب" value={<span className="whitespace-nowrap text-[1.3rem] md:text-[1.75rem]">{last ? relativeStamp(last.createdAt) : "—"}</span>} icon={<CalendarDays />} hint={last ? last.number : undefined} />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
        <Card title="طلبات العميل" padded={false}>
          {list.length === 0 ? (
            <EmptyState compact icon={<ShoppingBag />} title="لا طلبات مسجّلة" description="قد تكون طلباته السابقة حُذفت أو سُجّلت برقم آخر." />
          ) : (
            <>
            <ul className="divide-y divide-line md:hidden">
              {list.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 px-5 py-3.5 active:bg-ivory">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold tabular-nums text-espresso" dir="ltr">
                          {o.number}
                        </span>
                        <span className="font-semibold tabular-nums text-espresso">{money(o.total)}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={o.status} />
                        <PaymentBadge status={o.paymentStatus} />
                        <span className="ms-auto text-xs text-taupe">{formatDate(o.createdAt)}</span>
                      </div>
                    </div>
                    <ChevronLeft className="size-4 shrink-0 text-mist" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
            <Table minWidth={620} caption="طلبات العميل">
              <THead>
                <tr>
                  <Th>الطلب</Th>
                  <Th>التاريخ</Th>
                  <Th align="center">القطع</Th>
                  <Th align="end">الإجمالي</Th>
                  <Th>الحالة</Th>
                </tr>
              </THead>
              <TBody>
                {list.map((o) => (
                  <Tr key={o.id} className="relative">
                    <Td>
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="font-semibold tabular-nums text-espresso outline-none before:absolute before:inset-0 before:content-[''] hover:text-copper-deep focus-visible:before:ring-2 focus-visible:before:ring-inset focus-visible:before:ring-copper/40"
                        dir="ltr"
                      >
                        {o.number}
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-taupe">{formatDate(o.createdAt)}</Td>
                    <Td align="center" numeric>
                      {o.itemsCount}
                    </Td>
                    <Td align="end" numeric className="font-semibold text-espresso">
                      {money(o.total)}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1.5">
                        <StatusBadge status={o.status} />
                        <PaymentBadge status={o.paymentStatus} />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            </div>
            </>
          )}
        </Card>

        <div className="space-y-5 md:space-y-6">
          <Card title="الملف">
            <div className="flex items-center gap-3">
              <Avatar name={customer.name} className="size-12 text-base" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-espresso">{customer.name}</p>
                <p className="text-sm tabular-nums text-taupe" dir="ltr" style={{ textAlign: "right" }}>
                  {customer.phone}
                </p>
              </div>
            </div>
            {(customer.city || customer.address) && (
              <p className="mt-4 flex items-start gap-2.5 text-sm text-umber">
                <MapPin className="mt-0.5 size-4 shrink-0 text-copper" aria-hidden />
                <span>
                  {customer.city && <span className="font-medium text-espresso">{customer.city}</span>}
                  {customer.address && (
                    <>
                      <br />
                      {customer.address}
                    </>
                  )}
                </span>
              </p>
            )}
          </Card>
          <Card title="ملاحظات" description="تساعد الفريق على خدمة العميل بلمسة شخصية.">
            <CustomerNotesForm customerId={customer.id} notes={customer.notes} />
          </Card>
        </div>
      </div>
    </div>
  );
}
