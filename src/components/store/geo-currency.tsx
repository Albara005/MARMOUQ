"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStoreConfig } from "@/components/store/store-provider";
import { COUNTRY_COOKIE, currencyForCountry, detectCountryFromBrowser } from "@/lib/currency-catalog";

const hasCookie = (name: string) => new RegExp(`(?:^|;\\s*)${name}=`).test(document.cookie);

/**
 * First visit: guesses the visitor's country in the browser and remembers it, so the server
 * shows prices in their currency (when the store offers it). A manual switcher choice always wins.
 */
export function GeoCurrency() {
  const config = useStoreConfig();
  const router = useRouter();

  useEffect(() => {
    if (hasCookie(COUNTRY_COOKIE)) return;
    const country = detectCountryFromBrowser() ?? "ZZ";
    document.cookie = `${COUNTRY_COOKIE}=${country}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    if (hasCookie("mrq_cur")) return;
    const want = currencyForCountry(country);
    if (want && want !== config.currency.code && config.autoCurrencies.includes(want)) router.refresh();
  }, [config.autoCurrencies, config.currency.code, router]);

  return null;
}
