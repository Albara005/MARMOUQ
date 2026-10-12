/**
 * Validation for page sections & custom pages (mirrors the types in src/lib/blocks.ts).
 * Error paths follow the JSON path ("layouts.home.3.title", "customPages.1.blocks.0.url").
 */
import { z } from "zod";
import { BLOCK_LIMITS, FEATURE_ICONS, HOME_SECTION_ORDER, parseVideoUrl, type HomeSectionKey } from "@/lib/blocks";

const text = (max: number) => z.string().trim().max(max, `الحد الأقصى ${max} حرفاً`);
const mediaId = z
  .string()
  .regex(/^[a-f0-9]{8,64}$/)
  .nullable()
  .catch(null);

/** "" or an internal path ("/shop") or an https link — never javascript:, data:, http: or protocol-relative. */
const link = z
  .string()
  .trim()
  .max(300, "الرابط طويل")
  .refine((v) => v === "" || /^\/(?!\/)[^\s]*$/.test(v) || /^https:\/\/[^\s]+\.[^\s]+$/i.test(v), "ابدأ الرابط بـ / لصفحة داخلية أو https://");

const base = { id: z.string().regex(/^[A-Za-z0-9_-]{4,40}$/, "معرّف غير صالح"), enabled: z.boolean() };
const tone = z.enum(["paper", "ivory", "bone", "dark", "accent"]);
const int = (min: number, max: number) => z.coerce.number({ message: "أدخل رقماً" }).int().min(min, `أقل قيمة ${min}`).max(max, `أعلى قيمة ${max}`);

const builtin = z.object({ ...base, type: z.literal("builtin"), key: z.enum(HOME_SECTION_ORDER as [HomeSectionKey, ...HomeSectionKey[]]) });

const banner = z.object({
  ...base,
  type: z.literal("banner"),
  mediaId,
  mobileMediaId: mediaId,
  eyebrow: text(60),
  title: text(120),
  text: text(600),
  ctaLabel: text(30),
  ctaHref: link,
  align: z.enum(["start", "center", "end"]),
  height: z.enum(["md", "lg", "screen"]),
  overlay: int(0, 90),
});

const products = z.object({
  ...base,
  type: z.literal("products"),
  eyebrow: text(60),
  title: text(120),
  subtitle: text(400),
  source: z.enum(["newest", "featured", "new", "category", "manual"]),
  categorySlug: text(80),
  productIds: z.array(z.coerce.number().int().positive()).max(BLOCK_LIMITS.manualProducts, `${BLOCK_LIMITS.manualProducts} قطعة كحد أقصى`),
  limit: int(2, 24),
  layout: z.enum(["grid", "carousel"]),
  ctaLabel: text(30),
  ctaHref: link,
});

const textBlock = z.object({
  ...base,
  type: z.literal("text"),
  eyebrow: text(60),
  title: text(120),
  text: text(1500),
  align: z.enum(["start", "center"]),
  tone,
  ctaLabel: text(30),
  ctaHref: link,
});

const imageText = z.object({
  ...base,
  type: z.literal("imageText"),
  mediaId,
  eyebrow: text(60),
  title: text(120),
  text: text(1500),
  ctaLabel: text(30),
  ctaHref: link,
  imageSide: z.enum(["start", "end"]),
  tone,
});

const gallery = z.object({
  ...base,
  type: z.literal("gallery"),
  eyebrow: text(60),
  title: text(120),
  items: z.array(z.object({ mediaId, caption: text(80), href: link })).max(BLOCK_LIMITS.galleryItems, `${BLOCK_LIMITS.galleryItems} صورة كحد أقصى`),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  aspect: z.enum(["portrait", "square", "landscape"]),
});

const features = z.object({
  ...base,
  type: z.literal("features"),
  eyebrow: text(60),
  title: text(120),
  subtitle: text(400),
  items: z
    .array(z.object({ icon: z.enum(FEATURE_ICONS), title: text(60), body: text(300) }))
    .max(BLOCK_LIMITS.featureItems, `${BLOCK_LIMITS.featureItems} مميزات كحد أقصى`),
  tone,
});

const video = z.object({
  ...base,
  type: z.literal("video"),
  eyebrow: text(60),
  title: text(120),
  text: text(600),
  url: z
    .string()
    .trim()
    .max(500, "الرابط طويل")
    .refine((v) => v === "" || (v.startsWith("https://") && parseVideoUrl(v) !== null), "رابط غير مدعوم — استخدم رابط يوتيوب أو فيميو أو ملف mp4 يبدأ بـ https://"),
  posterId: mediaId,
  autoplay: z.boolean(),
});

