import type { Metadata } from "next";
import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MediaImage } from "@/components/ui/media-image";
import { Card, EmptyState, PageHeader, Pagination, SearchForm, Table, TabsNav, TBody, Td, Th, THead, Tr, hrefWith } from "@/components/admin/ui";
import { PRODUCT_STATUS_META, type ProductStatus } from "@/components/admin/product-editor/types";
import { ProductRowActions } from "@/components/admin/product-editor/row-actions";
import { listCategoryOptions } from "./_lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "المنتجات" };

const PAGE = 25;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

type Row = {
  id: number;
  slug: string;
  name: string;
  subtitle: string;
  price: number;
  compare_at_price: number | null;
  status: ProductStatus;
  is_featured: boolean;
  updated_at: Date;
  category: string | null;
  stock: number;
  variants: number;
  colors: number;
  cover_id: string | null;
  cover_blur: string | null;
};

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 80);
  const statusParam = one(sp.status);
  const status = (["active", "draft", "archived"] as const).find((s) => s === statusParam) ?? null;
  const category = Number.parseInt(one(sp.category), 10) || null;
  const stockParam = one(sp.stock);
  const stockFilter = stockParam === "low" || stockParam === "out" ? stockParam : null;
  const pageReq = Math.max(1, Number.parseInt(one(sp.page), 10) || 1);

  const [settings, categories] = await Promise.all([getSettings(), listCategoryOptions()]);
  const low = settings.lowStockThreshold;

  const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
  const conds = [
    q ? sql`(p.name ilike ${like} or p.slug ilike ${like} or p.subtitle ilike ${like})` : null,
    category ? sql`p.category_id = ${category}` : null,
  ].filter(Boolean);
  const baseWhere = conds.length ? sql`where ${sql.join(conds as ReturnType<typeof sql>[], sql` and `)}` : sql``;
  const statusWhere = status ? sql`p.status = ${status}` : sql`p.status <> 'archived'`;
  const stockHaving =
    stockFilter === "out" ? sql`having coalesce(sum(v.stock) filter (where v.is_active), 0) = 0` : stockFilter === "low" ? sql`having coalesce(sum(v.stock) filter (where v.is_active), 0) between 1 and ${low * 3}` : sql``;

  const counts = (await db.execute<{ status: string; n: number }>(sql`
    select p.status, count(*)::int as n from products p ${baseWhere} group by p.status`)) as unknown as { status: string; n: number }[];
  const countOf = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;

  const listSql = sql`
    select p.id, p.slug, p.name, p.subtitle, p.price, p.compare_at_price, p.status, p.is_featured, p.updated_at,
           c.name as category,
           coalesce(sum(v.stock) filter (where v.is_active), 0)::int as stock,
           count(v.id) filter (where v.is_active)::int as variants,
           count(distinct v.color) filter (where v.is_active and v.color <> '')::int as colors,
           (select pi.media_id from product_images pi where pi.product_id = p.id order by pi.sort_order, pi.id limit 1) as cover_id,
           (select m.blur from product_images pi join media m on m.id = pi.media_id where pi.product_id = p.id order by pi.sort_order, pi.id limit 1) as cover_blur
    from products p
    left join categories c on c.id = p.category_id
    left join product_variants v on v.product_id = p.id
    ${baseWhere ? sql`${baseWhere} and ${statusWhere}` : sql`where ${statusWhere}`}
    group by p.id, c.name
    ${stockHaving}`;

  const totalRes = (await db.execute<{ n: number }>(sql`select count(*)::int as n from (${listSql}) t`)) as unknown as { n: number }[];
  const total = totalRes[0]?.n ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE));
  const page = Math.min(pageReq, pageCount);
  const rows = (await db.execute<Row>(sql`${listSql} order by p.sort_order asc, p.updated_at desc limit ${PAGE} offset ${(page - 1) * PAGE}`)) as unknown as Row[];

  const money = (n: number) => formatMoney(n, settings.currency);
  const params = { q: q || undefined, status: status ?? undefined, category: category ? String(category) : undefined, stock: stockFilter ?? undefined };
  const tabs = [
    { label: "المعروضة والمسودات", href: hrefWith("/admin/products", params, { status: null, page: null }), count: countOf("active") + countOf("draft"), active: !status },
    ...(["active", "draft", "archived"] as const).map((s) => ({
      label: PRODUCT_STATUS_META[s].label,
      href: hrefWith("/admin/products", params, { status: s, page: null }),
      count: countOf(s),
      active: status === s,
    })),
  ];
  const stockTone = (n: number) => (n === 0 ? "text-danger" : n <= low * 3 ? "text-warning" : "text-umber");

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="CATALOGUE"
        title="المنتجات"
        description="أضف قطعك بألوانها ومقاساتها وصورها، وتحكّم بالمخزون والظهور في المتجر."
        actions={
          <Link href="/admin/products/new" className={buttonClasses("primary", "md")}>
            <Plus className="size-4" aria-hidden />
            منتج جديد
          </Link>
        }
      />

      <Card padded={false}>
        <div className="space-y-3 border-b border-line px-4 py-4 md:px-6">
          <TabsNav tabs={tabs} label="حالة المنتجات" />
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SearchForm placeholder="اسم المنتج أو الرابط…" defaultValue={q} action="/admin/products" extraParams={{ status: params.status, category: params.category, stock: params.stock }} label="بحث في المنتجات" />
            <nav aria-label="تصفية" className="no-scrollbar flex gap-1.5 overflow-x-auto">
              <FilterChip href={hrefWith("/admin/products", params, { category: null, page: null })} active={!category}>
                كل التصنيفات
              </FilterChip>
              {categories.map((c) => (
                <FilterChip key={c.id} href={hrefWith("/admin/products", params, { category: String(c.id), page: null })} active={category === c.id}>
                  {c.name}
                </FilterChip>
              ))}
              <span className="mx-1 w-px shrink-0 bg-line" aria-hidden />
              <FilterChip href={hrefWith("/admin/products", params, { stock: stockFilter === "low" ? null : "low", page: null })} active={stockFilter === "low"}>
                مخزون منخفض
              </FilterChip>
              <FilterChip href={hrefWith("/admin/products", params, { stock: stockFilter === "out" ? null : "out", page: null })} active={stockFilter === "out"}>
                نفد المخزون
              </FilterChip>
            </nav>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<Package />}
            title={q || category || stockFilter ? "لا منتجات مطابقة" : "لا منتجات بعد"}
            description={q || category || stockFilter ? "غيّر البحث أو أزل التصفية." : "ابدأ بإضافة أول قطعة — مع ألوانها ومقاساتها وصورها."}
            action={
              <Link href="/admin/products/new" className={buttonClasses("primary", "sm")}>
                <Plus className="size-4" aria-hidden />
                منتج جديد
              </Link>
            }
          />
        ) : (
          <>
            {/* Phones */}
            <ul className="divide-y divide-line md:hidden">
              {rows.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <Link href={`/admin/products/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <MediaImage media={p.cover_id ? { id: p.cover_id, blur: p.cover_blur ?? "" } : null} sizes="56px" className="studio-frame aspect-[4/5] w-14 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-espresso">{p.name}</p>
                      <p className="mt-0.5 text-xs text-taupe">
                        {money(p.price)} · <span className={stockTone(p.stock)}>{formatNumber(p.stock)} قطعة</span>
                      </p>
                      <Badge tone={PRODUCT_STATUS_META[p.status].tone} className="mt-1.5">
                        {PRODUCT_STATUS_META[p.status].label}
                      </Badge>
                    </div>
                  </Link>
                  <ProductRowActions id={p.id} slug={p.slug} status={p.status} />
                </li>
              ))}
            </ul>

            {/* Tablet & desktop */}
            <div className="hidden md:block">
              <Table minWidth={860} caption="قائمة المنتجات">
                <THead>
                  <tr>
                    <Th>المنتج</Th>
                    <Th>التصنيف</Th>
                    <Th align="end">السعر</Th>
                    <Th align="end">المخزون</Th>
                    <Th>الخيارات</Th>
                    <Th>الحالة</Th>
                    <Th>آخر تعديل</Th>
                    <Th align="end">
                      <span className="sr-only">إجراءات</span>
                    </Th>
                  </tr>
                </THead>
                <TBody>
                  {rows.map((p) => (
                    <Tr key={p.id}>
                      <Td>
                        <Link href={`/admin/products/${p.id}`} className="group flex items-center gap-3">
                          <MediaImage media={p.cover_id ? { id: p.cover_id, blur: p.cover_blur ?? "" } : null} sizes="48px" className="studio-frame aspect-[4/5] w-12 shrink-0 rounded-lg" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-espresso group-hover:text-copper-deep">
                              {p.name}
                              {p.is_featured && <span className="ms-2 text-[0.65rem] text-copper">✦ مميز</span>}
                            </span>
                            <span className="block truncate text-xs text-mist" dir="ltr">
                              /{p.slug}
                            </span>
                          </span>
                        </Link>
                      </Td>
                      <Td>{p.category ?? <span className="text-mist">—</span>}</Td>
                      <Td align="end" numeric>
                        <span className="text-espresso">{money(p.price)}</span>
                        {p.compare_at_price ? <s className="block text-xs text-mist">{money(p.compare_at_price)}</s> : null}
                      </Td>
                      <Td align="end" numeric>
                        <span className={cn("font-medium", stockTone(p.stock))}>{p.stock === 0 ? "نفد" : formatNumber(p.stock)}</span>
                      </Td>
                      <Td className="text-xs text-taupe">
                        {formatNumber(p.variants)} خيار{p.colors > 0 ? ` · ${formatNumber(p.colors)} ألوان` : ""}
                      </Td>
                      <Td>
                        <Badge tone={PRODUCT_STATUS_META[p.status].tone} dot>
                          {PRODUCT_STATUS_META[p.status].label}
                        </Badge>
                      </Td>
                      <Td className="whitespace-nowrap text-xs text-taupe">{formatDate(p.updated_at)}</Td>
                      <Td align="end">
                        <ProductRowActions id={p.id} slug={p.slug} status={p.status} />
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
            <div className="border-t border-line px-4 py-3 md:px-6">
              <Pagination page={page} pageCount={pageCount} basePath="/admin/products" searchParams={params} total={total} />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn("h-8 shrink-0 rounded-full px-3 text-xs leading-8 transition-colors", active ? "bg-espresso text-paper" : "bg-bone text-umber hover:bg-sand")}
    >
      {children}
    </Link>
  );
}
