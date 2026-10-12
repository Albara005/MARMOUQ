import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { DEFAULT_CURRENCY, type Currency } from "@/lib/money";
import { DEFAULT_NAV, resolveCopy, type NavLink } from "@/lib/copy";
import type { CustomPage, HomeSectionKey, Layouts } from "@/lib/blocks";
import { DEFAULT_CARRIERS, type Carrier } from "@/lib/carriers";
import { DEFAULT_SIZE_GUIDES, type SizeGuideDef } from "@/lib/size-guides";
import { cookies } from "next/headers";

export type PaymentAccount = { bank: string; holder: string; number: string };

/** An extra display currency for international customers (prices are always stored in the base currency). */
export type MarketCurrency = {
  code: string;
  symbol: string;
  /** Arabic name shown in the switcher, e.g. "ريال سعودي" */
  label: string;
  position: "after" | "before";
  /** How many base-currency units equal 1 unit of this currency (1 SAR = 140 YER → 140) */
  basePerUnit: number;
  /** Market markup in percent on top of the conversion (shipping/fees for that market) */
  markup: number;
  decimals: 0 | 2;
  /** Round converted prices to this step (1, 5, 10 …); 0 = none */
  roundTo: number;
  enabled: boolean;
};

export type BarTone = "espresso" | "copper" | "burgundy" | "navy" | "ivory";

export type { HomeSectionKey };

