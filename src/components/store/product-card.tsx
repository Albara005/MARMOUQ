"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Check, Heart, LoaderCircle, Plus } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { Price } from "@/components/store/store-provider";
import { useCart, useWishlist } from "@/components/store/cart/cart-provider";
import { getVariantsForProducts } from "@/app/(store)/actions";
import type { ProductCardData, ProductImage, VariantData } from "@/lib/catalog";
import { percentOff } from "@/lib/money";
import { cn } from "@/lib/utils";
import { imagesForColor } from "@/lib/product-images";

/* ───────────── Shared helpers (also used by the look dialog) ───────────── */

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];

export function sortSizes<T extends { size: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a.size.toUpperCase());
    const ib = SIZE_ORDER.indexOf(b.size.toUpperCase());
    if (ia !== -1 && ib !== -1) return ia - ib;
    const na = Number(a.size);
    const nb = Number(b.size);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return 0;
  });
}

const variantCache = new Map<number, Promise<VariantData[]>>();

/** Fetches (and memoises per page session) active variants for products. */
export async function loadVariants(productIds: number[]): Promise<Record<number, VariantData[]>> {
  const missing = productIds.filter((id) => !variantCache.has(id));
  if (missing.length) {
    const batch = getVariantsForProducts(missing);
    for (const id of missing) {
      variantCache.set(
        id,
        batch.then((r) => r[id] ?? []),
      );
    }
    batch.catch(() => missing.forEach((id) => variantCache.delete(id)));
  }
  const entries = await Promise.all(productIds.map(async (id) => [id, await variantCache.get(id)!] as const));
  return Object.fromEntries(entries);
}

/** Images for a colour: tagged ones, else untagged, else everything. */
export { imagesForColor };

function coverAndHover(images: ProductImage[], color?: string | null): [ProductImage | null, ProductImage | null] {
  const list = imagesForColor(images, color);
  const cover = list[0] ?? null;
  if (!cover) return [null, null];
  if (color) return [cover, list[1] ?? null];
  const sibling = list.slice(1).find((i) => !i.color || i.color === cover.color) ?? list[1] ?? null;
  return [cover, sibling];
}

/* ───────────── Card ───────────── */

