"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft, ShoppingBag, Sparkles, Truck, X } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { ButtonLink } from "@/components/ui/button";
import { useMoney } from "@/components/store/store-provider";
import { useCart, type CartLine } from "@/components/store/cart/cart-provider";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import { ProductCard } from "@/components/store/product-card";
import { addonRulesFrom, computeTotals, type LookRule, type Totals } from "@/lib/pricing";
import type { ProductCardData } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { useLookRules } from "./use-look-rules";
import { FreeShippingMeter, SummaryRow, lineHref, lookLabel, piecesLabel } from "./summary";
import { TrustList } from "./trust-list";

type Group = { lookId: number | null; title: string; percent: number; lines: CartLine[] };

function groupLines(lines: CartLine[]): Group[] {
  const looks = new Map<number, Group>();
  const singles: CartLine[] = [];
  for (const l of lines) {
    if (!l.lookId) {
      singles.push(l);
      continue;
    }
    const g = looks.get(l.lookId) ?? { lookId: l.lookId, title: l.lookTitle ?? "", percent: l.lookDiscountPercent ?? 0, lines: [] };
    g.lines.push(l);
    if (!g.title && l.lookTitle) g.title = l.lookTitle;
    looks.set(l.lookId, g);
  }
  const out = [...looks.values()];
  if (singles.length) out.push({ lookId: null, title: "", percent: 0, lines: singles });
  return out;
}

