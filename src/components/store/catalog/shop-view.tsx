import Link from "next/link";
import Form from "next/form";
import { Fragment } from "react";
import { Search } from "lucide-react";
import { and, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import { productVariants } from "@/db/schema";
import { copyOf, getDisplayCurrency, getSettings } from "@/lib/settings";
import { getMediaRefs } from "@/lib/catalog";
import { getFilterFacets, listCategories, listLooks, listProducts, type CategoryData, type LookData, type ProductCardData } from "@/lib/catalog";
import { PageHeader } from "@/components/store/page-header";
import { ProductCard } from "@/components/store/product-card";
import { MediaImage } from "@/components/ui/media-image";
import { ActiveFilters, FilterPanel, carryParams } from "@/components/store/catalog/filters";
import { FilterSheet, ResultsVeil, ShopLink, ShopNavProvider, SortSelect } from "@/components/store/catalog/shop-nav";
import { EditorialTile } from "@/components/store/catalog/editorial-tile";
import { ShopEmptyState } from "@/components/store/catalog/empty-state";
import { PAGE_SIZE, activeFilterCount, piecesLabel, shopHref, type ShopParams } from "@/components/store/catalog/params";
import { cn } from "@/lib/utils";
import { PageBlocks } from "@/components/store/blocks/page-blocks";

type Tile = { key: string; product: ProductCardData; color?: string };

/**
 * One card per colourway when a product's photos are colour-tagged (the sweater in four colours
 * reads as four looks), unless a colour filter is active — then only that colour.
 */
function explodeColours(items: ProductCardData[], color: string): Tile[] {
  const tiles: Tile[] = [];
  for (const p of items) {
    if (color) {
      const has = p.colors.some((c) => c.name === color);
      tiles.push({ key: `${p.id}`, product: p, color: has ? color : undefined });
      continue;
    }
    const tagged = p.colors.filter((c) => p.images.some((i) => i.color === c.name));
    if (tagged.length > 1) for (const c of tagged) tiles.push({ key: `${p.id}-${c.name}`, product: p, color: c.name });
    else tiles.push({ key: `${p.id}`, product: p });
  }
  return tiles;
}

/** "productId:colour" pairs that still have the chosen size in stock (so a size filter never shows a sold-out colourway). */
async function coloursInStockForSize(productIds: number[], size: string): Promise<Set<string>> {
  if (!productIds.length) return new Set();
  const rows = await db
    .select({ productId: productVariants.productId, color: productVariants.color })
    .from(productVariants)
    .where(and(inArray(productVariants.productId, productIds), eq(productVariants.size, size), eq(productVariants.isActive, true), gt(productVariants.stock, 0)));
  return new Set(rows.map((r) => `${r.productId}:${r.color}`));
}

const LETTER_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];

/** Tops (letters) first, then waist sizes, then shoe sizes. */
function orderSizes(sizes: string[]): string[] {
  const rank = (s: string) => {
    const i = LETTER_SIZES.indexOf(s.toUpperCase());
    if (i !== -1) return i;
    const n = Number(s);
    return Number.isNaN(n) ? 1000 : 100 + n;
  };
  return [...sizes].sort((a, b) => rank(a) - rank(b));
}

function optionsLabel(n: number): string {
  return n <= 10 ? `${n} خيارات بالألوان` : `${n} خياراً بالألوان`;
}

const CARD_SIZES = "(min-width: 1360px) 19vw, (min-width: 1024px) 24vw, (min-width: 768px) 31vw, 46vw";
const INTERSTITIAL_AT = 4;

function pickLook(looks: LookData[], category: CategoryData | null): LookData | null {
  if (!looks.length) return null;
  if (!category) return looks[0];
  return looks.find((l) => l.items.some((i) => i.product.categorySlug === category.slug)) ?? looks[0];
}

