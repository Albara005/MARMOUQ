/**
 * Page sections ("blocks") the merchant can add, reorder, hide and remove from the dashboard.
 *
 * - The home page is a fully ordered list of blocks (the original MARMOUQ sections are
 *   `builtin` blocks; the hero stays fixed at the top).
 * - Every other storefront page (shop, product, looks…) can receive extra blocks above
 *   ("top") or below ("bottom") its own content.
 * - Custom pages (/pages/[slug]) are built entirely from blocks.
 *
 * Plain module (no server imports) — safe in server and client components.
 */

/** The original home sections, rendered by their dedicated components. */
export type HomeSectionKey = "categories" | "colourStory" | "newArrivals" | "look" | "craft" | "social" | "atelier";

export const HOME_SECTION_ORDER: HomeSectionKey[] = ["categories", "colourStory", "newArrivals", "look", "craft", "social", "atelier"];

export const HOME_SECTION_LABELS: Record<HomeSectionKey, string> = {
  categories: "التصنيفات (خزانة الرجل المرموق)",
  colourStory: "قصة الألوان",
  newArrivals: "وصل حديثاً",
  look: "إطلالة الموسم",
  craft: "مبادئ مرموق",
  social: "المجتمع وآراء العملاء",
  atelier: "دعوة منسّق الإطلالة",
};

/** Section surface colours (mapped to theme tokens, so they follow the brand colours). */
export type BlockTone = "paper" | "ivory" | "bone" | "dark" | "accent";
export const BLOCK_TONES: { value: BlockTone; label: string }[] = [
  { value: "paper", label: "فاتح" },
  { value: "ivory", label: "عاجي" },
  { value: "bone", label: "بيج" },
  { value: "dark", label: "داكن" },
  { value: "accent", label: "اللون المميز" },
];

export type BlockAlign = "start" | "center";

/** Icons offered for feature items (rendered with lucide-react on the storefront). */
export const FEATURE_ICONS = ["truck", "shield", "sparkles", "gem", "ruler", "refresh", "wallet", "star", "scissors", "leaf", "gift", "clock", "phone", "heart", "badge", "package"] as const;
export type FeatureIcon = (typeof FEATURE_ICONS)[number];

type Base = { id: string; enabled: boolean };

export type BuiltinBlock = Base & { type: "builtin"; key: HomeSectionKey };

/** Full-width image with text overlay and up to one button. */
export type BannerBlock = Base & {
  type: "banner";
  mediaId: string | null;
  mobileMediaId: string | null;
  eyebrow: string;
  title: string;
  text: string;
  ctaLabel: string;
  ctaHref: string;
  align: "start" | "center" | "end";
  height: "md" | "lg" | "screen";
  /** Darkness of the overlay, 0–90 (%) */
  overlay: number;
};

/** A grid or horizontal carousel of product cards. */
export type ProductsBlock = Base & {
  type: "products";
  eyebrow: string;
  title: string;
  subtitle: string;
  source: "newest" | "featured" | "new" | "category" | "manual";
  /** used when source = "category" */
  categorySlug: string;
  /** used when source = "manual" (ordered) */
  productIds: number[];
  /** 2–24 */
  limit: number;
  layout: "grid" | "carousel";
  ctaLabel: string;
  ctaHref: string;
};

/** Editorial text section (title + paragraph + optional button). */
export type TextBlock = Base & {
  type: "text";
  eyebrow: string;
  title: string;
  text: string;
  align: BlockAlign;
  tone: BlockTone;
  ctaLabel: string;
  ctaHref: string;
};

/** Image beside text. */
export type ImageTextBlock = Base & {
  type: "imageText";
  mediaId: string | null;
  eyebrow: string;
  title: string;
  text: string;
  ctaLabel: string;
  ctaHref: string;
  imageSide: "start" | "end";
  tone: BlockTone;
};

/** Image grid; each tile may have a caption and a link (great for collections / lookbooks). */
export type GalleryBlock = Base & {
  type: "gallery";
  eyebrow: string;
  title: string;
  items: { mediaId: string | null; caption: string; href: string }[];
  columns: 2 | 3 | 4;
  aspect: "portrait" | "square" | "landscape";
};

/** Icon + title + text list (delivery, payment, guarantees…). */
export type FeaturesBlock = Base & {
  type: "features";
  eyebrow: string;
  title: string;
  subtitle: string;
  items: { icon: FeatureIcon; title: string; body: string }[];
  tone: BlockTone;
};

