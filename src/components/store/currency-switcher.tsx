"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { useStoreConfig } from "@/components/store/store-provider";
import { cn } from "@/lib/utils";

const COOKIE = "mrq_cur";

/** Compact currency picker. Hidden unless the store enabled extra currencies. */
export function CurrencySwitcher({ className, tone = "dark", variant = "compact" }: { className?: string; tone?: "dark" | "light"; variant?: "compact" | "full" }) {
  const config = useStoreConfig();
  const router = useRouter();
  const [pending, start] = useTransition();
  const options = config.currencyOptions;
  if (!options.length) return null;

  const change = (code: string) => {
    document.cookie = `${COOKIE}=${encodeURIComponent(code)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    start(() => router.refresh());
  };

  return (
    <label className={cn("relative inline-flex items-center", pending && "opacity-60", className)}>
      <span className="sr-only">العملة</span>
      <select
        value={config.currency.code}
        onChange={(e) => change(e.target.value)}
        className={cn(
          "cursor-pointer appearance-none rounded-full bg-transparent font-medium tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-copper/40",
          variant === "compact" ? "h-9 pe-6 ps-2.5 text-[0.72rem] tracking-wider" : "h-11 w-full border border-line bg-paper pe-9 ps-4 text-sm",
          tone === "light" ? "text-paper" : "text-espresso",
        )}
      >
        {options.map((o) => (
          <option key={o.code} value={o.code} className="text-espresso">
            {variant === "compact" ? o.code : `${o.label} · ${o.code} (${o.symbol})`}
          </option>
        ))}
      </select>
      <ChevronDown className={cn("pointer-events-none absolute size-3.5", variant === "compact" ? "end-1.5" : "end-3.5", tone === "light" ? "text-paper/70" : "text-taupe")} aria-hidden />
    </label>
  );
}
