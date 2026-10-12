/**
 * World currencies the merchant can offer (pick from a list — rates are automatic),
 * and how a visitor's country is guessed in the browser (time zone, then language region).
 *
 * Plain module — safe in server and client components.
 */

export type CatalogCurrency = {
  code: string;
  label: string;
  symbol: string;
  position: "after" | "before";
  decimals: 0 | 2;
  /** default rounding step for converted prices (0 = none) */
  roundTo: number;
  /** ISO 3166 country codes that use it */
  countries: string[];
};

export const CURRENCY_CATALOG: CatalogCurrency[] = [
  { code: "SAR", label: "ريال سعودي", symbol: "ر.س", position: "after", decimals: 0, roundTo: 1, countries: ["SA"] },
  { code: "AED", label: "درهم إماراتي", symbol: "د.إ", position: "after", decimals: 0, roundTo: 1, countries: ["AE"] },
  { code: "KWD", label: "دينار كويتي", symbol: "د.ك", position: "after", decimals: 2, roundTo: 0, countries: ["KW"] },
  { code: "QAR", label: "ريال قطري", symbol: "ر.ق", position: "after", decimals: 0, roundTo: 1, countries: ["QA"] },
  { code: "BHD", label: "دينار بحريني", symbol: "د.ب", position: "after", decimals: 2, roundTo: 0, countries: ["BH"] },
  { code: "OMR", label: "ريال عماني", symbol: "ر.ع", position: "after", decimals: 2, roundTo: 0, countries: ["OM"] },
  { code: "YER", label: "ريال يمني", symbol: "ر.ي", position: "after", decimals: 0, roundTo: 1, countries: ["YE"] },
  { code: "USD", label: "دولار أمريكي", symbol: "$", position: "before", decimals: 2, roundTo: 0, countries: ["US", "PR", "EC", "SV", "PA", "TL"] },
  { code: "EUR", label: "يورو", symbol: "€", position: "before", decimals: 2, roundTo: 0, countries: ["DE", "FR", "IT", "ES", "NL", "BE", "AT", "IE", "PT", "FI", "GR", "LU", "SK", "SI", "EE", "LV", "LT", "MT", "CY", "HR"] },
  { code: "GBP", label: "جنيه إسترليني", symbol: "£", position: "before", decimals: 2, roundTo: 0, countries: ["GB"] },
  { code: "EGP", label: "جنيه مصري", symbol: "ج.م", position: "after", decimals: 0, roundTo: 5, countries: ["EG"] },
  { code: "JOD", label: "دينار أردني", symbol: "د.أ", position: "after", decimals: 2, roundTo: 0, countries: ["JO", "PS"] },
  { code: "IQD", label: "دينار عراقي", symbol: "د.ع", position: "after", decimals: 0, roundTo: 250, countries: ["IQ"] },
  { code: "LBP", label: "ليرة لبنانية", symbol: "ل.ل", position: "after", decimals: 0, roundTo: 1000, countries: ["LB"] },
  { code: "MAD", label: "درهم مغربي", symbol: "د.م", position: "after", decimals: 0, roundTo: 1, countries: ["MA", "EH"] },
  { code: "DZD", label: "دينار جزائري", symbol: "د.ج", position: "after", decimals: 0, roundTo: 10, countries: ["DZ"] },
  { code: "TND", label: "دينار تونسي", symbol: "د.ت", position: "after", decimals: 2, roundTo: 0, countries: ["TN"] },
  { code: "LYD", label: "دينار ليبي", symbol: "د.ل", position: "after", decimals: 2, roundTo: 0, countries: ["LY"] },
  { code: "SDG", label: "جنيه سوداني", symbol: "ج.س", position: "after", decimals: 0, roundTo: 10, countries: ["SD"] },
  { code: "DJF", label: "فرنك جيبوتي", symbol: "Fdj", position: "after", decimals: 0, roundTo: 10, countries: ["DJ"] },
  { code: "TRY", label: "ليرة تركية", symbol: "₺", position: "after", decimals: 0, roundTo: 5, countries: ["TR"] },
  { code: "CAD", label: "دولار كندي", symbol: "C$", position: "before", decimals: 2, roundTo: 0, countries: ["CA"] },
  { code: "AUD", label: "دولار أسترالي", symbol: "A$", position: "before", decimals: 2, roundTo: 0, countries: ["AU"] },
  { code: "CHF", label: "فرنك سويسري", symbol: "CHF", position: "before", decimals: 2, roundTo: 0, countries: ["CH", "LI"] },
  { code: "SEK", label: "كرونة سويدية", symbol: "kr", position: "after", decimals: 0, roundTo: 5, countries: ["SE"] },
  { code: "NOK", label: "كرونة نرويجية", symbol: "kr", position: "after", decimals: 0, roundTo: 5, countries: ["NO"] },
  { code: "DKK", label: "كرونة دنماركية", symbol: "kr", position: "after", decimals: 0, roundTo: 5, countries: ["DK"] },
  { code: "MYR", label: "رينغيت ماليزي", symbol: "RM", position: "before", decimals: 2, roundTo: 0, countries: ["MY"] },
  { code: "IDR", label: "روبية إندونيسية", symbol: "Rp", position: "before", decimals: 0, roundTo: 1000, countries: ["ID"] },
  { code: "INR", label: "روبية هندية", symbol: "₹", position: "before", decimals: 0, roundTo: 10, countries: ["IN"] },
  { code: "PKR", label: "روبية باكستانية", symbol: "Rs", position: "before", decimals: 0, roundTo: 10, countries: ["PK"] },
  { code: "KES", label: "شلن كيني", symbol: "KSh", position: "before", decimals: 0, roundTo: 10, countries: ["KE"] },
];

