import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Banknote, BellRing, PackageOpen, Receipt, ShoppingBag, UserPlus, Wallet } from "lucide-react";
import { hasRole, requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { formatNumber } from "@/lib/utils";
import { FlashMessage, Segmented, StatCard, formatCompact } from "@/components/admin/ui";
import { RevenueChart } from "@/components/admin/dashboard/revenue-chart";
import { LowStock, QuickActions, RecentOrders, StatusBreakdown, TopProducts } from "@/components/admin/dashboard/panels";
import { getDashboardData, parseRange, RANGES, STORE_TZ, type RangeDays } from "./_dashboard/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "لوحة القيادة" };

const RANGE_LABEL: Record<RangeDays, { cur: string; prev: string; tab: string }> = {
  7: { cur: "آخر 7 أيام", prev: "الأيام السبعة السابقة", tab: "7 أيام" },
  30: { cur: "آخر 30 يوماً", prev: "الثلاثون يوماً السابقة", tab: "30 يوماً" },
  90: { cur: "آخر 90 يوماً", prev: "التسعون يوماً السابقة", tab: "90 يوماً" },
};

function greeting(now: Date): { hello: string; line: string } {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: STORE_TZ }).format(now));
  if (hour >= 4 && hour < 12) return { hello: "صباح الخير", line: "صباح مرموق — إليك ما ينتظرك اليوم." };
  if (hour >= 12 && hour < 18) return { hello: "مساء الخير", line: "إليك حصيلة اليوم حتى هذه اللحظة." };
  return { hello: "مساء الخير", line: "ختام يوم جميل — هذه أرقام مرموق الليلة." };
}

