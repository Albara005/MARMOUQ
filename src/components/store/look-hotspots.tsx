"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { Price } from "@/components/store/store-provider";
import { imagesForColor } from "@/components/store/product-card";
import type { LookData, LookItemData } from "@/lib/catalog";
import { cn } from "@/lib/utils";

function itemHref(item: LookItemData) {
  return item.color ? `/product/${item.product.slug}?color=${encodeURIComponent(item.color)}` : `/product/${item.product.slug}`;
}

function MiniCard({ item, className, id }: { item: LookItemData; className?: string; id?: string }) {
  const img = imagesForColor(item.product.images, item.color)[0] ?? null;
  return (
    <div id={id} className={cn("flex items-center gap-3 rounded-xl bg-paper/95 p-2.5 shadow-[0_18px_40px_-18px_rgba(28,19,15,0.55)] backdrop-blur-md", className)}>
      <div className="studio-frame aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-md">
        <MediaImage media={img} sizes="80px" className="h-full w-full" alt="" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-medium text-espresso">{item.product.name}</p>
        {item.color && <p className="text-xs text-taupe">{item.color}</p>}
        <Price amount={item.product.price} className="mt-0.5 block text-[0.82rem] text-umber" />
      </div>
      <Link
        href={itemHref(item)}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-espresso text-paper transition-colors hover:bg-copper"
        aria-label={`عرض ${item.product.name}`}
      >
        <ArrowLeft className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

/**
 * Look cover with pulsing pins at each item's x/y (percent from the image's physical left/top edge).
 * Hover (desktop) or tap (touch) reveals a mini product card.
 */
export function LookHotspots({
  look,
  className,
  sizes = "(min-width: 1024px) 45vw, 100vw",
  priority,
}: {
  look: LookData;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const uid = useId();

  // Close on outside tap and on Escape
  useEffect(() => {
    if (active === null) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setActive(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [active]);

  const current = active !== null ? look.items[active] : null;

  return (
    <div ref={rootRef} className={cn("studio-frame relative aspect-[4/5] w-full", className)} onMouseLeave={() => setActive(null)}>
      <MediaImage media={look.cover} sizes={sizes} priority={priority} className="h-full w-full" alt={look.cover?.alt || look.title} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-espresso/35 via-transparent to-transparent" aria-hidden />

      {look.items.map((item, i) => {
        const x = Math.min(94, Math.max(6, item.x));
        const y = Math.min(92, Math.max(8, item.y));
        const isActive = active === i;
        const popId = `${uid}-pop-${i}`;
        // Physical positioning on purpose: coordinates are measured on the (un-mirrored) photo.
        const toLeft = x > 52;
        const above = y > 62;
        return (
          <div
            key={item.product.id}
            className={cn("absolute size-11 -translate-x-1/2 -translate-y-1/2", isActive && "z-10")}
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <button
              type="button"
              aria-expanded={isActive}
              aria-controls={popId}
              aria-label={`${item.product.name}${item.color ? ` — ${item.color}` : ""}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive((a) => (a === i ? null : i))}
              className="group/pin relative grid size-11 place-items-center rounded-full"
            >
              <span className={cn("absolute inset-1.5 rounded-full bg-paper/50", !isActive && "animate-ping [animation-duration:2.2s]")} aria-hidden />
              <span
                className={cn(
                  "relative grid size-7 place-items-center rounded-full border border-paper/80 shadow-[0_4px_14px_rgba(0,0,0,0.35)] transition-all duration-300",
                  isActive ? "scale-110 bg-espresso text-paper" : "bg-paper text-espresso group-hover/pin:scale-110",
                )}
                aria-hidden
              >
                <Plus className={cn("size-3.5 transition-transform duration-300", isActive && "rotate-45")} />
              </span>
            </button>

            {/* Desktop popover near the pin */}
            <div
              className={cn(
                "absolute z-10 hidden w-64 transition-all duration-300 ease-[var(--ease-out-expo)] md:block",
                isActive ? "visible translate-y-0 opacity-100" : "invisible translate-y-1 opacity-0",
              )}
              style={{
                ...(toLeft ? { right: "calc(100% + 6px)" } : { left: "calc(100% + 6px)" }),
                ...(above ? { bottom: 0 } : { top: 0 }),
              }}
            >
              <MiniCard item={item} id={popId} />
            </div>
          </div>
        );
      })}

      {/* Mobile: selected piece slides up as a strip at the bottom of the photo */}
      <div
        className={cn(
          "absolute inset-x-3 bottom-3 transition-all duration-400 ease-[var(--ease-out-expo)] md:hidden",
          current ? "visible translate-y-0 opacity-100" : "invisible translate-y-3 opacity-0",
        )}
        aria-live="polite"
      >
        {current && <MiniCard item={current} />}
      </div>

      {look.discountPercent > 0 && (
        <span className="pointer-events-none absolute start-3 top-3 rounded-full bg-paper/90 px-3 py-1.5 text-[0.7rem] font-medium tracking-wide text-espresso backdrop-blur-sm">
          وفّر {look.discountPercent}% على الإطلالة كاملة
        </span>
      )}
    </div>
  );
}
