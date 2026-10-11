"use client";

import { useEffect, useState } from "react";
import { SectionHeading } from "@/components/store/section-heading";
import { ProductCard } from "@/components/store/product-card";
import type { ProductCardData } from "@/lib/catalog";

const KEY = "marmouq.recent.v1";
const MAX = 12;

function read(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    return list.filter((n): n is number => typeof n === "number" && Number.isInteger(n) && n > 0);
  } catch {
    return [];
  }
}

/** Records the current product and shows the shopper's other recent pieces (this device only). */
export function RecentlyViewed({ currentId }: { currentId: number }) {
  const [items, setItems] = useState<ProductCardData[]>([]);

  useEffect(() => {
    const prev = read();
    const others = prev.filter((id) => id !== currentId).slice(0, MAX - 1);
    try {
      localStorage.setItem(KEY, JSON.stringify([currentId, ...others]));
    } catch {
      /* private mode */
    }
    const show = others.slice(0, 4);
    if (!show.length) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    fetch(`/api/products?ids=${show.join(",")}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items?: ProductCardData[] }) => setItems(d.items ?? []))
      .catch(() => {});
    return () => ctrl.abort();
  }, [currentId]);

  if (!items.length) return null;

  const clear = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify([currentId]));
    } catch {
      /* ignore */
    }
    setItems([]);
  };

  return (
    <section aria-labelledby="recently-viewed" className="container-luxe border-t border-line py-16 md:py-20">
      <div className="flex items-end justify-between gap-6">
        <SectionHeading eyebrow="Recently Viewed" title="شاهدتها مؤخراً" id="recently-viewed" />
        <button type="button" onClick={clear} className="mb-1 min-h-11 shrink-0 text-sm text-taupe underline-offset-4 hover:text-espresso hover:underline">
          مسح السجل
        </button>
      </div>
      <ul className="no-scrollbar -mx-5 mt-10 flex snap-x gap-3 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:px-0">
        {items.map((p) => (
          <li key={p.id} className="w-[44%] shrink-0 snap-start md:w-auto">
            <ProductCard product={p} sizes="(min-width: 768px) 23vw, 44vw" />
          </li>
        ))}
      </ul>
    </section>
  );
}
