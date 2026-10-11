"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Heart } from "lucide-react";
import { useWishlist } from "@/components/store/cart/cart-provider";
import { ProductCard, ProductCardSkeleton } from "@/components/store/product-card";
import type { ProductCardData } from "@/lib/catalog";

const GRID = "grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 md:gap-y-14 lg:grid-cols-4";

/** Wishlist ids live in localStorage; cards are fetched from /api/products in the saved order. */
export function WishlistView({ picks }: { picks: ProductCardData[] }) {
  const wishlist = useWishlist();
  const [items, setItems] = useState<ProductCardData[] | null>(null);
  const [failed, setFailed] = useState(false);
  const idsKey = wishlist.ids.join(",");

  useEffect(() => {
    if (!wishlist.hydrated) return;
    if (!idsKey) {
      setItems([]);
      return;
    }
    // Only refetch when a new id appears (removals are filtered locally).
    if (items && idsKey.split(",").every((id) => items.some((p) => String(p.id) === id))) return;
    const ctrl = new AbortController();
    setFailed(false);
    fetch(`/api/products?ids=${idsKey}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { items?: ProductCardData[] }) => setItems(d.items ?? []))
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setFailed(true);
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wishlist.hydrated, idsKey]);

  const visible = useMemo(() => {
    if (!items) return null;
    const order = new Map(wishlist.ids.map((id, i) => [id, i]));
    return items.filter((p) => order.has(p.id)).sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  }, [items, wishlist.ids]);

  const loading = !wishlist.hydrated || (wishlist.ids.length > 0 && visible === null && !failed);

  return (
    <div className="container-luxe pb-24 pt-8 md:pt-12">
      {loading ? (
        <div className={GRID} role="status" aria-live="polite">
          <span className="sr-only">جارٍ تحميل المفضلة…</span>
          {Array.from({ length: Math.max(2, Math.min(8, wishlist.ids.length || 4)) }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : failed ? (
        <div className="mx-auto max-w-md py-16 text-center">
          <p className="display text-2xl text-espresso">تعذّر تحميل قائمتك الآن</p>
          <p className="mt-3 text-sm leading-7 text-umber">قطعك محفوظة بأمان على جهازك — تحقق من الاتصال وحاول مرة ثانية.</p>
          <button
            type="button"
            onClick={() => {
              setItems(null);
              setFailed(false);
              window.location.reload();
            }}
            className="mt-6 inline-flex h-12 items-center rounded-full bg-espresso px-7 text-sm font-medium text-paper hover:bg-cocoa"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : visible && visible.length > 0 ? (
        <>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-taupe" aria-live="polite">
              <span className="font-medium tabular-nums text-espresso">{visible.length}</span> {visible.length === 1 ? "قطعة محفوظة" : visible.length === 2 ? "قطعتان محفوظتان" : visible.length <= 10 ? "قطع محفوظة" : "قطعة محفوظة"}
            </p>
            <Link href="/shop" className="group inline-flex min-h-11 items-center gap-2 text-sm font-medium text-espresso">
              <span className="link-luxe pb-0.5">أكمل التسوّق</span>
              <ArrowLeft className="size-4 transition-transform duration-500 group-hover:-translate-x-1" aria-hidden />
            </Link>
          </div>
          <ul className={GRID}>
            {visible.map((p, i) => (
              <li key={p.id}>
                <ProductCard product={p} priority={i < 2} sizes="(min-width: 1024px) 23vw, (min-width: 768px) 31vw, 46vw" />
              </li>
            ))}
          </ul>
          <p className="mt-14 text-center text-xs text-taupe">اضغط على ♡ مرة ثانية لإزالة أي قطعة من القائمة.</p>
        </>
      ) : (
        <EmptyWishlist picks={picks} />
      )}
    </div>
  );
}

function EmptyWishlist({ picks }: { picks: ProductCardData[] }) {
  return (
    <div>
      <div className="mx-auto flex max-w-lg flex-col items-center py-6 text-center md:py-10">
        <div className="studio-frame relative grid size-28 place-items-center rounded-full">
          <Heart className="size-10 text-copper" strokeWidth={1.1} aria-hidden />
          <span className="absolute -end-1 top-3 size-2 rounded-full bg-gold" aria-hidden />
        </div>
        <h2 className="display mt-8 text-[1.75rem] text-espresso md:text-4xl">قائمتك فاضية… للحين</h2>
        <p className="mt-4 text-[0.95rem] leading-8 text-umber text-pretty">
          اضغط على <Heart className="inline size-4 -translate-y-px text-copper" strokeWidth={1.6} aria-label="القلب" /> فوق أي قطعة تعجبك، ونحفظها لك هنا لين ترجع لها وتقرر.
        </p>
        <Link
          href="/shop"
          className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-espresso px-8 text-[0.95rem] font-medium text-paper transition-colors hover:bg-cocoa"
        >
          اكتشف المجموعة
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
      </div>

      {picks.length > 0 && (
        <section aria-labelledby="wish-picks" className="mt-16 border-t border-line pt-14">
          <p className="eyebrow text-center">Start Here</p>
          <h3 id="wish-picks" className="display mt-3 text-center text-2xl text-espresso md:text-3xl">
            قطع تستاهل مكانها في قائمتك
          </h3>
          <ul className={`${GRID} mt-10`}>
            {picks.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} sizes="(min-width: 1024px) 23vw, (min-width: 768px) 31vw, 46vw" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
