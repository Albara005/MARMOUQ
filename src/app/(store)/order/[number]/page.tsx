import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Banknote, Landmark, MapPin, PackageSearch, Phone, StickyNote, User } from "lucide-react";
import { getOrderByToken, type OrderView } from "@/lib/orders";
import { getSettings, type StoreSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_META, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_META } from "@/lib/order-status";
import { formatDate, whatsappLink } from "@/lib/utils";
import { MediaImage } from "@/components/ui/media-image";
import { Badge } from "@/components/ui/badge";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { CheckoutSteps } from "@/components/store/checkout/steps";
import { SuccessMark } from "@/components/store/checkout/success-mark";
import { OrderTimeline } from "@/components/store/checkout/order-timeline";
import { CopyButton, PrintButton } from "@/components/store/checkout/client-buttons";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { number } = await params;
  const safe = decodeURIComponent(number).replace(/[^A-Za-z0-9-]/g, "").slice(0, 24);
  return {
    title: safe ? `تأكيد الطلب ${safe}` : "تأكيد الطلب",
    robots: { index: false, follow: false, nocache: true },
    referrer: "no-referrer",
  };
}

function firstName(full: string) {
  return full.trim().split(/\s+/)[0] ?? "";
}

function hasAccountNumber(n: string) {
  const t = n.trim();
  return !!t && t !== "—" && t !== "-";
}

