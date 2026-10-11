export type Currency = {
  /** ISO-ish code, e.g. YER / SAR */
  code: string;
  /** Display symbol, e.g. "ر.ي" */
  symbol: string;
  /** Where the symbol sits relative to the number (visual order in RTL text) */
  position: "after" | "before";
};

export const DEFAULT_CURRENCY: Currency = { code: "YER", symbol: "ر.ي", position: "after" };

const GROUPED = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Prices are stored as whole currency units (integers). */
export function formatMoney(amount: number, currency: Currency = DEFAULT_CURRENCY): string {
  const n = GROUPED.format(Math.round(amount));
  return currency.position === "before" ? `${currency.symbol} ${n}` : `${n} ${currency.symbol}`;
}

export function percentOff(price: number, compareAt?: number | null): number {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
