/** Confirmation skeleton: centred hero + receipt and side cards. */
export default function OrderLoading() {
  return (
    <div className="pb-20" role="status" aria-live="polite">
      <span className="sr-only">جارٍ تحميل تفاصيل الطلب…</span>
      <div className="container-luxe flex flex-col items-center pt-16 text-center">
        <div className="skeleton size-24 rounded-full" />
        <div className="skeleton mt-8 h-3 w-36 rounded-full" />
        <div className="skeleton mt-5 h-12 w-64 rounded-full" />
        <div className="skeleton mt-5 h-4 w-80 max-w-full rounded-full" />
        <div className="skeleton mt-8 h-12 w-72 rounded-full" />
      </div>
      <div className="container-luxe mt-16 grid gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="skeleton h-96 rounded-2xl lg:col-span-7" />
        <div className="space-y-6 lg:col-span-5">
          <div className="skeleton h-72 rounded-2xl" />
          <div className="skeleton h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