const plural = (n: number, one: string, two: string, few: string, many: string) => (n === 1 ? one : n === 2 ? two : n >= 3 && n <= 10 ? few : many);

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ range?: string; denied?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const range = parseRange(sp.range);
  const settings = await getSettings();
  const currency = settings.currency;
  const threshold = settings.lowStockThreshold;
  const data = await getDashboardData(range, threshold);

  const now = new Date();
  const { hello, line } = greeting(now);
  const firstName = admin.name.trim().split(/\s+/)[0] || admin.name;
  const dateLabel = new Intl.DateTimeFormat("ar-YE-u-nu-latn", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: STORE_TZ }).format(now);
  const labels = RANGE_LABEL[range];
  const { kpis, attention } = data;
  const money = (n: number) => formatMoney(n, currency);
  const compactMoney = (n: number) => (n >= 1_000_000 ? `${formatCompact(n)} ${currency.symbol}` : money(n));

  return (
    <div className="space-y-5 md:space-y-6">
      {sp.denied === "1" && <FlashMessage type="warning" title="صلاحية غير كافية" message="هذه الصفحة متاحة لأدوار أعلى في الفريق. تواصل مع مالك المتجر إن احتجت الوصول." />}

      {/* ── Greeting + range ── */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-[0.8rem] text-taupe">{dateLabel}</p>
          <h1 className="display mt-1.5 text-[1.75rem] text-espresso md:text-[2.15rem]">
            {hello}، {firstName}
          </h1>
          <p className="mt-1 text-sm text-taupe">
            {line}{" "}
            <span className="text-umber">
              اليوم: <span className="font-medium tabular-nums text-espresso">{formatNumber(data.today.orders)}</span>{" "}
              {plural(data.today.orders, "طلب", "طلبان", "طلبات", "طلباً")} بقيمة <span className="font-medium tabular-nums text-espresso">{money(data.today.revenue)}</span>
            </span>
          </p>
        </div>
        <Segmented
          label="الفترة الزمنية"
          className="self-start md:self-auto"
          items={RANGES.map((r) => ({ label: RANGE_LABEL[r].tab, href: r === 30 ? "/admin" : `/admin?range=${r}`, active: r === range }))}
        />
      </header>

      {/* ── Needs attention ── */}
      {(attention.pending > 0 || attention.unpaidTransfers > 0 || data.lowStockTotal > 0) && (
        <section aria-label="يحتاج انتباهك" className="grain relative overflow-hidden rounded-2xl bg-espresso text-paper">
          <div className="pointer-events-none absolute -start-16 -top-24 size-64 rounded-full bg-copper/25 blur-3xl" aria-hidden />
          <div className="relative z-10 flex flex-col gap-4 p-5 md:flex-row md:items-center md:gap-6 md:p-6">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-copper/20 text-copper-soft ring-1 ring-copper/30">
                <BellRing className="size-5" aria-hidden />
                {attention.pending > 0 && <span className="absolute -end-0.5 -top-0.5 size-2.5 animate-pulse rounded-full bg-copper ring-2 ring-espresso" aria-hidden />}
              </span>
              <div className="min-w-0">
                <p className="display text-lg leading-snug md:text-xl">
                  {attention.pending > 0 ? (
                    <>
                      <span className="tabular-nums">{attention.pending}</span> {plural(attention.pending, "طلب ينتظر", "طلبان ينتظران", "طلبات تنتظر", "طلباً ينتظر")} تأكيدك
                    </>
                  ) : (
                    "كل الطلبات مؤكدة — عمل رائع"
                  )}
                </p>
                <p className="mt-1 text-[0.82rem] leading-relaxed text-paper/60">
                  {attention.pending > 0 ? "تواصل مع العملاء عبر واتساب لتأكيد المقاس والعنوان قبل التجهيز." : "تابع الحوالات والمخزون أدناه."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {attention.unpaidTransfers > 0 && (
                    <Link
                      href="/admin/orders?payment=unpaid"
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1 text-[0.75rem] text-paper/85 ring-1 ring-white/10 transition-colors hover:bg-white/[0.12]"
                    >
                      <Wallet className="size-3.5 text-copper-soft" aria-hidden />
                      <span className="tabular-nums">{attention.unpaidTransfers}</span> {plural(attention.unpaidTransfers, "حوالة", "حوالتان", "حوالات", "حوالة")} بانتظار التحقق
                    </Link>
                  )}
                  {data.lowStockTotal > 0 && (
                    <a
                      href="#low-stock"
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1 text-[0.75rem] text-paper/85 ring-1 ring-white/10 transition-colors hover:bg-white/[0.12]"
                    >
                      <PackageOpen className="size-3.5 text-copper-soft" aria-hidden />
                      <span className="tabular-nums">{data.lowStockTotal}</span> {plural(data.lowStockTotal, "مقاس", "مقاسان", "مقاسات", "مقاساً")} منخفضة المخزون
                    </a>
                  )}
                </div>
              </div>
            </div>
            {attention.pending > 0 && (
              <Link
                href="/admin/orders?status=pending"
                className="group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-copper px-6 text-sm font-medium text-paper transition-colors hover:bg-copper-deep"
              >
                مراجعة الطلبات
                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ── KPIs ── */}
      <section aria-label="المؤشرات الرئيسية" className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <StatCard
          label="المبيعات"
          value={compactMoney(kpis.revenue.cur)}
          delta={kpis.revenue.delta}
          hint={`مقابل ${compactMoney(kpis.revenue.prev)}`}
          icon={<Banknote />}
          spark={kpis.revenue.spark}
        />
        <StatCard
          label="الطلبات"
          value={formatNumber(kpis.orders.cur)}
          delta={kpis.orders.delta}
          hint={`مقابل ${formatNumber(kpis.orders.prev)} في الفترة السابقة`}
          icon={<ShoppingBag />}
          spark={kpis.orders.spark}
          href="/admin/orders"
        />
        <StatCard
          label="متوسط قيمة الطلب"
          value={money(kpis.aov.cur)}
          delta={kpis.aov.delta}
          hint={`مقابل ${money(kpis.aov.prev)}`}
          icon={<Receipt />}
          spark={kpis.aov.spark}
        />
        <StatCard
          label="عملاء جدد"
          value={formatNumber(kpis.customers.cur)}
          delta={kpis.customers.delta}
          hint={`مقابل ${formatNumber(kpis.customers.prev)} في الفترة السابقة`}
          icon={<UserPlus />}
          spark={kpis.customers.spark}
          href="/admin/customers"
        />
      </section>

      {/* ── Trend + status ── */}
      <div className="grid gap-5 md:gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <RevenueChart data={data.series} currency={currency} rangeLabel={labels.cur} prevLabel={labels.prev} />
        </div>
        <StatusBreakdown statuses={data.statuses} total={data.statusTotal} rangeLabel={`${labels.cur} · ${formatNumber(data.statusTotal)} طلب`} />
      </div>

      {/* ── Orders + bestsellers ── */}
      <div className="grid gap-5 md:gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <RecentOrders orders={data.recent} currency={currency} />
        </div>
        <TopProducts items={data.top} currency={currency} rangeLabel={labels.cur} />
      </div>

      {/* ── Stock + shortcuts ── */}
      <div className="grid gap-5 md:gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <LowStock items={data.lowStock} total={data.lowStockTotal} threshold={threshold} />
        </div>
        <QuickActions canManage={hasRole(admin, "manager")} />
      </div>
    </div>
  );
}
