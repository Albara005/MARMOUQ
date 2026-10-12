"use server";

import { revalidatePath } from "next/cache";
import { inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { media } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings, saveSettings, type StoreSettings } from "@/lib/settings";
import { normalizePhone } from "@/lib/utils";
import { COPY_GROUPS } from "@/lib/copy";
import { blockMediaIds, type Block } from "@/lib/blocks";
import { customPagesSchema, layoutsSchema } from "@/lib/blocks-schema";
import { actionError, actionOk, zodFieldErrors, type ActionResult } from "@/components/admin/action-result";

const text = (max: number, msg = `الحد الأقصى ${max} حرفاً`) => z.string().trim().max(max, msg);
const required = (min: number, max: number, msg: string) => z.string().trim().min(min, msg).max(max, `الحد الأقصى ${max} حرفاً`);

const phone = z
  .string()
  .trim()
  .max(24, "رقم طويل")
  .transform((v) => (v ? normalizePhone(v) : ""))
  .refine((v) => v === "" || /^\+?\d{7,15}$/.test(v), "رقم غير صحيح — اكتبه بالأرقام مع رمز الدولة مثل 967770000000");

/** Accepts a full URL or a bare handle (@marmouq.ye) and stores a full https URL. */
const social = (host: "instagram" | "tiktok") =>
  z
    .string()
    .trim()
    .max(200, "الرابط طويل")
    .transform((v) => {
      if (!v) return "";
      const handle = v.match(/^@?([A-Za-z0-9._]{2,40})$/);
      if (handle) return host === "instagram" ? `https://www.instagram.com/${handle[1]}` : `https://www.tiktok.com/@${handle[1]}`;
      return /^https?:\/\//i.test(v) ? v : `https://${v}`;
    })
    .refine((v) => v === "" || /^https:\/\/[^\s]+\.[^\s]+/i.test(v), "رابط غير صالح");

const href = z
  .string()
  .trim()
  .max(200)
  .refine((v) => /^\/[^\s]*$/.test(v) || /^https:\/\/[^\s]+$/i.test(v), "ابدأ الرابط بـ / لصفحة داخلية أو https://");

