/** Tiny className joiner (no runtime deps). */
export function cn(...parts: Array<string | false | null | undefined | 0>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * When a caller hides a component (`hidden lg:inline-flex`), drop the component's own base
 * display utility so it cannot override `hidden` (Tailwind gives both equal specificity).
 */
export function baseDisplay(base: string, extra?: string | null): string {
  if (!extra || !/(^|\s)hidden(\s|$)/.test(extra)) return base;
  return base
    .split(/\s+/)
    .filter((c) => !/^(inline-flex|flex|block|inline-block|grid|inline-grid)$/.test(c))
    .join(" ");
}

/** URL-safe slug that keeps Arabic letters readable. */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "") // tashkeel + tatweel
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Normalises Yemeni / Gulf phone numbers: Arabic-Indic digits → Latin, strips spaces. */
export function normalizePhone(input: string): string {
  const latin = input.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  return latin.replace(/[^\d+]/g, "");
}

/** wa.me needs digits only incl. country code (Yemen = 967). */
export function whatsappLink(phone: string, text?: string): string {
  let digits = normalizePhone(phone).replace(/^\+/, "").replace(/^00/, "");
  if (digits.startsWith("7") && digits.length === 9) digits = `967${digits}`;
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${q}`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function randomToken(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

const AR_DATE = new Intl.DateTimeFormat("ar-YE-u-nu-latn", { day: "numeric", month: "long", year: "numeric" });
const AR_DATE_TIME = new Intl.DateTimeFormat("ar-YE-u-nu-latn", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(d: Date | string): string {
  return AR_DATE.format(typeof d === "string" ? new Date(d) : d);
}

export function formatDateTime(d: Date | string): string {
  return AR_DATE_TIME.format(typeof d === "string" ? new Date(d) : d);
}

const NUM = new Intl.NumberFormat("en-US");
export function formatNumber(n: number): string {
  return NUM.format(n);
}
