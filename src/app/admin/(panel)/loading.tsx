import { Skeleton } from "@/components/admin/ui";

/** Generic panel skeleton: page header, KPI row, a wide panel and a side panel. */
export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">جارٍ التحميل…</span>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-3 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-56 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-2xl border border-line bg-paper p-4 md:p-5">
            <div className="flex items-start justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="size-8 rounded-full" />
            </div>
            <Skeleton className="mt-3 h-7 w-28" />
            <Skeleton className="mt-2 h-3 w-24" />
            <Skeleton className="mt-4 h-8 w-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-line bg-paper p-5 md:p-6 xl:col-span-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-2 h-3 w-48" />
          <Skeleton className="mt-6 h-[240px] w-full rounded-xl" />
        </div>
        <div className="rounded-2xl border border-line bg-paper p-5 md:p-6">
          <Skeleton className="h-4 w-32" />
          <div className="mt-6 space-y-5">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
