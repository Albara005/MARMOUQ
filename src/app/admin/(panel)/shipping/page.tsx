import type { Metadata } from "next";
import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { ArrowUpLeft, Gift, Truck } from "lucide-react";
import { db } from "@/db";
import { shippingZones } from "@/db/schema";
import { hasRole, requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { formatNumber } from "@/lib/utils";
import { Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { NewZoneForm, ZoneHeader, ZoneRow, type ZoneDTO } from "./zone-editor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "مناطق الشحن" };

export default async function ShippingPage() {
  const admin = await requireAdmin();
  const [settings, zones] = await Promise.all([
    getSettings(),
    db
      .select({
        id: shippingZones.id,
        name: shippingZones.name,
        fee: shippingZones.fee,
        eta: shippingZones.eta,
        isActive: shippingZones.isActive,
        sortOrder: shippingZones.sortOrder,
        orders: sql<number>`(select count(*)::int from orders o where o.shipping_zone_id = ${shippingZones.id})`,
      })
      .from(shippingZones)
      .orderBy(asc(shippingZones.sortOrder), asc(shippingZones.id)),
  ]);
  const list = zones as ZoneDTO[];
  const active = list.filter((z) => z.isActive);
  const fees = active.map((z) => z.fee);
  const money = (n: number) => formatMoney(n, settings.currency);
  const threshold = settings.freeShippingThreshold;
  const canSettings = hasRole(admin, "manager");

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="DELIVERY"
        title="مناطق الشحن"
        description="المحافظات التي نوصل إليها، برسومها ومدة التوصيل كما يراها العميل في صفحة إتمام الطلب."
      />

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex items-center gap-4 rounded-2xl border border-line bg-paper px-5 py-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-bone text-copper-deep">
            <Truck className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-taupe">مناطق متاحة</p>
            <p className="text-lg font-semibold text-espresso">
              <span className="tabular-nums">{formatNumber(active.length)}</span>
              <span className="text-sm font-normal text-taupe"> من {formatNumber(list.length)}</span>
              {fees.length > 0 && (
                <span className="ms-2 text-sm font-normal text-umber">
                  · الرسوم {Math.min(...fees) === Math.max(...fees) ? money(fees[0]) : `${money(Math.min(...fees))} – ${money(Math.max(...fees))}`}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="grain relative flex items-center gap-4 overflow-hidden rounded-2xl bg-espresso px-5 py-4 text-paper">
          <span className="relative z-10 grid size-11 shrink-0 place-items-center rounded-full bg-paper/10 text-copper-soft">
            <Gift className="size-5" aria-hidden />
          </span>
          <div className="relative z-10 min-w-0 flex-1">
            <p className="text-sm text-paper/70">الشحن المجاني</p>
            <p className="text-[0.95rem] font-medium">{threshold > 0 ? `للطلبات من ${money(threshold)} فأكثر — يتجاوز رسوم أي منطقة` : "غير مفعّل حالياً"}</p>
          </div>
          {canSettings && (
            <Link href="/admin/settings?tab=shipping" className="relative z-10 inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-2 text-xs text-copper-soft hover:bg-paper/10">
              تعديل
              <ArrowUpLeft className="size-3.5" aria-hidden />
            </Link>
          )}
        </div>
      </div>

      <Card title="المناطق" description="عدّل مباشرة في الجدول ثم احفظ السطر. المناطق الموقوفة تختفي من صفحة الدفع دون حذف طلباتها." padded={false}>
        {list.length === 0 ? (
          <EmptyState compact icon={<Truck />} title="لا مناطق توصيل بعد" description="أضف أول محافظة بالأسفل ليتمكن العملاء من إتمام الطلب." />
        ) : (
          <div>
            <ZoneHeader currencySymbol={settings.currency.symbol} />
            <div className="divide-y divide-line/70">
              {list.map((z) => (
                <ZoneRow key={z.id} zone={z} currencySymbol={settings.currency.symbol} />
              ))}
            </div>
          </div>
        )}
        <div className="border-t border-line bg-ivory/50 px-4 py-5 md:px-6">
          <p className="mb-3 text-sm font-semibold text-espresso">إضافة منطقة</p>
          <NewZoneForm currencySymbol={settings.currency.symbol} />
        </div>
      </Card>
    </div>
  );
}