export function ProductCard({
  product,
  color,
  priority,
  sizes = "(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 70vw",
  className,
}: {
  product: ProductCardData;
  color?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  const [active, setActive] = useState<string | null>(color ?? null);
  const wishlist = useWishlist();
  const saved = wishlist.has(product.id);

  const [cover, hover] = useMemo(() => coverAndHover(product.images, active), [product.images, active]);
  const href = active ? `/product/${product.slug}?color=${encodeURIComponent(active)}` : `/product/${product.slug}`;
  const off = percentOff(product.price, product.compareAtPrice);
  const soldOut = !product.inStock;

  const badges: { label: string; tone: "dark" | "copper" | "light" }[] = [];
  if (soldOut) badges.push({ label: "نفدت الكمية", tone: "dark" });
  else {
    if (off > 0) badges.push({ label: `-${off}%`, tone: "copper" });
    if (product.isNew) badges.push({ label: "جديد", tone: "light" });
    if (product.badge && !badges.some((b) => b.label === product.badge)) badges.push({ label: product.badge, tone: "light" });
  }

  const visibleColors = product.colors.slice(0, 4);
  const extraColors = product.colors.length - visibleColors.length;
  const activeColorName = active ?? (cover?.color || null);

  return (
    <article className={cn("group/card relative flex flex-col", className)}>
      <div className="studio-frame relative aspect-[4/5] w-full">
        <Link href={href} tabIndex={-1} aria-hidden className="absolute inset-0 block">
          <MediaImage
            media={cover}
            sizes={sizes}
            priority={priority}
            className={cn(
              "h-full w-full transition-transform duration-[1600ms] ease-[var(--ease-out-expo)] group-hover/card:scale-[1.035]",
              soldOut && "opacity-75 saturate-[0.6]",
            )}
            alt={cover?.alt || product.name}
          />
          {hover && (
            <div className="absolute inset-0 opacity-0 transition-opacity duration-700 ease-[var(--ease-luxe)] [@media(hover:hover)]:group-hover/card:opacity-100">
              <MediaImage media={hover} sizes={sizes} className="h-full w-full" alt="" />
            </div>
          )}
        </Link>

        {badges.length > 0 && (
          <div className="pointer-events-none absolute start-3 top-3 flex flex-col items-start gap-1.5">
            {badges.slice(0, 2).map((b) => (
              <span
                key={b.label}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[0.68rem] font-medium leading-none tracking-wide",
                  b.tone === "dark" && "bg-espresso text-paper",
                  b.tone === "copper" && "bg-copper text-paper",
                  b.tone === "light" && "bg-paper/90 text-espresso backdrop-blur-sm",
                )}
              >
                {b.label}
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => wishlist.toggle(product.id)}
          aria-pressed={saved}
          aria-label={saved ? `إزالة ${product.name} من المفضلة` : `حفظ ${product.name} في المفضلة`}
          className={cn(
            "absolute end-2 top-2 grid size-11 place-items-center rounded-full transition-all duration-300",
            "bg-paper/0 text-espresso hover:bg-paper/85 hover:backdrop-blur-sm",
            saved && "text-copper",
          )}
        >
          <span className="grid size-8 place-items-center rounded-full bg-paper/80 backdrop-blur-sm transition-transform duration-300 active:scale-90">
            <Heart className={cn("size-[1.05rem]", saved && "fill-current")} strokeWidth={1.6} aria-hidden />
          </span>
        </button>

        {!soldOut &&
          (product.setParts ? (
            <span className="pointer-events-none absolute inset-x-3 bottom-3 hidden translate-y-2 rounded-xl bg-paper/92 px-3 py-2.5 text-center text-[0.78rem] font-medium text-espresso opacity-0 shadow-[0_10px_30px_-12px_rgba(28,19,15,0.35)] backdrop-blur-md transition-all duration-500 ease-[var(--ease-out-expo)] group-hover/card:translate-y-0 group-hover/card:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:block">
              طقم · اختر مقاس {product.setParts.map((p) => p.label).join(" و")}
            </span>
          ) : (
            <QuickAdd product={product} color={activeColorName} />
          ))}
      </div>

      <div className="mt-3.5 flex flex-1 flex-col gap-1 md:mt-4">
        <h3 className="text-[0.95rem] font-medium leading-6 text-espresso">
          <Link href={href} className="line-clamp-1 decoration-copper/60 underline-offset-4 hover:underline">
            {product.name}
          </Link>
        </h3>
        {product.subtitle && <p className="line-clamp-1 text-[0.8rem] text-taupe">{product.subtitle}</p>}
        <Price amount={product.price} compareAt={product.compareAtPrice} className="mt-0.5 text-[0.92rem] text-umber" />

        {visibleColors.length > 1 && (
          <div className="-ms-1.5 mt-1 flex items-center" role="group" aria-label="الألوان المتاحة">
            {visibleColors.map((c) => {
              const isActive = activeColorName === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setActive(c.name)}
                  onMouseEnter={() => setActive(c.name)}
                  aria-label={`اللون: ${c.name}`}
                  aria-pressed={isActive}
                  title={c.name}
                  className="grid size-7 place-items-center rounded-full"
                >
                  <span
                    className={cn(
                      "block size-3.5 rounded-full ring-1 ring-black/10 transition-shadow duration-300",
                      isActive && "shadow-[0_0_0_2px_var(--color-ivory),0_0_0_3px_var(--color-espresso)]",
                    )}
                    style={{ backgroundColor: c.hex }}
                  />
                </button>
              );
            })}
            {extraColors > 0 && (
              <Link href={href} className="ms-1 text-xs tabular-nums text-taupe hover:text-espresso" aria-label={`و${extraColors} ألوان أخرى`}>
                +{extraColors}
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

/* ───────────── Desktop quick-add (hover devices only) ───────────── */

function QuickAdd({ product, color }: { product: ProductCardData; color: string | null }) {
  const cart = useCart();
  const [variants, setVariants] = useState<VariantData[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [addedId, setAddedId] = useState<number | null>(null);

  const ensure = useCallback(() => {
    if (variants || state === "loading") return;
    setState("loading");
    loadVariants([product.id])
      .then((r) => {
        setVariants(r[product.id] ?? []);
        setState("idle");
      })
      .catch(() => setState("error"));
  }, [product.id, variants, state]);

  const options = useMemo(() => {
    if (!variants) return [];
    const forColor = color ? variants.filter((v) => v.color === color) : variants;
    const list = forColor.length ? forColor : variants;
    // one entry per size (first match wins when no colour is chosen)
    const bySize = new Map<string, VariantData>();
    for (const v of list) if (!bySize.has(v.size)) bySize.set(v.size, v);
    return sortSizes([...bySize.values()]);
  }, [variants, color]);

  const add = (v: VariantData) => {
    const img = imagesForColor(product.images, v.color)[0] ?? product.images[0];
    cart.add({
      variantId: v.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      color: v.color,
      colorHex: v.colorHex,
      size: v.size,
      unitPrice: v.price,
      compareAtPrice: product.compareAtPrice,
      imageId: img?.id ?? null,
      imageBlur: img?.blur,
      maxQuantity: v.stock,
      lookId: null,
    });
    setAddedId(v.id);
    window.setTimeout(() => setAddedId(null), 1600);
  };

  const single = options.length === 1 ? options[0] : null;

  return (
    <div
      className="absolute inset-x-3 bottom-3 hidden translate-y-2 opacity-0 transition-all duration-500 ease-[var(--ease-out-expo)] group-hover/card:translate-y-0 group-hover/card:opacity-100 focus-within:translate-y-0 focus-within:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:block"
      onMouseEnter={ensure}
      onFocus={ensure}
    >
      <div className="rounded-xl bg-paper/92 p-2.5 shadow-[0_10px_30px_-12px_rgba(28,19,15,0.35)] backdrop-blur-md">
        {state === "loading" && !variants ? (
          <div className="flex h-9 items-center justify-center text-taupe">
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            <span className="sr-only">جارٍ تحميل المقاسات</span>
          </div>
        ) : state === "error" ? (
          <button type="button" onClick={() => { setState("idle"); ensure(); }} className="h-9 w-full text-xs text-danger">
            تعذّر التحميل — أعد المحاولة
          </button>
        ) : !variants ? (
          <button type="button" onClick={ensure} className="flex h-9 w-full items-center justify-center gap-1.5 text-[0.8rem] font-medium text-espresso">
            <Plus className="size-3.5" aria-hidden />
            إضافة سريعة
          </button>
        ) : options.length === 0 ? (
          <p className="flex h-9 items-center justify-center text-xs text-taupe">غير متوفر حالياً</p>
        ) : single ? (
          <button
            type="button"
            disabled={single.stock <= 0}
            onClick={() => add(single)}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-[0.8rem] font-medium text-espresso transition-colors hover:bg-espresso hover:text-paper disabled:text-mist"
          >
            {addedId === single.id ? <Check className="size-3.5" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
            {single.stock <= 0 ? "نفدت الكمية" : addedId === single.id ? "أُضيفت إلى السلة" : single.size ? `أضف إلى السلة · ${single.size}` : "أضف إلى السلة"}
          </button>
        ) : (
          <div>
            <p className="mb-1.5 text-center text-[0.68rem] text-taupe">اختر المقاس للإضافة</p>
            <div className="flex flex-wrap justify-center gap-1">
              {options.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  disabled={v.stock <= 0}
                  onClick={() => add(v)}
                  aria-label={`أضف المقاس ${v.size}${v.stock <= 0 ? " (نفد)" : ""}`}
                  className={cn(
                    "h-8 min-w-10 rounded-full px-2.5 text-xs font-medium tabular-nums transition-colors duration-200",
                    v.stock <= 0 ? "text-mist line-through" : "text-espresso hover:bg-espresso hover:text-paper",
                    addedId === v.id && "bg-espresso text-paper",
                  )}
                >
                  {addedId === v.id ? <Check className="mx-auto size-3.5" aria-hidden /> : v.size}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Skeleton matching the card's proportions (for loading.tsx files). */
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col", className)} aria-hidden>
      <div className="skeleton aspect-[4/5] w-full" />
      <div className="skeleton mt-4 h-4 w-3/4 rounded-full" />
      <div className="skeleton mt-2 h-3 w-1/2 rounded-full" />
      <div className="skeleton mt-2.5 h-4 w-1/3 rounded-full" />
    </div>
  );
}
