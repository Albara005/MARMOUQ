"use client";

import {
  BadgeCheck,
  Badge,
  Blocks,
  Clapperboard,
  Clock,
  GalleryHorizontal,
  Gem,
  Gift,
  Heart,
  LayoutGrid,
  LayoutPanelLeft,
  Leaf,
  Mail,
  MessageCircleQuestionMark,
  MoveHorizontal,
  Package,
  Palette,
  Phone,
  RefreshCw,
  Ruler,
  Scissors,
  SeparatorHorizontal,
  Shield,
  Shirt,
  ShoppingBag,
  Sparkles,
  Star,
  Timer,
  Truck,
  Type,
  Users,
  Wallet,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { BLOCK_CATALOG, BLOCK_LABELS, HOME_SECTION_LABELS, parseVideoUrl, type Block, type BlockType, type FeatureIcon, type HomeSectionKey } from "@/lib/blocks";
import { cn } from "@/lib/utils";

/** Options the block editors pick from (loaded by the settings page). */
export type SectionsCatalog = {
  products: { id: number; name: string; imageId: string | null }[];
  categories: { slug: string; name: string }[];
  looks: { slug: string; title: string }[];
};

/* BLOCK_CATALOG names its icons as strings — map each name to the imported component. */
const ICONS_BY_NAME: Record<string, LucideIcon> = {
  GalleryHorizontal,
  ShoppingBag,
  LayoutPanelLeft,
  Type,
  LayoutGrid,
  BadgeCheck,
  Clapperboard,
  Shirt,
  Timer,
  MoveHorizontal,
  Mail,
  MessageCircleQuestion: MessageCircleQuestionMark,
  SeparatorHorizontal,
};

const ICON_BY_TYPE = Object.fromEntries(BLOCK_CATALOG.map((b) => [b.type, ICONS_BY_NAME[b.icon] ?? Blocks])) as Record<BlockType, LucideIcon>;

/** The original home sections get their own glyphs so the list reads at a glance. */
const BUILTIN_ICONS: Record<HomeSectionKey, LucideIcon> = {
  categories: LayoutGrid,
  colourStory: Palette,
  newArrivals: Sparkles,
  look: Shirt,
  craft: Scissors,
  social: Users,
  atelier: WandSparkles,
};

export function blockIcon(b: Block | BlockType): LucideIcon {
  if (typeof b !== "string") return b.type === "builtin" ? (BUILTIN_ICONS[b.key] ?? Blocks) : blockIcon(b.type);
  return b === "builtin" ? Blocks : (ICON_BY_TYPE[b] ?? Blocks);
}

/** Arabic names + admin preview icons for feature items (the storefront maps the same keys). */
export const FEATURE_ICON_META: Record<FeatureIcon, { label: string; icon: LucideIcon }> = {
  truck: { label: "شاحنة — التوصيل", icon: Truck },
  shield: { label: "درع — الضمان", icon: Shield },
  sparkles: { label: "لمعة — الجودة", icon: Sparkles },
  gem: { label: "جوهرة — الفخامة", icon: Gem },
  ruler: { label: "مسطرة — المقاسات", icon: Ruler },
  refresh: { label: "تبديل — الاستبدال", icon: RefreshCw },
  wallet: { label: "محفظة — الدفع", icon: Wallet },
  star: { label: "نجمة — التقييم", icon: Star },
  scissors: { label: "مقص — الخياطة", icon: Scissors },
  leaf: { label: "ورقة — خامة طبيعية", icon: Leaf },
  gift: { label: "هدية — التغليف", icon: Gift },
  clock: { label: "ساعة — السرعة", icon: Clock },
  phone: { label: "هاتف — التواصل", icon: Phone },
  heart: { label: "قلب — العناية", icon: Heart },
  badge: { label: "شارة — منتج أصلي", icon: Badge },
  package: { label: "صندوق — الشحنة", icon: Package },
};

export function BlockTypeIcon({ type, className }: { type: Block | BlockType; className?: string }) {
  const Icon = blockIcon(type);
  return <Icon className={cn("size-[1.05rem]", className)} aria-hidden strokeWidth={1.6} />;
}

/** Card heading: the type label, or the original section's name for built-ins. */
export function blockTitle(b: Block): string {
  return b.type === "builtin" ? HOME_SECTION_LABELS[b.key] : BLOCK_LABELS[b.type];
}

const SOURCE_SHORT = { newest: "الأحدث", featured: "المميزة", new: "الجديدة", category: "من تصنيف", manual: "اختيار يدوي" } as const;
const SIZE_SHORT = { sm: "صغير", md: "متوسط", lg: "كبير" } as const;
/** Arabic counted noun: [1, 2, 3–10, 11+] → «صورة واحدة»، «صورتان»، «3 صور»، «11 صورة». */
export function countAr(n: number, [one, two, few, many]: readonly [string, string, string, string]): string {
  if (n === 1) return one;
  if (n === 2) return two;
  return `${n} ${n >= 3 && n <= 10 ? few : many}`;
}
const IMAGES = ["صورة واحدة", "صورتان", "صور", "صورة"] as const;
const FEATURES = ["ميزة واحدة", "ميزتان", "ميزات", "ميزة"] as const;
const QUESTIONS = ["سؤال واحد", "سؤالان", "أسئلة", "سؤالاً"] as const;
export const PIECES = ["قطعة واحدة", "قطعتان", "قطع", "قطعة"] as const;

/** One quiet line under the card heading (what this block shows). */
export function blockSummary(b: Block, catalog?: SectionsCatalog): string {
  switch (b.type) {
    case "builtin":
      return "قسم أصلي · نصوصه من تبويب الواجهة";
    case "products": {
      let src: string = SOURCE_SHORT[b.source];
      if (b.source === "category") src = catalog?.categories.find((c) => c.slug === b.categorySlug)?.name || src;
      if (b.source === "manual" && b.productIds.length) src = `${src}: ${countAr(b.productIds.length, PIECES)}`;
      return [b.title, src].filter(Boolean).join(" · ");
    }
    case "gallery":
      return [b.title, b.items.length ? countAr(b.items.length, IMAGES) : ""].filter(Boolean).join(" · ");
    case "features":
      return [b.title, b.items.length ? countAr(b.items.length, FEATURES) : ""].filter(Boolean).join(" · ");
    case "faq":
      return [b.title, b.items.length ? countAr(b.items.length, QUESTIONS) : ""].filter(Boolean).join(" · ");
    case "marquee":
      return b.items.filter(Boolean).join(" ✦ ");
    case "look":
      return b.lookSlug ? (catalog?.looks.find((l) => l.slug === b.lookSlug)?.title ?? b.lookSlug) : "أول إطلالة متاحة";
    case "video": {
      const v = parseVideoUrl(b.url);
      const kind = v?.kind === "youtube" ? "يوتيوب" : v?.kind === "vimeo" ? "فيميو" : v ? "ملف فيديو" : "";
      return [b.title, kind].filter(Boolean).join(" · ");
    }
    case "countdown":
      return [b.title, b.endsAt ? b.endsAt.replace("T", " ") : ""].filter(Boolean).join(" · ");
    case "spacer":
      return `مسافة ${SIZE_SHORT[b.size]}${b.line ? " مع خط رفيع" : ""}`;
    default:
      return b.title;
  }
}

/** A gentle nudge when a block would render empty or broken on the storefront. */
export function blockIssue(b: Block): string | null {
  switch (b.type) {
    case "banner":
    case "imageText":
      return b.mediaId ? null : "أضف صورة";
    case "gallery":
      return b.items.some((i) => i.mediaId) ? null : "أضف صوراً للمعرض";
    case "products":
      return b.source === "manual" && !b.productIds.length ? "اختر القطع" : b.source === "category" && !b.categorySlug ? "اختر التصنيف" : null;
    case "video":
      return !b.url.trim() ? "أضف رابط الفيديو" : parseVideoUrl(b.url) ? null : "رابط غير مدعوم";
    case "countdown":
      return b.endsAt ? null : "حدّد موعد الانتهاء";
    case "marquee":
      return b.items.some((s) => s.trim()) ? null : "أضف عبارات";
    case "faq":
      return b.items.length ? null : "أضف سؤالاً";
    case "features":
      return b.items.length ? null : "أضف ميزة";
    default:
      return null;
  }
}
