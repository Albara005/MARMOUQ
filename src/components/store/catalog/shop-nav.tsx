"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Portal, useModal, usePresence } from "@/components/store/overlay";
import { SORT_OPTIONS } from "@/components/store/catalog/params";
import { cn } from "@/lib/utils";

/* ───────────── Transition context: filters update in place, results dim while loading ───────────── */

type ShopNav = { pending: boolean; navigate: (href: string) => void };
const ShopNavContext = createContext<ShopNav | null>(null);

export function ShopNavProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate = useCallback(
    (href: string) => {
      startTransition(() => router.push(href, { scroll: false }));
    },
    [router],
  );
  const value = useMemo(() => ({ pending, navigate }), [pending, navigate]);
  return <ShopNavContext.Provider value={value}>{children}</ShopNavContext.Provider>;
}

function useShopNav(): ShopNav {
  const ctx = useContext(ShopNavContext);
  // Outside the provider fall back to plain navigation semantics.
  return ctx ?? { pending: false, navigate: (href: string) => window.location.assign(href) };
}

/** A real link (works without JS, prefetches) that updates the results in a transition. */
export function ShopLink({
  href,
  className,
  children,
  onNavigate,
  ...rest
}: Omit<React.ComponentProps<typeof Link>, "href" | "onNavigate"> & { href: string; onNavigate?: () => void }) {
  const { navigate } = useShopNav();
  return (
    <Link
      href={href}
      scroll={false}
      className={className}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(href);
        onNavigate?.();
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}

/**
 * Wraps the results: dims them while a filter transition is pending and,
 * when the filters change while the shopper is scrolled deep, brings the results top back into view.
 */
export function ResultsVeil({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useShopNav();
  const ref = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const filtersKey = useMemo(() => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("page");
    return sp.toString();
  }, [searchParams]);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top < 0) window.scrollTo({ top: window.scrollY + top - 140, behavior: "smooth" });
  }, [filtersKey]);

  return (
    <div ref={ref} className={cn("relative scroll-mt-40", className)} aria-busy={pending || undefined}>
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 -top-px z-10 h-px origin-right overflow-hidden",
          pending ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      >
        <div className={cn("h-full w-1/3 bg-copper", pending && "animate-[shop-progress_1.1s_var(--ease-luxe)_infinite]")} />
      </div>
      <div className={cn("transition-opacity duration-500", pending && "pointer-events-none opacity-45")}>{children}</div>
      <style>{"@keyframes shop-progress{from{transform:translateX(100%)}to{transform:translateX(-300%)}}"}</style>
    </div>
  );
}

/* ───────────── Sort select (native picker on phones) ───────────── */

export function SortSelect({ base, hidden, value, compact }: { base: string; hidden: Record<string, string>; value: string; compact?: boolean }) {
  const { navigate } = useShopNav();
  return (
    <form
      action={base}
      method="get"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const sp = new URLSearchParams();
        for (const [k, v] of fd.entries()) if (typeof v === "string" && v && !(k === "sort" && v === "featured")) sp.set(k, v);
        const qs = sp.toString();
        navigate(qs ? `${base}?${qs}` : base);
      }}
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label className="sr-only" htmlFor={compact ? "sort-compact" : "sort-wide"}>
        ترتيب القطع
      </label>
      <span className={cn("pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-xs text-taupe", compact && "hidden")} aria-hidden>
        ترتيب:
      </span>
      <select
        id={compact ? "sort-compact" : "sort-wide"}
        name="sort"
        defaultValue={value}
        key={value}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={cn(
          "h-11 cursor-pointer appearance-none rounded-full border border-line bg-paper text-sm font-medium text-espresso outline-none transition-colors hover:border-espresso/40 focus-visible:border-copper",
          "bg-[url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%231c130f' stroke-width='2'><path d='m6 9 6 6 6-6'/></svg>\")] bg-[length:12px] bg-[position:left_1rem_center] bg-no-repeat",
          compact ? "w-full ps-4 pe-9" : "ps-16 pe-10",
        )}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="ms-2 text-sm underline">
          تطبيق
        </button>
      </noscript>
    </form>
  );
}

/* ───────────── Price range form ───────────── */

