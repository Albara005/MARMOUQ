/** Lookbook skeleton: masthead, then one spread (cover + story) in studio proportions. */
export default function LooksLoading() {
  return (
    <div className="bg-ivory pb-24" role="status" aria-live="polite">
      <span className="sr-only">نجهّز الإطلالات…</span>
      <div className="container-luxe pb-10 pt-8 md:pb-16 md:pt-14">
        <div className="skeleton h-3 w-40 rounded-full" />
        <div className="skeleton mt-5 h-12 w-3/4 max-w-xl rounded-full md:h-16" />
        <div className="skeleton mt-3 h-12 w-1/2 max-w-md rounded-full md:h-16" />
      </div>
      <div className="container-luxe grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="skeleton aspect-[4/5] rounded-sm lg:col-span-7" />
        <div className="lg:col-span-5 lg:pt-16">
          <div className="skeleton h-3 w-24 rounded-full" />
          <div className="skeleton mt-5 h-12 w-2/3 rounded-full" />
          <div className="skeleton mt-5 h-4 w-full rounded-full" />
          <div className="skeleton mt-3 h-4 w-5/6 rounded-full" />
          <div className="mt-8 grid grid-cols-5 gap-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[4/5] rounded-md" />
            ))}
          </div>
          <div className="skeleton mt-8 h-14 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
