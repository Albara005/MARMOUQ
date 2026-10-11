import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { DEFAULT_CURRENCY, type Currency } from "@/lib/money";

export type PaymentAccount = { bank: string; holder: string; number: string };

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
  };
  payments: {
    cod: { enabled: boolean; label: string; note: string };
    transfer: { enabled: boolean; label: string; note: string; accounts: PaymentAccount[] };
  };
  policies: { shipping: string; returns: string; privacy: string };
  testimonials: { name: string; city: string; quote: string }[];
  lowStockThreshold: number;
  seo: { title: string; description: string };
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
export type PublicStoreConfig = Pick<
  StoreSettings,
  "storeName" | "storeNameEn" | "tagline" | "whatsapp" | "instagram" | "tiktok" | "currency" | "freeShippingThreshold"
>;

export function toPublicConfig(s: StoreSettings): PublicStoreConfig {
  return {
    storeName: s.storeName,
    storeNameEn: s.storeNameEn,
    tagline: s.tagline,
    whatsapp: s.whatsapp,
    instagram: s.instagram,
    tiktok: s.tiktok,
    currency: s.currency,
    freeShippingThreshold: s.freeShippingThreshold,
  };
}
