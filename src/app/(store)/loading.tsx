import { ProductCardSkeleton } from "@/components/store/product-card";

/** Generic storefront skeleton: masthead + product grid in the studio proportions. */
export default function StoreLoading() {
  return (
    <div className="container-luxe pb-24 pt-8 md:pt-12" role="status" aria-live="polite">
      <span className="sr-only">جارٍ التحميل…</span>
      <div className="skeleton h-3 w-28 rounded-full" />
      <div className="skeleton mt-5 h-10 w-2/3 max-w-md rounded-full md:h-14" />
      <div className="skeleton mt-4 h-4 w-1/2 max-w-sm rounded-full" />
      <div className="mt-10 h-px bg-line" />
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ProductCardSkeleton key={i} className={i > 3 ? "hidden md:flex" : undefined} />
        ))}
      </div>
    </div>
  );
}
