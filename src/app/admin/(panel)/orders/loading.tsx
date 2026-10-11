import { Skeleton } from "@/components/admin/ui";

export default function OrdersLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">جارٍ تحميل الطلبات…</span>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-40 rounded-xl" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
      <div className="rounded-2xl border border-line bg-paper">
        <div className="flex gap-4 overflow-hidden border-b border-line px-6 py-3.5">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-20 shrink-0" />
          ))}
        </div>
        <div className="flex flex-col gap-3 border-b border-line px-6 py-4 lg:flex-row">
          <Skeleton className="h-10 w-full rounded-full lg:w-80" />
          <Skeleton className="h-10 w-full rounded-full lg:ms-auto lg:w-96" />
        </div>
        <div className="divide-y divide-line/70">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="flex items-center gap-6 px-6 py-4">
              <Skeleton className="h-4 w-24" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-40 max-w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="hidden h-4 w-20 md:block" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