export default async function OrderConfirmationPage({ params, searchParams }: Props) {
  const [{ number }, sp] = await Promise.all([params, searchParams]);
  const token = typeof sp.t === "string" ? sp.t.slice(0, 64) : "";
  const orderNumber = decodeURIComponent(number).slice(0, 24);
  if (!token || !/^[A-Za-z0-9-]+$/.test(orderNumber)) notFound();

  const [order, settings] = await Promise.all([getOrderByToken(orderNumber, token), getSettings()]);
  if (!order) notFound();

  const money = (n: number) => formatMoney(n, settings.currency);
  const name = firstName(order.customerName);
  const terminal = order.status === "cancelled" || order.status === "returned";
  const itemsCount = order.items.reduce((s, i) => s + i.quantity, 0);
  const statusEvents = order.events.filter((e) => !e.status.startsWith("payment:") && e.status !== "note").map((e) => ({ status: e.status, at: e.createdAt }));
  const paymentEvents = order.events.filter((e) => e.status.startsWith("payment:"));
  const lastPaymentNote = paymentEvents[paymentEvents.length - 1]?.note;
  const isTransfer = order.paymentMethod === "transfer";

  const summaryText = [
    `مرحباً ${settings.storeName} 👋`,
    `طلبي رقم ${order.number}`,
    ...order.items.map((i) => `• ${i.name}${i.color ? ` — ${i.color}` : ""}${i.size ? ` / ${i.size}` : ""} × ${i.quantity}`),
    `الإجمالي: ${money(order.total)}`,
    `الاسم: ${order.customerName}`,
    `المدينة: ${order.city}`,
    `الدفع: ${PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}`,
  ].join("\n");
  const receiptText = `مرحباً ${settings.storeName} 👋\nهذا إيصال تحويل طلبي رقم ${order.number} بمبلغ ${money(order.total)}`;

  const intro = terminal
    ? ORDER_STATUS_META[order.status].hint
    : order.status === "pending"
      ? "استلمنا طلبك وصار بأيدٍ أمينة. بنتواصل معك على رقمك خلال ساعات العمل لتأكيد التفاصيل قبل الشحن."
      : `${ORDER_STATUS_META[order.status].hint}. تابع حالة طلبك من هذه الصفحة في أي وقت.`;

  return (
    <div className="pb-20 md:pb-28">
      {/* ───────── Hero ───────── */}
      <section className="container-luxe pt-6 md:pt-10">
        <CheckoutSteps current={3} className="flex justify-center" />
        <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center text-center md:mt-14">
          {!terminal && <SuccessMark />}
          <p className="eyebrow mt-8 inline-flex items-center gap-3">
            <span className="h-px w-6 bg-gold/70" aria-hidden />
            {terminal ? "ORDER UPDATE" : "ORDER CONFIRMED"}
            <span className="h-px w-6 bg-gold/70" aria-hidden />
          </p>
          <h1 className="display mt-4 text-4xl text-espresso text-balance md:text-6xl">{terminal ? `أهلاً ${name}` : `شكراً ${name}`}</h1>
          <p className="mt-5 max-w-lg text-[0.98rem] leading-8 text-umber text-pretty">{intro}</p>

          <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-line bg-paper py-1 pe-1 ps-5 shadow-[0_18px_40px_-30px_rgba(28,19,15,0.5)]">
            <span className="text-xs text-taupe">رقم الطلب</span>
            <span dir="ltr" className="mx-2 text-lg font-medium tracking-[0.08em] tabular-nums text-espresso">
              {order.number}
            </span>
            <CopyButton value={order.number} label="نسخ رقم الطلب" iconOnly />
          </div>
          <p className="mt-3 text-xs text-taupe">
            {formatDate(order.createdAt)} · {itemsCount === 1 ? "قطعة واحدة" : itemsCount === 2 ? "قطعتان" : `${itemsCount} قطع`} · احتفظ برقم الطلب لتتبّعه
          </p>
        </div>
      </section>

      <div className="container-luxe mt-12 md:mt-16">
        <div className="hairline" aria-hidden />
      </div>

      {/* ───────── Details ───────── */}
      <div className="container-luxe mt-10 grid gap-8 md:mt-14 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-12">
        <div className="lg:col-span-7">
          <Receipt order={order} money={money} />
        </div>

        <aside className="space-y-6 lg:col-span-5 lg:row-span-2 lg:self-start">
          <Card title="حالة الطلب" eyebrow="STATUS" action={<Badge tone={ORDER_STATUS_META[order.status].tone} dot>{ORDER_STATUS_META[order.status].label}</Badge>}>
            <OrderTimeline status={order.status} events={statusEvents} />
          </Card>

          <Card title="الدفع" eyebrow="PAYMENT" action={<Badge tone={PAYMENT_STATUS_META[order.paymentStatus].tone}>{PAYMENT_STATUS_META[order.paymentStatus].label}</Badge>}>
            <p className="flex items-center gap-2.5 text-sm font-medium text-espresso">
              {isTransfer ? <Landmark className="size-4 text-copper" strokeWidth={1.5} aria-hidden /> : <Banknote className="size-4 text-copper" strokeWidth={1.5} aria-hidden />}
              {isTransfer ? settings.payments.transfer.label || PAYMENT_METHOD_LABELS.transfer : settings.payments.cod.label || PAYMENT_METHOD_LABELS.cod}
            </p>
            {order.paymentStatus === "paid" ? (
              <p className="mt-2 text-xs leading-6 text-success">{lastPaymentNote || "تم تأكيد استلام الدفع"} — شكراً لك.</p>
            ) : isTransfer && !terminal ? (
              <TransferInstructions order={order} settings={settings} receiptText={receiptText} money={money} />
            ) : !terminal ? (
              <p className="mt-2 text-xs leading-6 text-umber">
                جهّز مبلغ <strong className="font-semibold tabular-nums text-espresso">{money(order.total)}</strong> نقداً، وادفعه للمندوب عند استلام طلبك.
              </p>
            ) : null}
          </Card>

          <Card title="التوصيل إلى" eyebrow="DELIVERY">
            <ul className="space-y-3 text-sm text-umber">
              <li className="flex items-start gap-3">
                <User className="mt-0.5 size-4 shrink-0 text-taupe" strokeWidth={1.5} aria-hidden />
                <span className="text-espresso">{order.customerName}</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-taupe" strokeWidth={1.5} aria-hidden />
                <span dir="ltr" className="tabular-nums">
                  {prettyPhone(order.phone)}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-taupe" strokeWidth={1.5} aria-hidden />
                <span>
                  <span className="font-medium text-espresso">{order.city}</span>
                  <span className="block leading-7">{order.address}</span>
                </span>
              </li>
              {order.notes && (
                <li className="flex items-start gap-3">
                  <StickyNote className="mt-0.5 size-4 shrink-0 text-taupe" strokeWidth={1.5} aria-hidden />
                  <span className="leading-7">{order.notes}</span>
                </li>
              )}
            </ul>
          </Card>
        </aside>

        <div className="lg:col-span-7 lg:self-start">
          <Actions order={order} settings={settings} summaryText={summaryText} />
        </div>
      </div>
    </div>
  );
}

