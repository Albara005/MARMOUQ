import { ProductCardSkeleton } from "@/components/store/product-card";

/** Shop skeleton: masthead, filter rail and the 4:5 product grid. */
export default function ShopLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">جارٍ تحميل القطع…</span>
      <div className="container-luxe pb-10 pt-8 md:pb-14 md:pt-12">
        <div className="skeleton h-3 w-32 rounded-full" />
        <div className="skeleton mt-6 h-3 w-24 rounded-full" />
        <div className="skeleton mt-4 h-11 w-1/2 max-w-sm rounded-full md:h-14" />
        <div className="skeleton mt-5 h-4 w-3/4 max-w-xl rounded-full" />
      </div>
      <div className="container-luxe">
        <div className="h-px bg-line" />
      </div>
      <div className="container-luxe flex gap-2 pt-5 lg:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-11 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="container-luxe grid grid-cols-2 gap-2 pt-4 lg:hidden">
        <div className="skeleton h-11 rounded-full" />
        <div className="skeleton h-11 rounded-full" />
      </div>
      <div className="container-luxe pb-24 pt-6 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 lg:pt-10 xl:gap-16">
        <div className="hidden space-y-8 lg:block">
          {[5, 4, 4].map((n, s) => (
            <div key={s} className="space-y-3 border-b border-line pb-6">
              <div className="skeleton h-3 w-16 rounded-full" />
              {Array.from({ length: n }).map((_, i) => (
                <div key={i} className="skeleton h-4 rounded-full" style={{ width: `${55 + ((i * 17) % 35)}%` }} />
              ))}
            </div>
          ))}
        </div>
        <div>
          <div className="hidden items-center justify-between border-b border-line pb-5 lg:flex">
            <div className="skeleton h-4 w-40 rounded-full" />
            <div className="skeleton h-11 w-48 rounded-full" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 md:gap-y-14 lg:mt-8 min-[85rem]:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} className={i > 3 ? "hidden md:flex" : undefined} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
