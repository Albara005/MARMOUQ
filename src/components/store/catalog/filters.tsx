import { Check, X } from "lucide-react";
import type { CategoryData, ColorOption } from "@/lib/catalog";
import { formatMoney, type Currency } from "@/lib/money";
import { cn } from "@/lib/utils";
import { PriceForm, ShopLink } from "@/components/store/catalog/shop-nav";
import { shopHref, type ShopParams } from "@/components/store/catalog/params";

export type Facets = { colors: ColorOption[]; sizes: string[]; priceMin: number; priceMax: number };

/** Hidden inputs that carry the current state through GET forms. */
export function carryParams(p: ShopParams, omit: (keyof ShopParams)[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (p.q && !omit.includes("q")) out.q = p.q;
  if (p.color && !omit.includes("color")) out.color = p.color;
  if (p.size && !omit.includes("size")) out.size = p.size;
  if (p.min != null && !omit.includes("min")) out.min = String(p.min);
  if (p.max != null && !omit.includes("max")) out.max = String(p.max);
  if (p.sort !== "featured" && !omit.includes("sort")) out.sort = p.sort;
  return out;
}

/** Three honest price bands derived from the catalogue's real range. */
function priceBands(lo: number, hi: number): { label: string; min: number | null; max: number | null }[] {
  if (!hi || hi - lo < 4000) return [];
  const step = 5000;
  const a = Math.max(step, Math.round((lo + (hi - lo) / 3) / step) * step);
  const b = Math.max(a + step, Math.round((lo + ((hi - lo) * 2) / 3) / step) * step);
  return [
    { label: `حتى ${a.toLocaleString("en-US")}`, min: null, max: a },
    { label: `${a.toLocaleString("en-US")} – ${b.toLocaleString("en-US")}`, min: a, max: b },
    { label: `أكثر من ${b.toLocaleString("en-US")}`, min: b, max: null },
  ];
}

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="border-b border-line py-6 last:border-b-0">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h3 className="text-[0.8rem] font-semibold tracking-wide text-espresso">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function FilterPanel({
  params,
  base,
  category,
  categories,
  allCount,
  facets,
  currency,
  idPrefix,
  showCategories = true,
}: {
  showCategories?: boolean;
  params: ShopParams;
  base: string;
  category: CategoryData | null;
  categories: CategoryData[];
  allCount: number;
  facets: Facets;
  currency: Currency;
  idPrefix: string;
}) {
  const bands = priceBands(facets.priceMin, facets.priceMax);
  const keep = (slug: string | null) => shopHref(slug ? `/shop/${slug}` : "/shop", { ...params, color: "", size: "", min: null, max: null });
  const priceActive = params.min != null || params.max != null;

  return (
    <div>
      {showCategories && (
      <Section title="الأقسام">
        <ul className="-my-1">
          {[{ slug: null as string | null, name: "كل القطع", count: allCount }, ...categories.map((c) => ({ slug: c.slug as string | null, name: c.name, count: c.productCount }))].map(
            (c) => {
              const active = (category?.slug ?? null) === c.slug;
              return (
                <li key={c.slug ?? "all"}>
                  <ShopLink
                    href={keep(c.slug)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex min-h-11 items-center justify-between gap-3 py-1 text-[0.92rem] transition-colors",
                      active ? "font-medium text-espresso" : "text-umber hover:text-espresso",
                    )}
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <span
                        className={cn("h-px transition-all duration-500 ease-[var(--ease-out-expo)]", active ? "w-5 bg-copper" : "w-2 bg-sand group-hover:w-4 group-hover:bg-gold")}
                        aria-hidden
                      />
                      {c.name}
                    </span>
                    <span className="text-xs tabular-nums text-mist">{c.count}</span>
                  </ShopLink>
                </li>
              );
            },
          )}
        </ul>
      </Section>
      )}

      {facets.colors.length > 1 && (
        <Section
          title="اللون"
          aside={
            params.color ? (
              <ShopLink href={shopHref(base, params, { color: "" })} className="text-xs text-taupe underline-offset-4 hover:text-espresso hover:underline">
                إلغاء
              </ShopLink>
            ) : null
          }
        >
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
            {facets.colors.map((c) => {
              const active = params.color === c.name;
              return (
                <li key={c.name}>
                  <ShopLink
                    href={shopHref(base, params, { color: active ? "" : c.name })}
                    aria-pressed={active}
                    aria-label={`${active ? "إلغاء " : ""}اللون ${c.name}`}
                    className={cn("group flex min-h-11 items-center gap-2.5 text-[0.86rem]", active ? "font-medium text-espresso" : "text-umber hover:text-espresso")}
                  >
                    <span
                      className={cn(
                        "relative grid size-6 shrink-0 place-items-center rounded-full ring-1 ring-black/10 transition-shadow duration-300",
                        active ? "shadow-[0_0_0_2px_var(--color-ivory),0_0_0_3px_var(--color-espresso)]" : "group-hover:shadow-[0_0_0_2px_var(--color-ivory),0_0_0_3px_var(--color-sand)]",
                      )}
                      style={{ backgroundColor: c.hex }}
                      aria-hidden
                    >
                      {active && <Check className={cn("size-3", isLight(c.hex) ? "text-espresso" : "text-paper")} strokeWidth={2.4} />}
                    </span>
                    <span className="truncate">{c.name}</span>
                  </ShopLink>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {facets.sizes.length > 0 && (
        <Section
          title="المقاس"
          aside={
            params.size ? (
              <ShopLink href={shopHref(base, params, { size: "" })} className="text-xs text-taupe underline-offset-4 hover:text-espresso hover:underline">
                إلغاء
              </ShopLink>
            ) : (
              <span className="text-[0.7rem] text-mist">المتوفر فقط</span>
            )
          }
        >
          <ul className="flex flex-wrap gap-2">
            {facets.sizes.map((s) => {
              const active = params.size === s;
              return (
                <li key={s}>
                  <ShopLink
                    href={shopHref(base, params, { size: active ? "" : s })}
                    aria-pressed={active}
                    aria-label={`${active ? "إلغاء " : ""}المقاس ${s}`}
                    className={cn(
                      "grid h-11 min-w-12 place-items-center rounded-full border px-3 text-[0.82rem] font-medium tabular-nums transition-colors duration-300",
                      active ? "border-espresso bg-espresso text-paper" : "border-line bg-paper text-espresso hover:border-espresso/50",
                    )}
                  >
                    {s}
                  </ShopLink>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Section
        title="السعر"
        aside={
          priceActive ? (
            <ShopLink href={shopHref(base, params, { min: null, max: null })} className="text-xs text-taupe underline-offset-4 hover:text-espresso hover:underline">
              إلغاء
            </ShopLink>
          ) : (
            <span className="text-[0.7rem] text-mist">{currency.symbol}</span>
          )
        }
      >
        {bands.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {bands.map((b) => {
              const active = params.min === b.min && params.max === b.max;
              return (
                <li key={b.label}>
                  <ShopLink
                    href={shopHref(base, params, active ? { min: null, max: null } : { min: b.min, max: b.max })}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex h-10 items-center rounded-full border px-3.5 text-[0.78rem] tabular-nums transition-colors duration-300",
                      active ? "border-espresso bg-espresso text-paper" : "border-line bg-paper text-umber hover:border-espresso/50 hover:text-espresso",
                    )}
                  >
                    {b.label}
                  </ShopLink>
                </li>
              );
            })}
          </ul>
        )}
        <PriceForm
          base={base}
          hidden={carryParams(params, ["min", "max"])}
          min={params.min}
          max={params.max}
          placeholderMin={facets.priceMin}
          placeholderMax={facets.priceMax}
          idPrefix={idPrefix}
        />
        {facets.priceMax > 0 && (
          <p className="mt-3 text-[0.7rem] leading-5 text-mist">
            الأسعار في هذا القسم من {formatMoney(facets.priceMin, currency)} إلى {formatMoney(facets.priceMax, currency)}
          </p>
        )}
      </Section>
    </div>
  );
}

/** Removable chips for the active filters + "clear all". */
export function ActiveFilters({ params, base, currency, className }: { params: ShopParams; base: string; currency: Currency; className?: string }) {
  const chips: { label: string; href: string }[] = [];
  if (params.color) chips.push({ label: `اللون: ${params.color}`, href: shopHref(base, params, { color: "" }) });
  if (params.size) chips.push({ label: `المقاس: ${params.size}`, href: shopHref(base, params, { size: "" }) });
  if (params.min != null || params.max != null) {
    const label =
      params.min != null && params.max != null
        ? `${formatMoney(params.min, currency)} – ${formatMoney(params.max, currency)}`
        : params.min != null
          ? `من ${formatMoney(params.min, currency)}`
          : `حتى ${formatMoney(params.max!, currency)}`;
    chips.push({ label, href: shopHref(base, params, { min: null, max: null }) });
  }
  if (chips.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="sr-only">الفلاتر المفعّلة:</span>
      {chips.map((c) => (
        <ShopLink
          key={c.label}
          href={c.href}
          className="group inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-paper pe-2.5 ps-3.5 text-[0.78rem] tabular-nums text-espresso transition-colors hover:border-espresso/50"
          aria-label={`إزالة ${c.label}`}
        >
          {c.label}
          <X className="size-3.5 text-taupe transition-colors group-hover:text-espresso" aria-hidden />
        </ShopLink>
      ))}
      {chips.length > 1 && (
        <ShopLink
          href={shopHref(base, params, { color: "", size: "", min: null, max: null })}
          className="inline-flex h-9 items-center px-2 text-[0.78rem] text-taupe underline underline-offset-4 hover:text-espresso"
        >
          مسح الكل
        </ShopLink>
      )}
    </div>
  );
}

export function isLight(hex: string): boolean {
  const m = hex.replace("#", "");
  if (m.length < 6) return false;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}