/** Currencies whose official feed rate differs from the market price (parallel exchange rates). */
export const PARALLEL_RATE_CURRENCIES = new Set(["YER", "SYP", "SDG", "LBP"]);

/** 1 USD in the base currency: the merchant's market rate, else the live feed (null = unknown / unsafe). */
export function usdInBase(base: string, usdRate: number, rates: Record<string, number> | null | undefined): number | null {
  const b = base.toUpperCase();
  if (usdRate > 0) return usdRate;
  if (b === "USD") return 1;
  if (PARALLEL_RATE_CURRENCIES.has(b)) return null;
  return rates?.[b] ?? null;
}

/** How many base units one unit of `code` is worth, from live rates (0 = unknown). */
export function autoBasePerUnit(code: string, usdBase: number | null, rates: Record<string, number> | null | undefined): number {
  const c = code.toUpperCase();
  // the feed's official rate for these is not the market price — they need a manual rate
  if (PARALLEL_RATE_CURRENCIES.has(c)) return 0;
  const perUsd = c === "USD" ? 1 : rates?.[c];
  return usdBase && perUsd ? Number((usdBase / perUsd).toPrecision(8)) : 0;
}

/** Legacy currencies (saved before automatic rates) keep the rate the merchant typed. */
export function isManualRate(c: { rateMode?: "auto" | "manual"; basePerUnit: number }): boolean {
  return c.rateMode === "manual" || (c.rateMode == null && c.basePerUnit > 0);
}

const BY_CODE = new Map(CURRENCY_CATALOG.map((c) => [c.code, c]));
const BY_COUNTRY = new Map(CURRENCY_CATALOG.flatMap((c) => c.countries.map((cc) => [cc, c.code] as const)));

export function catalogCurrency(code: string): CatalogCurrency | undefined {
  return BY_CODE.get(code.toUpperCase());
}

/** The currency of a country (ISO 3166 alpha-2), if we know it. */
export function currencyForCountry(country: string | null | undefined): string | null {
  if (!country) return null;
  return BY_COUNTRY.get(country.toUpperCase()) ?? null;
}

/** Cookie holding the visitor's detected country (2 letters). */
export const COUNTRY_COOKIE = "mrq_cc";

/** IANA time zones → country, for the visitor markets that matter here. */
const ZONE_COUNTRY: Record<string, string> = {
  "Asia/Aden": "YE", "Asia/Riyadh": "SA", "Asia/Dubai": "AE", "Asia/Kuwait": "KW", "Asia/Qatar": "QA", "Asia/Bahrain": "BH", "Asia/Muscat": "OM",
  "Africa/Cairo": "EG", "Asia/Amman": "JO", "Asia/Baghdad": "IQ", "Asia/Beirut": "LB", "Asia/Damascus": "SY", "Asia/Gaza": "PS", "Asia/Hebron": "PS",
  "Africa/Casablanca": "MA", "Africa/El_Aaiun": "EH", "Africa/Algiers": "DZ", "Africa/Tunis": "TN", "Africa/Tripoli": "LY", "Africa/Khartoum": "SD",
  "Africa/Djibouti": "DJ", "Africa/Nairobi": "KE", "Europe/Istanbul": "TR", "Asia/Istanbul": "TR",
  "Europe/London": "GB", "Europe/Dublin": "IE", "Europe/Berlin": "DE", "Europe/Paris": "FR", "Europe/Rome": "IT", "Europe/Madrid": "ES",
  "Europe/Amsterdam": "NL", "Europe/Brussels": "BE", "Europe/Vienna": "AT", "Europe/Lisbon": "PT", "Europe/Helsinki": "FI", "Europe/Athens": "GR",
  "Europe/Luxembourg": "LU", "Europe/Bratislava": "SK", "Europe/Ljubljana": "SI", "Europe/Tallinn": "EE", "Europe/Riga": "LV", "Europe/Vilnius": "LT",
  "Europe/Malta": "MT", "Asia/Nicosia": "CY", "Europe/Zagreb": "HR", "Europe/Zurich": "CH", "Europe/Stockholm": "SE", "Europe/Oslo": "NO", "Europe/Copenhagen": "DK",
  "America/Toronto": "CA", "America/Vancouver": "CA", "America/Edmonton": "CA", "America/Winnipeg": "CA", "America/Halifax": "CA", "America/St_Johns": "CA", "America/Regina": "CA",
  "Asia/Kuala_Lumpur": "MY", "Asia/Jakarta": "ID", "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "Asia/Karachi": "PK",
  "Pacific/Auckland": "NZ",
};

/** Best guess of the visitor's country from the browser (no network, no permission prompt). */
export function detectCountryFromBrowser(): string | null {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (ZONE_COUNTRY[zone]) return ZONE_COUNTRY[zone];
    if (zone.startsWith("Australia/")) return "AU";
    if (zone.startsWith("America/")) return "US";
  } catch {
    /* fall through to the language */
  }
  try {
    for (const lang of navigator.languages ?? [navigator.language]) {
      const region = lang.split("-")[1];
      if (region && /^[A-Za-z]{2}$/.test(region)) return region.toUpperCase();
    }
  } catch {
    /* unknown */
  }
  return null;
}