const marquee = z.object({
  ...base,
  type: z.literal("marquee"),
  items: z
    .array(z.string().trim().min(1, "النص فارغ").max(60, "الحد الأقصى 60 حرفاً"))
    .max(BLOCK_LIMITS.marqueeItems, `${BLOCK_LIMITS.marqueeItems} عبارة كحد أقصى`),
  tone: z.enum(["ivory", "espresso", "copper", "burgundy", "navy"]),
  speed: int(10, 120),
});

const look = z.object({ ...base, type: z.literal("look"), eyebrow: text(60), lookSlug: text(80) });

const newsletter = z.object({ ...base, type: z.literal("newsletter"), eyebrow: text(60), title: text(120), text: text(400), tone });

const faq = z.object({
  ...base,
  type: z.literal("faq"),
  eyebrow: text(60),
  title: text(120),
  items: z
    .array(z.object({ q: z.string().trim().min(2, "اكتب السؤال").max(200, "الحد الأقصى 200 حرف"), a: z.string().trim().min(1, "اكتب الإجابة").max(1500, "الحد الأقصى 1500 حرف") }))
    .max(BLOCK_LIMITS.faqItems, `${BLOCK_LIMITS.faqItems} سؤالاً كحد أقصى`),
});

const countdown = z.object({
  ...base,
  type: z.literal("countdown"),
  eyebrow: text(60),
  title: text(120),
  text: text(400),
  endsAt: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v === "" || !Number.isNaN(new Date(v).getTime()), "تاريخ غير صالح"),
  ctaLabel: text(30),
  ctaHref: link,
  tone,
  endedText: text(200),
});

const spacer = z.object({ ...base, type: z.literal("spacer"), size: z.enum(["sm", "md", "lg"]), line: z.boolean() });

const ADDABLE = [banner, products, textBlock, imageText, gallery, features, video, marquee, look, newsletter, faq, countdown, spacer] as const;

/** Any block allowed on the home page (incl. the original sections). */
export const homeBlockSchema = z.discriminatedUnion("type", [builtin, ...ADDABLE]);
/** Blocks allowed on regular / custom pages. */
export const blockSchema = z.discriminatedUnion("type", [...ADDABLE]);
const position = { position: z.enum(["top", "bottom"]).catch("bottom") };
export const placedBlockSchema = z.discriminatedUnion("type", [
  banner.extend(position),
  products.extend(position),
  textBlock.extend(position),
  imageText.extend(position),
  gallery.extend(position),
  features.extend(position),
  video.extend(position),
  marquee.extend(position),
  look.extend(position),
  newsletter.extend(position),
  faq.extend(position),
  countdown.extend(position),
  spacer.extend(position),
]);

const MAX_BLOCKS = `${BLOCK_LIMITS.perLayout} قسماً كحد أقصى`;
const placedList = z.array(placedBlockSchema).max(BLOCK_LIMITS.perLayout, MAX_BLOCKS).optional();

export const layoutsSchema = z
  .object({
    home: z.array(homeBlockSchema).max(BLOCK_LIMITS.perLayout, MAX_BLOCKS).nullable().optional(),
    shop: placedList,
    product: placedList,
    looks: placedList,
    atelier: placedList,
    about: placedList,
    contact: placedList,
  })
  .superRefine((v, ctx) => {
    const seen = new Set<string>();
    v.home?.forEach((b, i) => {
      if (b.type !== "builtin") return;
      if (seen.has(b.key)) ctx.addIssue({ code: "custom", path: ["home", i, "key"], message: "القسم مكرر" });
      seen.add(b.key);
    });
  });

export const customPageSchema = z.object({
  id: base.id,
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "الرابط مطلوب")
    .max(60, "الحد الأقصى 60 حرفاً")
    .regex(/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u, "استخدم حروفاً وأرقاماً وشرطات فقط"),
  title: z.string().trim().min(2, "عنوان الصفحة مطلوب").max(80, "الحد الأقصى 80 حرفاً"),
  description: text(200),
  showHeader: z.boolean(),
  eyebrow: text(60),
  intro: text(600),
  published: z.boolean(),
  blocks: z.array(blockSchema).max(BLOCK_LIMITS.perLayout, MAX_BLOCKS),
});

export const customPagesSchema = z
  .array(customPageSchema)
  .max(BLOCK_LIMITS.customPages, `${BLOCK_LIMITS.customPages} صفحة كحد أقصى`)
  .superRefine((pages, ctx) => {
    const slugs = new Set<string>();
    pages.forEach((p, i) => {
      if (slugs.has(p.slug)) ctx.addIssue({ code: "custom", path: [i, "slug"], message: "الرابط مستخدم لصفحة أخرى" });
      slugs.add(p.slug);
    });
  });
