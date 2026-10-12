"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  ChevronDown,
  Landmark,
  LoaderCircle,
  Lock,
  PackageCheck,
  ShoppingBag,
  Tag,
  Truck,
  X,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Label, Select, Textarea, FieldError, FieldHint } from "@/components/ui/field";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { useMoney, useStoreConfig } from "@/components/store/store-provider";
import { useCart } from "@/components/store/cart/cart-provider";
import { applyCoupon, submitOrder } from "@/app/(store)/checkout/actions";
import { computeTotals, type CouponRule, type Totals } from "@/lib/pricing";
import type { ShippingZoneData } from "@/lib/catalog";
import type { PaymentAccount } from "@/lib/settings";
import { cn, whatsappLink } from "@/lib/utils";
import { useLookRules } from "./use-look-rules";
import { FreeShippingMeter, SummaryItems, SummaryRow, piecesLabel } from "./summary";
import { CopyButton } from "./client-buttons";
import { TrustList } from "./trust-list";

export type CheckoutPayments = {
  cod: { enabled: boolean; label: string; note: string };
  transfer: { enabled: boolean; label: string; note: string; accounts: PaymentAccount[] };
};

type Method = "cod" | "transfer";
type FieldName = "name" | "phone" | "zoneId" | "address" | "notes" | "paymentMethod";
const FIELD_ORDER: FieldName[] = ["name", "phone", "zoneId", "address", "notes", "paymentMethod"];
const PROFILE_KEY = "marmouq.checkout.v1";

type Profile = { name: string; phone: string; zoneId: string; address: string };