export function CartView({ suggestions }: { suggestions: ProductCardData[] }) {
  const cart = useCart();
  const money = useMoney();
  const lookIds = useMemo(() => cart.lines.map((l) => l.lookId), [cart.lines]);
  const { rules, loading } = useLookRules(lookIds);
  const totals = useMemo(() => computeTotals({ lines: cart.lines, looks: rules, addons: addonRulesFrom(cart.lines) }), [cart.lines, rules]);
  const groups = useMemo(() => groupLines(cart.lines), [cart.lines]);

  const inCart = new Set(cart.lines.map((l) => l.productId));
  const picks = suggestions.filter((p) => !inCart.has(p.id)).slice(0, 4);

  if (!cart.hydrated) return <CartSkeleton />;
  if (cart.lines.length === 0) return <EmptyCart suggestions={suggestions} />;

  const hasLookGroups = groups.some((g) => g.lookId);
  const estimate = totals.subtotal - totals.lookDiscount - totals.addonDiscount;

  return (
    <>
      <div className="container-luxe pb-32 pt-8 md:pt-12 lg:pb-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          {/* ───────── Lines ───────── */}
          <section aria-labelledby="cart-lines-title" className="lg:col-span-8">
            <div className="flex items-baseline justify-between gap-4 border-b border-espresso/80 pb-4">
              <h2 id="cart-lines-title" className="display text-xl text-espresso md:text-2xl">
                قطعك المختارة <span className="ms-1 font-[family-name:var(--font-sans)] text-sm tabular-nums text-taupe">({piecesLabel(cart.count)})</span>
              </h2>
              <Link href="/shop" className="link-luxe hidden py-2 text-sm text-umber hover:text-espresso sm:inline">
                متابعة التسوق
              </Link>
            </div>

            <div className="mt-2 hidden grid-cols-[minmax(0,1fr)_9rem_8rem] gap-x-6 py-3 text-xs tracking-wide text-taupe md:grid">
              <span>القطعة</span>
              <span className="text-center">الكمية</span>
              <span className="text-end">المجموع</span>
            </div>

            <div className="space-y-6 md:space-y-8">
              {groups.map((g) =>
                g.lookId ? (
                  <LookGroup key={`look-${g.lookId}`} group={g} rules={rules} totals={totals} loading={loading} />
                ) : (
                  <div key="singles">
                    {hasLookGroups && <p className="eyebrow mb-1 mt-2 text-[0.7rem] text-taupe">INDIVIDUAL PIECES · قطع منفردة</p>}
                    <ul className="divide-y divide-line border-b border-line">
                      {g.lines.map((l) => (
                        <CartRow key={l.key} line={l} discount={totals.lineDiscounts[l.key] ?? 0} />
                      ))}
                    </ul>
                  </div>
                ),
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-sm">
              <Link href="/shop" className="group inline-flex min-h-11 items-center gap-2 text-umber hover:text-espresso">
                <ArrowLeft className="size-4 rotate-180 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                <span className="link-luxe">متابعة التسوق</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("تفريغ السلة بالكامل؟")) cart.clear();
                }}
                className="min-h-11 px-1 text-xs text-taupe underline-offset-4 transition-colors hover:text-danger hover:underline"
              >
                تفريغ السلة
              </button>
            </div>
          </section>

          {/* ───────── Summary ───────── */}
          <aside aria-labelledby="cart-summary-title" className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <div className="rounded-2xl border border-line bg-paper p-6 md:p-7">
                <h2 id="cart-summary-title" className="display text-xl text-espresso">
                  ملخص الطلب
                </h2>
                <div className="hairline my-5" aria-hidden />
                <dl>
                  <SummaryRow label="المجموع الفرعي" value={money(totals.subtotal)} />
                  {totals.lookDiscount > 0 && <SummaryRow label="خصم الإطلالة الكاملة" value={`− ${money(totals.lookDiscount)}`} tone="saving" />}
                  {totals.addonDiscount > 0 && <SummaryRow label="خصم الإضافات مع الطقم" value={`− ${money(totals.addonDiscount)}`} tone="saving" />}
                  <SummaryRow label="التوصيل" value="تُحسب عند الإتمام" tone="muted" />
                  <SummaryRow label="كود الخصم" value="يُضاف في الخطوة التالية" tone="muted" />
                </dl>
                <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-line pt-5">
                  <span className="text-sm font-medium text-espresso">الإجمالي التقديري</span>
                  <span className="display text-2xl tabular-nums text-espresso">{money(estimate)}</span>
                </div>
                {totals.lookDiscount > 0 && (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-copper/10 px-3 py-1 text-xs font-medium text-copper-deep">
                    <Sparkles className="size-3" aria-hidden />
                    وفّرت {money(totals.lookDiscount)} بتنسيق الإطلالة كاملة
                  </p>
                )}
                <FreeShippingMeter amount={estimate} className="mt-6 rounded-xl bg-bone/60 p-4" />
                <ButtonLink href="/checkout" size="lg" className="mt-6 hidden w-full lg:flex">
                  إتمام الطلب
                  <ArrowLeft className="size-4" aria-hidden />
                </ButtonLink>
                <p className="mt-4 text-center text-xs leading-6 text-taupe">الدفع عند الاستلام متاح · نؤكد معك قبل الشحن</p>
              </div>
              <TrustList compact className="mt-6 px-1" />
            </div>
          </aside>
        </div>
      </div>

      {picks.length >= 2 && <Suggestions products={picks} title="أكمل حضورك" subtitle="قطع تنسجم مع اختيارك — من مختارات مرموق لهذا الموسم." />}

      {/* ───────── Mobile sticky CTA ───────── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-5 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <p className="text-[0.7rem] text-taupe">الإجمالي التقديري</p>
            <p className="display text-lg tabular-nums text-espresso">{money(estimate)}</p>
          </div>
          <ButtonLink href="/checkout" size="lg" className="h-13 flex-1">
            إتمام الطلب
            <ArrowLeft className="size-4" aria-hidden />
          </ButtonLink>
        </div>
      </div>
    </>
  );
}

/* ───────────── Look group ───────────── */

function LookGroup({ group, rules, totals, loading }: { group: Group; rules: LookRule[]; totals: Totals; loading: boolean }) {
  const money = useMoney();
  const rule = rules.find((r) => r.id === group.lookId);
  const applied = !!group.lookId && totals.appliedLookIds.includes(group.lookId);
  const saving = group.lines.reduce((s, l) => s + (totals.lineDiscounts[l.key] ?? 0), 0);
  const percent = rule?.discountPercent ?? group.percent;
  const have = rule ? rule.productIds.filter((pid) => group.lines.some((l) => l.productId === pid)).length : 0;
  const need = rule?.productIds.length ?? 0;

  let status: React.ReactNode = null;
  if (loading) status = <span className="skeleton inline-block h-3 w-40 rounded-full" />;
  else if (applied) status = <>خصم الإطلالة الكاملة {percent}% مُفعّل — وفّرت <strong className="font-semibold tabular-nums">{money(saving)}</strong></>;
  else if (rule && need > 0) status = <>أكمل قطع الإطلالة ({have}/{need}) ليُفعَّل خصم {percent}%</>;
  else status = <>القطع محتسبة بسعرها الأصلي</>;

  return (
    <div className="overflow-hidden rounded-2xl border border-copper/25 bg-paper/50">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-copper/15 bg-copper/[0.06] px-4 py-3.5 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-copper text-paper">
            <Sparkles className="size-4" strokeWidth={1.5} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="eyebrow text-[0.62rem] leading-none">THE LOOK</p>
            <h3 className="display mt-1 truncate text-lg text-espresso">{group.title ? lookLabel(group.title) : "إطلالة مرموق"}</h3>
          </div>
        </div>
        {percent > 0 && (
          <span className={cn("rounded-full px-3 py-1 text-xs font-medium tabular-nums", applied ? "bg-copper text-paper" : "bg-paper text-copper-deep ring-1 ring-copper/25")}>
            −{percent}%
          </span>
        )}
        <p className={cn("w-full text-xs leading-6", applied ? "text-copper-deep" : "text-taupe")}>
          {status}
          {!loading && !applied && rule && need > have && (
            <Link href="/looks" className="ms-2 font-medium text-espresso underline decoration-copper/50 underline-offset-4 hover:decoration-copper">
              أكمل الإطلالة
            </Link>
          )}
        </p>
      </div>
      <ul className="divide-y divide-line px-4 md:px-5">
        {group.lines.map((l) => (
          <CartRow key={l.key} line={l} discount={totals.lineDiscounts[l.key] ?? 0} />
        ))}
      </ul>
    </div>
  );
}

/* ───────────── Row ───────────── */

function CartRow({ line: l, discount }: { line: CartLine; discount: number }) {
  const cart = useCart();
  const money = useMoney();
  const gross = l.unitPrice * l.quantity;
  const max = Math.max(1, Math.min(20, l.maxQuantity || 20));
  const atMax = l.quantity >= max && max < 20;

  const total = (
    <div className="text-end tabular-nums">
      {discount > 0 ? (
        <>
          <span className="block text-[0.95rem] font-medium text-espresso">{money(gross - discount)}</span>
          <s className="block text-xs text-mist">{money(gross)}</s>
        </>
      ) : (
        <span className="text-[0.95rem] font-medium text-espresso">{money(gross)}</span>
      )}
    </div>
  );
  const stepper = <QuantityStepper size="sm" value={l.quantity} max={max} onChange={(n) => cart.setQuantity(l.key, n)} label={`كمية ${l.name}`} />;

  return (
    <li className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-4 py-5 sm:grid-cols-[7rem_minmax(0,1fr)] md:grid-cols-[7rem_minmax(0,1fr)_9rem_8rem] md:items-center md:gap-x-6 md:py-6">
      <Link href={lineHref(l)} tabIndex={-1} aria-hidden className="studio-frame group/img block aspect-[4/5] overflow-hidden rounded-lg md:row-span-1">
        <MediaImage
          media={l.imageId ? { id: l.imageId, blur: l.imageBlur } : null}
          sizes="120px"
          className="h-full w-full"
          imgClassName="transition-transform duration-700 ease-[var(--ease-luxe)] group-hover/img:scale-[1.04]"
          alt=""
        />
      </Link>

      <div className="flex min-w-0 flex-col self-stretch md:self-center">
        <div className="flex items-start justify-between gap-2">
          <Link href={lineHref(l)} className="line-clamp-2 text-[0.95rem] font-medium leading-7 text-espresso hover:underline hover:decoration-copper/60 hover:underline-offset-4">
            {l.name}
          </Link>
          <button
            type="button"
            onClick={() => cart.remove(l.key)}
            className="-me-2 -mt-1.5 grid size-10 shrink-0 place-items-center rounded-full text-taupe transition-colors hover:bg-bone hover:text-danger md:hidden"
            aria-label={`إزالة ${l.name} من السلة`}
          >
            <X className="size-4" strokeWidth={1.5} aria-hidden />
          </button>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-taupe">
          {l.color && (
            <span className="inline-flex items-center gap-1.5">
              {l.colorHex && <span className="size-3 rounded-full ring-1 ring-black/10" style={{ backgroundColor: l.colorHex }} aria-hidden />}
              {l.color}
            </span>
          )}
          {l.color && l.size && <span className="h-3 w-px bg-line" aria-hidden />}
          {l.size && <span>المقاس {l.size}</span>}
        </p>
        {!l.lookId && l.addonOf && (
          <p className="mt-1.5 inline-flex w-fit rounded-full bg-bone px-2.5 py-0.5 text-[0.7rem] font-medium text-umber">
            {l.addonOfName ? `إضافة مع ${l.addonOfName}` : "إضافة"}
            {l.addonDiscountPercent ? ` · خصم ${l.addonDiscountPercent}%` : ""}
          </p>
        )}
        <p className="mt-1.5 text-xs text-taupe">
          <span className="tabular-nums">{money(l.unitPrice)}</span> للقطعة
          {l.compareAtPrice != null && l.compareAtPrice > l.unitPrice && <s className="ms-2 tabular-nums text-mist">{money(l.compareAtPrice)}</s>}
        </p>
        {atMax && <p className="mt-1 text-[0.7rem] text-warning">هذه آخر الكمية المتوفرة من هذا المقاس</p>}
        <button
          type="button"
          onClick={() => cart.remove(l.key)}
          className="mt-2 hidden min-h-9 w-fit items-center gap-1.5 text-xs text-taupe underline-offset-4 transition-colors hover:text-danger hover:underline md:inline-flex"
          aria-label={`إزالة ${l.name} من السلة`}
        >
          إزالة
        </button>
        {/* Mobile: quantity + total */}
        <div className="mt-auto flex items-end justify-between gap-3 pt-3 md:hidden">
          {stepper}
          {total}
        </div>
      </div>

      <div className="hidden justify-center md:flex">{stepper}</div>
      <div className="hidden md:block">{total}</div>
    </li>
  );
}

/* ───────────── Empty + suggestions + skeleton ───────────── */

function EmptyCart({ suggestions }: { suggestions: ProductCardData[] }) {
  return (
    <>
      <div className="container-luxe py-14 md:py-20">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <div className="relative grid size-28 place-items-center rounded-full border border-line bg-paper">
            <span className="absolute inset-2 rounded-full border border-dashed border-gold/50" aria-hidden />
            <ShoppingBag className="size-10 text-copper" strokeWidth={1.1} aria-hidden />
            <span className="absolute -end-1 top-3 text-gold" aria-hidden>
              ✦
            </span>
          </div>
          <p className="eyebrow mt-8">YOUR BAG IS EMPTY</p>
          <h2 className="display mt-3 text-3xl text-espresso md:text-4xl">سلّتك بانتظار أول قطعة</h2>
          <p className="mt-4 max-w-md text-[0.95rem] leading-8 text-umber">
            وش يمنعك تبدأ؟ سويتر تريكو إيطالي، قميص بياقة حادّة، أو إطلالة كاملة منسّقة من الرأس للقدم — كل قطعة مختارة لتكمل حضورك.
          </p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <ButtonLink href="/shop" size="lg" className="w-full sm:w-auto">
              تسوّق المجموعة
              <ArrowLeft className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/looks" variant="outline" size="lg" className="w-full sm:w-auto">
              الإطلالات الجاهزة
            </ButtonLink>
          </div>
          <p className="mt-6 inline-flex items-center gap-2 text-xs text-taupe">
            <Truck className="size-3.5 text-copper" strokeWidth={1.5} aria-hidden />
            توصيل لجميع المحافظات اليمنية · الدفع عند الاستلام
          </p>
        </div>
      </div>
      {suggestions.length > 0 && <Suggestions products={suggestions.slice(0, 4)} title="مختارات المحرر" subtitle="القطع التي يبدأ بها عملاؤنا عادةً — وتبقى معهم طويلاً." />}
    </>
  );
}

function Suggestions({ products, title, subtitle }: { products: ProductCardData[]; title: string; subtitle: string }) {
  return (
    <section aria-labelledby="cart-suggestions" className="border-t border-line bg-paper/60 py-14 md:py-20">
      <div className="container-luxe">
        <p className="eyebrow inline-flex items-center gap-3">
          <span className="h-px w-8 bg-gold/70" aria-hidden />
          CURATED FOR YOU
        </p>
        <h2 id="cart-suggestions" className="display mt-3 text-3xl text-espresso md:text-4xl">
          {title}
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-umber">{subtitle}</p>
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} sizes="(min-width: 1024px) 22vw, 45vw" />
          ))}
        </div>
      </div>
    </section>
  );
}

function CartSkeleton() {
  return (
    <div className="container-luxe pb-24 pt-8 md:pt-12" role="status" aria-live="polite">
      <span className="sr-only">جارٍ تحميل السلة…</span>
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-8">
          <div className="skeleton h-7 w-48 rounded-full" />
          <div className="mt-6 divide-y divide-line border-y border-line">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-4 py-6">
                <div className="skeleton aspect-[4/5] w-24 shrink-0 rounded-lg md:w-28" />
                <div className="flex-1 space-y-3 pt-1">
                  <div className="skeleton h-4 w-2/3 rounded-full" />
                  <div className="skeleton h-3 w-1/3 rounded-full" />
                  <div className="skeleton mt-6 h-10 w-28 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-4">
          <div className="skeleton h-80 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