export async function ShopView({ category, params }: { category: CategoryData | null; params: ShopParams }) {
  const base = category ? `/shop/${category.slug}` : "/shop";
  const [settings, result, facets, categories, looks] = await Promise.all([
    getSettings(),
    listProducts({
      category: category?.slug,
      q: params.q || undefined,
      sort: params.sort,
      color: params.color || undefined,
      size: params.size || undefined,
      min: params.min ?? undefined,
      max: params.max ?? undefined,
      limit: params.page * PAGE_SIZE,
      offset: 0,
    }),
    getFilterFacets(category?.slug),
    listCategories(),
    listLooks(4),
  ]);

  const { items, total } = result;
  const inSize = params.size ? await coloursInStockForSize(items.map((p) => p.id), params.size) : null;
  const tiles = explodeColours(items, params.color).filter((t) => !inSize || !t.color || inSize.has(`${t.product.id}:${t.color}`));
  const filtersActive = activeFilterCount(params);
  const clearHref = filtersActive ? shopHref(base, params, { color: "", size: "", min: null, max: null }) : null;
  const allCount = categories.reduce((s, c) => s + c.productCount, 0);
  const hasMore = items.length < total;
  let picks: ProductCardData[] = [];
  if (total === 0) {
    const featured = (await listProducts({ featured: true, limit: 4 })).items;
    const extra = featured.length < 4 ? (await listProducts({ limit: 8 })).items.filter((p) => !featured.some((f) => f.id === p.id)) : [];
    picks = [...featured, ...extra].slice(0, 4);
  }
  const look = tiles.length >= 6 ? pickLook(looks, category) : null;
  const showInterstitial = tiles.length >= 6;
  const resultLabel = total === 0 ? "النتائج" : piecesLabel(total);
  const countLine = (
    <p className="text-[0.82rem] text-taupe" aria-live="polite">
      <span className="font-medium tabular-nums text-espresso">{piecesLabel(total)}</span>
      {tiles.length > items.length && <span className="tabular-nums"> · {optionsLabel(tiles.length)}</span>}
    </p>
  );

  const displayCurrency = await getDisplayCurrency(settings);
  const c = copyOf(settings);
  const shopCover = c["shop.cover"] ? ((await getMediaRefs([c["shop.cover"]]))[0] ?? null) : null;
  const panelProps = { params, base, category, categories, allCount, facets: { ...facets, sizes: orderSizes(facets.sizes) }, currency: displayCurrency };
  const crumbs = [
    { label: "الرئيسية", href: "/" },
    { label: "المتجر", href: "/shop" },
    ...(category ? [{ label: category.name }] : params.q ? [{ label: "نتائج البحث" }] : []),
  ];

  return (
    <ShopNavProvider>
      {params.q && !category ? (
        <PageHeader
          eyebrow="Search"
          title={<>نتائج «{params.q}»</>}
          subtitle={total ? `${piecesLabel(total)} تطابق بحثك — رتّبها أو صفّها كما تحب.` : undefined}
          breadcrumbs={crumbs}
        >
          <Form action="/shop" className="relative max-w-md" role="search">
            <label htmlFor="shop-q" className="sr-only">
              ابحث في المتجر
            </label>
            <input
              id="shop-q"
              name="q"
              type="search"
              defaultValue={params.q}
              key={params.q}
              placeholder="ابحث عن قطعة، لون، أو خامة…"
              className="h-12 w-full rounded-full border border-line bg-paper pe-14 ps-5 text-[0.95rem] text-espresso outline-none placeholder:text-mist focus:border-copper focus:ring-2 focus:ring-copper/15"
            />
            <button type="submit" className="absolute end-1 top-1 grid size-10 place-items-center rounded-full bg-espresso text-paper" aria-label="بحث">
              <Search className="size-4" aria-hidden />
            </button>
          </Form>
        </PageHeader>
      ) : category ? (
        <PageHeader
          eyebrow={category.nameEn || "Collection"}
          title={category.name}
          subtitle={category.description || undefined}
          media={category.image}
          breadcrumbs={crumbs}
        />
      ) : (
        <PageHeader
          eyebrow={c["shop.eyebrow"]}
          title={c["shop.title"]}
          subtitle={c["shop.subtitle"]}
          media={shopCover}
          breadcrumbs={crumbs.slice(0, 2)}
        />
      )}

      <PageBlocks page="shop" position="top" />

      {/* Mobile: category rail + sticky filter/sort bar */}
      <div className="lg:hidden">
        <nav aria-label="الأقسام" className="no-scrollbar overflow-x-auto">
          <ul className="flex w-max gap-2 px-5 pt-5">
            {[{ slug: null as string | null, name: "الكل", image: null as CategoryData["image"] }, ...categories.map((c) => ({ slug: c.slug as string | null, name: c.name, image: c.image }))].map(
              (c) => {
                const active = (category?.slug ?? null) === c.slug;
                return (
                  <li key={c.slug ?? "all"}>
                    <Link
                      href={shopHref(c.slug ? `/shop/${c.slug}` : "/shop", { ...params, color: "", size: "", min: null, max: null })}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-11 items-center gap-2 rounded-full border pe-4 text-sm transition-colors",
                        c.image ? "ps-1.5" : "ps-4",
                        active ? "border-espresso bg-espresso text-paper" : "border-line bg-paper text-umber",
                      )}
                    >
                      {c.image && (
                        <span className="studio-frame size-8 overflow-hidden rounded-full">
                          <MediaImage media={c.image} sizes="40px" className="h-full w-full" alt="" />
                        </span>
                      )}
                      {c.name}
                    </Link>
                  </li>
                );
              },
            )}
          </ul>
        </nav>
        <div className="sticky top-16 z-30 mt-4 border-y border-line bg-ivory/92 backdrop-blur-md">
          <div className="container-luxe grid grid-cols-2 gap-2 py-2.5">
            <FilterSheet activeCount={filtersActive} resultLabel={resultLabel} clearHref={clearHref}>
              <FilterPanel {...panelProps} idPrefix="sheet" showCategories={false} />
            </FilterSheet>
            <SortSelect base={base} hidden={carryParams(params, ["sort"])} value={params.sort} compact />
          </div>
        </div>
      </div>

      <div className="container-luxe pb-24 pt-5 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 lg:pt-10 xl:gap-16">
        <aside className="hidden lg:block" aria-label="تصفية القطع">
          <div className="no-scrollbar sticky top-28 max-h-[calc(100svh-8rem)] overflow-y-auto pb-8">
            <FilterPanel {...panelProps} idPrefix="aside" />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 lg:border-b lg:border-line lg:pb-5">
            {countLine}
            <div className="hidden lg:block">
              <SortSelect base={base} hidden={carryParams(params, ["sort"])} value={params.sort} />
            </div>
          </div>
          <ActiveFilters params={params} base={base} currency={displayCurrency} className="mt-4" />

          <ResultsVeil className="mt-6 lg:mt-8">
            {total === 0 ? (
              <ShopEmptyState query={params.q} clearHref={clearHref} categories={categories} picks={picks} />
            ) : (
              <>
                <ul className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 md:gap-y-14 min-[85rem]:grid-cols-4">
                  {tiles.map((t, i) => (
                    <Fragment key={t.key}>
                      {showInterstitial && i === INTERSTITIAL_AT && (
                        <li className="col-span-2 flex">
                          <EditorialTile look={look} instagram={settings.instagram} className="w-full" />
                        </li>
                      )}
                      <li>
                        <ProductCard product={t.product} color={t.color} priority={i < 2} sizes={CARD_SIZES} />
                      </li>
                    </Fragment>
                  ))}
                </ul>

                <div className="mt-16 flex flex-col items-center gap-4 text-center">
                  <p className="text-xs text-taupe">
                    عرضنا <span className="tabular-nums text-espresso">{items.length}</span> من <span className="tabular-nums text-espresso">{total}</span>
                  </p>
                  <div className="h-px w-48 overflow-hidden bg-line" aria-hidden>
                    <div className="h-full bg-espresso" style={{ width: `${Math.round((items.length / Math.max(1, total)) * 100)}%` }} />
                  </div>
                  {hasMore ? (
                    <ShopLink
                      href={shopHref(base, params, { page: params.page + 1 })}
                      className="mt-2 inline-flex h-12 items-center rounded-full border border-espresso/80 px-8 text-[0.95rem] font-medium text-espresso transition-colors hover:bg-espresso hover:text-paper"
                    >
                      عرض المزيد
                    </ShopLink>
                  ) : (
                    <p className="text-sm text-taupe">شاهدت المجموعة كاملة <span className="text-gold" aria-hidden>✦</span></p>
                  )}
                </div>
              </>
            )}
          </ResultsVeil>
        </div>
      </div>

      <PageBlocks page="shop" position="bottom" />
    </ShopNavProvider>
  );
}