export function CheckoutForm({ zones, payments }: { zones: ShippingZoneData[]; payments: CheckoutPayments }) {
  const cart = useCart();
  const config = useStoreConfig();
  const money = useMoney();
  const router = useRouter();
  const uid = useId();

  const methods = useMemo(() => (["cod", "transfer"] as const).filter((m) => payments[m].enabled), [payments]);

  const [values, setValues] = useState<Profile & { notes: string }>({ name: "", phone: "", zoneId: "", address: "", notes: "" });
  const [method, setMethod] = useState<Method | "">(methods[0] ?? "");
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [stockNotice, setStockNotice] = useState<string[]>([]);
  const [coupon, setCoupon] = useState<CouponRule | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponPending, startCoupon] = useTransition();
  const [pending, startSubmit] = useTransition();
  const [placed, setPlaced] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const submitting = useRef(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Returning customers: prefill contact & delivery details saved on this device.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as Partial<Profile>;
      const zoneOk = p.zoneId && zones.some((z) => String(z.id) === p.zoneId);
      setValues((v) => ({
        ...v,
        name: v.name || (typeof p.name === "string" ? p.name : ""),
        phone: v.phone || (typeof p.phone === "string" ? p.phone : ""),
        zoneId: v.zoneId || (zoneOk ? String(p.zoneId) : ""),
        address: v.address || (typeof p.address === "string" ? p.address : ""),
      }));
    } catch {
      /* ignore */
    }
  }, [zones]);

  const lookIds = useMemo(() => cart.lines.map((l) => l.lookId), [cart.lines]);
  const { rules } = useLookRules(lookIds);
  const zone = zones.find((z) => String(z.id) === values.zoneId) ?? null;

  const totals: Totals = useMemo(
    () =>
      computeTotals({
        lines: cart.lines,
        looks: rules,
        coupon,
        shippingFee: zone?.fee ?? 0,
        freeShippingThreshold: config.freeShippingThreshold,
      }),
    [cart.lines, rules, coupon, zone, config.freeShippingThreshold],
  );
  const couponBlocked = !!coupon && !!totals.couponError;

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key as FieldName]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function onApplyCoupon(code: string) {
    setCouponError(null);
    startCoupon(async () => {
      const res = await applyCoupon(code);
      if (res.ok) setCoupon(res.coupon);
      else setCouponError(res.error);
    });
  }

  function validate(): Partial<Record<FieldName, string>> {
    const e: Partial<Record<FieldName, string>> = {};
    if (values.name.trim().length < 2) e.name = "اكتب اسمك الكريم";
    const digits = values.phone.replace(/[٠-٩]/g, "0").replace(/\D/g, "");
    if (!digits) e.phone = "رقم الجوال مطلوب لتأكيد الطلب";
    else if (digits.length < 7 || digits.length > 15) e.phone = "تأكد من رقم الجوال";
    if (!zone) e.zoneId = "اختر مدينة التوصيل";
    if (values.address.trim().length < 4) e.address = "اكتب الحي والشارع وأقرب معلم";
    if (!method) e.paymentMethod = "اختر طريقة الدفع";
    return e;
  }

  function focusFirst(errs: Partial<Record<FieldName, string>>) {
    const first = FIELD_ORDER.find((f) => errs[f]);
    if (!first) return;
    const el = document.getElementById(`${uid}-${first}`);
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function applyStockIssues(issues: { variantId: number; available: number }[]) {
    const notes: string[] = [];
    for (const { variantId, available } of issues) {
      let remaining = Math.max(0, available);
      for (const l of cart.lines.filter((x) => x.variantId === variantId)) {
        const label = `${l.name}${l.color ? ` — ${l.color}` : ""}${l.size ? ` / ${l.size}` : ""}`;
        if (remaining <= 0) {
          cart.remove(l.key);
          notes.push(`${label}: نفدت الكمية، فأزلناها من سلتك.`);
        } else if (l.quantity > remaining) {
          cart.setQuantity(l.key, remaining);
          notes.push(`${label}: المتوفر ${remaining} فقط، فعدّلنا الكمية.`);
          remaining = 0;
        } else {
          remaining -= l.quantity;
        }
      }
    }
    setStockNotice(notes);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current || pending || placed) return;
    setFormError(null);
    setStockNotice([]);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) {
      focusFirst(errs);
      return;
    }
    submitting.current = true;
    startSubmit(async () => {
      try {
        const res = await submitOrder({
          name: values.name,
          phone: values.phone,
          zoneId: Number(values.zoneId),
          address: values.address,
          notes: values.notes,
          paymentMethod: method,
          couponCode: coupon && !couponBlocked ? coupon.code : "",
          currencyCode: config.currency.code,
          lines: cart.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, lookId: l.lookId ?? null })),
        });
        if (res.ok) {
          setPlaced(true);
          try {
            const profile: Profile = { name: values.name.trim(), phone: values.phone.trim(), zoneId: values.zoneId, address: values.address.trim() };
            localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
          } catch {
            /* ignore */
          }
          cart.clear();
          router.replace(`/order/${encodeURIComponent(res.number)}?t=${encodeURIComponent(res.token)}`);
          return;
        }
        submitting.current = false;
        const fe = (res.fieldErrors ?? {}) as Partial<Record<FieldName | "lines" | "couponCode", string>>;
        setErrors(fe);
        if (res.stockIssues?.length) applyStockIssues(res.stockIssues);
        if (fe.couponCode || (!res.fieldErrors && !res.stockIssues && coupon && /كود|حد/.test(res.error))) {
          setCoupon(null);
          setCouponError(fe.couponCode ?? res.error);
        }
        setFormError(fe.lines ? "سلّتك تحتاج مراجعة — حدّث الصفحة وحاول مجدداً." : res.error);
        if (Object.keys(fe).some((k) => FIELD_ORDER.includes(k as FieldName))) focusFirst(fe);
        else requestAnimationFrame(() => bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
      } catch {
        submitting.current = false;
        setFormError("انقطع الاتصال أثناء الإرسال. تأكد من الإنترنت وحاول مرة أخرى — لن يتكرر طلبك.");
        requestAnimationFrame(() => bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
      }
    });
  }

  /* ───────── States: loading · placed · empty ───────── */

  if (!cart.hydrated) return <CheckoutSkeleton />;

  if (placed) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center py-16 text-center" role="status" aria-live="polite">
        <span className="grid size-16 place-items-center rounded-full bg-copper/10 text-copper">
          <PackageCheck className="size-7" strokeWidth={1.4} aria-hidden />
        </span>
        <p className="display mt-6 text-2xl text-espresso">تم استلام طلبك</p>
        <p className="mt-2 inline-flex items-center gap-2 text-sm text-taupe">
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          نجهّز صفحة التأكيد…
        </p>
      </div>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center md:py-24">
        <span className="grid size-20 place-items-center rounded-full border border-line bg-paper">
          <ShoppingBag className="size-8 text-copper" strokeWidth={1.2} aria-hidden />
        </span>
        <h2 className="display mt-6 text-2xl text-espresso">سلّتك فارغة حالياً</h2>
        <p className="mt-3 text-sm leading-7 text-umber">أضف القطع التي تعجبك أولاً، وبعدها نكمل الطلب في خطوة واحدة.</p>
        {stockNotice.length > 0 && (
          <ul className="mt-5 w-full space-y-1 rounded-xl bg-warning/10 p-4 text-start text-xs leading-6 text-warning">
            {stockNotice.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
        <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <ButtonLink href="/shop" size="lg">
            تسوّق المجموعة
            <ArrowLeft className="size-4" aria-hidden />
          </ButtonLink>
          <ButtonLink href="/looks" variant="outline" size="lg">
            الإطلالات الجاهزة
          </ButtonLink>
        </div>
      </div>
    );
  }

  const shippingValue = !zone ? "اختر المدينة" : totals.freeShipping || totals.shipping === 0 ? "مجاني" : money(totals.shipping);
  const payable = zone ? totals.total : totals.total - totals.shipping;

  const totalsBlock = (
    <>
      <dl>
        <SummaryRow label={`المجموع الفرعي · ${piecesLabel(cart.count)}`} value={money(totals.subtotal)} />
        {totals.lookDiscount > 0 && <SummaryRow label="خصم الإطلالة الكاملة" value={`− ${money(totals.lookDiscount)}`} tone="saving" />}
        {coupon && !couponBlocked && totals.couponDiscount > 0 && (
          <SummaryRow
            label={
              <span className="inline-flex items-center gap-1.5">
                كود الخصم
                <span dir="ltr" className="rounded bg-bone px-1.5 py-0.5 text-[0.7rem] font-medium tracking-wider text-espresso">
                  {coupon.code}
                </span>
              </span>
            }
            value={`− ${money(totals.couponDiscount)}`}
            tone="saving"
          />
        )}
        <SummaryRow
          label="التوصيل"
          value={<span className={cn(zone && (totals.freeShipping || totals.shipping === 0) && "font-medium text-success", !zone && "text-xs text-taupe")}>{shippingValue}</span>}
          hint={zone ? `${zone.name} · خلال ${zone.eta}` : undefined}
        />
      </dl>
      <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-line pt-5">
        <span className="text-sm font-medium text-espresso">الإجمالي</span>
        <span className="display text-2xl tabular-nums text-espresso">{money(payable)}</span>
      </div>
      {totals.discount > 0 && (
        <p className="mt-1 text-end text-xs text-copper-deep">
          وفّرت <span className="tabular-nums">{money(totals.discount)}</span> في هذا الطلب ✦
        </p>
      )}
    </>
  );

  const couponProps = {
    coupon,
    error: couponError ?? (couponBlocked ? `${totals.couponError} (${money(coupon!.minSubtotal)})` : null),
    pending: couponPending,
    onApply: onApplyCoupon,
    onRemove: () => {
      setCoupon(null);
      setCouponError(null);
    },
    discountLabel: coupon ? (coupon.type === "percent" ? `خصم ${coupon.value}%` : `خصم ${money(coupon.value)}`) : "",
  };

  return (
    <>
      {/* ───────── Mobile: collapsible summary ───────── */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-line bg-paper lg:hidden">
        <button
          type="button"
          onClick={() => setSummaryOpen((o) => !o)}
          aria-expanded={summaryOpen}
          aria-controls={`${uid}-summary`}
          className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-start"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-bone text-copper">
              <ShoppingBag className="size-4" strokeWidth={1.5} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 whitespace-nowrap text-sm text-espresso">
                {summaryOpen ? "إخفاء ملخص الطلب" : "عرض ملخص الطلب"}
                <ChevronDown className={cn("size-4 text-taupe transition-transform duration-300", summaryOpen && "rotate-180")} aria-hidden />
              </span>
              <span className="block text-xs text-taupe">{piecesLabel(cart.count)}</span>
            </span>
          </span>
          <span className="display shrink-0 whitespace-nowrap text-lg tabular-nums text-espresso">{money(payable)}</span>
        </button>
        <div
          id={`${uid}-summary`}
          className={cn("grid transition-[grid-template-rows] duration-500 ease-[var(--ease-out-expo)]", summaryOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
        >
          <div className="min-h-0 overflow-hidden" inert={!summaryOpen || undefined}>
            <div className="border-t border-line px-4 pb-5 pt-5">
              <SummaryItems lines={cart.lines} lineDiscounts={totals.lineDiscounts} />
              <div className="mt-2 border-t border-line pt-4">{totalsBlock}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        {/* ───────── Form ───────── */}
        <form id={`${uid}-form`} noValidate onSubmit={onSubmit} className="lg:col-span-7" aria-describedby={formError ? `${uid}-banner` : undefined}>
          {(formError || stockNotice.length > 0) && (
            <div ref={bannerRef} id={`${uid}-banner`} role="alert" className="mb-8 rounded-2xl border border-danger/25 bg-danger/[0.06] p-4 md:p-5">
              <p className="flex items-start gap-2.5 text-sm font-medium text-danger">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                {formError ?? "عدّلنا سلتك حسب المتوفر"}
              </p>
              {stockNotice.length > 0 && (
                <ul className="mt-3 space-y-1.5 ps-6 text-xs leading-6 text-umber">
                  {stockNotice.map((n) => (
                    <li key={n} className="list-disc">
                      {n}
                    </li>
                  ))}
                  <li className="list-none pt-1 text-taupe">راجع الملخص ثم أكّد الطلب مرة أخرى.</li>
                </ul>
              )}
            </div>
          )}

          {/* 01 Contact */}
          <Section index="01" eyebrow="CONTACT" title="بيانات التواصل" note="نتواصل معك لتأكيد الطلب قبل الشحن">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor={`${uid}-name`}>الاسم الكامل</Label>
                <Input
                  id={`${uid}-name`}
                  name="name"
                  autoComplete="name"
                  value={values.name}
                  onChange={(e) => set("name", e.target.value)}
                  maxLength={80}
                  placeholder="مثال: عبدالله أحمد"
                  aria-invalid={!!errors.name || undefined}
                  aria-describedby={errors.name ? `${uid}-name-err` : undefined}
                  required
                />
                {errors.name && <FieldError><span id={`${uid}-name-err`}>{errors.name}</span></FieldError>}
              </div>
              <div>
                <Label htmlFor={`${uid}-phone`}>رقم الجوال</Label>
                <div className="relative" dir="ltr">
                  {!/^\s*(\+|00)/.test(values.phone) && (
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center ps-4 text-[0.95rem] tabular-nums text-taupe" aria-hidden>
                      +967
                      <span className="ms-3 h-5 w-px bg-line" />
                    </span>
                  )}
                  <Input
                    id={`${uid}-phone`}
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                    value={values.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    maxLength={20}
                    placeholder="7X XXX XXXX"
                    className={cn("text-left tabular-nums tracking-wide", !/^\s*(\+|00)/.test(values.phone) && "pl-[4.75rem]")}
                    aria-invalid={!!errors.phone || undefined}
                    aria-describedby={`${uid}-phone-msg`}
                    required
                  />
                </div>
                <p id={`${uid}-phone-msg`} className={cn("mt-1.5 text-xs", errors.phone ? "text-danger" : "text-taupe")} role={errors.phone ? "alert" : undefined}>
                  {errors.phone ?? "رقم يمني يبدأ بـ 7، أو اكتب رقمك مع رمز الدولة — ويفضّل أن يكون عليه واتساب"}
                </p>
              </div>
            </div>
          </Section>

          {/* 02 Delivery */}
          <Section index="02" eyebrow="DELIVERY" title="عنوان التوصيل" note="نوصل لجميع المحافظات اليمنية">
            <div className="grid gap-5">
              <div>
                <Label htmlFor={`${uid}-zoneId`}>المحافظة / المدينة</Label>
                <Select
                  id={`${uid}-zoneId`}
                  name="zoneId"
                  value={values.zoneId}
                  onChange={(e) => set("zoneId", e.target.value)}
                  aria-invalid={!!errors.zoneId || undefined}
                  aria-describedby={`${uid}-zone-msg`}
                  disabled={zones.length === 0}
                  required
                >
                  <option value="" disabled>
                    {zones.length ? "اختر مدينة التوصيل" : "لا توجد مدن متاحة حالياً"}
                  </option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} — {z.fee > 0 ? money(z.fee) : "توصيل مجاني"}
                      {z.eta ? ` · ${z.eta}` : ""}
                    </option>
                  ))}
                </Select>
                <div id={`${uid}-zone-msg`}>
                  {errors.zoneId ? (
                    <FieldError>{errors.zoneId}</FieldError>
                  ) : zone ? (
                    <p className="mt-2.5 flex items-center gap-2 rounded-xl bg-bone/70 px-3.5 py-2.5 text-xs leading-6 text-umber">
                      <Truck className="size-4 shrink-0 text-copper" strokeWidth={1.5} aria-hidden />
                      <span>
                        يصل طلبك إلى <strong className="font-medium text-espresso">{zone.name}</strong>
                        {zone.eta ? <> خلال {zone.eta}</> : null} ·{" "}
                        {totals.freeShipping || zone.fee === 0 ? <span className="font-medium text-success">التوصيل مجاني</span> : <>رسوم التوصيل <span className="tabular-nums">{money(zone.fee)}</span></>}
                      </span>
                    </p>
                  ) : (
                    <FieldHint>رسوم ومدة التوصيل تظهر بعد اختيار المدينة</FieldHint>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor={`${uid}-address`}>العنوان التفصيلي</Label>
                <Textarea
                  id={`${uid}-address`}
                  name="address"
                  autoComplete="street-address"
                  rows={2}
                  className="min-h-20"
                  value={values.address}
                  onChange={(e) => set("address", e.target.value)}
                  maxLength={300}
                  placeholder="الحي، الشارع، أقرب معلم معروف"
                  aria-invalid={!!errors.address || undefined}
                  aria-describedby={errors.address ? `${uid}-address-err` : undefined}
                  required
                />
                {errors.address && <FieldError><span id={`${uid}-address-err`}>{errors.address}</span></FieldError>}
              </div>
              <div>
                <Label htmlFor={`${uid}-notes`}>
                  ملاحظات للطلب <span className="font-normal text-taupe">(اختياري)</span>
                </Label>
                <Textarea
                  id={`${uid}-notes`}
                  name="notes"
                  rows={2}
                  className="min-h-20"
                  value={values.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  maxLength={500}
                  placeholder="وقت مناسب للتواصل، تغليف هدية، أو أي تفصيل يهمك"
                  aria-invalid={!!errors.notes || undefined}
                />
                <FieldError>{errors.notes}</FieldError>
              </div>
            </div>
          </Section>

          {/* 03 Payment */}
          <Section index="03" eyebrow="PAYMENT" title="طريقة الدفع" note="لا تدفع شيئاً الآن عبر الموقع">
            {methods.length === 0 ? (
              <p className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm leading-7 text-warning">
                استقبال الطلبات عبر الموقع متوقف مؤقتاً. تواصل معنا مباشرة وسنخدمك بكل سرور.
              </p>
            ) : (
              <fieldset aria-describedby={errors.paymentMethod ? `${uid}-pm-err` : undefined}>
                <legend className="sr-only">اختر طريقة الدفع</legend>
                <div className="grid gap-3" id={`${uid}-paymentMethod`} tabIndex={-1}>
                  {methods.map((m) => {
                    const p = payments[m];
                    const checked = method === m;
                    const Icon = m === "cod" ? Banknote : Landmark;
                    return (
                      <div
                        key={m}
                        className={cn(
                          "rounded-2xl border bg-paper transition-[border-color,box-shadow] duration-300 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-copper/40",
                          checked ? "border-espresso shadow-[0_18px_40px_-28px_rgba(28,19,15,0.55)]" : "border-line hover:border-taupe/60",
                        )}
                      >
                        <label className="flex cursor-pointer items-start gap-4 p-4 md:p-5">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={m}
                            checked={checked}
                            onChange={() => {
                              setMethod(m);
                              setErrors((e) => ({ ...e, paymentMethod: undefined }));
                            }}
                            className="peer sr-only"
                          />
                          <span
                            className={cn(
                              "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
                              checked ? "border-espresso" : "border-mist",
                            )}
                            aria-hidden
                          >
                            <span className={cn("size-2.5 rounded-full bg-espresso transition-transform duration-300", checked ? "scale-100" : "scale-0")} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-3">
                              <span className="text-[0.95rem] font-medium text-espresso">{p.label}</span>
                              <Icon className={cn("size-5 shrink-0", checked ? "text-copper" : "text-taupe")} strokeWidth={1.4} aria-hidden />
                            </span>
                            <span className="mt-1 block text-xs leading-6 text-taupe">{p.note}</span>
                            {m === "cod" && <span className="mt-2 inline-flex rounded-full bg-success/10 px-2.5 py-0.5 text-[0.68rem] font-medium text-success">الأكثر اختياراً</span>}
                          </span>
                        </label>
                        {m === "transfer" && checked && <TransferAccounts accounts={payments.transfer.accounts} />}
                      </div>
                    );
                  })}
                </div>
                {errors.paymentMethod && <FieldError><span id={`${uid}-pm-err`}>{errors.paymentMethod}</span></FieldError>}
              </fieldset>
            )}
          </Section>

          {/* Coupon (mobile/tablet — desktop has it in the summary) */}
          <div className="mt-8 lg:hidden">
            <CouponField idPrefix={`${uid}-m`} {...couponProps} />
          </div>

          {/* Submit — sticks to the bottom on phones while the form scrolls */}
          <div className="sticky bottom-0 z-20 -mx-5 mt-10 border-t border-line bg-ivory/95 px-5 pb-[max(0.9rem,env(safe-area-inset-bottom))] pt-3.5 backdrop-blur-md md:-mx-10 md:px-10 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <div className="flex items-center gap-4 lg:hidden">
              <div className="min-w-0">
                <p className="text-[0.7rem] text-taupe">الإجمالي</p>
                <p className="display text-lg tabular-nums text-espresso">{money(payable)}</p>
              </div>
              <Button type="submit" size="lg" loading={pending} disabled={methods.length === 0} className="h-13 flex-1">
                {pending ? "جارٍ تأكيد طلبك…" : "تأكيد الطلب"}
                {!pending && <ArrowLeft className="size-4" aria-hidden />}
              </Button>
            </div>
            <div className="hidden lg:block">
              <Button type="submit" size="lg" loading={pending} disabled={methods.length === 0} className="w-full">
                {pending ? "جارٍ تأكيد طلبك…" : <>تأكيد الطلب · <span className="tabular-nums">{money(payable)}</span></>}
                {!pending && <ArrowLeft className="size-4" aria-hidden />}
              </Button>
            </div>
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[0.72rem] leading-5 text-taupe lg:mt-4 lg:text-xs">
              <Lock className="size-3 shrink-0" aria-hidden />
              بياناتك آمنة، وسنتواصل معك لتأكيد الطلب قبل الشحن.
            </p>
          </div>
          <HelpLine />
        </form>

        {/* ───────── Desktop summary ───────── */}
        <aside aria-labelledby={`${uid}-sum-title`} className="hidden lg:col-span-5 lg:block">
          <div className="sticky top-28">
            <div className="rounded-2xl border border-line bg-paper p-7">
              <div className="flex items-baseline justify-between">
                <h2 id={`${uid}-sum-title`} className="display text-xl text-espresso">
                  ملخص الطلب
                </h2>
                <Link href="/cart" className="link-luxe py-1 text-xs text-umber hover:text-espresso">
                  تعديل السلة
                </Link>
              </div>
              <div className="hairline my-5" aria-hidden />
              <SummaryItems lines={cart.lines} lineDiscounts={totals.lineDiscounts} className="max-h-[38vh] overflow-y-auto overscroll-contain pe-1" />
              <div className="my-5 border-t border-line pt-5">
                <CouponField idPrefix={`${uid}-d`} {...couponProps} />
              </div>
              <div className="border-t border-line pt-4">{totalsBlock}</div>
              <FreeShippingMeter amount={totals.subtotal - totals.discount} className="mt-6 rounded-xl bg-bone/60 p-4" />
            </div>
            <TrustList compact className="mt-6 px-1" />
          </div>
        </aside>
      </div>
    </>
  );
}

/* ───────────── Pieces ───────────── */

function Section({ index, eyebrow, title, note, children }: { index: string; eyebrow: string; title: string; note?: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="pt-2 [&+section]:mt-12">
      <div className="mb-6 flex items-end gap-4 border-b border-line pb-4">
        <span className="latin-italic text-4xl leading-none text-copper/80" aria-hidden>
          {index}
        </span>
        <div className="min-w-0">
          <p className="eyebrow text-[0.62rem] leading-none text-taupe">{eyebrow}</p>
          <h2 id={id} className="display mt-1.5 text-xl text-espresso md:text-2xl">
            {title}
          </h2>
        </div>
        {note && <p className="ms-auto hidden pb-1 text-xs text-taupe sm:block">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function TransferAccounts({ accounts }: { accounts: PaymentAccount[] }) {
  const usable = accounts.filter((a) => a.bank || a.number);
  return (
    <div className="border-t border-line px-4 pb-4 pt-4 md:px-5 md:pb-5">
      {usable.length === 0 ? (
        <p className="text-xs leading-6 text-umber">سنرسل لك تفاصيل الحساب عند تأكيد الطلب.</p>
      ) : (
        <ul className="space-y-2.5">
          {usable.map((a, i) => {
            const hasNumber = !!a.number && a.number.trim() !== "—" && a.number.trim() !== "-";
            return (
              <li key={`${a.bank}-${i}`} className="flex items-center justify-between gap-3 rounded-xl bg-bone/70 py-2 pe-1 ps-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-espresso">{a.bank}</p>
                  <p className="text-xs text-taupe">
                    {a.holder && <>باسم {a.holder}</>}
                    {hasNumber && (
                      <>
                        {a.holder && " · "}
                        <span dir="ltr" className="font-medium tabular-nums tracking-wide text-umber">
                          {a.number}
                        </span>
                      </>
                    )}
                    {!hasNumber && " · رقم الحساب يصلك عند التأكيد"}
                  </p>
                </div>
                {hasNumber && <CopyButton value={a.number} label="نسخ الرقم" />}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-[0.72rem] leading-6 text-taupe">حوّل بعد تأكيد الطلب معك، ثم أرسل صورة الإيصال مع رقم الطلب.</p>
    </div>
  );
}

function CouponField({
  idPrefix,
  coupon,
  error,
  pending,
  onApply,
  onRemove,
  discountLabel,
}: {
  idPrefix: string;
  coupon: CouponRule | null;
  error: string | null;
  pending: boolean;
  onApply: (code: string) => void;
  onRemove: () => void;
  discountLabel: string;
}) {
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  const inputId = `${idPrefix}-coupon`;

  if (coupon) {
    return (
      <div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-copper/30 bg-copper/[0.06] py-1.5 pe-1.5 ps-3.5">
          <span className="inline-flex min-w-0 items-center gap-2 text-sm">
            <Tag className="size-4 shrink-0 text-copper" strokeWidth={1.5} aria-hidden />
            <span dir="ltr" className="font-medium tracking-wider text-espresso">
              {coupon.code}
            </span>
            <span className="truncate text-xs text-copper-deep">{discountLabel}</span>
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="grid size-10 shrink-0 place-items-center rounded-full text-taupe transition-colors hover:bg-paper hover:text-danger"
            aria-label={`إزالة كود الخصم ${coupon.code}`}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        {error && <FieldError>{error}</FieldError>}
      </div>
    );
  }

  if (!open && !error) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 text-sm text-umber transition-colors hover:text-espresso"
        aria-expanded={false}
      >
        <Tag className="size-4 text-copper" strokeWidth={1.5} aria-hidden />
        <span className="link-luxe">عندك كود خصم؟</span>
      </button>
    );
  }

  const submit = () => {
    if (code.trim() && !pending) onApply(code.trim());
  };

  return (
    <div>
      <Label htmlFor={inputId} className="text-xs">
        كود الخصم
      </Label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          dir="ltr"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={40}
          placeholder="CODE"
          className="h-11 text-left tracking-[0.18em] placeholder:tracking-[0.3em]"
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${inputId}-err` : undefined}
          autoFocus={open}
        />
        <Button type="button" variant="outline" className="h-11 shrink-0 px-5" onClick={submit} loading={pending} disabled={!code.trim()}>
          تطبيق
        </Button>
      </div>
      {error && <FieldError><span id={`${inputId}-err`}>{error}</span></FieldError>}
    </div>
  );
}

function HelpLine() {
  const config = useStoreConfig();
  const href = config.whatsapp ? whatsappLink(config.whatsapp, "مرحباً مرموق 👋 عندي استفسار بخصوص الطلب") : config.instagram;
  if (!href) return null;
  return (
    <p className="mt-6 flex flex-wrap items-center justify-center gap-x-2 text-center text-xs text-taupe lg:justify-start">
      تحتاج مساعدة في الطلب؟
      <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 font-medium text-espresso hover:text-copper-deep">
        {config.whatsapp ? <WhatsAppIcon size={14} className="text-success" /> : <InstagramIcon size={14} />}
        <span className="link-luxe">{config.whatsapp ? "كلّمنا على واتساب" : "راسلنا على إنستغرام"}</span>
      </a>
    </p>
  );
}

export function CheckoutSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-16" role="status" aria-live="polite">
      <span className="sr-only">جارٍ تجهيز صفحة الإتمام…</span>
      <div className="space-y-10 lg:col-span-7">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div className="skeleton h-8 w-48 rounded-full" />
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="skeleton h-12 rounded-xl" />
              <div className="skeleton h-12 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden lg:col-span-5 lg:block">
        <div className="skeleton h-[28rem] rounded-2xl" />
      </div>
    </div>
  );
}
