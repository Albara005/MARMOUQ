import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { listShippingZones, type ShippingZoneData } from "@/lib/catalog";
import { CheckoutForm, type CheckoutPayments } from "@/components/store/checkout/checkout-form";
import { CheckoutSteps } from "@/components/store/checkout/steps";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "إتمام الطلب",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const settings = await getSettings();
  let zones: ShippingZoneData[] = [];
  try {
    zones = await listShippingZones();
  } catch (err) {
    console.error("[checkout] shipping zones unavailable", err);
  }

  const { cod, transfer } = settings.payments;
  const payments: CheckoutPayments = {
    cod: { enabled: cod.enabled, label: cod.label || "الدفع عند الاستلام", note: cod.note },
    transfer: {
      enabled: transfer.enabled,
      label: transfer.label || "حوالة / محفظة إلكترونية",
      note: transfer.note,
      accounts: transfer.accounts.map((a) => ({ bank: a.bank, holder: a.holder, number: a.number })),
    },
  };

  return (
    <div className="container-luxe pb-16 pt-6 md:pb-24 md:pt-10">
      <CheckoutSteps current={1} />
      <header className="mb-8 mt-5 md:mb-12 md:mt-8">
        <p className="eyebrow inline-flex items-center gap-3">
          <span className="h-px w-8 bg-gold/70" aria-hidden />
          SECURE CHECKOUT
        </p>
        <h1 className="display mt-3 text-4xl text-espresso md:text-5xl">إتمام الطلب</h1>
        <p className="mt-3 max-w-xl text-[0.95rem] leading-8 text-umber">خطوة وحدة وتصير قطعك في الطريق إليك — بدون تسجيل حساب، وتدفع عند الاستلام.</p>
      </header>
      <CheckoutForm zones={zones} payments={payments} />
    </div>
  );
}
