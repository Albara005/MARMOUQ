"use client";

import { createContext, useCallback, useContext } from "react";
import { formatMoney } from "@/lib/money";
import type { PublicStoreConfig } from "@/lib/settings";

const StoreConfigContext = createContext<PublicStoreConfig | null>(null);

export function StoreConfigProvider({ config, children }: { config: PublicStoreConfig; children: React.ReactNode }) {
  return <StoreConfigContext.Provider value={config}>{children}</StoreConfigContext.Provider>;
}

export function useStoreConfig(): PublicStoreConfig {
  const ctx = useContext(StoreConfigContext);
  if (!ctx) throw new Error("useStoreConfig must be used inside <StoreConfigProvider>");
  return ctx;
}

/** Returns a formatter bound to the store currency. */
export function useMoney(): (amount: number) => string {
  const { currency } = useStoreConfig();
  return useCallback((amount: number) => formatMoney(amount, currency), [currency]);
}

/** Price with optional strike-through compare-at price. */
export function Price({ amount, compareAt, className }: { amount: number; compareAt?: number | null; className?: string }) {
  const money = useMoney();
  return (
    <span className={className}>
      <span className="tabular-nums">{money(amount)}</span>
      {compareAt != null && compareAt > amount && <s className="ms-2 text-[0.85em] text-mist tabular-nums">{money(compareAt)}</s>}
    </span>
  );
}
