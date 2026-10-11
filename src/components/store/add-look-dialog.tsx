"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { CircleAlert, LoaderCircle, ShoppingBag, X } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { Price, useMoney } from "@/components/store/store-provider";
import { useCart, type NewCartLine } from "@/components/store/cart/cart-provider";
import { imagesForColor, loadVariants, sortSizes } from "@/components/store/product-card";
import { Portal, useModal, usePresence } from "@/components/store/overlay";
import type { LookData, VariantData } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type Variants = Record<number, VariantData[]>;

/**
 * "Shop the whole look": opens a sheet (mobile) / dialog (desktop) where the shopper
 * picks a size for every piece, then adds the set as bundle lines (lookId) to the bag.
 */
export function AddLookButton({
  look,
  label = "أضف الإطلالة كاملة",
  className,
  variant = "primary",
  size = "lg",
}: {
  look: LookData;
  label?: string;
  className?: string;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
}) {
  const [open, setOpen] = useState(false);
  const disabled = look.items.length === 0;
  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-haspopup="dialog"
        onMouseEnter={() => look.items.length && loadVariants(look.items.map((i) => i.product.id)).catch(() => {})}
      >
        <ShoppingBag className="size-[1.1rem]" strokeWidth={1.6} aria-hidden />
        {label}
      </Button>
      <AddLookDialog look={look} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function AddLookDialog({ look, open, onClose }: { look: LookData; open: boolean; onClose: () => void }) {
  const { mounted, visible } = usePresence(open, 500);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const cart = useCart();
  const money = useMoney();

  const [variants, setVariants] = useState<Variants | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">("idle");
  const [picked, setPicked] = useState<Record<number, number>>({}); // productId -> variantId
  const [showErrors, setShowErrors] = useState(false);

  useModal({ open, onClose, containerRef: panelRef });

  const fetchVariants = useCallback(() => {
    setLoadState("loading");
    loadVariants(look.items.map((i) => i.product.id))
      .then((v) => {
        setVariants(v);
        setLoadState("idle");
      })
      .catch(() => setLoadState("error"));
  }, [look.items]);

  useEffect(() => {
    if (open && !variants && loadState !== "loading") fetchVariants();
  }, [open, variants, loadState, fetchVariants]);

  useEffect(() => {
    if (!open) setShowErrors(false);
  }, [open]);

  /** Per item: the size options for its preset colour */
  const rows = useMemo(
    () =>
      look.items.map((item) => {
        const all = variants?.[item.product.id] ?? [];
        const forColor = item.color ? all.filter((v) => v.color === item.color) : all;
        const options = sortSizes(forColor.length ? forColor : all);
        const inStock = options.filter((v) => v.stock > 0);
        return { item, options, inStock, image: imagesForColor(item.product.images, item.color)[0] ?? null };
      }),
    [look.items, variants],
  );

  // Auto-select pieces that only come in one size
  useEffect(() => {
    if (!variants) return;
    setPicked((prev) => {
      const next = { ...prev };
      for (const r of rows) {
        if (next[r.item.product.id] == null && r.inStock.length === 1 && r.options.length === 1) next[r.item.product.id] = r.inStock[0].id;
      }
      return next;
    });
  }, [variants, rows]);

  const unavailable = variants ? rows.filter((r) => r.inStock.length === 0) : [];
  const missing = rows.filter((r) => picked[r.item.product.id] == null);

  const priceOf = (r: (typeof rows)[number]) => r.options.find((v) => v.id === picked[r.item.product.id])?.price ?? r.item.product.price;
  const total = rows.reduce((s, r) => s + priceOf(r), 0);
  const savings = Math.round((total * look.discountPercent) / 100);

  const submit = () => {
    if (!variants || unavailable.length) return;
    if (missing.length) {
      setShowErrors(true);
      const first = document.getElementById(`${titleId}-row-${missing[0].item.product.id}`);
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const lines: NewCartLine[] = rows.map((r) => {
      const v = r.options.find((o) => o.id === picked[r.item.product.id])!;
      return {
        variantId: v.id,
        productId: r.item.product.id,
        slug: r.item.product.slug,
        name: r.item.product.name,
        color: v.color,
        colorHex: v.colorHex,
        size: v.size,
        unitPrice: v.price,
        compareAtPrice: r.item.product.compareAtPrice,
        imageId: r.image?.id ?? null,
        imageBlur: r.image?.blur,
        maxQuantity: v.stock,
        quantity: 1,
        lookId: look.id,
        lookTitle: look.title,
        lookDiscountPercent: look.discountPercent,
      };
    });
    onClose();
    cart.addMany(lines);
  };

  if (!mounted) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-6">
        <div
          className={cn("absolute inset-0 bg-espresso/55 backdrop-blur-[2px] transition-opacity duration-500", visible ? "opacity-100" : "opacity-0")}
          onClick={onClose}
          aria-hidden
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={cn(
            "relative flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-2xl bg-ivory shadow-2xl outline-none transition-all duration-500 ease-[var(--ease-out-expo)]",
            "md:grid md:max-h-[86vh] md:max-w-4xl md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:rounded-2xl",
            visible ? "translate-y-0 opacity-100 md:scale-100" : "translate-y-full opacity-100 md:translate-y-4 md:scale-[0.98] md:opacity-0",
          )}
        >
          {/* Cover (desktop) */}
          <div className="relative hidden md:block">
            <MediaImage media={look.cover} sizes="420px" className="studio-frame h-full w-full" alt={look.cover?.alt || look.title} />
            <div className="absolute inset-0 bg-gradient-to-t from-espresso/70 via-transparent to-transparent" aria-hidden />
            <div className="absolute inset-x-6 bottom-6 text-paper">
              <p className="eyebrow text-copper-soft">The Complete Look</p>
              <p className="display mt-2 text-2xl">{look.title}</p>
              {look.subtitle && <p className="mt-1 text-sm text-paper/75">{look.subtitle}</p>}
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            {/* Header */}
            <div className="relative border-b border-line px-5 pb-4 pt-3 md:px-7 md:pt-6">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-sand md:hidden" aria-hidden />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow text-[0.7rem]">Shop the look</p>
                  <h2 id={titleId} className="display mt-1.5 text-2xl text-espresso">
                    {look.title}
                  </h2>
                  <p className="mt-1 text-sm text-taupe">
                    اختر مقاسك لكل قطعة{look.discountPercent > 0 ? ` — وخصم ${look.discountPercent}% يُطبَّق على الإطلالة كاملة` : ""}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="-me-2 grid size-11 shrink-0 place-items-center rounded-full text-espresso transition-colors hover:bg-bone"
                  aria-label="إغلاق"
                >
                  <X className="size-5" strokeWidth={1.6} aria-hidden />
                </button>
              </div>
            </div>

            {/* Items */}
            <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto overscroll-contain px-5 md:px-7">
              {rows.map((r) => {
                const err = showErrors && picked[r.item.product.id] == null && r.inStock.length > 0;
                return (
                  <li key={r.item.product.id} id={`${titleId}-row-${r.item.product.id}`} className="flex gap-4 py-5">
                    <div className="studio-frame aspect-[4/5] w-20 shrink-0 overflow-hidden rounded-lg md:w-24">
                      <MediaImage media={r.image} sizes="96px" className="h-full w-full" alt="" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[0.95rem] font-medium leading-6 text-espresso">{r.item.product.name}</p>
                          {r.item.color && (
                            <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-taupe">
                              <span
                                className="size-2.5 rounded-full ring-1 ring-black/10"
                                style={{ backgroundColor: r.item.product.colors.find((c) => c.name === r.item.color)?.hex ?? "#999" }}
                                aria-hidden
                              />
                              {r.item.color}
                            </p>
                          )}
                        </div>
                        <Price amount={priceOf(r)} className="shrink-0 text-sm text-umber" />
                      </div>

                      <fieldset className="mt-3">
                        <legend className="sr-only">مقاس {r.item.product.name}</legend>
                        {!variants ? (
                          loadState === "error" ? null : (
                            <div className="flex gap-1.5" aria-hidden>
                              {[0, 1, 2, 3].map((k) => (
                                <span key={k} className="skeleton h-10 w-12 rounded-full" />
                              ))}
                            </div>
                          )
                        ) : r.inStock.length === 0 ? (
                          <p className="text-xs text-danger">هذه القطعة غير متوفرة حالياً بهذا اللون</p>
                        ) : r.options.length === 1 && !r.options[0].size ? (
                          <p className="text-xs text-taupe">مقاس واحد</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {r.options.map((v) => {
                              const sel = picked[r.item.product.id] === v.id;
                              const out = v.stock <= 0;
                              return (
                                <label
                                  key={v.id}
                                  className={cn(
                                    "relative grid h-10 min-w-12 cursor-pointer place-items-center rounded-full border px-3 text-sm tabular-nums transition-colors duration-200",
                                    "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-copper/40",
                                    sel ? "border-espresso bg-espresso text-paper" : "border-line bg-paper text-espresso hover:border-espresso/60",
                                    out && "cursor-not-allowed border-dashed text-mist line-through hover:border-line",
                                  )}
                                >
                                  <input
                                    type="radio"
                                    className="sr-only"
                                    name={`${titleId}-size-${r.item.product.id}`}
                                    value={v.id}
                                    checked={sel}
                                    disabled={out}
                                    onChange={() => setPicked((p) => ({ ...p, [r.item.product.id]: v.id }))}
                                    aria-label={`${v.size}${out ? " — نفد" : v.stock <= 3 ? ` — بقي ${v.stock}` : ""}`}
                                  />
                                  {v.size || "—"}
                                </label>
                              );
                            })}
                          </div>
                        )}
                        {err && (
                          <p role="alert" className="mt-2 text-xs text-danger">
                            اختر المقاس لـ{r.item.product.name}
                          </p>
                        )}
                      </fieldset>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Summary */}
            <div className="border-t border-line bg-paper px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 md:px-7 md:pb-6">
              {loadState === "error" && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-danger/8 px-4 py-3 text-sm text-danger">
                  <span className="inline-flex items-center gap-2">
                    <CircleAlert className="size-4" aria-hidden />
                    تعذّر تحميل المقاسات.
                  </span>
                  <button type="button" onClick={fetchVariants} className="min-h-11 font-medium underline underline-offset-4">
                    أعد المحاولة
                  </button>
                </div>
              )}
              {unavailable.length > 0 && (
                <p className="mb-3 text-xs leading-6 text-danger">
                  بعض قطع الإطلالة نفدت حالياً — تقدر تضيف القطع المتوفرة من صفحاتها، أو تواصل معنا ونبلغك أول ما ترجع.
                </p>
              )}
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-taupe">سعر الإطلالة ({look.items.length} قطع)</p>
                  <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                    <span className="display text-2xl tabular-nums text-espresso">{money(total - savings)}</span>
                    {savings > 0 && <s className="text-sm tabular-nums text-mist">{money(total)}</s>}
                  </p>
                </div>
                {savings > 0 && (
                  <span className="rounded-full bg-copper/10 px-3 py-1.5 text-xs font-medium text-copper-deep">وفّرت {money(savings)}</span>
                )}
              </div>
              <Button
                size="lg"
                className="mt-4 w-full"
                onClick={submit}
                disabled={!variants || unavailable.length > 0}
                aria-describedby={missing.length ? `${titleId}-hint` : undefined}
              >
                {!variants && loadState === "loading" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <ShoppingBag className="size-[1.1rem]" strokeWidth={1.6} aria-hidden />}
                أضف الإطلالة إلى السلة
              </Button>
              {missing.length > 0 && variants && unavailable.length === 0 && (
                <p id={`${titleId}-hint`} className="mt-2 text-center text-xs text-taupe">
                  باقي تختار مقاس {missing.length === 1 ? "قطعة واحدة" : `${missing.length} قطع`}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
