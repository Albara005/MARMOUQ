import { ProductCard } from "@/components/store/product-card";
import type { ProductCardData } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/** Peeking horizontal rail on phones, 4-up grid from tablet. */
export function ProductRail({ items, className }: { items: ProductCardData[]; className?: string }) {
  return (
    <ul
      className={cn(
        "no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-x-6 md:gap-y-12 md:overflow-visible md:px-0",
        className,
      )}
    >
      {items.map((p) => (
        <li key={p.id} className="w-[64%] shrink-0 snap-start sm:w-[42%] md:w-auto">
          <ProductCard product={p} sizes="(min-width: 768px) 23vw, 64vw" />
        </li>
      ))}
    </ul>
  );
}
