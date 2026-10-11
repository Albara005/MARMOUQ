/** Shop URL state — plain module, safe for server and client components. */

export const PAGE_SIZE = 12;

export const SORT_OPTIONS = [
  { value: "featured", label: "مختاراتنا" },
  { value: "newest", label: "الأحدث وصولاً" },
  { value: "price-asc", label: "السعر: من الأقل" },
  { value: "price-desc", label: "السعر: من الأعلى" },
] as const;

export type ShopSort = (typeof SORT_OPTIONS)[number]["value"];

export type ShopParams = {
  q: string;
  sort: ShopSort;
  color: string;
  size: string;
  min: number | null;
  max: number | null;
  page: number;
};

export const DEFAULT_PARAMS: ShopParams = { q: "", sort: "featured", color: "", size: "", min: null, max: null, page: 1 };

type RawParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v ?? "").trim();
}

function toAmount(v: string): number | null {
  const digits = v.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n >= 0 && n <= 100_000_000 ? n : null;
}

/** Validates & normalises raw search params (never throws). */
export function parseShopParams(raw: RawParams): ShopParams {
  const sortRaw = first(raw.sort);
  const sort = (SORT_OPTIONS.some((s) => s.value === sortRaw) ? sortRaw : "featured") as ShopSort;
  let min = toAmount(first(raw.min));
  let max = toAmount(first(raw.max));
  if (min != null && max != null && min > max) [min, max] = [max, min];
  const page = Math.min(50, Math.max(1, Number.parseInt(first(raw.page), 10) || 1));
  return {
    q: first(raw.q).slice(0, 60),
    sort,
    color: first(raw.color).slice(0, 40),
    size: first(raw.size).slice(0, 12),
    min,
    max,
    page,
  };
}

/** Builds a shop URL from the current state and a patch. Any change except `page` resets pagination. */
export function shopHref(base: string, current: ShopParams, patch: Partial<ShopParams> = {}): string {
  const next: ShopParams = { ...current, page: 1, ...patch };
  const sp = new URLSearchParams();
  if (next.q) sp.set("q", next.q);
  if (next.color) sp.set("color", next.color);
  if (next.size) sp.set("size", next.size);
  if (next.min != null) sp.set("min", String(next.min));
  if (next.max != null) sp.set("max", String(next.max));
  if (next.sort !== "featured") sp.set("sort", next.sort);
  if (next.page > 1) sp.set("page", String(next.page));
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

export function activeFilterCount(p: ShopParams): number {
  return (p.color ? 1 : 0) + (p.size ? 1 : 0) + (p.min != null || p.max != null ? 1 : 0);
}

/** Arabic counted noun for "piece": 1 قطعة · 2 قطعتان · 3–10 قطع · 11+ قطعة */
export function piecesLabel(n: number): string {
  if (n === 0) return "لا توجد قطع";
  if (n === 1) return "قطعة واحدة";
  if (n === 2) return "قطعتان";
  if (n <= 10) return `${n} قطع`;
  return `${n} قطعة`;
}
