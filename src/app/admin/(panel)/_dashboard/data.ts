import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { OrderStatus } from "@/db/schema";
import { ORDER_STATUSES } from "@/lib/order-status";

/** Yemen has no DST: Asia/Aden is a fixed UTC+3, so day boundaries can be computed in JS and SQL alike. */
export const STORE_TZ = "Asia/Aden";
const TZ_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const RANGES = [7, 30, 90] as const;
export type RangeDays = (typeof RANGES)[number];

export function parseRange(v: string | string[] | undefined): RangeDays {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return (RANGES as readonly number[]).includes(n) ? (n as RangeDays) : 30;
}

function storeMidnight(now: Date): Date {
  const shifted = new Date(now.getTime() + TZ_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - TZ_OFFSET_MS);
}

export type SeriesPoint = {
  day: string;
  prevDay: string;
  revenue: number;
  orders: number;
  validOrders: number;
  customers: number;
  prevRevenue: number;
  prevOrders: number;
};

export type Kpi = { cur: number; prev: number; delta: number | null; spark: number[] };

export type DashboardData = {
  range: RangeDays;
  series: SeriesPoint[];
  kpis: { revenue: Kpi; orders: Kpi; aov: Kpi; customers: Kpi };
  today: { orders: number; revenue: number };
  statuses: { status: OrderStatus; count: number }[];
  statusTotal: number;
  top: { productId: number | null; name: string; units: number; revenue: number; imageId: string | null }[];
  lowStock: { variantId: number; productId: number; name: string; color: string; colorHex: string; size: string; stock: number; imageId: string | null }[];
  lowStockTotal: number;
  recent: {
    id: number;
    number: string;
    customerName: string;
    city: string;
    total: number;
    status: OrderStatus;
    paymentStatus: string;
    paymentMethod: string;
    createdAt: Date;
    items: number;
  }[];
  attention: { pending: number; unpaidTransfers: number };
};

export function pctDelta(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / prev) * 100;
}

/** Sums daily values into ~7–15 buckets for sparklines. */
function bucket(values: number[], size: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size).reduce((a, b) => a + b, 0));
  return out;
}

type Row = Record<string, unknown>;
const num = (v: unknown) => (v == null ? 0 : Number(v));

