/** Cart skeleton: masthead + rows + summary card. */
export default function CartLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">جارٍ تحميل السلة…</span>
      <div className="container-luxe pb-8 pt-8 md:pt-12">
        <div className="skeleton h-3 w-32 rounded-full" />
        <div className="skeleton mt-5 h-10 w-56 rounded-full md:h-14 md:w-80" />
        <div className="skeleton mt-4 h-4 w-3/4 max-w-lg rounded-full" />
      </div>
      <div className="container-luxe">
        <div className="h-px bg-line" />
      </div>
      <div className="container-luxe grid gap-10 pb-24 pt-10 lg:grid-cols-12 lg:gap-14">
        <div className="space-y-6 lg:col-span-8">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-4 border-b border-line pb-6">
              <div className="skeleton aspect-[4/5] w-24 shrink-0 rounded-lg md:w-28" />
              <div className="flex-1 space-y-3 pt-1">
                <div className="skeleton h-4 w-2/3 rounded-full" />
                <div className="skeleton h-3 w-1/3 rounded-full" />
                <div className="skeleton mt-6 h-10 w-28 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="skeleton h-80 rounded-2xl lg:col-span-4" />
      </div>
    </div>
  );
}