/** "+967777123456" → "+967 777 123 456" (other numbers untouched). */
function prettyPhone(p: string) {
  const m = /^\+967(\d{3})(\d{3})(\d{3})$/.exec(p);
  return m ? `+967 ${m[1]} ${m[2]} ${m[3]}` : p;
}

/* ───────────── Pieces ───────────── */

function Card({ title, eyebrow, action, children }: { title: string; eyebrow: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-paper p-5 md:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-[0.6rem] leading-none text-taupe">{eyebrow}</p>
          <h2 className="display mt-1.5 text-lg text-espresso">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Receipt({ order, money }: { order: OrderView; money: (n: number) => string }) {
  const lookSavings = order.items.reduce((s, i) => s + i.lineDiscount, 0);
  const couponSavings = Math.max(0, order.discount - lookSavings);
  return (
    <section aria-labelledby="receipt-title" className="relative overflow-hidden rounded-2xl border border-line bg-paper">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 md:px-7 md:py-5">
        <div>
          <p className="eyebrow text-[0.6rem] leading-none text-taupe">RECEIPT</p>
          <h2 id="receipt-title" className="display mt-1.5 text-xl text-espresso">
            تفاصيل الطلب
          </h2>
        </div>
        <PrintButton className="-me-2" />
      </div>

      <ul className="divide-y divide-line px-5 md:px-7">
        {order.items.map((i) => {
          const gross = i.unitPrice * i.quantity;
          return (
            <li key={i.id} className="flex gap-4 py-5">
              <div className="studio-frame aspect-[4/5] w-[4.5rem] shrink-0 overflow-hidden rounded-lg md:w-20">
                <MediaImage media={i.imageId ? { id: i.imageId } : null} sizes="90px" className="h-full w-full" alt={i.name} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="line-clamp-2 text-[0.92rem] font-medium leading-6 text-espresso">{i.name}</p>
                <p className="mt-1 text-xs text-taupe">
                  {[i.color, i.size && `المقاس ${i.size}`].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-auto pt-2 text-xs tabular-nums text-taupe">
                  {i.quantity} × {money(i.unitPrice)}
                </p>
              </div>
              <div className="shrink-0 text-end text-[0.92rem] tabular-nums">
                {i.lineDiscount > 0 ? (
                  <>
                    <span className="block text-espresso">{money(gross - i.lineDiscount)}</span>
                    <s className="block text-xs text-mist">{money(gross)}</s>
                  </>
                ) : (
                  <span className="text-espresso">{money(gross)}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-dashed border-sand bg-bone/40 px-5 py-5 md:px-7">
        <dl className="space-y-2 text-[0.9rem]">
          <Row label="المجموع الفرعي" value={money(order.subtotal)} />
          {lookSavings > 0 && <Row label="خصم الإطلالة الكاملة" value={`− ${money(lookSavings)}`} saving />}
          {couponSavings > 0 && (
            <Row
              label={
                <>
                  كود الخصم{" "}
                  {order.couponCode && (
                    <span dir="ltr" className="ms-1 rounded bg-paper px-1.5 py-0.5 text-[0.7rem] font-medium tracking-wider text-espresso">
                      {order.couponCode}
                    </span>
                  )}
                </>
              }
              value={`− ${money(couponSavings)}`}
              saving
            />
          )}
          <Row label={`التوصيل · ${order.city}`} value={order.shippingFee > 0 ? money(order.shippingFee) : <span className="font-medium text-success">مجاني</span>} />
        </dl>
        <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
          <span className="text-sm font-medium text-espresso">الإجمالي</span>
          <span className="display text-2xl tabular-nums text-espresso md:text-3xl">{money(order.total)}</span>
        </div>
        {order.discount > 0 && <p className="mt-1 text-end text-xs text-copper-deep">وفّرت {money(order.discount)} في هذا الطلب ✦</p>}
      </div>
    </section>
  );
}

function Row({ label, value, saving }: { label: React.ReactNode; value: React.ReactNode; saving?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-umber">{label}</dt>
      <dd className={saving ? "font-medium tabular-nums text-copper-deep" : "tabular-nums text-espresso"}>{value}</dd>
    </div>
  );
}

function TransferInstructions({
  order,
  settings,
  receiptText,
  money,
}: {
  order: OrderView;
  settings: StoreSettings;
  receiptText: string;
  money: (n: number) => string;
}) {
  const t = settings.payments.transfer;
  const accounts = t.accounts.filter((a) => a.bank || a.number);
  return (
    <div className="mt-3">
      <p className="flex items-baseline justify-between gap-3 rounded-xl border border-dashed border-sand px-4 py-2.5 text-xs text-umber">
        المبلغ المطلوب تحويله
        <strong className="text-base font-semibold tabular-nums text-espresso">{money(order.total)}</strong>
      </p>
      {t.note && <p className="mt-2.5 text-xs leading-6 text-taupe">{t.note}</p>}
      {accounts.length > 0 && (
        <ul className="mt-3 space-y-2">
          {accounts.map((a, i) => (
            <li key={`${a.bank}-${i}`} className="flex items-center justify-between gap-3 rounded-xl bg-bone/70 py-2 pe-1 ps-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-espresso">{a.bank}</p>
                <p className="text-xs text-taupe">
                  {a.holder && <>باسم {a.holder}</>}
                  {hasAccountNumber(a.number) ? (
                    <>
                      {a.holder && " · "}
                      <span dir="ltr" className="font-medium tabular-nums tracking-wide text-umber">
                        {a.number}
                      </span>
                    </>
                  ) : (
                    " · رقم الحساب يصلك عند التأكيد"
                  )}
                </p>
              </div>
              {hasAccountNumber(a.number) && <CopyButton value={a.number} label="نسخ الرقم" />}
            </li>
          ))}
        </ul>
      )}
      {settings.whatsapp ? (
        <a
          href={whatsappLink(settings.whatsapp, receiptText)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses("outline", "md", "no-print mt-4 w-full")}
        >
          <WhatsAppIcon size={16} className="text-success" />
          أرسل الإيصال عبر واتساب
        </a>
      ) : settings.instagram ? (
        <a href={settings.instagram} target="_blank" rel="noopener noreferrer" className={buttonClasses("outline", "md", "no-print mt-4 w-full")}>
          <InstagramIcon size={16} />
          أرسل الإيصال عبر إنستغرام
        </a>
      ) : null}
      <p className="mt-2 text-center text-[0.7rem] text-taupe">
        اذكر رقم الطلب <span dir="ltr" className="tabular-nums">{order.number}</span> مع الإيصال
      </p>
    </div>
  );
}

function Actions({ order, settings, summaryText }: { order: OrderView; settings: StoreSettings; summaryText: string }) {
  return (
    <div className="no-print rounded-2xl bg-espresso p-6 text-paper grain relative overflow-hidden md:p-8">
      <p className="eyebrow text-copper-soft">WHAT&apos;S NEXT</p>
      <h2 className="display mt-2 text-2xl">وش اللي بعدها؟</h2>
      <ol className="mt-5 space-y-3 text-sm leading-7 text-paper/75">
        {[
          "نتواصل معك لتأكيد المقاسات والعنوان.",
          "نجهّز قطعك ونغلّفها بعناية.",
          `يوصلك الطلب، وتدفع ${order.paymentMethod === "cod" ? "عند الاستلام" : "بالحوالة المتفق عليها"}.`,
        ].map((t, i) => (
          <li key={t} className="flex items-baseline gap-3">
            <span className="latin-italic w-6 shrink-0 text-lg text-copper-soft">0{i + 1}</span>
            <span>{t}</span>
          </li>
        ))}
      </ol>
      <div className="relative z-[1] mt-6 grid gap-3 sm:grid-cols-2">
        {settings.whatsapp ? (
          <a
            href={whatsappLink(settings.whatsapp, summaryText)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("light", "lg", "w-full sm:col-span-2")}
          >
            <WhatsAppIcon size={18} className="text-success" />
            أرسل تفاصيل الطلب عبر واتساب
          </a>
        ) : null}
        <ButtonLink href={`/track?number=${encodeURIComponent(order.number)}`} variant={settings.whatsapp ? "outline" : "light"} size="lg" className={settings.whatsapp ? "w-full border-paper/40 text-paper hover:bg-paper hover:text-espresso" : "w-full"}>
          <PackageSearch className="size-4" strokeWidth={1.5} aria-hidden />
          تتبّع طلبك
        </ButtonLink>
        <Link href="/shop" className={buttonClasses("outline", "lg", "w-full border-paper/40 text-paper hover:bg-paper hover:text-espresso")}>
          متابعة التسوق
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
