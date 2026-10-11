"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowLeft, CircleAlert, LoaderCircle, ShoppingBag, Sparkles, X } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { Button } from "@/components/ui/button";
import { Price, useMoney } from "@/components/store/store-provider";
import { useCart, type NewCartLine } from "@/components/store/cart/cart-provider";
import { loadVariants, sortSizes } from "@/components/store/product-card";
import { Portal, useModal, usePresence } from "@/components/store/overlay";
import type { VariantData } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { SLOT_META, type AtelierOption, type LookMatch, type SlotKey } from "./model";

type Row = { slot: SlotKey; option: AtelierOption };

/** Step 2 — "اختر المقاسات": a size per chosen piece, then the whole composition goes to the bag (no look discount). */
export function SizesSheet({
  open,
  onClose,
  rows,
  look,
}: {
  open: boolean;
  onClose: () => void;
  rows: Row[];
  look: LookMatch | null;
}) {
  const { mounted, visible } = usePresence(open, 500);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const cart = useCart();
  const money = useMoney();

  const [variants, setVariants] = useState<Record<number, VariantData[]> | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">("idle");
  const [picked, setPicked] = useState<Record<string, number>>({}); // option key -> variant id
  const [showErrors, setShowErrors] = useState(false);

  useModal({ open, onClose, containerRef: panelRef });

  const productIds = useMemo(() => [...new Set(rows.map((r) => r.option.productId))], [rows]);

  const fetchVariants = useCallback(() => {
    if (!productIds.length) return;
    setLoadState("loading");
    loadVariants(productIds)
      .then((v) => {
        setVariants((prev) => ({ ...(prev ?? {}), ...v }));
        setLoadState("idle");
      })
      .catch(() => setLoadState("error"));
  }, [productIds]);

  const haveAll = !!variants && productIds.every((id) => variants[id]);

  useEffect(() => {
    if (open && !haveAll && loadState !== "loading" && loadState !== "error") fetchVariants();
  }, [open, haveAll, loadState, fetchVariants]);

  useEffect(() => {
    if (!open) setShowErrors(false);
  }, [open]);

  const table = useMemo(
    () =>
      rows.map((r) => {
        const all = variants?.[r.option.productId] ?? [];
        const forColor = r.option.color ? all.filter((v) => v.color === r.option.color) : all;
        const options = sortSizes(forColor.length ? forColor : all);
        return { ...r, options, inStock: options.filter((v) => v.stock > 0) };
      }),
    [rows, variants],
  );

  // One-size pieces (ties) are picked automatically
  useEffect(() => {
    if (!haveAll) return;
    setPicked((prev) => {
      const next = { ...prev };
      for (const r of table) {
        if (next[r.option.key] == null && r.options.length === 1 && r.inStock.length === 1) next[r.option.key] = r.inStock[0].id;
      }
      return next;
    });
  }, [haveAll, table]);

  const unavailable = haveAll ? table.filter((r) => r.inStock.length === 0) : [];
  const missing = table.filter((r) => picked[r.option.key] == null);
  const priceOf = (r: (typeof table)[number]) => r.options.find((v) => v.id === picked[r.option.key])?.price ?? r.option.price;
  const total = table.reduce((s, r) => s + priceOf(r), 0);

  const submit = () => {
    if (!haveAll) return;
    const available = table.filter((r) => r.inStock.length > 0);
    const missingAvailable = available.filter((r) => picked[r.option.key] == null);
    if (missingAvailable.length || !available.length) {
      setShowErrors(true);
      document.getElementById(`${titleId}-row-${missingAvailable[0]?.slot}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const lines: NewCartLine[] = available.map((r) => {
      const v = r.options.find((o) => o.id === picked[r.option.key])!;
      return {
        variantId: v.id,
        productId: r.option.productId,
        slug: r.option.slug,
        name: r.option.name,
        color: v.color,
        colorHex: v.colorHex,
        size: v.size,
        unitPrice: v.price,
        compareAtPrice: r.option.compareAtPrice,
        imageId: r.option.image?.id ?? null,
        imageBlur: r.option.image?.blur,
        maxQuantity: v.stock,
        quantity: 1,
        lookId: null,
      };
    });
    onClose();
    cart.addMany(lines);
  };

  if (!mounted) return null;
  const addable = table.filter((r) => !haveAll || r.inStock.length > 0).length;

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
            "relative flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-2xl bg-ivory shadow-2xl outline-none transition-all duration-500 ease-[var(--ease-out-expo)] md:max-h-[86vh] md:max-w-2xl md:rounded-2xl",
            visible ? "translate-y-0 md:scale-100 md:opacity-100" : "translate-y-full md:translate-y-4 md:scale-[0.98] md:opacity-0",
          )}
        >
          <div className="border-b border-line px-5 pb-4 pt-3 md:px-8 md:pt-7">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-sand md:hidden" aria-hidden />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-[0.7rem]">Step 02 · The Fitting</p>
                <h2 id={titleId} className="display mt-1.5 text-2xl text-espresso md:text-3xl">
                  اختر المقاسات
                </h2>
                <p className="mt-1 text-sm text-taupe">مقاس لكل قطعة، وطقمك جاهز للحقيبة.</p>
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

          <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto overscroll-contain px-5 md:px-8">
            {table.map((r) => {
              const err = showErrors && picked[r.option.key] == null && r.inStock.length > 0;
              return (
                <li key={r.slot} id={`${titleId}-row-${r.slot}`} className="flex gap-4 py-5">
                  <div className="studio-frame aspect-[4/5] w-[4.5rem] shrink-0 overflow-hidden rounded-md md:w-20">
                    <MediaImage media={r.option.image} sizes="96px" className="h-full w-full" alt="" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[0.7rem] tracking-wide text-taupe">{SLOT_META[r.slot].label}</p>
                        <p className="text-[0.95rem] font-medium leading-6 text-espresso">{r.option.name}</p>
                        {r.option.color && (
                          <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-taupe">
                            {r.option.colorHex && <span className="size-2.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: r.option.colorHex }} aria-hidden />}
                            {r.option.color}
                          </p>
                        )}
                      </div>
                      <Price amount={priceOf(r)} className="shrink-0 text-sm text-umber" />
                    </div>

                    <fieldset className="mt-3">
                      <legend className="sr-only">مقاس {r.option.name}</legend>
                      {!haveAll ? (
                        loadState === "error" ? null : (
                          <div className="flex gap-1.5" aria-hidden>
                            {[0, 1, 2, 3].map((k) => (
                              <span key={k} className="skeleton h-10 w-12 rounded-full" />
                            ))}
                          </div>
                        )
                      ) : r.inStock.length === 0 ? (
                        <p className="text-xs text-danger">نفدت هذه القطعة بهذا اللون — لن تُضاف للحقيبة.</p>
                      ) : r.options.length === 1 && !r.options[0].size ? (
                        <p className="text-xs text-taupe">مقاس واحد يناسب الجميع</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {r.options.map((v) => {
                            const sel = picked[r.option.key] === v.id;
                            const out = v.stock <= 0;
                            return (
                              <label
                                key={v.id}
                                className={cn(
                                  "relative grid h-11 min-w-12 cursor-pointer place-items-center rounded-full border px-3 text-sm tabular-nums transition-colors duration-200",
                                  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-copper/40",
                                  sel ? "border-espresso bg-espresso text-paper" : "border-line bg-paper text-espresso hover:border-espresso/60",
                                  out && "cursor-not-allowed border-dashed text-mist line-through hover:border-line",
                                )}
                              >
                                <input
                                  type="radio"
                                  className="sr-only"
                                  name={`${titleId}-size-${r.slot}`}
                                  value={v.id}
                                  checked={sel}
                                  disabled={out}
                                  onChange={() => setPicked((p) => ({ ...p, [r.option.key]: v.id }))}
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
                          اختر مقاس {r.option.name}
                        </p>
                      )}
                    </fieldset>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-line bg-paper px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 md:px-8 md:pb-7">
            {look && look.discountPercent > 0 && (
              <Link
                href={`/looks/${look.slug}`}
                className="group mb-4 flex items-center gap-3 rounded-xl bg-copper/10 px-4 py-3 text-sm text-copper-deep"
              >
                <Sparkles className="size-4 shrink-0" aria-hidden />
                <span className="flex-1">
                  تنسيقك يطابق «{look.title}» — اطلبها كإطلالة واحصل على خصم {look.discountPercent}%.
                </span>
                <ArrowLeft className="size-4 shrink-0 transition-transform duration-500 group-hover:-translate-x-1" aria-hidden />
              </Link>
            )}
            {loadState === "error" && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-danger/8 px-4 py-3 text-sm text-danger">
                <span className="inline-flex items-center gap-2">
                  <CircleAlert className="size-4" aria-hidden />
                  تعذّر تحميل المقاسات.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLoadState("idle");
                  }}
                  className="min-h-11 font-medium underline underline-offset-4"
                >
                  أعد المحاولة
                </button>
              </div>
            )}
            {unavailable.length > 0 && unavailable.length < table.length && (
              <p className="mb-3 text-xs leading-6 text-taupe">سنضيف القطع المتوفرة فقط ({addable} من {table.length}).</p>
            )}
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-taupe">مجموع التنسيق ({table.length} {table.length > 2 && table.length < 11 ? "قطع" : "قطعة"})</p>
                <p className="display mt-1 text-2xl tabular-nums text-espresso">{money(total)}</p>
              </div>
              {missing.length > 0 && haveAll && (
                <p className="text-xs text-taupe" id={`${titleId}-hint`}>
                  باقي {missing.length} {missing.length === 1 ? "مقاس" : "مقاسات"}
                </p>
              )}
            </div>
            <Button
              size="lg"
              className="mt-4 w-full"
              onClick={submit}
              disabled={!haveAll || unavailable.length === table.length}
              aria-describedby={missing.length ? `${titleId}-hint` : undefined}
            >
              {!haveAll && loadState === "loading" ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <ShoppingBag className="size-[1.1rem]" strokeWidth={1.6} aria-hidden />
              )}
              أضف التنسيق إلى الحقيبة
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
