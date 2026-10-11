import type { Metadata } from "next";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/admin/ui";
import { CouponManager, type CouponDTO } from "./coupon-manager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "كوبونات الخصم" };

const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Aden" });

export default async function CouponsPage() {
  await requireAdmin();
  const [settings, rows, impact] = await Promise.all([
    getSettings(),
    db.select().from(coupons).orderBy(desc(coupons.isActive), desc(coupons.createdAt)),
    db.execute<{ code: string; n: number; discount: number; revenue: number }>(sql`
      select coupon_code as code, count(*)::int as n, coalesce(sum(discount), 0)::int as discount, coalesce(sum(total), 0)::bigint as revenue
      from orders where coupon_code <> '' and status not in ('cancelled', 'returned') group by coupon_code`),
  ]);
  const byCode = new Map(Array.from(impact, (r) => [r.code, r]));
  const now = Date.now();

  const list: CouponDTO[] = rows.map((c) => {
    const status: CouponDTO["status"] = !c.isActive
      ? "inactive"
      : c.startsAt && c.startsAt.getTime() > now
        ? "scheduled"
        : c.endsAt && c.endsAt.getTime() < now
          ? "expired"
          : c.maxUses != null && c.usedCount >= c.maxUses
            ? "exhausted"
            : "active";
    const imp = byCode.get(c.code);
    return {
      id: c.id,
      code: c.code,
      type: c.type,
      value: c.value,
      minSubtotal: c.minSubtotal,
      maxUses: c.maxUses,
      usedCount: c.usedCount,
      startsAt: c.startsAt ? DAY.format(c.startsAt) : "",
      endsAt: c.endsAt ? DAY.format(c.endsAt) : "",
      isActive: c.isActive,
      status,
      orders: imp ? Number(imp.n) : 0,
      revenue: imp ? Number(imp.revenue) : 0,
      discountGiven: imp ? Number(imp.discount) : 0,
    };
  });

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader eyebrow="PRIVILEGES" title="كوبونات الخصم" description="أكواد خاصة لعملائك ومتابعيك — حدّد القيمة والمدة وعدد الاستخدامات، وتابع أثرها على المبيعات." />
      <CouponManager coupons={list} currency={settings.currency} />
    </div>
  );
}