const HEX_OR_EMPTY = z.union([z.literal(""), z.string().regex(/^#[0-9a-fA-F]{6}$/, "لون غير صالح")]);

const TONE = z.enum(["espresso", "copper", "burgundy", "navy", "ivory"]);

const money = (max: number) => z.coerce.number({ message: "أدخل رقماً" }).int("أدخل رقماً صحيحاً").min(0, "لا يقبل قيمة سالبة").max(max, "القيمة كبيرة جداً");

const settingsSchema = z
  .object({
    storeName: required(2, 40, "اسم المتجر مطلوب"),
    storeNameEn: text(40),
    tagline: text(120),
    description: text(400),
    whatsapp: phone,
    phone: phone,
    email: z.union([z.literal(""), z.email("بريد إلكتروني غير صحيح")]),
    instagram: social("instagram"),
    tiktok: social("tiktok"),
    address: text(120),
    workingHours: text(120),
    currency: z.object({
      code: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{3}$/, "رمز من 3 أحرف لاتينية مثل YER"),
      symbol: required(1, 8, "رمز العملة مطلوب"),
      position: z.enum(["after", "before"]),
    }),
    freeShippingThreshold: money(100_000_000),
    lowStockThreshold: money(1000),
    announcements: z.array(required(2, 120, "النص قصير جداً")).max(8, "8 رسائل كحد أقصى"),
    hero: z.object({
      eyebrow: text(80),
      title: required(2, 120, "العنوان مطلوب"),
      subtitle: text(300),
      ctaLabel: required(2, 30, "نص الزر مطلوب"),
      ctaHref: href,
      mediaId: z
        .string()
        .regex(/^[a-f0-9]{8,64}$/)
        .nullable(),
      mobileMediaId: z
        .string()
        .regex(/^[a-f0-9]{8,64}$/)
        .nullable(),
      overlay: z.coerce.number().int().min(0).max(90),
      secondaryLabel: text(30),
      secondaryHref: z.union([z.literal(""), href]),
      sideText: text(60),
    }),
    payments: z.object({
      cod: z.object({ enabled: z.boolean(), label: required(2, 40, "اسم الطريقة مطلوب"), note: text(300) }),
      transfer: z.object({
        enabled: z.boolean(),
        label: required(2, 40, "اسم الطريقة مطلوب"),
        note: text(400),
        accounts: z
          .array(
            z.object({
              bank: required(2, 40, "اسم الجهة مطلوب"),
              holder: text(60),
              number: required(1, 40, "رقم الحساب مطلوب"),
            }),
          )
          .max(8, "8 حسابات كحد أقصى"),
      }),
    }),
    policies: z.object({ shipping: text(4000), returns: text(4000), privacy: text(4000) }),
    testimonials: z
      .array(z.object({ name: required(2, 40, "الاسم مطلوب"), city: text(30), quote: required(5, 300, "اكتب الشهادة") }))
      .max(12, "12 شهادة كحد أقصى"),
    seo: z.object({ title: required(5, 80, "عنوان الصفحة مطلوب"), description: text(200) }),
    markets: z.object({
      switcher: z.boolean(),
      defaultCode: z.string().trim().toUpperCase().max(3),
      currencies: z
        .array(
          z.object({
            code: z
              .string()
              .trim()
              .toUpperCase()
              .regex(/^[A-Z]{3}$/, "رمز من 3 أحرف لاتينية مثل SAR"),
            symbol: required(1, 8, "رمز العملة مطلوب"),
            label: text(30),
            position: z.enum(["after", "before"]),
            basePerUnit: z.coerce.number({ message: "أدخل سعر الصرف" }).positive("سعر الصرف يجب أن يكون أكبر من صفر").max(1_000_000_000),
            markup: z.coerce.number({ message: "أدخل نسبة" }).min(-50, "أقل نسبة -50%").max(300, "أعلى نسبة 300%"),
            decimals: z.union([z.literal(0), z.literal(2)]),
            roundTo: z.coerce.number({ message: "أدخل رقماً" }).min(0).max(100_000),
            enabled: z.boolean(),
          }),
        )
        .max(12, "12 عملة كحد أقصى"),
    }),
    bars: z.object({
      announcement: z.object({ enabled: z.boolean(), tone: TONE, href: z.union([z.literal(""), href]), interval: z.coerce.number().int().min(2, "ثانيتان على الأقل").max(30, "30 ثانية كحد أقصى") }),
      marquee: z.object({
        enabled: z.boolean(),
        tone: TONE,
        items: z.array(required(1, 60, "النص فارغ")).max(12, "12 عبارة كحد أقصى"),
        speed: z.coerce.number().int().min(10, "10 ثوانٍ على الأقل").max(120, "120 ثانية كحد أقصى"),
      }),
    }),
    copy: z.record(z.string().max(80), z.string().max(4000, "النص طويل جداً")).refine((r) => Object.keys(r).length <= 400, "عدد الحقول كبير"),
    nav: z.array(z.object({ label: required(1, 30, "اسم الرابط مطلوب"), href })).max(8, "8 روابط كحد أقصى"),
    faq: z.array(z.object({ q: required(3, 160, "اكتب السؤال"), a: required(3, 1500, "اكتب الإجابة") })).max(20, "20 سؤالاً كحد أقصى"),
    theme: z.object({ accent: HEX_OR_EMPTY, dark: HEX_OR_EMPTY, background: HEX_OR_EMPTY }),
    brand: z.object({
      logoId: z
        .string()
        .regex(/^[a-f0-9]{8,64}$/)
        .nullable(),
      logoHeight: z.coerce.number().int().min(20).max(96),
    }),
    carriers: z
      .array(
        z.object({
          id: z.string().regex(/^[A-Za-z0-9_-]{4,40}$/),
          name: required(2, 40, "اسم الشركة مطلوب"),
          trackingUrl: z
            .string()
            .trim()
            .max(300, "الرابط طويل")
            .refine((v) => v === "" || /^https:\/\/[^\s]+\.[^\s]+$/i.test(v), "الرابط يجب أن يبدأ بـ https://"),
          phone,
          enabled: z.boolean(),
        }),
      )
      .max(12, "12 شركة كحد أقصى"),
    layouts: layoutsSchema,
    customPages: customPagesSchema,
    home: z.object({
      sections: z.object({
        categories: z.boolean(),
        colourStory: z.boolean(),
        newArrivals: z.boolean(),
        look: z.boolean(),
        craft: z.boolean(),
        social: z.boolean(),
        atelier: z.boolean(),
      }),
      categories: z.object({ eyebrow: text(40), title: required(2, 80, "العنوان مطلوب"), subtitle: text(240) }),
      colourStory: z.object({ eyebrow: text(40), title: required(2, 80, "العنوان مطلوب"), productSlug: text(80) }),
      newArrivals: z.object({ eyebrow: text(40), title: required(2, 80, "العنوان مطلوب"), subtitle: text(240), source: z.enum(["newest", "featured", "all"]) }),
      look: z.object({ eyebrow: text(40), lookSlug: text(80) }),
      craft: z.object({
        eyebrow: text(40),
        title: required(2, 80, "العنوان مطلوب"),
        subtitle: text(240),
        items: z.array(z.object({ title: required(2, 40, "العنوان مطلوب"), body: text(240) })).max(6, "6 نقاط كحد أقصى"),
      }),
      social: z.object({ eyebrow: text(40), statValue: text(12), title: required(2, 80, "العنوان مطلوب"), text: text(240) }),
      atelier: z.object({ eyebrow: text(40), title: required(2, 80, "العنوان مطلوب"), text: text(300), ctaLabel: required(2, 30, "نص الزر مطلوب") }),
    }),
  })
  .superRefine((v, ctx) => {
    if (!v.payments.cod.enabled && !v.payments.transfer.enabled) {
      ctx.addIssue({ code: "custom", path: ["payments", "cod", "enabled"], message: "فعّل طريقة دفع واحدة على الأقل" });
    }
    const codes = new Set<string>();
    v.markets.currencies.forEach((c, i) => {
      if (c.code === v.currency.code) ctx.addIssue({ code: "custom", path: ["markets", "currencies", i, "code"], message: "هذه هي العملة الأساسية — اختر عملة أخرى" });
      else if (codes.has(c.code)) ctx.addIssue({ code: "custom", path: ["markets", "currencies", i, "code"], message: "العملة مكررة" });
      codes.add(c.code);
    });
    if (v.markets.defaultCode && v.markets.defaultCode !== v.currency.code && !v.markets.currencies.some((c) => c.enabled && c.code === v.markets.defaultCode)) {
      ctx.addIssue({ code: "custom", path: ["markets", "defaultCode"], message: "العملة الافتراضية يجب أن تكون مفعّلة" });
    }
    if (v.payments.transfer.enabled && v.payments.transfer.accounts.length === 0) {
      ctx.addIssue({ code: "custom", path: ["payments", "transfer", "accounts"], message: "أضف حساباً واحداً على الأقل لاستقبال الحوالات" });
    }
  });

export async function saveSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin("manager");
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return actionError("تعذّر قراءة البيانات، أعد المحاولة");
  }
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) return actionError("لم تُحفظ الإعدادات — راجع الحقول المظلّلة", zodFieldErrors(parsed.error));
  const v = parsed.data;

  const heroIds = [v.hero.mediaId, v.hero.mobileMediaId].filter((x): x is string => !!x);
  if (heroIds.length) {
    const found = await db.select({ id: media.id }).from(media).where(inArray(media.id, heroIds));
    if (v.hero.mediaId && !found.some((f) => f.id === v.hero.mediaId)) return actionError("صورة الواجهة غير موجودة", { "hero.mediaId": "ارفع الصورة من جديد" });
    if (v.hero.mobileMediaId && !found.some((f) => f.id === v.hero.mobileMediaId)) return actionError("صورة الجوال غير موجودة", { "hero.mobileMediaId": "ارفع الصورة من جديد" });
  }

  // Section images: drop references to media that no longer exists (never fail the save for it)
  const allBlocks: Block[] = [
    ...(v.layouts.home ?? []),
    ...(["shop", "product", "looks", "atelier", "about", "contact"] as const).flatMap((k) => v.layouts[k] ?? []),
    ...v.customPages.flatMap((p) => p.blocks),
  ] as Block[];
  const blockIds = blockMediaIds(allBlocks);
  const found = new Set(blockIds.length ? (await db.select({ id: media.id }).from(media).where(inArray(media.id, blockIds))).map((f) => f.id) : []);
  const keep = (id: string | null) => (id && found.has(id) ? id : null);
  for (const b of allBlocks) {
    if (b.type === "banner") {
      b.mediaId = keep(b.mediaId);
      b.mobileMediaId = keep(b.mobileMediaId);
    } else if (b.type === "imageText") b.mediaId = keep(b.mediaId);
    else if (b.type === "video") b.posterId = keep(b.posterId);
    else if (b.type === "gallery") b.items = b.items.filter((it) => it.mediaId && found.has(it.mediaId));
  }

  const copy: Record<string, string> = {};
  for (const g of COPY_GROUPS)
    for (const f of g.fields) {
      const val = (v.copy[f.key] ?? "").trim();
      if (!val || val === f.def) continue;
      if (f.type === "image" && !/^[a-f0-9]{8,64}$/.test(val)) continue;
      copy[f.key] = val;
    }
  v.copy = copy;

  const current = await getSettings();
  const next: StoreSettings = {
    ...current,
    ...v,
    currency: { ...current.currency, ...v.currency },
    hero: { ...current.hero, ...v.hero },
    payments: {
      cod: { ...current.payments.cod, ...v.payments.cod },
      transfer: { ...current.payments.transfer, ...v.payments.transfer },
    },
    policies: { ...current.policies, ...v.policies },
    seo: { ...current.seo, ...v.seo },
  };
  try {
    await saveSettings(next);
  } catch (err) {
    console.error("[settings] save", err);
    return actionError("تعذّر حفظ الإعدادات");
  }
  revalidatePath("/", "layout");
  return actionOk("حُفظت الإعدادات وظهرت في المتجر", { settings: next });
}