export function PriceForm({
  base,
  hidden,
  min,
  max,
  placeholderMin,
  placeholderMax,
  idPrefix,
}: {
  base: string;
  hidden: Record<string, string>;
  min: number | null;
  max: number | null;
  placeholderMin: number;
  placeholderMax: number;
  idPrefix: string;
}) {
  const { navigate } = useShopNav();
  const [error, setError] = useState("");
  return (
    <form
      action={base}
      method="get"
      noValidate
      className="mt-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const lo = Number(String(fd.get("min") ?? "").replace(/[^\d]/g, "")) || 0;
        const hi = Number(String(fd.get("max") ?? "").replace(/[^\d]/g, "")) || 0;
        if (lo && hi && lo > hi) {
          setError("الحد الأدنى أكبر من الأعلى — عدّل الأرقام");
          return;
        }
        setError("");
        const sp = new URLSearchParams();
        for (const [k, v] of Object.entries(hidden)) if (v) sp.set(k, v);
        if (lo) sp.set("min", String(lo));
        if (hi) sp.set("max", String(hi));
        const qs = sp.toString();
        navigate(qs ? `${base}?${qs}` : base);
      }}
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={`${idPrefix}-min`} className="mb-1 block text-[0.7rem] text-taupe">
            من
          </label>
          <input
            id={`${idPrefix}-min`}
            name="min"
            inputMode="numeric"
            defaultValue={min ?? ""}
            key={`min-${min}`}
            placeholder={placeholderMin.toLocaleString("en-US")}
            className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm tabular-nums text-espresso outline-none placeholder:text-mist focus:border-copper"
          />
        </div>
        <span className="pb-3 text-taupe" aria-hidden>
          —
        </span>
        <div className="min-w-0 flex-1">
          <label htmlFor={`${idPrefix}-max`} className="mb-1 block text-[0.7rem] text-taupe">
            إلى
          </label>
          <input
            id={`${idPrefix}-max`}
            name="max"
            inputMode="numeric"
            defaultValue={max ?? ""}
            key={`max-${max}`}
            placeholder={placeholderMax.toLocaleString("en-US")}
            className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm tabular-nums text-espresso outline-none placeholder:text-mist focus:border-copper"
          />
        </div>
        <button
          type="submit"
          className="h-11 shrink-0 rounded-full bg-espresso px-4 text-sm font-medium text-paper transition-colors hover:bg-cocoa"
        >
          تطبيق
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

/* ───────────── Mobile filter bottom-sheet ───────────── */

export function FilterSheet({
  activeCount,
  resultLabel,
  clearHref,
  children,
}: {
  activeCount: number;
  resultLabel: string;
  clearHref: string | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { mounted, visible } = usePresence(open, 450);
  const panelRef = useRef<HTMLDivElement>(null);
  const { pending } = useShopNav();
  const close = useCallback(() => setOpen(false), []);
  useModal({ open, onClose: close, containerRef: panelRef });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-espresso px-5 text-sm font-medium text-paper transition-colors hover:bg-cocoa"
      >
        <SlidersHorizontal className="size-4" strokeWidth={1.6} aria-hidden />
        التصفية
        {activeCount > 0 && (
          <span className="grid size-5 place-items-center rounded-full bg-copper text-[0.7rem] tabular-nums text-paper">{activeCount}</span>
        )}
      </button>

      {mounted && (
        <Portal>
          <div className="fixed inset-0 z-[60] lg:hidden">
            <div
              className={cn("absolute inset-0 bg-espresso/45 backdrop-blur-[2px] transition-opacity duration-500", visible ? "opacity-100" : "opacity-0")}
              onClick={close}
              aria-hidden
            />
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="filter-sheet-title"
              tabIndex={-1}
              className={cn(
                "absolute inset-x-0 bottom-0 flex max-h-[88svh] flex-col rounded-t-3xl bg-ivory shadow-[0_-24px_60px_-20px_rgba(28,19,15,0.45)] outline-none transition-transform duration-500 ease-[var(--ease-out-expo)]",
                visible ? "translate-y-0" : "translate-y-full",
              )}
            >
              <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-sand" aria-hidden />
              <div className="flex items-center justify-between border-b border-line px-5 pb-3 pt-2">
                <h2 id="filter-sheet-title" className="display text-xl text-espresso">
                  تصفية القطع
                </h2>
                <div className="flex items-center gap-1">
                  {clearHref && (
                    <ShopLink href={clearHref} className="min-h-11 px-2 py-3 text-sm text-taupe underline-offset-4 hover:text-espresso hover:underline">
                      مسح الكل
                    </ShopLink>
                  )}
                  <button type="button" onClick={close} className="grid size-11 place-items-center rounded-full text-espresso hover:bg-bone" aria-label="إغلاق">
                    <X className="size-5" strokeWidth={1.6} aria-hidden />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6">{children}</div>
              <div className="border-t border-line bg-paper px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                <button
                  type="button"
                  onClick={close}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-espresso text-[0.95rem] font-medium text-paper transition-colors hover:bg-cocoa"
                >
                  {pending ? "جارٍ التحديث…" : `عرض ${resultLabel}`}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
