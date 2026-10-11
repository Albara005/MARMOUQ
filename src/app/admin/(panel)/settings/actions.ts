"use server";

import { revalidatePath } from "next/cache";
import { inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { media } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings, saveSettings, type StoreSettings } from "@/lib/settings";
import { normalizePhone } from "@/lib/utils";
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
  })
  .superRefine((v, ctx) => {
    if (!v.payments.cod.enabled && !v.payments.transfer.enabled) {
      ctx.addIssue({ code: "custom", path: ["payments", "cod", "enabled"], message: "فعّل طريقة دفع واحدة على الأقل" });
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

  if (v.hero.mediaId) {
    const found = await db.select({ id: media.id }).from(media).where(inArray(media.id, [v.hero.mediaId]));
    if (!found.length) return actionError("صورة الواجهة غير موجودة", { "hero.mediaId": "ارفع الصورة من جديد" });
  }

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
