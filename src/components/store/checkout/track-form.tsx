"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef } from "react";
import { AlertCircle, ArrowLeft, Banknote, Check, Landmark, PackageCheck, PackageOpen, Search, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { MediaImage } from "@/components/ui/media-image";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { useMoney, useStoreConfig } from "@/components/store/store-provider";
import { trackOrder, type TrackState, type TrackedOrder } from "@/app/(store)/track/actions";
import { ORDER_STATUS_META, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_META } from "@/lib/order-status";
import { cn, formatDateTime, whatsappLink } from "@/lib/utils";
import { OrderTimeline } from "./order-timeline";
import { piecesLabel } from "./summary";

export function TrackForm({ defaultNumber = "" }: { defaultNumber?: string }) {
  const [state, action, pending] = useActionState<TrackState, FormData>(trackOrder, { status: "idle", values: { number: defaultNumber, phone: "" } });
  const uid = useId();
  const resultRef = useRef<HTMLDivElement>(null);
  const values = state.values ?? { number: defaultNumber, phone: "" };
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state.status === "found" && window.matchMedia("(max-width: 1023px)").matches) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [state]);

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
      {/* ───────── Form ───────── */}
      <div className="lg:col-span-5">
        <form action={action} noValidate className="rounded-2xl border border-line bg-paper p-5 md:p-7 lg:sticky lg:top-28" aria-describedby={state.status === "error" ? `${uid}-err` : undefined}>
          <p className="eyebrow text-[0.62rem] leading-none text-taupe">FIND YOUR ORDER</p>
          <h2 className="display mt-2 text-2xl text-espresso">بيانات الطلب</h2>
          <p className="mt-2 text-sm leading-7 text-umber">تجد رقم الطلب في صفحة التأكيد أو في رسالتنا لك.</p>

          <div className="mt-6 space-y-5">
            <div>
              <Label htmlFor={`${uid}-number`}>رقم الطلب</Label>
              <Input
                id={`${uid}-number`}
                name="number"
                dir="ltr"
                defaultValue={values.number}
                key={`n-${values.number}`}
                placeholder="MRQ-10046"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                maxLength={24}
                className="text-left uppercase tracking-[0.12em] placeholder:normal-case"
                aria-invalid={!!fieldErrors?.number || undefined}
                aria-describedby={fieldErrors?.number ? `${uid}-number-err` : undefined}
                required
              />
              {fieldErrors?.number && (
                <p id={`${uid}-number-err`} role="alert" className="mt-1.5 text-xs text-danger">
                  {fieldErrors.number}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor={`${uid}-phone`}>رقم الجوال المستخدم عند الطلب</Label>
              <Input
                id={`${uid}-phone`}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                defaultValue={values.phone}
                key={`p-${values.phone}`}
                placeholder="7X XXX XXXX"
                maxLength={24}
                className="text-left tabular-nums tracking-wide"
                aria-invalid={!!fieldErrors?.phone || undefined}
                aria-describedby={fieldErrors?.phone ? `${uid}-phone-err` : undefined}
                required
              />
              {fieldErrors?.phone && (
                <p id={`${uid}-phone-err`} role="alert" className="mt-1.5 text-xs text-danger">
                  {fieldErrors.phone}
                </p>
              )}
            </div>
          </div>

          {state.status === "error" && !fieldErrors && (
            <p id={`${uid}-err`} role="alert" className="mt-5 flex items-start gap-2.5 rounded-xl bg-danger/[0.07] p-3.5 text-sm leading-7 text-danger">
              <AlertCircle className="mt-1 size-4 shrink-0" aria-hidden />
              {state.message}
            </p>
          )}

          <Button type="submit" size="lg" loading={pending} className="mt-6 w-full">
            {!pending && <Search className="size-4" aria-hidden />}
            {pending ? "جارٍ البحث…" : "تتبّع الطلب"}
          </Button>
          <p className="mt-3 text-center text-xs leading-6 text-taupe">نعرض حالة الطلب فقط لمن يملك رقم الطلب ورقم الجوال معاً.</p>
        </form>
      </div>

      {/* ───────── Result ───────── */}
      <div ref={resultRef} className="scroll-mt-24 lg:col-span-7" aria-live="polite">
        {state.status === "found" ? <TrackResult order={state.order} /> : <TrackIntro />}
      </div>
    </div>
  );
}

const HEADLINES: Record<TrackedOrder["status"], string> = {
  pending: "طلبك قيد المراجعة",
  confirmed: "تم تأكيد طلبك",
  processing: "نجهّز طلبك الآن",
  shipped: "طلبك في الطريق إليك",
  delivered: "وصل طلبك ✦",
  cancelled: "تم إلغاء طلبك",
  returned: "تم إرجاع طلبك",
};