/** YouTube / Vimeo link or a direct https .mp4 file. */
export type VideoBlock = Base & {
  type: "video";
  eyebrow: string;
  title: string;
  text: string;
  url: string;
  /** optional poster image (used for .mp4) */
  posterId: string | null;
  /** muted autoplay loop (mp4 only) */
  autoplay: boolean;
};

/** Moving band of short phrases. */
export type MarqueeBlock = Base & {
  type: "marquee";
  items: string[];
  tone: "ivory" | "espresso" | "copper" | "burgundy" | "navy";
  /** seconds per loop, 10–120 */
  speed: number;
};

/** One shoppable look with hotspots ("" = the first look that has items). */
export type LookBlock = Base & { type: "look"; eyebrow: string; lookSlug: string };

/** Newsletter sign-up band. */
export type NewsletterBlock = Base & { type: "newsletter"; eyebrow: string; title: string; text: string; tone: BlockTone };

/** Questions & answers accordion. */
export type FaqBlock = Base & { type: "faq"; eyebrow: string; title: string; items: { q: string; a: string }[] };

/** Countdown to a date (sales, drops). Hides itself after the date unless `keepAfter`. */
export type CountdownBlock = Base & {
  type: "countdown";
  eyebrow: string;
  title: string;
  text: string;
  /** ISO date-time, e.g. 2026-11-28T21:00 (store local time) */
  endsAt: string;
  ctaLabel: string;
  ctaHref: string;
  tone: BlockTone;
  /** text shown after the countdown ends ("" = hide the section) */
  endedText: string;
};

/** Vertical breathing room / hairline divider. */
export type SpacerBlock = Base & { type: "spacer"; size: "sm" | "md" | "lg"; line: boolean };

export type Block =
  | BuiltinBlock
  | BannerBlock
  | ProductsBlock
  | TextBlock
  | ImageTextBlock
  | GalleryBlock
  | FeaturesBlock
  | VideoBlock
  | MarqueeBlock
  | LookBlock
  | NewsletterBlock
  | FaqBlock
  | CountdownBlock
  | SpacerBlock;

export type BlockType = Block["type"];
export type AddableBlockType = Exclude<BlockType, "builtin">;

/** Where extra blocks go on a regular storefront page. */
export type BlockPosition = "top" | "bottom";

/** A block placed on a regular (non-home) page. */
export type PlacedBlock = Block & { position: BlockPosition };

/** Storefront pages that accept extra sections (besides home & custom pages). */
export type StorePageKey = "shop" | "product" | "looks" | "atelier" | "about" | "contact";
export const STORE_PAGES: { key: StorePageKey; label: string; href: string; topHint: string; bottomHint: string }[] = [
  { key: "shop", label: "المتجر وكل التصنيفات", href: "/shop", topHint: "بعد عنوان الصفحة وقبل المنتجات", bottomHint: "بعد شبكة المنتجات" },
  { key: "product", label: "صفحة المنتج (كل المنتجات)", href: "/shop", topHint: "بعد تفاصيل المنتج مباشرة", bottomHint: "في آخر الصفحة" },
  { key: "looks", label: "الإطلالات", href: "/looks", topHint: "بعد المقدمة", bottomHint: "في آخر الصفحة" },
  { key: "atelier", label: "منسّق الإطلالة", href: "/atelier", topHint: "قبل المنسّق", bottomHint: "بعد المنسّق" },
  { key: "about", label: "قصتنا", href: "/about", topHint: "بعد صورة الغلاف", bottomHint: "في آخر الصفحة" },
  { key: "contact", label: "تواصل معنا", href: "/contact", topHint: "بعد العنوان", bottomHint: "في آخر الصفحة" },
];

export type CustomPage = {
  id: string;
  /** URL part: /pages/{slug} (latin, digits, Arabic letters and dashes) */
  slug: string;
  title: string;
  /** SEO description */
  description: string;
  /** Show the editorial page header (eyebrow + title + intro) */
  showHeader: boolean;
  eyebrow: string;
  intro: string;
  published: boolean;
  blocks: Block[];
};

export type Layouts = {
  /** null/undefined = not customised yet → the original sections in their original order */
  home?: Block[] | null;
} & Partial<Record<StorePageKey, PlacedBlock[]>>;

export const BLOCK_LIMITS = { perLayout: 40, customPages: 30, galleryItems: 16, featureItems: 8, faqItems: 20, marqueeItems: 12, manualProducts: 24 } as const;

