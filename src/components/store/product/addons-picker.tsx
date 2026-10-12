"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import type { AddonProduct, VariantData } from "@/lib/catalog";
import { MediaImage } from "@/components/ui/media-image";
import { useMoney } from "@/components/store/store-provider";
import { sortSizes } from "@/components/store/product-card";
import { cn } from "@/lib/utils";

/** What the customer picked for one add-on. */
export type AddonChoice = { on: boolean; color: string | null; size: string | null };

const variantsFor = (a: AddonProduct, color: string | null) => (color ? a.variants.filter((v) => v.color === color) : a.variants);
const needsSize = (a: AddonProduct, color: string | null) => variantsFor(a, color).some((v) => v.size !== "");

/** Default choice when an add-on is ticked: first in-stock colour, size left to the customer. */
export function initialChoice(a: AddonProduct): AddonChoice {
  const color = a.colors.find((c) => a.variants.some((v) => v.color === c.name && v.stock > 0))?.name ?? a.colors[0]?.name ?? null;
  const list = variantsFor(a, color).filter((v) => v.stock > 0);
  const only = list.length === 1 ? list[0].size : null;
  return { on: true, color, size: only };
}

/** The purchasable variant for a choice (null = still needs a size, or out of stock). */
export function resolveAddon(a: AddonProduct, c: AddonChoice | undefined): VariantData | null {
  if (!c?.on) return null;
  const list = variantsFor(a, c.color);
  const v = needsSize(a, c.color) ? list.find((x) => x.size === c.size) : (list.find((x) => x.stock > 0) ?? list[0]);
  return v && v.stock > 0 ? v : null;
}

/** «أكمل إطلالتك»: tick extra pieces (watch, shoes…) to add them with the product. */
export function AddonsPicker({
  addons,
  choices,
  onChange,
  title,
  hint,
  missing,
  discountPercent = 0,
}: {
  addons: AddonProduct[];
  choices: Record<number, AddonChoice>;
  onChange: (id: number, next: AddonChoice) => void;
  title: string;
  hint: string;
  /** add-on ids that still need a size (highlighted) */
  missing: number[];
  /** % off each add-on bought with the product */
  discountPercent?: number;
}) {
  const money = useMoney();
  if (!addons.length) return null;

  return (
    <section aria-labelledby="addons-title" className="mt-7 border-t border-line pt-6">
      <h2 id="addons-title" className="text-sm font-medium text-espresso">
        {title}
      </h2>
      {hint && <p className="mt-1 text-[0.8rem] leading-6 text-taupe">{hint}</p>}
      {discountPercent > 0 && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-copper/10 px-3 py-1 text-[0.78rem] font-medium text-copper-deep">خصم {discountPercent}% على الإضافات مع هذا الطقم</p>
      )}
      <ul className="mt-4 space-y-2.5">
        {addons.map((a) => {
          const c = choices[a.id];
          const on = !!c?.on;
          const variant = resolveAddon(a, c);
          const price = variant?.price ?? a.price;
          const sizes = on ? sortSizes([...new Map(variantsFor(a, c?.color ?? null).map((v) => [v.size, v])).values()]).filter((v) => v.size !== "") : [];
          const cover = (c?.color ? a.images.find((i) => i.color === c.color) : null) ?? a.images[0] ?? null;
          return (
            <li key={a.id} className={cn("rounded-2xl border bg-paper transition-colors duration-300", on ? "border-espresso/70" : "border-line", missing.includes(a.id) && "border-danger/60")}>
              <div className="flex items-center gap-3 p-2.5 pe-3.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  aria-label={`${on ? "إزالة" : "إضافة"} ${a.name}`}
                  onClick={() => onChange(a.id, on ? { ...(c as AddonChoice), on: false } : c ? { ...c, on: true } : initialChoice(a))}
                  className="flex min-w-0 flex-1 items-center gap-3 text-start"
                >
                  <span className={cn("grid size-6 shrink-0 place-items-center rounded-md border transition-colors", on ? "border-espresso bg-espresso text-paper" : "border-sand bg-paper")} aria-hidden>
                    {on && <Check className="size-4" strokeWidth={2.4} />}
                  </span>
                  <span className="studio-frame aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-lg">
                    <MediaImage media={cover} sizes="56px" className="h-full w-full" alt="" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[0.9rem] text-espresso">{a.name}</span>
                    <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-[0.82rem] font-medium tabular-nums text-umber">
                      + {money(discountPercent > 0 ? price - Math.round((price * discountPercent) / 100) : price)}
                      {discountPercent > 0 && <s className="text-[0.75rem] font-normal text-mist">{money(price)}</s>}
                    </span>
                  </span>
                </button>
                <Link href={`/product/${a.slug}`} target="_blank" className="shrink-0 text-xs text-taupe underline-offset-4 hover:text-espresso hover:underline">
                  التفاصيل
                </Link>
              </div>

              {on && (a.colors.length > 1 || sizes.length > 0) && (
                <div className="space-y-3 border-t border-line px-3.5 pb-3.5 pt-3">
                  {a.colors.length > 1 && (
                    <div role="radiogroup" aria-label={`لون ${a.name}`} className="flex flex-wrap items-center gap-2">
                      {a.colors.map((col) => {
                        const active = c?.color === col.name;
                        const out = !a.variants.some((v) => v.color === col.name && v.stock > 0);
                        return (
                          <button
                            key={col.name}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            aria-label={`${col.name}${out ? " — نفد" : ""}`}
                            title={col.name}
                            disabled={out}
                            onClick={() => onChange(a.id, { on: true, color: col.name, size: null })}
                            className={cn("grid size-9 place-items-center rounded-full transition-shadow disabled:opacity-35", active ? "ring-2 ring-espresso ring-offset-2 ring-offset-paper" : "ring-1 ring-line")}
                          >
                            <span className="size-6 rounded-full ring-1 ring-black/10" style={{ background: col.hex }} aria-hidden />
                          </button>
                        );
                      })}
                      {c?.color && <span className="ms-1 text-xs text-taupe">{c.color}</span>}
                    </div>
                  )}
                  {sizes.length > 0 && (
                    <div role="radiogroup" aria-label={`مقاس ${a.name}`} className="flex flex-wrap gap-1.5">
                      {sizes.map((v) => {
                        const active = c?.size === v.size;
                        const out = v.stock <= 0;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            disabled={out}
                            onClick={() => onChange(a.id, { ...(c as AddonChoice), size: v.size })}
                            className={cn(
                              "h-10 min-w-12 rounded-lg border px-3 text-sm font-medium tabular-nums transition-colors",
                              active ? "border-espresso bg-espresso text-paper" : out ? "cursor-not-allowed border-line text-mist line-through" : "border-line bg-paper text-espresso hover:border-espresso/60",
                            )}
                          >
                            {v.size}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {missing.includes(a.id) && <p className="text-xs text-danger">اختر مقاس {a.name}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
