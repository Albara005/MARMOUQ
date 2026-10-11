/**
 * MARMOUQ admin kit — every admin screen is built from these pieces so the back office reads as one product.
 * Server-safe (no hooks here); interactive pieces are re-exported from ./ui-client.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Info, Search, TrendingDown, TrendingUp, TriangleAlert, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_META, PAYMENT_STATUS_META } from "@/lib/order-status";
import { cn } from "@/lib/utils";

export {
  Toaster,
  toast,
  dismissToast,
  ToastOnMount,
  ActionForm,
  ActionFieldError,
  ActionFormError,
  SubmitButton,
  ConfirmSubmit,
  TopbarContext,
  useActionToast,
  useActionFormState,
  TOPBAR_SLOT_ID,
} from "./ui-client";
export type { ToastType, ToastOptions } from "./ui-client";
export { actionOk, actionError, zodFieldErrors, initialActionState } from "./action-result";
export type { ActionResult } from "./action-result";

/* ═══════════════════════════ Page header ═══════════════════════════ */

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  if (!items.length) return null;
  return (
    <nav aria-label="مسار التنقل" className={cn("mb-2", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-xs text-taupe">
        {items.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-1">
            {c.href ? (
              <Link href={c.href} className="rounded transition-colors hover:text-espresso">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-umber">
                {c.label}
              </span>
            )}
            {i < items.length - 1 && <ChevronLeft className="size-3.5 text-mist" aria-hidden />}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  eyebrow,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
  eyebrow?: string;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        {eyebrow && <p className="eyebrow mb-1.5 !text-[0.7rem]">{eyebrow}</p>}
        <h1 className="display text-[1.65rem] text-espresso md:text-[2rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-taupe">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/* ═══════════════════════════ Card ═══════════════════════════ */

export function Card({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  padded = true,
  footer,
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** false = content flush to the edges (tables, lists); a divider is drawn under the header */
  padded?: boolean;
  footer?: ReactNode;
  id?: string;
}) {
  const hasHeader = Boolean(title || description || actions);
  return (
    <section id={id} className={cn("min-w-0 rounded-2xl border border-line bg-paper shadow-[0_1px_2px_rgba(28,19,15,0.04)]", className)}>
      {hasHeader && (
        <div className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-4 md:px-6 md:pt-5", padded ? "pb-1" : "border-b border-line pb-4")}>
          <div className="min-w-0">
            {title && <h2 className="text-[0.98rem] font-semibold text-espresso">{title}</h2>}
            {description && <p className="mt-0.5 text-[0.8rem] leading-relaxed text-taupe">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {children !== undefined && <div className={cn(padded && "px-5 pb-5 pt-4 md:px-6 md:pb-6", !hasHeader && padded && "pt-5", bodyClassName)}>{children}</div>}
      {footer && <div className="border-t border-line px-5 py-3 md:px-6">{footer}</div>}
    </section>
  );
}

/* ═══════════════════════════ Stat card (KPI tile) ═══════════════════════════ */

/** Compact Arabic number for big values: 1.2 مليون / 450 ألف */
const COMPACT = new Intl.NumberFormat("ar-YE-u-nu-latn", { notation: "compact", maximumFractionDigits: 1 });
export function formatCompact(n: number): string {
  return COMPACT.format(n);
}

export function Delta({ value, invert = false, className, srSuffix = "مقارنة بالفترة السابقة" }: { value: number | null | undefined; invert?: boolean; className?: string; srSuffix?: string }) {
  if (value == null || !Number.isFinite(value)) {
    return <span className={cn("inline-flex items-center rounded-full bg-bone px-2 py-0.5 text-[0.72rem] font-medium text-taupe", className)}>جديد</span>;
  }
  const rounded = Math.round(value * 10) / 10;
  const flat = Math.abs(rounded) < 0.1;
  const up = rounded > 0;
  const good = flat ? null : invert ? !up : up;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.72rem] font-semibold",
        good === null ? "bg-bone text-taupe" : good ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
        className,
      )}
    >
      {!flat && <Icon className="size-3.5" aria-hidden />}
      <span className="sr-only">{flat ? "دون تغيير" : up ? "ارتفاع" : "انخفاض"}</span>
      <span dir="ltr" className="tabular-nums">
        {flat ? "0%" : `${Math.abs(rounded).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`}
      </span>
      <span className="sr-only">{srSuffix}</span>
    </span>
  );
}

/**
 * Sparkline: the trend in the recessive tone, the latest point in copper.
 * Values are plotted oldest → newest flowing in the reading direction (right → left in RTL).
 */
export function Sparkline({ values, className, label }: { values: number[]; className?: string; label?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const n = values.length;
  // RTL: index 0 (oldest) sits at the right edge (x=100), newest at the left (x=0)
  const pts = values.map((v, i) => [100 - (i / (n - 1)) * 100, 4 + (1 - (v - min) / span) * 24] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${line} L0,32 L100,32 Z`;
  const last = pts[n - 1];
  const prev = pts[n - 2];
  return (
    <div className={cn("relative h-8 w-full", className)} role="img" aria-label={label ?? "اتجاه الفترة"}>
      <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <path d={area} fill="var(--color-copper)" fillOpacity={0.07} />
        <path d={line} fill="none" stroke="#b9a99b" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        <path d={`M${prev[0]},${prev[1]} L${last[0]},${last[1]}`} fill="none" stroke="var(--color-copper)" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
      </svg>
      <span
        className="absolute size-2 -translate-y-1/2 rounded-full bg-copper ring-2 ring-paper"
        style={{ left: `calc(${last[0]}% - 4px)`, top: `${(last[1] / 32) * 100}%` }}
        aria-hidden
      />
    </div>
  );
}

export function StatCard({
  label,
  value,
  delta,
  invertDelta,
  hint,
  icon,
  spark,
  href,
  className,
}: {
  label: string;
  value: ReactNode;
  /** Percent change vs the previous period; null = no comparable data */
  delta?: number | null;
  /** true when "down" is the good direction (e.g. cancellations) */
  invertDelta?: boolean;
  hint?: ReactNode;
  icon?: ReactNode;
  spark?: number[];
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.82rem] font-medium text-taupe">{label}</p>
        {icon && <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bone text-copper-deep [&_svg]:size-4">{icon}</span>}
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <p className="text-[1.6rem] font-semibold leading-tight tracking-tight text-espresso md:text-[1.75rem]">{value}</p>
        {delta !== undefined && <Delta value={delta} invert={invertDelta} />}
      </div>
      {hint && <p className="mt-1 text-xs leading-5 text-taupe">{hint}</p>}
      {spark && spark.length > 1 && <Sparkline values={spark} className="mt-4" label={`اتجاه ${label}`} />}
    </>
  );
  const cls = cn(
    "group relative block min-w-0 rounded-2xl border border-line bg-paper p-4 shadow-[0_1px_2px_rgba(28,19,15,0.04)] md:p-5",
    href && "transition-[border-color,box-shadow] duration-300 hover:border-sand hover:shadow-[0_10px_30px_-20px_rgba(28,19,15,0.35)]",
    className,
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/* ═══════════════════════════ Empty state ═══════════════════════════ */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "px-4 py-8" : "px-6 py-14 md:py-20", className)}>
      {icon && (
        <span className="relative mb-4 grid size-14 place-items-center rounded-full bg-bone text-copper-deep ring-1 ring-line ring-offset-4 ring-offset-paper [&_svg]:size-6">
          {icon}
        </span>
      )}
      <p className={cn("display text-espresso", compact ? "text-base" : "text-lg")}>{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-taupe">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}

/* ═══════════════════════════ Table primitives ═══════════════════════════ */

/**
 * Responsive table. On phones it scrolls horizontally; from `lg` up the header sticks under the topbar.
 * Pass `maxHeight` to make the table scroll internally (the header then sticks inside it at every size).
 * Don't wrap it in an `overflow-hidden` parent or sticky headers stop working.
 */
export function Table({ children, className, maxHeight, minWidth = 640, caption }: { children: ReactNode; className?: string; maxHeight?: number | string; minWidth?: number; caption?: string }) {
  return (
    <div
      className={cn("relative w-full", maxHeight ? "overflow-auto" : "overflow-x-auto lg:overflow-x-visible", className)}
      style={maxHeight ? { maxHeight } : undefined}
      data-scroll={maxHeight ? "inner" : "page"}
    >
      <table className="w-full border-separate border-spacing-0 text-sm" style={{ minWidth }}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export function THead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <thead
      className={cn(
        "[&_th]:z-10 [&_th]:bg-paper/95 [&_th]:backdrop-blur-sm",
        "[[data-scroll=inner]_&_th]:sticky [[data-scroll=inner]_&_th]:top-0",
        "lg:[[data-scroll=page]_&_th]:sticky lg:[[data-scroll=page]_&_th]:top-16",
        className,
      )}
    >
      {children}
    </thead>
  );
}

export function TBody({ children, className }: { children: ReactNode; className?: string }) {
  return <tbody className={cn("[&>tr:last-child>td]:border-b-0", className)}>{children}</tbody>;
}

export function Tr({ children, className, selected }: { children: ReactNode; className?: string; selected?: boolean }) {
  return <tr className={cn("group/row transition-colors duration-150 hover:bg-ivory/80", selected && "bg-copper/[0.04]", className)}>{children}</tr>;
}

type Align = "start" | "center" | "end";
const alignCls: Record<Align, string> = { start: "text-start", center: "text-center", end: "text-end" };

export function Th({ children, className, align = "start", ...rest }: React.ThHTMLAttributes<HTMLTableCellElement> & { align?: Align }) {
  return (
    <th
      scope="col"
      className={cn("whitespace-nowrap border-b border-line px-4 py-3 text-[0.75rem] font-medium text-taupe first:ps-5 last:pe-5 md:first:ps-6 md:last:pe-6", alignCls[align], className)}
      {...rest}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  align = "start",
  numeric,
  ...rest
}: React.TdHTMLAttributes<HTMLTableCellElement> & { align?: Align; numeric?: boolean }) {
  return (
    <td
      className={cn(
        "border-b border-line/70 px-4 py-3 align-middle text-umber first:ps-5 last:pe-5 md:first:ps-6 md:last:pe-6",
        numeric && "tabular-nums whitespace-nowrap",
        alignCls[align],
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  );
}

/* ═══════════════════════════ Status badges ═══════════════════════════ */

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = ORDER_STATUS_META[status as keyof typeof ORDER_STATUS_META];
  return (
    <Badge tone={meta?.tone ?? "neutral"} dot className={cn("whitespace-nowrap", className)}>
      {meta?.label ?? status}
    </Badge>
  );
}

export function PaymentBadge({ status, className }: { status: string; className?: string }) {
  const meta = PAYMENT_STATUS_META[status as keyof typeof PAYMENT_STATUS_META];
  return (
    <Badge tone={meta?.tone ?? "neutral"} className={cn("whitespace-nowrap", className)}>
      {meta?.label ?? status}
    </Badge>
  );
}

export const ROLE_LABELS: Record<string, string> = { owner: "المالك", manager: "مدير", staff: "موظف" };

export function RoleBadge({ role }: { role: string }) {
  return <Badge tone={role === "owner" ? "copper" : role === "manager" ? "info" : "neutral"}>{ROLE_LABELS[role] ?? role}</Badge>;
}

/* ═══════════════════════════ Pagination ═══════════════════════════ */

type SearchParamsLike = Record<string, string | string[] | undefined>;

export function hrefWith(basePath: string, params: SearchParamsLike | undefined, patch: Record<string, string | number | null | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v === undefined) continue;
    if (Array.isArray(v)) v.forEach((x) => qs.append(k, x));
    else qs.set(k, v);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === "") qs.delete(k);
    else qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}

function pageWindow(page: number, count: number): (number | "…")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(count - 1, page + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < count - 1) out.push("…");
  out.push(count);
  return out;
}

/**
 * Page links. Either pass `makeHref(page)` or `basePath` + current `searchParams` (the `page` param is replaced).
 */
export function Pagination({
  page,
  pageCount,
  makeHref,
  basePath,
  searchParams,
  total,
  className,
}: {
  page: number;
  pageCount: number;
  makeHref?: (page: number) => string;
  basePath?: string;
  searchParams?: SearchParamsLike;
  /** Optional total item count shown as a summary */
  total?: number;
  className?: string;
}) {
  if (pageCount <= 1) {
    return total != null ? <p className={cn("px-1 text-xs text-taupe", className)}>{`${total.toLocaleString("en-US")} عنصر`}</p> : null;
  }
  const href = (p: number) => (makeHref ? makeHref(p) : hrefWith(basePath ?? "", searchParams, { page: p === 1 ? null : p }));
  const linkCls = "grid h-9 min-w-9 place-items-center rounded-full px-2 text-sm tabular-nums transition-colors";
  return (
    <nav aria-label="التنقل بين الصفحات" className={cn("flex items-center justify-between gap-3", className)}>
      <p className="text-xs text-taupe">
        صفحة <span className="tabular-nums text-umber">{page}</span> من <span className="tabular-nums text-umber">{pageCount}</span>
        {total != null && <span className="hidden sm:inline">{` · ${total.toLocaleString("en-US")} عنصر`}</span>}
      </p>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link href={href(page - 1)} className={cn(linkCls, "text-umber hover:bg-bone")} aria-label="الصفحة السابقة" rel="prev">
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <span className={cn(linkCls, "text-mist")} aria-hidden>
            <ChevronRight className="size-4" />
          </span>
        )}
        <span className="hidden items-center gap-1 sm:flex">
          {pageWindow(page, pageCount).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-1 text-mist" aria-hidden>
                …
              </span>
            ) : (
              <Link
                key={p}
                href={href(p)}
                aria-current={p === page ? "page" : undefined}
                className={cn(linkCls, p === page ? "bg-espresso text-paper" : "text-umber hover:bg-bone")}
              >
                {p}
              </Link>
            ),
          )}
        </span>
        {page < pageCount ? (
          <Link href={href(page + 1)} className={cn(linkCls, "text-umber hover:bg-bone")} aria-label="الصفحة التالية" rel="next">
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
        ) : (
          <span className={cn(linkCls, "text-mist")} aria-hidden>
            <ChevronLeft className="size-4" />
          </span>
        )}
      </div>
    </nav>
  );
}

/* ═══════════════════════════ Search (GET form) ═══════════════════════════ */

export function SearchForm({
  placeholder = "ابحث…",
  defaultValue,
  name = "q",
  extraParams,
  action,
  className,
  label = "بحث",
}: {
  placeholder?: string;
  defaultValue?: string;
  name?: string;
  /** Hidden params preserved on submit (e.g. the active status tab) */
  extraParams?: Record<string, string | number | undefined | null>;
  /** Target path; defaults to the current URL */
  action?: string;
  className?: string;
  label?: string;
}) {
  const hidden = Object.entries(extraParams ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== "");
  const clearHref = action !== undefined ? hrefWith(action, undefined, Object.fromEntries(hidden)) : undefined;
  return (
    <form role="search" method="get" action={action} className={cn("relative w-full sm:max-w-xs", className)}>
      {hidden.map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={String(v)} />
      ))}
      <label className="sr-only" htmlFor={`search-${name}`}>
        {label}
      </label>
      <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-taupe" aria-hidden />
      <input
        id={`search-${name}`}
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        className="h-10 w-full rounded-full border border-line bg-paper ps-10 pe-10 text-sm text-espresso outline-none transition-colors placeholder:text-mist focus:border-copper focus:ring-2 focus:ring-copper/15 [&::-webkit-search-cancel-button]:hidden"
      />
      {defaultValue && clearHref && (
        <Link href={clearHref} className="absolute end-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-taupe hover:bg-bone hover:text-espresso" aria-label="مسح البحث">
          <X className="size-3.5" aria-hidden />
        </Link>
      )}
      <button type="submit" className="sr-only">
        {label}
      </button>
    </form>
  );
}

/* ═══════════════════════════ Tabs (link based) ═══════════════════════════ */

export function TabsNav({ tabs, className, label = "تصفية" }: { tabs: { label: string; href: string; count?: number | null; active?: boolean }[]; className?: string; label?: string }) {
  return (
    <nav aria-label={label} className={cn("no-scrollbar -mx-1 overflow-x-auto border-b border-line", className)}>
      <ul className="flex min-w-max items-center gap-1 px-1">
        {tabs.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              aria-current={t.active ? "page" : undefined}
              className={cn(
                "relative inline-flex h-11 items-center gap-2 px-3 text-sm transition-colors",
                t.active ? "font-semibold text-espresso after:absolute after:inset-x-2 after:-bottom-px after:h-[2px] after:rounded-full after:bg-copper" : "text-taupe hover:text-espresso",
              )}
            >
              {t.label}
              {t.count != null && (
                <span className={cn("rounded-full px-1.5 py-px text-[0.7rem] tabular-nums", t.active ? "bg-espresso text-paper" : "bg-bone text-taupe")}>{t.count}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Segmented control (link based) — e.g. date ranges. */
export function Segmented({ items, className, label }: { items: { label: string; href: string; active?: boolean }[]; className?: string; label: string }) {
  return (
    <nav aria-label={label} className={cn("inline-flex items-center rounded-full border border-line bg-paper p-1", className)}>
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          aria-current={it.active ? "true" : undefined}
          scroll={false}
          className={cn(
            "inline-flex h-8 items-center rounded-full px-3.5 text-[0.8rem] transition-colors duration-200",
            it.active ? "bg-espresso font-medium text-paper shadow-sm" : "text-taupe hover:text-espresso",
          )}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

/* ═══════════════════════════ Flash message ═══════════════════════════ */

const FLASH: Record<"success" | "error" | "info" | "warning", { icon: typeof Info; cls: string }> = {
  success: { icon: CircleCheck, cls: "border-success/20 bg-success/[0.06] text-success" },
  error: { icon: CircleAlert, cls: "border-danger/20 bg-danger/[0.06] text-danger" },
  warning: { icon: TriangleAlert, cls: "border-warning/25 bg-warning/[0.07] text-warning" },
  info: { icon: Info, cls: "border-copper/20 bg-copper/[0.06] text-copper-deep" },
};

export function FlashMessage({
  type = "info",
  message,
  title,
  action,
  className,
}: {
  type?: "success" | "error" | "info" | "warning";
  message: ReactNode;
  title?: string;
  action?: ReactNode;
  className?: string;
}) {
  const meta = FLASH[type];
  const Icon = meta.icon;
  return (
    <div role={type === "error" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", meta.cls, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? "text-umber" : undefined}>{message}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ═══════════════════════════ Small pieces ═══════════════════════════ */

/** Definition list for detail pages: label/value rows. */
export function DataList({ items, className }: { items: { label: string; value: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-line/70", className)}>
      {items.map((it) => (
        <div key={it.label} className="flex items-start justify-between gap-4 py-2.5 text-sm">
          <dt className="shrink-0 text-taupe">{it.label}</dt>
          <dd className="min-w-0 text-end text-espresso">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "م";
  return parts.length === 1 ? parts[0].slice(0, 2) : `${parts[0][0]}${parts[1][0]}`;
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={cn("grid size-9 shrink-0 place-items-center rounded-full bg-copper/15 text-[0.8rem] font-semibold text-copper-deep", className)}>
      {initials(name)}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} aria-hidden />;
}

/** Colour swatch dot for variant colours. */
export function Swatch({ hex, className, label }: { hex: string; className?: string; label?: string }) {
  return (
    <span
      className={cn("inline-block size-3 shrink-0 rounded-full ring-1 ring-espresso/15", className)}
      style={{ background: hex || "var(--color-sand)" }}
      title={label}
      aria-hidden
    />
  );
}