/** Catalog shown in the "add section" picker. `icon` is a lucide-react icon name used by the admin. */
export const BLOCK_CATALOG: { type: AddableBlockType; label: string; description: string; icon: string }[] = [
  { type: "banner", label: "بانر بصورة", description: "صورة عريضة بعنوان وزر — للعروض والمجموعات الجديدة.", icon: "GalleryHorizontal" },
  { type: "products", label: "منتجات", description: "شبكة أو شريط منتجات: الأحدث، المميزة، تصنيف معيّن أو قطع تختارها بنفسك.", icon: "ShoppingBag" },
  { type: "imageText", label: "صورة ونص", description: "صورة بجانبها عنوان وفقرة وزر.", icon: "LayoutPanelLeft" },
  { type: "text", label: "نص", description: "عنوان وفقرة — رسالة، قصة، أو إعلان.", icon: "Type" },
  { type: "gallery", label: "معرض صور", description: "صور بعناوين وروابط — مجموعات، إطلالات، أو صور من إنستغرام.", icon: "LayoutGrid" },
  { type: "features", label: "مميزات", description: "أيقونات مع نص قصير: التوصيل، الدفع، الضمان…", icon: "BadgeCheck" },
  { type: "video", label: "فيديو", description: "فيديو من يوتيوب أو فيميو أو رابط mp4.", icon: "Clapperboard" },
  { type: "look", label: "إطلالة قابلة للتسوّق", description: "صورة إطلالة بنقاط تفتح القطع وتضيفها للسلة.", icon: "Shirt" },
  { type: "countdown", label: "عدّاد تنازلي", description: "عدّاد لعرض أو إطلاق قادم.", icon: "Timer" },
  { type: "marquee", label: "شريط متحرك", description: "عبارات قصيرة تتحرك بعرض الصفحة.", icon: "MoveHorizontal" },
  { type: "newsletter", label: "اشتراك بالقائمة", description: "خانة بريد للانضمام لقائمة العملاء.", icon: "Mail" },
  { type: "faq", label: "أسئلة وأجوبة", description: "أسئلة قابلة للفتح والإغلاق.", icon: "MessageCircleQuestion" },
  { type: "spacer", label: "فاصل", description: "مسافة أو خط رفيع بين الأقسام.", icon: "SeparatorHorizontal" },
];

export const BLOCK_LABELS: Record<BlockType, string> = {
  builtin: "قسم أساسي",
  ...(Object.fromEntries(BLOCK_CATALOG.map((b) => [b.type, b.label])) as Record<AddableBlockType, string>),
};

export function newBlockId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID().replace(/-/g, "").slice(0, 12);
  return Math.random().toString(36).slice(2, 14).padEnd(12, "0");
}

/** A fresh block of the given type with sensible Arabic placeholder content. */
export function createBlock(type: AddableBlockType): Block {
  const id = newBlockId();
  const enabled = true;
  switch (type) {
    case "banner":
      return { id, enabled, type, mediaId: null, mobileMediaId: null, eyebrow: "New Season", title: "مجموعة جديدة وصلت", text: "قطع مختارة بعناية لموسم جديد.", ctaLabel: "تسوّق الآن", ctaHref: "/shop", align: "center", height: "lg", overlay: 40 };
    case "products":
      return { id, enabled, type, eyebrow: "Selected Pieces", title: "مختارات مرموق", subtitle: "", source: "newest", categorySlug: "", productIds: [], limit: 8, layout: "grid", ctaLabel: "عرض الكل", ctaHref: "/shop" };
    case "text":
      return { id, enabled, type, eyebrow: "", title: "عنوان القسم", text: "اكتب هنا رسالتك لعملائك.", align: "center", tone: "paper", ctaLabel: "", ctaHref: "" };
    case "imageText":
      return { id, enabled, type, mediaId: null, eyebrow: "", title: "عنوان القسم", text: "اكتب وصفاً قصيراً بجانب الصورة.", ctaLabel: "اكتشف المزيد", ctaHref: "/shop", imageSide: "start", tone: "ivory" };
    case "gallery":
      return { id, enabled, type, eyebrow: "", title: "معرض الصور", items: [], columns: 3, aspect: "portrait" };
    case "features":
      return {
        id,
        enabled,
        type,
        eyebrow: "",
        title: "ليش مرموق؟",
        subtitle: "",
        tone: "paper",
        items: [
          { icon: "truck", title: "توصيل لكل المحافظات", body: "نوصل طلبك لين باب بيتك." },
          { icon: "wallet", title: "الدفع عند الاستلام", body: "ادفع لما توصلك قطعتك." },
          { icon: "refresh", title: "استبدال سهل", body: "استبدال المقاس أو اللون خلال 3 أيام." },
        ],
      };
    case "video":
      return { id, enabled, type, eyebrow: "", title: "", text: "", url: "", posterId: null, autoplay: false };
    case "marquee":
      return { id, enabled, type, items: ["قطن 100%", "صنع إيطالي", "توصيل لكل المحافظات"], tone: "espresso", speed: 38 };
    case "look":
      return { id, enabled, type, eyebrow: "Shop the Look", lookSlug: "" };
    case "newsletter":
      return { id, enabled, type, eyebrow: "The Private List", title: "انضم لقائمة مرموق الخاصة", text: "كن أول من يعرف بالمجموعات الجديدة والعروض.", tone: "dark" };
    case "faq":
      return { id, enabled, type, eyebrow: "", title: "أسئلة شائعة", items: [{ q: "كم يأخذ التوصيل؟", a: "عادة من 1 إلى 4 أيام عمل حسب مدينتك." }] };
    case "countdown":
      return { id, enabled, type, eyebrow: "Limited Time", title: "العرض ينتهي قريباً", text: "", endsAt: "", ctaLabel: "تسوّق العرض", ctaHref: "/shop", tone: "dark", endedText: "" };
    case "spacer":
      return { id, enabled, type, size: "md", line: true };
  }
}

