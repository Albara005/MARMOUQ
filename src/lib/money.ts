export type Currency = {
  /** ISO-ish code, e.g. YER / SAR / USD */
  code: string;
  /** Display symbol, e.g. "ر.ي" */
  symbol: string;
  /** Where the symbol sits relative to the number (visual order in RTL text) */
  position: "after" | "before";
  /**
   * Display currencies only: how many BASE units equal 1 unit of this currency
   * (e.g. 1 SAR = 140 YER → 140). Undefined / 1 for the base currency.
   */
  basePerUnit?: number;
  /** Optional market markup in percent applied on top of the conversion (e.g. 10 = +10%) */
  markup?: number;
  /** 0 = whole numbers, 2 = cents */
  decimals?: 0 | 2;
  /** Round converted prices to this step (e.g. 1, 5, 10). 0/undefined = no extra rounding */
  roundTo?: number;
};

export const DEFAULT_CURRENCY: Currency = { code: "YER", symbol: "ر.ي", position: "after" };

/** Converts an amount stored in the base currency into the given display currency. */
export function convertAmount(amount: number, currency: Currency = DEFAULT_CURRENCY): number {
  const per = currency.basePerUnit && currency.basePerUnit > 0 ? currency.basePerUnit : 1;
  let v = (amount / per) * (1 + (currency.markup ?? 0) / 100);
  const step = currency.roundTo && currency.roundTo > 0 ? currency.roundTo : currency.decimals === 2 ? 0.01 : 1;
  v = Math.round(v / step) * step;
  return currency.decimals === 2 ? Math.round(v * 100) / 100 : Math.round(v);
}

/** Number only (no symbol), converted and grouped: "1,250" / "47.50". */
export function formatAmount(amount: number, currency: Currency = DEFAULT_CURRENCY): string {
  const v = convertAmount(amount, currency);
  const cents = currency.decimals === 2 && !Number.isInteger(v);
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 }).format(v);
}

/** Prices are stored as whole base-currency units; this converts + formats for display. */
export function formatMoney(amount: number, currency: Currency = DEFAULT_CURRENCY): string {
  const n = formatAmount(amount, currency);
  return currency.position === "before" ? `${currency.symbol} ${n}` : `${n} ${currency.symbol}`;
}

export function percentOff(price: number, compareAt?: number | null): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

/** True when the currency converts from the base (i.e. it is not the store's base currency). */
export function isForeign(currency: Currency): boolean {
  return currency.basePerUnit != null;
}