export async function getDashboardData(range: RangeDays, lowStockThreshold: number): Promise<DashboardData> {
  const now = new Date();
  const todayStart = storeMidnight(now);
  const curStart = new Date(todayStart.getTime() - (range - 1) * DAY_MS);
  const prevStart = new Date(curStart.getTime() - range * DAY_MS);
  const days = range * 2;
  const cur = curStart.toISOString();
  const prev = prevStart.toISOString();
  const threshold = Math.max(0, Math.floor(lowStockThreshold));

  const [daily, statusRows, topRows, lowRows, lowCountRows, recentRows, attentionRows] = await Promise.all([
    db.execute<Row>(sql`
      with o as (
        select (created_at at time zone ${STORE_TZ})::date as d,
               count(*)::int as orders,
               count(*) filter (where status not in ('cancelled', 'returned'))::int as valid_orders,
               coalesce(sum(total) filter (where status not in ('cancelled', 'returned')), 0)::float8 as revenue
        from orders
        where created_at >= ${prev}::timestamptz
        group by 1
      ),
      c as (
        select (created_at at time zone ${STORE_TZ})::date as d, count(*)::int as customers
        from customers
        where created_at >= ${prev}::timestamptz
        group by 1
      ),
      s as (
        select g as i, ((${prev}::timestamptz at time zone ${STORE_TZ})::date + g) as d
        from generate_series(0, ${days - 1}::int) as g
      )
      select to_char(s.d, 'YYYY-MM-DD') as day,
             coalesce(o.orders, 0) as orders,
             coalesce(o.valid_orders, 0) as valid_orders,
             coalesce(o.revenue, 0) as revenue,
             coalesce(c.customers, 0) as customers
      from s
      left join o on o.d = s.d
      left join c on c.d = s.d
      order by s.i
    `),
    db.execute<Row>(sql`
      select status, count(*)::int as n
      from orders
      where created_at >= ${cur}::timestamptz
      group by status
    `),
    db.execute<Row>(sql`
      select max(oi.product_id) as product_id,
             coalesce(max(p.name), max(oi.name)) as name,
             sum(oi.quantity)::int as units,
             sum(oi.unit_price * oi.quantity - oi.line_discount)::float8 as revenue,
             coalesce(
               (select pi.media_id from product_images pi where pi.product_id = max(oi.product_id) order by pi.sort_order, pi.id limit 1),
               max(oi.image_id)
             ) as image_id
      from order_items oi
      join orders o on o.id = oi.order_id
      left join products p on p.id = oi.product_id
      where o.created_at >= ${cur}::timestamptz
        and o.status not in ('cancelled', 'returned')
      group by coalesce(oi.product_id::text, 'n:' || oi.name)
      order by revenue desc, units desc
      limit 5
    `),
    db.execute<Row>(sql`
      select v.id as variant_id, v.product_id, p.name, v.color, v.color_hex, v.size, v.stock,
             (select pi.media_id from product_images pi
               where pi.product_id = v.product_id
               order by (pi.color = v.color) desc, pi.sort_order, pi.id limit 1) as image_id
      from product_variants v
      join products p on p.id = v.product_id
      where v.is_active and p.status <> 'archived' and v.stock <= ${threshold}::int
      order by v.stock asc, p.sort_order, p.name, v.sort_order
      limit 6
    `),
    db.execute<Row>(sql`
      select count(*)::int as n
      from product_variants v
      join products p on p.id = v.product_id
      where v.is_active and p.status <> 'archived' and v.stock <= ${threshold}::int
    `),
    db.execute<Row>(sql`
      select o.id, o.number, o.customer_name, o.city, o.total, o.status, o.payment_status, o.payment_method, o.created_at,
             coalesce((select sum(oi.quantity) from order_items oi where oi.order_id = o.id), 0)::int as items
      from orders o
      order by o.created_at desc, o.id desc
      limit 7
    `),
    db.execute<Row>(sql`
      select count(*) filter (where status = 'pending')::int as pending,
             count(*) filter (where payment_method = 'transfer' and payment_status = 'unpaid' and status not in ('cancelled', 'returned'))::int as unpaid_transfers
      from orders
    `),
  ]);

  /* ── series: first half = previous period, second half = current ── */
  const all = Array.from(daily as unknown as Row[]).map((r) => ({
    day: String(r.day),
    orders: num(r.orders),
    validOrders: num(r.valid_orders),
    revenue: num(r.revenue),
    customers: num(r.customers),
  }));
  const prevHalf = all.slice(0, range);
  const curHalf = all.slice(range);
  const series: SeriesPoint[] = curHalf.map((d, i) => ({
    ...d,
    prevDay: prevHalf[i]?.day ?? "",
    prevRevenue: prevHalf[i]?.revenue ?? 0,
    prevOrders: prevHalf[i]?.orders ?? 0,
  }));

  const sum = (rows: typeof all, k: "orders" | "validOrders" | "revenue" | "customers") => rows.reduce((a, r) => a + r[k], 0);
  const size = range === 7 ? 1 : range === 30 ? 2 : 7;

  const revCur = sum(curHalf, "revenue");
  const revPrev = sum(prevHalf, "revenue");
  const ordCur = sum(curHalf, "orders");
  const ordPrev = sum(prevHalf, "orders");
  const validCur = sum(curHalf, "validOrders");
  const validPrev = sum(prevHalf, "validOrders");
  const aovCur = validCur ? revCur / validCur : 0;
  const aovPrev = validPrev ? revPrev / validPrev : 0;
  const custCur = sum(curHalf, "customers");
  const custPrev = sum(prevHalf, "customers");

  const revBuckets = bucket(curHalf.map((d) => d.revenue), size);
  const validBuckets = bucket(curHalf.map((d) => d.validOrders), size);

  const kpis = {
    revenue: { cur: revCur, prev: revPrev, delta: pctDelta(revCur, revPrev), spark: revBuckets },
    orders: { cur: ordCur, prev: ordPrev, delta: pctDelta(ordCur, ordPrev), spark: bucket(curHalf.map((d) => d.orders), size) },
    aov: {
      cur: Math.round(aovCur),
      prev: Math.round(aovPrev),
      delta: aovPrev ? pctDelta(aovCur, aovPrev) : aovCur ? null : 0,
      spark: revBuckets.map((r, i) => (validBuckets[i] ? r / validBuckets[i] : 0)),
    },
    customers: { cur: custCur, prev: custPrev, delta: pctDelta(custCur, custPrev), spark: bucket(curHalf.map((d) => d.customers), size) },
  };

  const last = curHalf[curHalf.length - 1];

  const counts = new Map<string, number>(Array.from(statusRows as unknown as Row[]).map((r) => [String(r.status), num(r.n)]));
  const statuses = ORDER_STATUSES.map((s) => ({ status: s, count: counts.get(s) ?? 0 }));

  const attention = Array.from(attentionRows as unknown as Row[])[0] ?? {};

  return {
    range,
    series,
    kpis,
    today: { orders: last?.orders ?? 0, revenue: last?.revenue ?? 0 },
    statuses,
    statusTotal: statuses.reduce((a, s) => a + s.count, 0),
    top: Array.from(topRows as unknown as Row[]).map((r) => ({
      productId: r.product_id == null ? null : num(r.product_id),
      name: String(r.name ?? ""),
      units: num(r.units),
      revenue: num(r.revenue),
      imageId: (r.image_id as string | null) ?? null,
    })),
    lowStock: Array.from(lowRows as unknown as Row[]).map((r) => ({
      variantId: num(r.variant_id),
      productId: num(r.product_id),
      name: String(r.name ?? ""),
      color: String(r.color ?? ""),
      colorHex: String(r.color_hex ?? ""),
      size: String(r.size ?? ""),
      stock: num(r.stock),
      imageId: (r.image_id as string | null) ?? null,
    })),
    lowStockTotal: num(Array.from(lowCountRows as unknown as Row[])[0]?.n),
    recent: Array.from(recentRows as unknown as Row[]).map((r) => ({
      id: num(r.id),
      number: String(r.number),
      customerName: String(r.customer_name ?? ""),
      city: String(r.city ?? ""),
      total: num(r.total),
      status: String(r.status) as OrderStatus,
      paymentStatus: String(r.payment_status ?? "unpaid"),
      paymentMethod: String(r.payment_method ?? "cod"),
      createdAt: r.created_at instanceof Date ? r.created_at : new Date(String(r.created_at)),
      items: num(r.items),
    })),
    attention: { pending: num(attention.pending), unpaidTransfers: num(attention.unpaid_transfers) },
  };
}