export type StoreSettings = {
  storeName: string;
  storeNameEn: string;
  tagline: string;
  description: string;
  whatsapp: string;
  phone: string;
  email: string;
  instagram: string;
  tiktok: string;
  address: string;
  workingHours: string;
  currency: Currency;
  /** 0 disables the free-shipping incentive */
  freeShippingThreshold: number;
  announcements: string[];
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    ctaHref: string;
    /** media id of the hero image (falls back to the first featured look cover) */
    mediaId: string | null;
    /** Optional portrait image for phones */
    mobileMediaId: string | null;
    /** Darkness of the overlay on the image, 0–90 (%) */
    overlay: number;
    secondaryLabel: string;
    secondaryHref: string;
    /** Small vertical latin signature on desktop ("" hides it) */
    sideText: string;
  };
  payments: {
    cod: { enabled: boolean; label: string; note: string };
    transfer: { enabled: boolean; label: string; note: string; accounts: PaymentAccount[] };
  };
  policies: { shipping: string; returns: string; privacy: string };
  testimonials: { name: string; city: string; quote: string }[];
  lowStockThreshold: number;
  seo: { title: string; description: string };
  /** International selling: extra display currencies + the customer-facing switcher */
  markets: {
    switcher: boolean;
    /** Currency shown to first-time visitors ("" = base currency) */
    defaultCode: string;
    currencies: MarketCurrency[];
  };
  /** Announcement bar (top) and the moving brand band on the home page */
  bars: {
    announcement: { enabled: boolean; tone: BarTone; href: string; interval: number };
    marquee: { enabled: boolean; tone: BarTone; items: string[]; speed: number };
  };
  /** Overrides for storefront texts & image ids (see src/lib/copy.ts) */
  copy: Record<string, string>;
  /** Header / mobile menu links (after the shop mega-menu) */
  nav: NavLink[];
  /** Custom FAQ on the contact page (empty = built-in answers from your settings) */
  faq: { q: string; a: string }[];
  /** Brand colours ("" = MARMOUQ defaults) */
  theme: { accent: string; dark: string; background: string };
  /** Optional logo image replacing the text wordmark */
  brand: { logoId: string | null; logoHeight: number };
  /** Page sections: the ordered home layout + extra sections on other pages (see src/lib/blocks.ts) */
  layouts: Layouts;
  /** Merchant-built pages served at /pages/[slug] */
  customPages: CustomPage[];
  /** Shipping companies + their tracking-link templates (see src/lib/carriers.ts) */
  carriers: Carrier[];
  /** Size guide tables shown on product pages (see src/lib/size-guides.ts) */
  sizeGuides: SizeGuideDef[];
  home: {
    /** Legacy on/off switches — only used until the home layout is customised (layouts.home) */
    sections: Record<HomeSectionKey, boolean>;
    categories: { eyebrow: string; title: string; subtitle: string };
    colourStory: { eyebrow: string; title: string; productSlug: string };
    newArrivals: { eyebrow: string; title: string; subtitle: string; source: "newest" | "featured" | "all" };
    look: { eyebrow: string; lookSlug: string };
    craft: { eyebrow: string; title: string; subtitle: string; items: { title: string; body: string }[] };
    social: { eyebrow: string; statValue: string; title: string; text: string };
    atelier: { eyebrow: string; title: string; text: string; ctaLabel: string };
  };
};

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "مرموق",
  storeNameEn: "MARMOUQ",
  tagline: "طريقك لتكون شخصية مرموقة",
  description: "ملابس رجالية راقية بتفاصيل مختارة بعناية — تريكو قطني إيطالي، قمصان رسمية، بناطيل بقصّات مدروسة وأحذية إيطالية.",
  whatsapp: "",
  phone: "",
  email: "",
  instagram: "https://www.instagram.com/marmouq.ye",
  tiktok: "https://www.tiktok.com/@marmouq.ye",
  address: "اليمن",
  workingHours: "يومياً من 10 صباحاً حتى 11 مساءً",
  currency: DEFAULT_CURRENCY,
  freeShippingThreshold: 60000,
  announcements: ["توصيل لجميع المحافظات اليمنية", "قطن 100% · صنع إيطالي 🇮🇹", "الدفع عند الاستلام متاح", "استبدال سهل خلال 3 أيام"],
  hero: {
    eyebrow: "مجموعة الخريف · AUTUMN EDIT",
    title: "طريقك لتكون\nشخصية مرموقة",
    subtitle: "تريكو قطني إيطالي، قمصان بياقات حادّة، وبناطيل بقصّة كورية صحيحة — كل قطعة مختارة لتكمل حضورك.",
    ctaLabel: "تسوّق المجموعة",
    ctaHref: "/shop",
    mediaId: null,
    mobileMediaId: null,
    overlay: 45,
    secondaryLabel: "نسّق إطلالتك",
    secondaryHref: "/atelier",
    sideText: "Est. Yemen — Italian Craft",
  },
  payments: {
    cod: { enabled: true, label: "الدفع عند الاستلام", note: "ادفع نقداً عند وصول طلبك إلى باب منزلك." },
    transfer: {
      enabled: true,
      label: "حوالة / محفظة إلكترونية",
      note: "حوّل المبلغ إلى أحد الحسابات التالية ثم أرسل صورة الإيصال عبر واتساب مع رقم الطلب.",
      accounts: [{ bank: "الكريمي", holder: "مرموق", number: "—" }],
    },
  },
  policies: {
    shipping: "نوصل إلى جميع المحافظات اليمنية. يتم تأكيد الطلب هاتفياً أو عبر واتساب قبل الشحن، ويصل عادة خلال 1–4 أيام عمل حسب المدينة.",
    returns: "يمكنك استبدال المقاس أو اللون خلال 3 أيام من الاستلام بشرط أن تكون القطعة بحالتها الأصلية مع البطاقة.",
    privacy: "نستخدم بياناتك فقط لتوصيل طلبك والتواصل معك بخصوصه، ولا نشاركها مع أي طرف ثالث.",
  },
  testimonials: [
    { name: "عبدالله", city: "صنعاء", quote: "الخامة فوق التوقع والقصّة مضبوطة، صار السويتر قطعتي المفضلة هذا الشتاء." },
    { name: "محمد", city: "عدن", quote: "تعامل راقٍ وتغليف فخم، والطلب وصلني بسرعة. أكيد بكرر." },
    { name: "سالم", city: "تعز", quote: "نسّقوا لي الطقم كامل من السويتر للحذاء، والنتيجة حضور مختلف." },
  ],
  lowStockThreshold: 3,
  seo: {
    title: "مرموق | MARMOUQ — أزياء رجالية راقية",
    description: "طريقك لتكون شخصية مرموقة. ملابس رجالية راقية بتفاصيل مختارة بعناية: تريكو قطني إيطالي، قمصان، بناطيل وأحذية.",
  },
  markets: { switcher: true, defaultCode: "", currencies: [] },
  copy: {},
  nav: DEFAULT_NAV,
  faq: [],
  theme: { accent: "", dark: "", background: "" },
  brand: { logoId: null, logoHeight: 40 },
  layouts: {},
  customPages: [],
  carriers: DEFAULT_CARRIERS,
  sizeGuides: DEFAULT_SIZE_GUIDES,
  bars: {
    announcement: { enabled: true, tone: "espresso", href: "", interval: 5 },
    marquee: { enabled: true, tone: "ivory", items: ["قطن 100%", "صنع إيطالي 🇮🇹", "قصّات مدروسة", "توصيل لكل المحافظات", "الدفع عند الاستلام", "استبدال سهل"], speed: 38 },
  },
  home: {
    sections: { categories: true, colourStory: true, newArrivals: true, look: true, craft: true, social: true, atelier: true },
    categories: { eyebrow: "The Wardrobe", title: "خزانة الرجل المرموق", subtitle: "من التريكو الإيطالي إلى الشوز المصنوع يدوياً — كل قسم منتقى ليكمل الآخر." },
    colourStory: { eyebrow: "The Colour Story", title: "قصة الألوان", productSlug: "half-zip-cable-knit-sweater" },
    newArrivals: { eyebrow: "New Arrivals", title: "وصل حديثاً", subtitle: "قطع الموسم بألوانها كاملة — اختر لونك وخلّ الباقي علينا.", source: "all" },
    look: { eyebrow: "Look of the Season", lookSlug: "" },
    craft: {
      eyebrow: "The Marmouq Standard",
      title: "تفاصيل مختارة بعناية",
      subtitle: "أربعة مبادئ نلتزم فيها بكل قطعة توصلك — لأن الأناقة الحقيقية في التفاصيل.",
      items: [
        { title: "الخامة أولاً", body: "قطن 100% بملمس ناعم يتنفّس معك طول اليوم، ويحافظ على شكله وألوانه غسلة بعد غسلة." },
        { title: "صنعة إيطالية", body: "تريكو بضفائر كلاسيكية وسحّاب معدني متين، مصنوع في إيطاليا بمعايير الدور العريقة." },
        { title: "القصّة الصحيحة", body: "بناطيل بالقالب الكوري الصحيح: بِليتس أمامية وخصر مرتفع يعطيك وقفة أطول وأرتب." },
        { title: "تنسيق متكامل", body: "كل قطعة مختارة لتكمل الأخرى — من ربطة العنق الحريرية حتى الشوز الإيطالي." },
      ],
    },
    social: { eyebrow: "The Community", statValue: "69K", title: "رجل مرموق يتابعنا", text: "إطلالات يومية، قطع جديدة قبل الكل، وتنسيقات من عملائنا في كل المحافظات." },
    atelier: {
      eyebrow: "The Atelier",
      title: "نسّق إطلالتك بنفسك، قطعة بقطعة",
      text: "اختر السويتر، القميص، الربطة، البنطال والشوز — وشوف إطلالتك تكتمل قدامك مع سعرها النهائي قبل ما تطلب.",
      ctaLabel: "ابدأ التنسيق الآن",
    },
  },
};

