import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ChevronLeft, Repeat, Users, Wallet } from "lucide-react";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { cn, formatDate, formatNumber, normalizePhone } from "@/lib/utils";
import { Avatar, Card, EmptyState, PageHeader, Pagination, SearchForm, StatCard, Table, TBody, Td, Th, THead, Tr, hrefWith } from "@/components/admin/ui";
import { relativeStamp } from "@/components/admin/dashboard/panels";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "العملاء" };

const PAGE = 25;
const SORTS = {
  recent: { label: "آخر طلب", sql: sql`last_order desc nulls last, c.id desc` },
  spent: { label: "الأعلى إنفاقاً", sql: sql`spent desc, c.id desc` },
  orders: { label: "الأكثر طلباً", sql: sql`orders_count desc, spent desc` },
  newest: { label: "الأحدث انضماماً", sql: sql`c.created_at desc` },
  name: { label: "الاسم", sql: sql`c.name asc` },
} as const;
type SortKey = keyof typeof SORTS;

type Row = { id: number; name: string; phone: string; city: string; created_at: Date; orders_count: number; spent: number; last_order: Date | null };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 80);
  const sortParam = one(sp.sort);
  const sort: SortKey = sortParam in SORTS ? (sortParam as SortKey) : "recent";
  const pageReq = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);

  const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
  const digits = normalizePhone(q).replace(/\D/g, "");
  const where = q
    ? digits.length >= 3
      ? sql`where c.name ilike ${like} or c.city ilike ${like} or regexp_replace(c.phone, '\\D', '', 'g') like ${`%${digits}%`}`
      : sql`where c.name ilike ${like} or c.city ilike ${like}`
    : sql``;

  const [settings, countRes, kpiRes] = await Promise.all([
    getSettings(),
    db.execute<{ n: number }>(sql`select count(*)::int as n from customers c ${where}`),
    db.execute<{ total: number; repeat: number; buyers: number; revenue: number }>(sql`
      select count(*)::int as total,
             count(*) filter (where n >= 2)::int as repeat,
             count(*) filter (where n >= 1)::int as buyers,
             coalesce(sum(spent), 0)::bigint as revenue
      from (
        select c.id,
               count(o.id) filter (where o.status not in ('cancelled','returned')) as n,
               coalesce(sum(o.total) filter (where o.status not in ('cancelled','returned')), 0) as spent
        from customers c left join orders o on o.customer_id = c.id
        group by c.id
      ) t`),
  ]);
  const total = Number(countRes[0]?.n ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / PAGE));
  const page = Math.min(pageReq, pageCount);
  const rows = (await db.execute<Row>(sql`
    select c.id, c.name, c.phone, c.city, c.created_at,
           count(o.id)::int as orders_count,
           coalesce(sum(o.total) filter (where o.status not in ('cancelled','returned')), 0)::int as spent,
           max(o.created_at) as last_order
    from customers c left join orders o on o.customer_id = c.id
    ${where}
    group by c.id
    order by ${SORTS[sort].sql}
    limit ${PAGE} offset ${(page - 1) * PAGE}`)) as unknown as Row[];

  const k = kpiRes[0] ?? { total: 0, repeat: 0, buyers: 0, revenue: 0 };
  const money = (n: number) => formatMoney(n, settings.currency);
  const repeatShare = Number(k.buyers) ? Math.round((Number(k.repeat) / Number(k.buyers)) * 100) : 0;
  const avgValue = Number(k.buyers) ? Math.round(Number(k.revenue) / Number(k.buyers)) : 0;
  const params = { q: q || undefined, sort: sort === "recent" ? undefined : sort };
  const sortHref = (s: SortKey) => hrefWith("/admin/customers", params, { sort: s === "recent" ? null : s, page: null });
  const toDate = (d: Date | string | null) => (d ? (d instanceof Date ? d : new Date(d)) : null);

  const SortTh = ({ k: key, children, align }: { k: SortKey; children: React.ReactNode; align?: "start" | "end" | "center" }) => (
    <Th align={align} aria-sort={sort === key ? "descending" : undefined}>
      <Link href={sortHref(key)} scroll={false} className={cn("inline-flex items-center gap-1 transition-colors hover:text-espresso", sort === key && "font-semibold text-espresso")}>
        {children}
        {sort === key && <ArrowDown className="size-3" aria-hidden />}
      </Link>
    </Th>
  );

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader eyebrow="CLIENTELE" title="العملاء" description="كل من طلب من مرموق — مجمّعين برقم الجوال، مع إنفاقهم وتاريخ آخر طلب." />

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-3">
        <StatCard label="إجمالي العملاء" value={formatNumber(Number(k.total))} icon={<Users />} hint={`${formatNumber(Number(k.buyers))} منهم لديهم طلب مكتمل أو جارٍ`} />
        <StatCard label="العملاء العائدون" value={`${repeatShare}%`} icon={<Repeat />} hint={`${formatNumber(Number(k.repeat))} عميل طلبوا أكثر من مرة`} />
        <StatCard label="متوسط قيمة العميل" value={<span className="whitespace-nowrap">{money(avgValue)}</span>} icon={<Wallet />} hint="إجمالي الإنفاق ÷ العملاء المشترين" className="col-span-2 xl:col-span-1" />
      </div>

      <Card padded={false}>
        <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <SearchForm placeholder="الاسم، الجوال أو المدينة…" defaultValue={q} action="/admin/customers" extraParams={{ sort: params.sort }} label="بحث في العملاء" />
          <div className="flex items-center gap-2 sm:hidden">
            <span className="shrink-0 text-xs text-taupe" aria-hidden>
              الترتيب
            </span>
            <nav aria-label="ترتيب العملاء" className="no-scrollbar flex gap-1.5 overflow-x-auto">
              {(Object.keys(SORTS) as SortKey[]).map((s) => (
                <Link
                  key={s}
                  href={sortHref(s)}
                  scroll={false}
                  aria-current={sort === s ? "true" : undefined}
                  className={cn("h-8 shrink-0 rounded-full px-3 text-xs leading-8", sort === s ? "bg-espresso text-paper" : "bg-bone text-umber")}
                >
                  {SORTS[s].label}
                </Link>
              ))}
            </nav>
          </div>
          <p className="hidden text-xs text-taupe sm:block">
            <span className="tabular-nums">{formatNumber(total)}</span> عميل
          </p>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title={q ? "لا يوجد عميل بهذا البحث" : "لا عملاء بعد"}
            description={q ? "جرّب جزءاً من الاسم أو آخر أرقام الجوال." : "يُضاف كل عميل تلقائياً مع أول طلب له من المتجر."}
          />
        ) : (
          <>
            <ul className="divide-y divide-line md:hidden">
              {rows.map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/customers/${c.id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-ivory">
                    <Avatar name={c.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate font-medium text-espresso">{c.name}</p>
                        <p className="shrink-0 text-sm font-semibold tabular-nums text-espresso">{money(c.spent)}</p>
                      </div>
                      <p className="mt-0.5 flex items-center justify-between gap-3 text-xs text-taupe">
                        <span className="truncate">
                          {c.city || "—"} · {formatNumber(c.orders_count)} {c.orders_count === 1 ? "طلب" : "طلبات"}
                        </span>
                        <span className="shrink-0">{c.last_order ? relativeStamp(toDate(c.last_order)!) : "—"}</span>
                      </p>
                    </div>
                    <ChevronLeft className="size-4 shrink-0 text-mist" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table minWidth={900} caption="قائمة العملاء">
                <THead>
                  <tr>
                    <SortTh k="name">العميل</SortTh>
                    <Th>المدينة</Th>
                    <SortTh k="orders" align="center">
                      الطلبات
                    </SortTh>
                    <SortTh k="spent" align="end">
                      إجمالي الإنفاق
                    </SortTh>
                    <SortTh k="recent" align="end">
                      آخر طلب
                    </SortTh>
                    <SortTh k="newest" align="end">
                      أول ظهور
                    </SortTh>
                  </tr>
                </THead>
                <TBody>
                  {rows.map((c) => (
                    <Tr key={c.id} className="relative">
                      <Td>
                        <div className="flex items-center gap-3">
                          <Avatar name={c.name} />
                          <div className="min-w-0">
                            <Link
                              href={`/admin/customers/${c.id}`}
                              className="block max-w-[14rem] truncate font-medium text-espresso outline-none before:absolute before:inset-0 before:content-[''] hover:text-copper-deep focus-visible:before:ring-2 focus-visible:before:ring-inset focus-visible:before:ring-copper/40"
                            >
                              {c.name}
                            </Link>
                            <p className="text-xs tabular-nums text-taupe" dir="ltr" style={{ textAlign: "right" }}>
                              {c.phone}
                            </p>
                          </div>
                        </div>
                      </Td>
                      <Td>{c.city || "—"}</Td>
                      <Td align="center" numeric>
                        {c.orders_count >= 2 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-copper/10 px-2 py-0.5 text-xs font-semibold text-copper-deep">{c.orders_count}</span>
                        ) : (
                          c.orders_count
                        )}
                      </Td>
                      <Td align="end" numeric className="font-semibold text-espresso">
                        {money(c.spent)}
                      </Td>
                      <Td align="end" className="whitespace-nowrap text-xs text-taupe">
                        {c.last_order ? relativeStamp(toDate(c.last_order)!) : "—"}
                      </Td>
                      <Td align="end" className="whitespace-nowrap text-xs text-taupe">
                        {formatDate(toDate(c.created_at)!)}
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
            <Pagination page={page} pageCount={pageCount} basePath="/admin/customers" searchParams={params} total={total} />
          </div>
        )}
      </Card>
    </div>
  );
}
