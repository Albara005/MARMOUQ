"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Heart, HandCoins, RefreshCcw, ShoppingBag, Truck } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { useMoney, useStoreConfig } from "@/components/store/store-provider";
import { useCart, useWishlist } from "@/components/store/cart/cart-provider";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import { sortSizes } from "@/components/store/product-card";
import { ProductGallery } from "@/components/store/product/gallery";
import { SizeGuide, type SizeGuideEntry } from "@/components/store/product/size-guide";
import { AddonsPicker, resolveAddon, type AddonChoice } from "@/components/store/product/addons-picker";
import { findGuide, formatSetSize, isSetProduct, setSizeKey, splitSetSize, type SizeGuideDef } from "@/lib/size-guides";
import type { ProductDetail, ProductImage, VariantData } from "@/lib/catalog";
import { percentOff } from "@/lib/money";
import { cn, whatsappLink } from "@/lib/utils";

/** Photos for a colourway: that colour's tagged shots plus untagged ones; everything as a last resort. */
function galleryFor(images: ProductImage[], color: string | null): ProductImage[] {
  if (!color) return images;
  const list = images.filter((i) => !i.color || i.color === color);
  return list.length ? list : images;
}

function isLightHex(hex: string): boolean {
  const m = hex.replace("#", "");
  if (m.length < 6) return false;
  const [r, g, b] = [0, 2, 4].map((o) => parseInt(m.slice(o, o + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 170;
}

function urgency(stock: number): string | null {
  if (stock === 1) return "آخر قطعة في هذا المقاس";
  if (stock === 2) return "آخر قطعتين في هذا المقاس";
  return null;
}

/**
 * The buying experience: gallery + sticky info panel share the selected colourway.
 * Colour is mirrored to ?color= (replaceState) so links and refreshes keep the choice.
 */
export function ProductExperience({
  product,
  initialColor,
  details,
  sizeGuides = [],
}: {
  product: ProductDetail;
  initialColor: string | null;
  /** size guide tables from settings */
  sizeGuides?: SizeGuideDef[];
  /** Server-rendered accordions (description, materials, care, shipping) */
  details: React.ReactNode;
}) {
  const config = useStoreConfig();
  const money = useMoney();
  const cart = useCart();
  const wishlist = useWishlist();
  const saved = wishlist.has(product.id);

  const stockByColor = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of product.variants) m.set(v.color, (m.get(v.color) ?? 0) + Math.max(0, v.stock));
    return m;
  }, [product.variants]);

  const defaultColor = useMemo(() => {
    if (initialColor && product.colors.some((c) => c.name === initialColor)) return initialColor;
    return product.colors.find((c) => (stockByColor.get(c.name) ?? 0) > 0)?.name ?? product.colors[0]?.name ?? null;
  }, [initialColor, product.colors, stockByColor]);

  const [color, setColor] = useState<string | null>(defaultColor);
  const variantsForColor = useMemo(
    () => (color ? product.variants.filter((v) => v.color === color) : product.variants),
    [product.variants, color],
  );
  const sizeOptions = useMemo(() => {
    const bySize = new Map<string, VariantData>();
    for (const v of variantsForColor) if (!bySize.has(v.size)) bySize.set(v.size, v);
    return sortSizes([...bySize.values()]);
  }, [variantsForColor]);
  // Sets (shirt + trousers…): one size per piece; the variant size is "L / 32"
  const parts = isSetProduct(product.setParts) ? product.setParts : null;
  const [pieces, setPieces] = useState<(string | null)[]>(() => (parts ? parts.map(() => null) : []));
  const needsSize = parts ? true : sizeOptions.some((v) => v.size !== "");

  const [size, setSize] = useState<string | null>(() => {
    const only = sizeOptions.filter((v) => v.stock > 0);
    return only.length === 1 && sizeOptions.length === 1 ? only[0].size : null;
  });
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  // Add-ons (watch, shoes…) ticked by the customer
  const [addonChoices, setAddonChoices] = useState<Record<number, AddonChoice>>({});
  const [addonMissing, setAddonMissing] = useState<number[]>([]);
  const chosenAddons = product.addons.filter((a) => addonChoices[a.id]?.on);
  const addonOff = product.addonDiscount;
  const addonPrice = (n: number) => (addonOff > 0 ? n - Math.round((n * addonOff) / 100) : n);
  // the discount covers one add-on per unit of this product
  const addonsTotal = chosenAddons.reduce((sum, a) => sum + addonPrice(resolveAddon(a, addonChoices[a.id])?.price ?? a.price), 0);
  const setAddon = (id: number, next: AddonChoice) => {
    setAddonChoices((prev) => ({ ...prev, [id]: next }));
    setAddonMissing((prev) => prev.filter((x) => x !== id));
  };
  const [added, setAdded] = useState(false);

  const variant: VariantData | null = parts
    ? pieces.every(Boolean)
      ? (variantsForColor.find((v) => v.size === setSizeKey(pieces as string[])) ?? null)
      : null
    : needsSize
      ? (sizeOptions.find((v) => v.size === size) ?? null)
      : (variantsForColor.find((v) => v.stock > 0) ?? variantsForColor[0] ?? null);
  /** What the customer chose, for labels ("القميص L · البنطلون 32" for sets) */
  const sizeLabel = parts ? (variant ? formatSetSize(parts, variant.size) : null) : size;
  const missingPieces = parts ? parts.filter((_, i) => !pieces[i]).map((p) => p.label) : [];
  const guideEntries: SizeGuideEntry[] = parts
    ? parts.flatMap((p, i) => {
        const guide = findGuide(sizeGuides, p.guide);
        return guide ? [{ label: p.label, guide, selected: pieces[i] }] : [];
      })
    : (() => {
        const guide = findGuide(sizeGuides, product.sizeGuide);
        return guide ? [{ label: "", guide, selected: size }] : [];
      })();

  /** Piece i can take `value` when an in-stock variant matches it and the other chosen pieces. */
  /**
   * "ok": in stock with the other chosen pieces · "out": only with other sizes (still clickable —
   * picking it clears the clashing choice) · "sold": no stock at all · "missing": not offered.
   */
  const pieceState = (i: number, value: string): "ok" | "out" | "sold" | "missing" => {
    if (!parts) return "missing";
    let exists = false;
    let anyStock = false;
    for (const v of variantsForColor) {
      const vals = splitSetSize(v.size, parts.length);
      if (vals[i] !== value) continue;
      exists = true;
      if (v.stock <= 0) continue;
      anyStock = true;
      if (pieces.every((p, k) => k === i || !p || vals[k] === p)) return "ok";
    }
    return !exists ? "missing" : anyStock ? "out" : "sold";
  };
  const choosePiece = (i: number, value: string) => {
    setError("");
    setPieces((prev) => {
      const next = prev.map((p, k) => (k === i ? value : p));
      // drop other choices that no longer combine with this one in stock
      return next.map((p, k) => {
        if (k === i || !p || !parts) return p;
        const ok = variantsForColor.some((v) => {
          const vals = splitSetSize(v.size, parts.length);
          return v.stock > 0 && vals[i] === value && vals[k] === p;
        });
        return ok ? p : null;
      });
    });
  };

  const colorStock = color ? (stockByColor.get(color) ?? 0) : product.totalStock;
  const soldOut = !product.inStock || colorStock <= 0;
  const maxQty = Math.max(1, Math.min(20, variant?.stock ?? 1));
  const price = variant?.price ?? product.price;
  const off = percentOff(price, product.compareAtPrice);
  const images = useMemo(() => galleryFor(product.images, color), [product.images, color]);
  const thumb = images[0] ?? null;
  const lowStock = variant && variant.stock > 0 ? urgency(variant.stock) : null;

  // Keep quantity within the stock of the chosen variant.
  useEffect(() => {
    setQty((q) => Math.min(q, maxQty));
  }, [maxQty]);

  const chooseColor = (name: string) => {
    setColor(name);
    setError("");
    // keep the size if it is available in the new colour
    if (size) {
      const v = product.variants.find((x) => x.color === name && x.size === size);
      if (!v || v.stock <= 0) setSize(null);
    }
    if (parts && pieces.every(Boolean)) {
      const v = product.variants.find((x) => x.color === name && x.size === setSizeKey(pieces as string[]));
      if (!v || v.stock <= 0) setPieces(parts.map(() => null));
    }
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("color", name);
      window.history.replaceState(window.history.state, "", url);
    } catch {
      /* ignore */
    }
  };

  const sizeRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  const addToCart = useCallback(() => {
    if (soldOut) return;
    if (needsSize && !variant) {
      setError(parts ? (missingPieces.length ? `اختر مقاس ${missingPieces.join(" و")} أولاً` : "هذا التركيب غير متوفر حالياً — جرّب مقاساً آخر") : "اختر مقاسك أولاً");
      sizeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      (sizeRef.current?.querySelector("button:not([disabled])") as HTMLButtonElement | null)?.focus({ preventScroll: true });
      return;
    }
    if (!variant || variant.stock <= 0) {
      setError("هذا الخيار غير متوفر حالياً");
      return;
    }
    const missingAddons = chosenAddons.filter((a) => !resolveAddon(a, addonChoices[a.id])).map((a) => a.id);
    if (missingAddons.length) {
      setAddonMissing(missingAddons);
      setError("اختر مقاس الإضافات اللي حدّدتها");
      document.getElementById("addons-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setError("");
    const addonLines = chosenAddons.map((a) => {
      const v = resolveAddon(a, addonChoices[a.id])!;
      const img = (v.color ? a.images.find((i) => i.color === v.color) : null) ?? a.images[0];
      return {
        variantId: v.id,
        productId: a.id,
        slug: a.slug,
        name: a.name,
        color: v.color,
        colorHex: v.colorHex,
        size: v.size,
        unitPrice: v.price,
        compareAtPrice: a.compareAtPrice,
        imageId: img?.id ?? null,
        imageBlur: img?.blur,
        maxQuantity: v.stock,
        lookId: null,
        addonOf: product.id,
        addonOfName: product.name,
        addonDiscountPercent: addonOff,
        quantity: 1,
      };
    });
    cart.addMany([{
      variantId: variant.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      color: variant.color,
      colorHex: variant.colorHex,
      size: parts ? formatSetSize(parts, variant.size) : variant.size,
      unitPrice: variant.price,
      compareAtPrice: product.compareAtPrice,
      imageId: thumb?.id ?? null,
      imageBlur: thumb?.blur,
      maxQuantity: variant.stock,
      lookId: null,
      quantity: qty,
    }, ...addonLines]);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  }, [soldOut, needsSize, variant, cart, product, thumb, qty, parts, missingPieces, chosenAddons, addonChoices]);

  // Mobile sticky bar: visible once the main CTA has scrolled above the viewport.
  const [showBar, setShowBar] = useState(false);
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setShowBar(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const productUrl = () => {
    try {
      const u = new URL(`/product/${product.slug}`, window.location.origin);
      if (color) u.searchParams.set("color", color);
      return u.toString();
    } catch {
      return `/product/${product.slug}`;
    }
  };

  const orderOnWhatsApp = () => {
    const lines = [
      "مرحباً مرموق 👋 حاب أطلب:",
      `• ${product.name}`,
      color ? `• اللون: ${color}` : null,
      sizeLabel ? `• المقاس: ${sizeLabel}` : needsSize ? "• المقاس: (ساعدوني أختار)" : null,
      `• الكمية: ${qty}`,
      `• السعر: ${money(price * qty)}`,
      productUrl(),
    ].filter(Boolean);
    window.open(whatsappLink(config.whatsapp, lines.join("\n")), "_blank", "noopener,noreferrer");
  };

  const helpHref = config.whatsapp
    ? whatsappLink(config.whatsapp, `مرحباً مرموق، أحتاج مساعدة في اختيار مقاس ${product.name}. طولي: … ووزني: …`)
    : config.instagram || null;

  const badges: string[] = [];
  if (product.badge) badges.push(product.badge);
  if (product.isNew && product.badge !== "جديد") badges.push("جديد");

  const ctaLabel = soldOut ? "نفدت الكمية" : added ? "أُضيفت إلى السلة" : "أضف إلى السلة";

  return (
    <>
      <div className="mx-auto w-full max-w-[1440px] md:grid md:grid-cols-2 md:items-start md:gap-8 md:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-14 xl:grid-cols-[minmax(0,1fr)_minmax(0,29rem)] xl:gap-20">
        <div className="min-w-0 md:sticky md:top-24 lg:top-28">
          <ProductGallery images={images} productName={product.name} saved={saved} onToggleSave={() => wishlist.toggle(product.id)} />
        </div>

        <div className="min-w-0 px-5 pt-7 md:px-0 md:pt-0 lg:sticky lg:top-28">
          {(badges.length > 0 || off > 0) && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {off > 0 && <span className="rounded-full bg-copper px-2.5 py-1 text-[0.7rem] font-medium leading-none text-paper">-{off}%</span>}
              {badges.map((b) => (
                <span key={b} className="rounded-full border border-line bg-paper px-2.5 py-1 text-[0.7rem] font-medium leading-none text-espresso">
                  {b}
                </span>
              ))}
            </div>
          )}
          {product.categoryName && product.categorySlug && (
            <Link href={`/shop/${product.categorySlug}`} className="link-luxe text-xs tracking-wide text-taupe hover:text-espresso">
              {product.categoryName}
            </Link>
          )}
          <h1 className="display mt-2 text-[1.85rem] leading-[1.3] text-espresso text-balance md:text-[2.35rem]">{product.name}</h1>
          {product.subtitle && <p className="mt-2 text-[0.95rem] leading-7 text-umber">{product.subtitle}</p>}

          <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-2xl font-medium tabular-nums text-espresso">{money(price)}</span>
            {off > 0 && product.compareAtPrice && (
              <>
                <s className="text-base tabular-nums text-mist">{money(product.compareAtPrice)}</s>
                <span className="text-sm text-copper-deep">وفّر {money(product.compareAtPrice - price)}</span>
              </>
            )}
          </div>
          <p className="mt-1.5 text-xs text-taupe">السعر نهائي · ادفع نقداً عند الاستلام</p>

          <div className="mt-7 border-t border-line pt-6">
            {/* Colour */}
            {product.colors.length > 0 && (
              <fieldset>
                <legend className="flex w-full items-baseline justify-between text-sm">
                  <span className="text-taupe">
                    اللون: <span className="font-medium text-espresso">{color}</span>
                  </span>
                  {product.colors.length > 1 && <span className="text-xs text-mist">{product.colors.length === 2 ? "لونان" : `${product.colors.length} ألوان`}</span>}
                </legend>
                <div className="-ms-1.5 mt-3 flex flex-wrap gap-1" role="radiogroup" aria-label="اختر اللون">
                  {product.colors.map((c) => {
                    const active = c.name === color;
                    const out = (stockByColor.get(c.name) ?? 0) <= 0;
                    return (
                      <button
                        key={c.name}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={`${c.name}${out ? " — نفد" : ""}`}
                        title={c.name}
                        onClick={() => chooseColor(c.name)}
                        className="group grid size-12 place-items-center rounded-full"
                      >
                        <span
                          className={cn(
                            "relative grid size-9 place-items-center overflow-hidden rounded-full ring-1 ring-black/10 transition-shadow duration-300",
                            active
                              ? "shadow-[0_0_0_3px_var(--color-ivory),0_0_0_4px_var(--color-espresso)]"
                              : "group-hover:shadow-[0_0_0_3px_var(--color-ivory),0_0_0_4px_var(--color-sand)]",
                            out && "opacity-50",
                          )}
                          style={{ backgroundColor: c.hex }}
                        >
                          {out && <span className="absolute h-px w-[140%] rotate-45 bg-paper" aria-hidden />}
                          {active && !out && <Check className={cn("size-3.5", isLightHex(c.hex) ? "text-espresso" : "text-paper")} strokeWidth={2.2} aria-hidden />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {/* Size */}
            {needsSize && (
              <div ref={sizeRef} className="mt-6 scroll-mt-32">
                <div className="flex items-center justify-between">
                  <p id="size-label" className="text-sm text-taupe">
                    {parts ? "المقاسات — اختر مقاس كل قطعة" : <>المقاس{size ? <>: <span className="font-medium text-espresso">{size}</span></> : null}</>}
                  </p>
                  {guideEntries.length > 0 && <SizeGuide entries={guideEntries} helpHref={helpHref} helpLabel={config.whatsapp ? "اسألنا على واتساب" : "راسلنا على إنستغرام"} />}
                </div>
                {parts ? (
                  <div className="mt-3 space-y-4">
                    {parts.map((part, i) => (
                      <div key={`${part.label}-${i}`}>
                        <p id={`piece-label-${i}`} className="mb-2 text-[0.82rem] text-umber">
                          {part.label}
                          {pieces[i] ? (
                            <>
                              : <span className="font-medium tabular-nums text-espresso">{pieces[i]}</span>
                            </>
                          ) : null}
                        </p>
                        <div role="radiogroup" aria-labelledby={`piece-label-${i}`} aria-invalid={(!!error && !pieces[i]) || undefined} className="grid grid-cols-[repeat(auto-fill,minmax(3.75rem,1fr))] gap-2">
                          {part.sizes.map((value) => {
                            const st = pieceState(i, value);
                            if (st === "missing") return null;
                            const active = pieces[i] === value;
                            const out = st === "out" || st === "sold";
                            return (
                              <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                disabled={st === "sold" && !active}
                                aria-label={`مقاس ${part.label} ${value}${st === "sold" ? " — نفد" : out ? " — متوفر مع مقاس آخر" : ""}`}
                                onClick={() => choosePiece(i, value)}
                                className={cn(
                                  "relative h-12 rounded-xl border text-sm font-medium tabular-nums transition-[background-color,border-color,color] duration-300",
                                  active
                                    ? "border-espresso bg-espresso text-paper"
                                    : out
                                      ? "cursor-not-allowed border-line bg-transparent text-mist [background-image:linear-gradient(to_top_left,transparent_calc(50%-0.5px),var(--color-sand)_50%,transparent_calc(50%+0.5px))]"
                                      : "border-line bg-paper text-espresso hover:border-espresso/60",
                                )}
                              >
                                {value}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                <div
                  role="radiogroup"
                  aria-labelledby="size-label"
                  aria-invalid={!!error || undefined}
                  className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(3.75rem,1fr))] gap-2"
                >
                  {sizeOptions.map((v) => {
                    const active = v.size === size;
                    const out = v.stock <= 0;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={out}
                        aria-label={`المقاس ${v.size}${out ? " — نفد" : v.stock <= 2 ? " — كمية محدودة" : ""}`}
                        onClick={() => {
                          setSize(v.size);
                          setError("");
                        }}
                        className={cn(
                          "relative h-12 rounded-xl border text-sm font-medium tabular-nums transition-[background-color,border-color,color] duration-300",
                          active
                            ? "border-espresso bg-espresso text-paper"
                            : out
                              ? "cursor-not-allowed border-line bg-transparent text-mist [background-image:linear-gradient(to_top_left,transparent_calc(50%-0.5px),var(--color-sand)_50%,transparent_calc(50%+0.5px))]"
                              : "border-line bg-paper text-espresso hover:border-espresso/60",
                        )}
                      >
                        {v.size}
                        {!out && v.stock <= 2 && (
                          <span className={cn("absolute end-1.5 top-1.5 size-1.5 rounded-full", active ? "bg-copper-soft" : "bg-copper")} aria-hidden />
                        )}
                      </button>
                    );
                  })}
                </div>
                )}
                <div className="mt-2 min-h-6 text-[0.8rem]" aria-live="polite">
                  {error ? (
                    <p role="alert" className="text-danger">
                      {error}
                    </p>
                  ) : lowStock ? (
                    <p className="inline-flex items-center gap-2 text-copper-deep">
                      <span className="relative flex size-2">
                        <span className="absolute inset-0 animate-ping rounded-full bg-copper/60" />
                        <span className="relative size-2 rounded-full bg-copper" />
                      </span>
                      {lowStock} — اطلبها قبل أن تنفد
                    </p>
                  ) : variant && variant.stock > 2 ? (
                    <p className="inline-flex items-center gap-1.5 text-success">
                      <span className="size-1.5 rounded-full bg-success" aria-hidden />
                      متوفر وجاهز للشحن
                    </p>
                  ) : null}
                </div>
              </div>
            )}
            {!needsSize && !soldOut && variant && (
              <p className="mt-4 text-[0.8rem]" aria-live="polite">
                {urgency(variant.stock) ? (
                  <span className="text-copper-deep">{variant.stock === 1 ? "آخر قطعة متوفرة" : "آخر قطعتين متوفرتين"} — اطلبها قبل أن تنفد</span>
                ) : (
                  <span className="text-success">متوفر وجاهز للشحن</span>
                )}
              </p>
            )}
            {!needsSize && error && (
              <p role="alert" className="mt-2 text-[0.8rem] text-danger">
                {error}
              </p>
            )}

            <AddonsPicker
              addons={product.addons}
              choices={addonChoices}
              onChange={setAddon}
              title={config.copy["product.addonsTitle"] ?? "أكمل إطلالتك"}
              hint={config.copy["product.addonsHint"] ?? ""}
              missing={addonMissing}
              discountPercent={addonOff}
            />
            {chosenAddons.length > 0 && (
              <p className="mt-4 flex items-baseline justify-between text-sm text-umber" aria-live="polite">
                <span>
                  المجموع مع {chosenAddons.length === 1 ? "الإضافة" : `${chosenAddons.length} إضافات`}
                </span>
                <span className="font-semibold tabular-nums text-espresso">{money(price * qty + addonsTotal)}</span>
              </p>
            )}
            {addonMissing.length > 0 && error && (
              <p role="alert" className="mt-2 text-[0.8rem] text-danger">
                {error}
              </p>
            )}

            {/* Quantity + add */}
            <div ref={ctaRef} className="mt-5 flex items-stretch gap-2.5">
              {!soldOut && <QuantityStepper value={qty} onChange={setQty} max={maxQty} className="h-14 shrink-0" />}
              <button
                type="button"
                onClick={addToCart}
                disabled={soldOut}
                className={cn(
                  "relative flex h-14 min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden rounded-full text-[0.98rem] font-medium tracking-wide transition-colors duration-300",
                  soldOut ? "cursor-not-allowed bg-sand text-taupe" : added ? "bg-success text-paper" : "bg-espresso text-paper hover:bg-cocoa",
                )}
              >
                {added ? <Check className="size-5" aria-hidden /> : <ShoppingBag className="size-[1.15rem]" strokeWidth={1.6} aria-hidden />}
                <span className="truncate">{ctaLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => wishlist.toggle(product.id)}
                aria-pressed={saved}
                aria-label={saved ? "إزالة من المفضلة" : "حفظ في المفضلة"}
                className={cn(
                  "grid size-14 shrink-0 place-items-center rounded-full border transition-colors duration-300",
                  saved ? "border-copper/40 bg-copper/10 text-copper" : "border-line bg-paper text-espresso hover:border-espresso/50",
                )}
              >
                <Heart className={cn("size-5", saved && "fill-current")} strokeWidth={1.5} aria-hidden />
              </button>
            </div>

            {config.whatsapp ? (
              <button
                type="button"
                onClick={orderOnWhatsApp}
                className="mt-2.5 flex h-13 w-full items-center justify-center gap-2.5 rounded-full border border-espresso/80 py-3.5 text-[0.95rem] font-medium text-espresso transition-colors duration-300 hover:bg-espresso hover:text-paper"
              >
                <WhatsAppIcon size={19} className="text-[#25a35a]" />
                {soldOut ? "اسألنا متى ترجع" : "اطلب عبر واتساب"}
              </button>
            ) : config.instagram ? (
              <a
                href={config.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-[0.85rem] text-umber underline decoration-sand underline-offset-[6px] hover:text-espresso hover:decoration-copper"
              >
                <InstagramIcon size={16} />
                عندك سؤال عن القطعة؟ راسلنا على إنستغرام
              </a>
            ) : null}
          </div>

          <ul className="mt-7 grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-paper text-center">
            {[
              { icon: Truck, label: config.copy["product.trust1"] },
              { icon: HandCoins, label: config.copy["product.trust2"] },
              { icon: RefreshCcw, label: config.copy["product.trust3"] },
            ].filter((x) => x.label?.trim()).map(({ icon: Icon, label }) => (
              <li key={label} className="flex flex-col items-center gap-2 px-2 py-4">
                <Icon className="size-5 text-copper" strokeWidth={1.4} aria-hidden />
                <span className="text-[0.72rem] leading-5 text-umber">{label}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6">{details}</div>
        </div>
      </div>

      {/* Mobile sticky add-to-bag */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md transition-transform duration-500 ease-[var(--ease-out-expo)] lg:hidden",
          showBar ? "translate-y-0" : "pointer-events-none translate-y-full",
        )}
        aria-hidden={!showBar}
        inert={!showBar}
      >
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="studio-frame aspect-[4/5] w-11 shrink-0 overflow-hidden rounded-md">
            <MediaImage media={thumb} sizes="48px" className="h-full w-full" alt="" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.82rem] font-medium text-espresso">{product.name}</p>
            <p className="truncate text-xs text-taupe">
              <span className="tabular-nums text-umber">{money(price)}</span>
              {color ? ` · ${color}` : ""}
              {sizeLabel ? ` · ${sizeLabel}` : needsSize ? (parts ? " · اختر المقاسات" : " · اختر المقاس") : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={addToCart}
            disabled={soldOut}
            className={cn(
              "flex h-12 shrink-0 items-center gap-1.5 rounded-full px-5 text-sm font-medium transition-colors",
              soldOut ? "bg-sand text-taupe" : added ? "bg-success text-paper" : "bg-espresso text-paper",
            )}
          >
            {added ? <Check className="size-4" aria-hidden /> : <ShoppingBag className="size-4" strokeWidth={1.6} aria-hidden />}
            {soldOut ? "نفدت" : added ? "أُضيفت" : needsSize && !variant ? "اختر المقاس" : "أضف للسلة"}
          </button>
        </div>
      </div>
    </>
  );
}