const KEY = "store";

function merge<T>(base: T, patch: unknown): T {
  if (Array.isArray(base) || typeof base !== "object" || base === null) {
    return (patch === undefined || patch === null ? base : patch) as T;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  if (patch && typeof patch === "object" && !Array.isArray(patch)) {
    for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
      out[k] = k in out ? merge(out[k], v) : v;
    }
  }
  return out as T;
}

/** Store settings merged over defaults. Deduplicated per request. Never throws (falls back to defaults). */
export const getSettings = cache(async (): Promise<StoreSettings> => {
  try {
    const row = await db.query.settings.findFirst({ where: eq(settings.key, KEY) });
    return merge(DEFAULT_SETTINGS, row?.value);
  } catch (err) {
    console.error("[settings] falling back to defaults:", err);
    return DEFAULT_SETTINGS;
  }
});

export async function saveSettings(next: StoreSettings): Promise<void> {
  await db
    .insert(settings)
    .values({ key: KEY, value: next, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: next, updatedAt: new Date() } });
}

/** The subset of settings that is safe and useful on the client. */
export type PublicStoreConfig = Pick<StoreSettings, "storeName" | "storeNameEn" | "tagline" | "whatsapp" | "instagram" | "tiktok" | "freeShippingThreshold" | "nav" | "brand"> & {
  /** Resolved storefront copy (defaults + overrides) */
  copy: Record<string, string>;
  /** The visitor's DISPLAY currency (converts from base). */
  currency: Currency;
  baseCurrency: Currency;
  /** Currencies offered in the switcher (base first); empty when the switcher is off */
  currencyOptions: { code: string; symbol: string; label: string }[];
};

export function toPublicConfig(s: StoreSettings, display?: Currency): PublicStoreConfig {
  const enabled = s.markets.currencies.filter((c) => c.enabled && c.basePerUnit > 0);
  return {
    storeName: s.storeName,
    storeNameEn: s.storeNameEn,
    tagline: s.tagline,
    whatsapp: s.whatsapp,
    instagram: s.instagram,
    tiktok: s.tiktok,
    currency: display ?? s.currency,
    baseCurrency: s.currency,
    freeShippingThreshold: s.freeShippingThreshold,
    nav: s.nav.length ? s.nav : DEFAULT_NAV,
    brand: s.brand,
    copy: resolveCopy(s.copy),
    currencyOptions:
      s.markets.switcher && enabled.length
        ? [{ code: s.currency.code, symbol: s.currency.symbol, label: "العملة الأساسية" }, ...enabled.map((c) => ({ code: c.code, symbol: c.symbol, label: c.label || c.code }))]
        : [],
  };
}

/** Resolves a currency code to a display currency (falls back to the base). Pure — safe anywhere. */
export function resolveDisplayCurrency(s: StoreSettings, code: string | null | undefined): Currency {
  const want = (code || s.markets.defaultCode || "").toUpperCase();
  const m = s.markets.currencies.find((c) => c.enabled && c.basePerUnit > 0 && c.code === want);
  if (!m) return s.currency;
  return { code: m.code, symbol: m.symbol, position: m.position, basePerUnit: m.basePerUnit, markup: m.markup, decimals: m.decimals, roundTo: m.roundTo };
}

export const CURRENCY_COOKIE = "mrq_cur";

/** The visitor's display currency, from the switcher cookie (server components only). */
export async function getDisplayCurrency(s?: StoreSettings): Promise<Currency> {
  const settings = s ?? (await getSettings());
  let code: string | undefined;
  try {
    code = (await cookies()).get(CURRENCY_COOKIE)?.value;
  } catch {
    code = undefined;
  }
  return resolveDisplayCurrency(settings, code);
}

/** Storefront copy for server components. */
export function copyOf(s: StoreSettings): Record<string, string> {
  return resolveCopy(s.copy);
}