/** The original home page: all built-in sections in their original order, honouring the old on/off switches. */
export function defaultHomeLayout(sections?: Partial<Record<HomeSectionKey, boolean>>): Block[] {
  return HOME_SECTION_ORDER.map((key) => ({ id: `builtin-${key}`, type: "builtin" as const, key, enabled: sections?.[key] ?? true }));
}

/** The home layout to render/edit: the saved one, or the original sections. Built-ins missing from a saved layout are not re-added (the merchant removed them). */
export function resolveHomeLayout(layouts: Layouts | undefined, sections?: Partial<Record<HomeSectionKey, boolean>>): Block[] {
  const saved = layouts?.home;
  return Array.isArray(saved) ? saved : defaultHomeLayout(sections);
}

/** Blocks for a regular page at a position (enabled only). */
export function pageBlocks(layouts: Layouts | undefined, page: StorePageKey, position: BlockPosition): Block[] {
  return (layouts?.[page] ?? []).filter((b) => b.enabled && (b.position ?? "bottom") === position);
}

/** Recognises YouTube / Vimeo links and direct .mp4/.webm files. */
export function parseVideoUrl(url: string): { kind: "youtube" | "vimeo"; id: string } | { kind: "file"; src: string } | null {
  const u = url.trim();
  if (!u) return null;
  const yt = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) return { kind: "youtube", id: yt[1] };
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/);
  if (vm) return { kind: "vimeo", id: vm[1] };
  if (/^https:\/\/[^\s]+\.(mp4|webm)(\?[^\s]*)?$/i.test(u)) return { kind: "file", src: u };
  return null;
}

/** Every media id referenced by a list of blocks (for batch loading / validation). */
export function blockMediaIds(blocks: Block[]): string[] {
  const ids = new Set<string>();
  for (const b of blocks) {
    if (b.type === "banner") {
      if (b.mediaId) ids.add(b.mediaId);
      if (b.mobileMediaId) ids.add(b.mobileMediaId);
    } else if (b.type === "imageText" && b.mediaId) ids.add(b.mediaId);
    else if (b.type === "video" && b.posterId) ids.add(b.posterId);
    else if (b.type === "gallery") for (const it of b.items) if (it.mediaId) ids.add(it.mediaId);
  }
  return [...ids];
}

/** The store's clock (Yemen, Asia/Aden — no daylight saving): countdowns are entered in this time. */
export const STORE_TIME_ZONE = "Asia/Aden";
const STORE_UTC_OFFSET = "+03:00";

/** End instant of a countdown ("2026-11-28T21:00" = 9 pm store time); NaN when invalid. */
export function countdownEndMs(endsAt: string): number {
  const v = endsAt.trim();
  if (!v) return NaN;
  if (/(?:z|[+-]\d{2}:?\d{2})$/i.test(v)) return Date.parse(v);
  const full = v.includes("T") ? (v.length === 16 ? `${v}:00` : v) : `${v}T00:00:00`;
  return Date.parse(`${full}${STORE_UTC_OFFSET}`);
}

/** URL-safe slug for custom pages (keeps Arabic letters). */
export function pageSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
