/** Atelier skeleton: the table (stage) and the slot rail, in their final proportions. */
export default function AtelierLoading() {
  return (
    <div className="bg-ivory pb-28" role="status" aria-live="polite">
      <span className="sr-only">نرتّب القطع على الطاولة…</span>
      <div className="container-luxe pb-6 pt-6 md:pb-10 md:pt-12">
        <div className="skeleton h-3 w-36 rounded-full" />
        <div className="skeleton mt-4 h-11 w-60 rounded-full md:h-14 md:w-96" />
        <div className="skeleton mt-4 h-4 w-3/4 max-w-lg rounded-full" />
      </div>
      <div className="container-luxe grid gap-7 lg:grid-cols-12 lg:gap-12">
        <div className="skeleton aspect-[4/5] rounded-2xl lg:col-span-7 lg:aspect-[6/5]" />
        <div className="lg:col-span-5">
          <div className="hidden grid-cols-5 gap-2 lg:grid">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[4/6] rounded-xl" />
            ))}
          </div>
          <div className="skeleton mt-8 h-8 w-48 rounded-full" />
          <div className="mt-5 flex gap-3 overflow-hidden lg:grid lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[4/5] w-[40%] shrink-0 rounded-lg lg:w-auto" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