function TrackResult({ order }: { order: TrackedOrder }) {
  const money = useMoney();
  const config = useStoreConfig();
  const meta = ORDER_STATUS_META[order.status];
  const terminal = order.status === "cancelled" || order.status === "returned";
  const contact = config.whatsapp ? whatsappLink(config.whatsapp, `مرحباً مرموق 👋 استفسار عن طلبي رقم ${order.number}`) : config.instagram;

  return (
    <article className="animate-fade-up overflow-hidden rounded-2xl border border-line bg-paper">
      <header className={cn("relative overflow-hidden px-5 py-6 md:px-8 md:py-8", terminal ? "bg-bone" : "grain bg-espresso text-paper")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={cn("eyebrow text-[0.62rem] leading-none", terminal ? "text-taupe" : "text-copper-soft")}>ORDER</p>
            <p dir="ltr" className="mt-2 text-end text-lg font-medium tracking-[0.08em] tabular-nums">
              {order.number}
            </p>
          </div>
          {terminal ? (
            <Badge tone={meta.tone} dot>
              {meta.label}
            </Badge>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-paper/10 px-2.5 py-0.5 text-xs font-medium text-paper ring-1 ring-inset ring-paper/20">
              <span className="size-1.5 animate-pulse rounded-full bg-copper-soft" aria-hidden />
              {meta.label}
            </span>
          )}
        </div>
        <h2 className="display mt-6 text-3xl md:text-4xl">
          {order.customerFirstName ? `${order.customerFirstName}، ` : ""}
          {HEADLINES[order.status]}
        </h2>
        <p className={cn("mt-2 text-sm leading-7", terminal ? "text-umber" : "text-paper/70")}>
          {meta.hint} · آخر تحديث {formatDateTime(order.updatedAt)}
        </p>
      </header>

      <div className="grid gap-8 p-5 md:grid-cols-2 md:p-8">
        <section aria-label="مراحل الطلب">
          <h3 className="mb-5 text-sm font-medium text-espresso">مراحل الطلب</h3>
          <OrderTimeline status={order.status} events={order.events} />
        </section>
        <section aria-label="ملخص الطلب" className="md:border-s md:border-line md:ps-8">
          <h3 className="mb-4 text-sm font-medium text-espresso">القطع · {piecesLabel(order.itemsCount)}</h3>
          <ul className="space-y-3">
            {order.items.map((i, idx) => (
              <li key={`${i.name}-${idx}`} className="flex items-center gap-3">
                <div className="studio-frame aspect-[4/5] w-12 shrink-0 overflow-hidden rounded-md">
                  <MediaImage media={i.imageId ? { id: i.imageId } : null} sizes="56px" className="h-full w-full" alt="" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.85rem] text-espresso">{i.name}</p>
                  <p className="text-xs text-taupe">{[i.color, i.size && `المقاس ${i.size}`, `الكمية ${i.quantity}`].filter(Boolean).join(" · ")}</p>
                </div>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-2.5 border-t border-line pt-5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-taupe">التوصيل إلى</dt>
              <dd className="text-espresso">{order.city}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-taupe">الدفع</dt>
              <dd className="inline-flex items-center gap-1.5 text-espresso">
                {order.paymentMethod === "transfer" ? <Landmark className="size-3.5 text-copper" aria-hidden /> : <Banknote className="size-3.5 text-copper" aria-hidden />}
                {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-taupe">حالة الدفع</dt>
              <dd>
                <Badge tone={PAYMENT_STATUS_META[order.paymentStatus as keyof typeof PAYMENT_STATUS_META]?.tone ?? "neutral"}>
                  {PAYMENT_STATUS_META[order.paymentStatus as keyof typeof PAYMENT_STATUS_META]?.label ?? order.paymentStatus}
                </Badge>
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
              <dt className="font-medium text-espresso">الإجمالي</dt>
              <dd className="display text-xl tabular-nums text-espresso">{money(order.total)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <footer className="flex flex-col gap-3 border-t border-line bg-bone/40 px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-8">
        <p className="text-xs leading-6 text-taupe">طلبت في {formatDateTime(order.createdAt)} — عندك سؤال؟ فريقنا يرد عليك بنفسه.</p>
        {contact && (
          <a href={contact} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-medium text-espresso hover:text-copper-deep">
            {config.whatsapp ? <WhatsAppIcon size={16} className="text-success" /> : <InstagramIcon size={16} />}
            <span className="link-luxe">{config.whatsapp ? "تواصل عبر واتساب" : "راسلنا على إنستغرام"}</span>
          </a>
        )}
      </footer>
    </article>
  );
}

const JOURNEY = [
  { icon: Check, title: "استلام الطلب", text: "يصلنا طلبك فوراً ونراجعه بأنفسنا" },
  { icon: PackageOpen, title: "التأكيد والتجهيز", text: "نتصل بك للتأكيد ثم نغلّف قطعك بعناية" },
  { icon: Truck, title: "الشحن", text: "يتحرك طلبك مع مندوب موثوق إلى مدينتك" },
  { icon: PackageCheck, title: "التسليم", text: "تستلم وتدفع عند الباب — بكل سهولة" },
] as const;

function TrackIntro() {
  return (
    <div className="grain relative overflow-hidden rounded-2xl bg-espresso p-6 text-paper md:p-10">
      <p className="eyebrow text-copper-soft">THE JOURNEY</p>
      <h2 className="display mt-3 text-3xl leading-[1.3] md:text-4xl">من خزانتنا إلى بابك</h2>
      <p className="mt-3 max-w-md text-sm leading-7 text-paper/70">كل طلب في مرموق نتابعه خطوة بخطوة حتى يوصلك. هذه رحلته:</p>
      <ol className="relative z-[1] mt-8 grid gap-6 sm:grid-cols-2">
        {JOURNEY.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="flex gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full border border-paper/15 text-copper-soft">
              <Icon className="size-5" strokeWidth={1.4} aria-hidden />
            </span>
            <div>
              <p className="flex items-baseline gap-2">
                <span className="latin-italic text-sm text-copper-soft">0{i + 1}</span>
                <span className="font-medium">{title}</span>
              </p>
              <p className="mt-1 text-xs leading-6 text-paper/60">{text}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link href="/shop" className="relative z-[1] mt-10 inline-flex min-h-11 items-center gap-2 text-sm text-paper/85 hover:text-paper">
        <span className="link-luxe">تصفّح المجموعة أثناء الانتظار</span>
        <ArrowLeft className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
