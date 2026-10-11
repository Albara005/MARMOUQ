/** Product skeleton: gallery in the studio 4:5 frame beside the info panel. */
export default function ProductLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">جارٍ تحميل القطعة…</span>
      <div className="container-luxe py-5">
        <div className="skeleton h-3 w-56 rounded-full" />
      </div>
      <div className="mx-auto w-full max-w-[1440px] md:grid md:grid-cols-2 md:gap-8 md:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-14 xl:grid-cols-[minmax(0,1fr)_minmax(0,29rem)] xl:gap-20">
        <div className="lg:flex lg:gap-4">
          <div className="hidden w-[4.5rem] shrink-0 flex-col gap-3 lg:flex">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[4/5] w-full" />
            ))}
          </div>
          <div className="skeleton aspect-[4/5] w-full flex-1" />
        </div>
        <div className="px-5 pt-7 md:px-0 md:pt-0">
          <div className="skeleton h-5 w-24 rounded-full" />
          <div className="skeleton mt-5 h-9 w-4/5 rounded-full" />
          <div className="skeleton mt-3 h-4 w-3/5 rounded-full" />
          <div className="skeleton mt-6 h-7 w-32 rounded-full" />
          <div className="mt-8 h-px bg-line" />
          <div className="mt-6 flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton size-9 rounded-full" />
            ))}
          </div>
          <div className="mt-6 grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-12 rounded-xl" />
            ))}
          </div>
          <div className="skeleton mt-6 h-14 rounded-full" />
          <div className="skeleton mt-3 h-12 rounded-full" />
          <div className="skeleton mt-7 h-20 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
