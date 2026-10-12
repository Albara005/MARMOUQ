"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStoreConfig } from "@/components/store/store-provider";
import { COUNTRY_COOKIE, currencyForCountry, detectCountryFromBrowser } from "@/lib/currency-catalog";

const hasCookie = (name: string) => new RegExp(`(?:^|;\\s*)${name}=`).test(document.cookie);

/** At most one automatic refresh per page load (cookies may be blocked). */
let attempted = false;

/**
 * First visit: guesses the visitor's country in the browser and remembers it, so the server
 * shows prices in their currency (when the store offers it). A manual switcher choice always wins.
 */
export function GeoCurrency() {
  const config = useStoreConfig();
  const router = useRouter();

  const offered = config.autoCurrencies.join(",");
  useEffect(() => {
    if (attempted || hasCookie(COUNTRY_COOKIE)) return;
    attempted = true;
    const country = detectCountryFromBrowser();
    if (!country) return;
    document.cookie = `${COUNTRY_COOKIE}=${country}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    if (!hasCookie(COUNTRY_COOKIE) || hasCookie("mrq_cur")) return; // cookies blocked, or the visitor already chose
    const want = currencyForCountry(country);
    if (want && want !== config.currency.code && offered.split(",").includes(want)) router.refresh();
  }, [offered, config.currency.code, router]);

  return null;
}
