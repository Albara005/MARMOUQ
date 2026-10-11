import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getOrderById } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_META, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_META } from "@/lib/order-status";
import { formatDate, formatNumber } from "@/lib/utils";
import { Wordmark } from "@/components/ui/wordmark";
import { buttonClasses } from "@/components/ui/button";
import { PrintButton } from "@/components/admin/orders/print-button";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ print?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `فاتورة #${id}` };
}

const PRINT_CSS = `
@page { size: A4; margin: 14mm 12mm; }
@media print {
  html, body { background: #fff !important; }
  aside, .invoice-toolbar, [aria-live], a[href="#admin-main"] { display: none !important; }
  div:has(> #admin-main) { padding: 0 !important; min-height: 0 !important; }
  div:has(> #admin-main) > header { display: none !important; }
  #admin-main { padding: 0 !important; max-width: none !important; }
  #invoice { border: 0 !important; border-radius: 0 !important; box-shadow: none !important; padding: 0 !important; }
  #invoice > span { display: none !important; }
  #invoice * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  #invoice tr { break-inside: avoid; }
}
`;

export default async function InvoicePage({ params, searchParams }: Props) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) notFound();
  const [order, settings] = await Promise.all([getOrderById(orderId), getSettings()]);
  if (!order) notFound();

  const money = (n: number) => formatMoney(n, settings.currency);
  const lineDiscounts = order.items.reduce((s, i) => s + i.lineDiscount, 0);
  const couponDiscount = Math.max(0, order.discount - lineDiscounts);
  const ig = settings.instagram.match(/instagram\.com\/([A-Za-z0-9._]+)/i)?.[1];
  const contacts = [
    settings.whatsapp && { label: "واتساب", value: settings.whatsapp },
    settings.phone && { label: "هاتف", value: settings.phone },
    ig && { label: "إنستغرام", value: `@${ig}` },
    settings.email && { label: "بريد", value: settings.email },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="mx-auto max-w-[820px]">
      <style>{PRINT_CSS}</style>
      <div className="invoice-toolbar mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/admin/orders/${order.id}`} className="inline-flex items-center gap-1.5 text-sm text-taupe hover:text-espresso">
          <ArrowRight className="size-4" aria-hidden />
          العودة إلى الطلب
        </Link>
        <div className="flex items-center gap-2">
          <p className="hidden text-xs text-taupe sm:block">مقاس A4 · اختر «حفظ كـ PDF» لإرسالها للعميل</p>
          <PrintButton auto={sp.print === "1"} />
        </div>
      </div>

      <article id="invoice" className="relative overflow-hidden rounded-2xl border border-line bg-white px-6 py-8 text-espresso shadow-[0_30px_60px_-40px_rgba(28,19,15,0.45)] sm:px-12 sm:py-12">
        <span className="absolute inset-x-0 top-0 h-1.5 bg-espresso" aria-hidden />
        <span className="absolute inset-x-0 top-1.5 h-px bg-gold" aria-hidden />

        {/* Brand header */}
        <header className="flex flex-col-reverse items-start justify-between gap-6 border-b border-line pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow !text-[0.68rem]">INVOICE</p>
            <h1 className="display mt-1 text-3xl">فاتورة</h1>
            <dl className="mt-4 grid grid-cols-[auto_auto] gap-x-5 gap-y-1 text-sm">
              <dt className="text-taupe">رقم الطلب</dt>
              <dd className="font-semibold tabular-nums" dir="ltr">
                {order.number}
              </dd>
              <dt className="text-taupe">التاريخ</dt>
              <dd className="tabular-nums">{formatDate(order.createdAt)}</dd>
              <dt className="text-taupe">الحالة</dt>
              <dd>{ORDER_STATUS_META[order.status].label}</dd>
            </dl>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <Wordmark size="md" />
            <p className="max-w-[16rem] text-xs leading-5 text-taupe sm:text-end">{settings.tagline}</p>
          </div>
        </header>

        {/* Parties */}
        <section className="grid gap-6 border-b border-line py-7 sm:grid-cols-2">
          <div>
            <p className="text-[0.7rem] font-medium tracking-wide text-taupe">فاتورة إلى</p>
            <p className="mt-2 text-base font-semibold">{order.customerName}</p>
            <p className="mt-0.5 text-sm tabular-nums text-umber" dir="ltr" style={{ textAlign: "right" }}>
              {order.phone}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-umber">
              {order.city} — {order.address}
            </p>
          </div>
          <div className="sm:text-end">
            <p className="text-[0.7rem] font-medium tracking-wide text-taupe">الدفع</p>
            <p className="mt-2 text-sm font-semibold">{PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</p>
            <p className="mt-0.5 text-sm text-umber">{PAYMENT_STATUS_META[order.paymentStatus].label}</p>
            {order.couponCode && (
              <p className="mt-2 text-sm text-umber">
                كود الخصم:{" "}
                <span className="font-semibold" dir="ltr">
                  {order.couponCode}
                </span>
              </p>
            )}
          </div>
        </section>

        {/* Items */}
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-espresso/80 text-[0.72rem] text-taupe">
              <th scope="col" className="py-2.5 text-start font-medium">
                القطعة
              </th>
              <th scope="col" className="w-16 py-2.5 text-center font-medium">
                الكمية
              </th>
              <th scope="col" className="w-28 py-2.5 text-end font-medium">
                السعر
              </th>
              <th scope="col" className="w-28 py-2.5 text-end font-medium">
                المجموع
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.id} className="border-b border-line align-top">
                <td className="py-3.5">
                  <p className="font-medium">{it.name}</p>
                  <p className="mt-0.5 text-xs text-taupe">
                    {[it.color && `اللون: ${it.color}`, it.size && `المقاس: ${it.size}`].filter(Boolean).join(" · ")}
                    {it.lineDiscount > 0 && <span className="text-copper-deep"> · خصم الإطلالة −{money(it.lineDiscount)}</span>}
                  </p>
                </td>
                <td className="py-3.5 text-center tabular-nums">{formatNumber(it.quantity)}</td>
                <td className="py-3.5 text-end tabular-nums text-umber">{money(it.unitPrice)}</td>
                <td className="py-3.5 text-end font-medium tabular-nums">{money(it.unitPrice * it.quantity - it.lineDiscount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-taupe">المجموع الفرعي</dt>
              <dd className="tabular-nums">{money(order.subtotal)}</dd>
            </div>
            {lineDiscounts > 0 && (
              <div className="flex justify-between">
                <dt className="text-taupe">خصم الإطلالات</dt>
                <dd className="tabular-nums">−{money(lineDiscounts)}</dd>
              </div>
            )}
            {couponDiscount > 0 && (
              <div className="flex justify-between">
                <dt className="text-taupe">خصم الكوبون</dt>
                <dd className="tabular-nums">−{money(couponDiscount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-taupe">الشحن</dt>
              <dd className="tabular-nums">{order.shippingFee > 0 ? money(order.shippingFee) : "مجاني"}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t-2 border-espresso pt-3">
              <dt className="font-semibold">الإجمالي</dt>
              <dd className="text-2xl font-semibold tabular-nums tracking-tight">{money(order.total)}</dd>
            </div>
          </dl>
        </div>

        {/* Thank you */}
        <footer className="mt-12 border-t border-line pt-7 text-center">
          <p className="latin-italic text-lg text-copper">Thank you</p>
          <p className="display mt-1 text-lg">شكراً لاختيارك {settings.storeName}</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-taupe">
            نتمنى أن تمنحك قطعك الحضور الذي تستحقه. الاستبدال متاح وفق سياسة المتجر — احتفظ بهذه الفاتورة وبطاقة القطعة.
          </p>
          {contacts.length > 0 && (
            <p className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-umber">
              {contacts.map((c) => (
                <span key={c.label}>
                  <span className="text-taupe">{c.label}: </span>
                  <span dir="ltr">{c.value}</span>
                </span>
              ))}
            </p>
          )}
        </footer>
      </article>
    </div>
  );
}
