import "server-only";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { orders, type OrderStatus, type PaymentStatus } from "@/db/schema";
import { isOrderStatus } from "@/lib/order-status";
import { normalizePhone } from "@/lib/utils";

export const STORE_TZ = "Asia/Aden";
export const ORDERS_PAGE_SIZE = 25;

type SP = Record<string, string | string[] | undefined>;

export type OrderFilters = {
  status: OrderStatus | null;
  q: string;
  payment: PaymentStatus | null;
  method: "cod" | "transfer" | null;
  from: string | null;
  to: string | null;
  page: number;
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseOrderFilters(sp: SP): OrderFilters {
  const status = one(sp.status);
  const payment = one(sp.payment);
  const method = one(sp.method);
  const from = one(sp.from);
  const to = one(sp.to);
  const page = Number.parseInt(one(sp.page), 10);
  return {
    status: isOrderStatus(status) ? status : null,
    q: one(sp.q).trim().slice(0, 80),
    payment: payment === "paid" || payment === "unpaid" || payment === "refunded" ? payment : null,
    method: method === "cod" || method === "transfer" ? method : null,
    from: DATE.test(from) ? from : null,
    to: DATE.test(to) ? to : null,
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
  };
}

/** Plain search params for links (drops empty values, never includes `page`). */
export function filtersToParams(f: OrderFilters, opts: { status?: boolean } = {}): Record<string, string> {
  const out: Record<string, string> = {};
  if (opts.status !== false && f.status) out.status = f.status;
  if (f.q) out.q = f.q;
  if (f.payment) out.payment = f.payment;
  if (f.method) out.method = f.method;
  if (f.from) out.from = f.from;
  if (f.to) out.to = f.to;
  return out;
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

export function ordersWhere(f: OrderFilters, { includeStatus = true }: { includeStatus?: boolean } = {}): SQL | undefined {
  const parts: (SQL | undefined)[] = [];
  if (includeStatus && f.status) parts.push(eq(orders.status, f.status));
  if (f.payment) parts.push(eq(orders.paymentStatus, f.payment));
  if (f.method) parts.push(eq(orders.paymentMethod, f.method));
  if (f.from) parts.push(sql`(${orders.createdAt} at time zone ${STORE_TZ})::date >= ${f.from}::date`);
  if (f.to) parts.push(sql`(${orders.createdAt} at time zone ${STORE_TZ})::date <= ${f.to}::date`);
  if (f.q) {
    const like = `%${escapeLike(f.q)}%`;
    const digits = normalizePhone(f.q).replace(/\D/g, "");
    const ors: SQL[] = [ilike(orders.number, like), ilike(orders.customerName, like)];
    if (digits.length >= 3) {
      ors.push(sql`regexp_replace(${orders.phone}, '\\D', '', 'g') like ${`%${digits}%`}`);
      ors.push(ilike(orders.number, `%${digits}%`));
    }
    parts.push(or(...ors));
  }
  const defined = parts.filter((p): p is SQL => !!p);
  return defined.length ? and(...defined) : undefined;
}

export type OrderRow = {
  id: number;
  number: string;
  customerId: number | null;
  customerName: string;
  phone: string;
  city: string;
  address: string;
  notes: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  couponCode: string;
  createdAt: Date;
  itemsCount: number;
};

const rowCols = {
  id: orders.id,
  number: orders.number,
  customerId: orders.customerId,
  customerName: orders.customerName,
  phone: orders.phone,
  city: orders.city,
  address: orders.address,
  notes: orders.notes,
  status: orders.status,
  paymentMethod: orders.paymentMethod,
  paymentStatus: orders.paymentStatus,
  subtotal: orders.subtotal,
  discount: orders.discount,
  shippingFee: orders.shippingFee,
  total: orders.total,
  couponCode: orders.couponCode,
  createdAt: orders.createdAt,
  itemsCount: sql<number>`(select coalesce(sum(oi.quantity), 0)::int from order_items oi where oi.order_id = ${orders.id})`,
};

export async function listOrders(f: OrderFilters): Promise<{ rows: OrderRow[]; total: number; pageCount: number; page: number }> {
  const where = ordersWhere(f);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(orders).where(where);
  const pageCount = Math.max(1, Math.ceil(n / ORDERS_PAGE_SIZE));
  const page = Math.min(f.page, pageCount);
  const rows = await db
    .select(rowCols)
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(ORDERS_PAGE_SIZE)
    .offset((page - 1) * ORDERS_PAGE_SIZE);
  return { rows: rows as OrderRow[], total: n, pageCount, page };
}

/** Counts per status for the tabs — respects every filter except the status itself. */
export async function statusCounts(f: OrderFilters): Promise<{ all: number; byStatus: Partial<Record<OrderStatus, number>> }> {
  const rows = await db
    .select({ status: orders.status, n: sql<number>`count(*)::int` })
    .from(orders)
    .where(ordersWhere(f, { includeStatus: false }))
    .groupBy(orders.status);
  const byStatus: Partial<Record<OrderStatus, number>> = {};
  let all = 0;
  for (const r of rows) {
    byStatus[r.status] = r.n;
    all += r.n;
  }
  return { all, byStatus };
}

/** Rows for the CSV export (capped). */
export async function exportOrders(f: OrderFilters, cap = 5000) {
  const rows = await db
    .select({
      ...rowCols,
      itemsLabel: sql<string>`(select coalesce(string_agg(oi.name || case when oi.color <> '' then ' / ' || oi.color else '' end || case when oi.size <> '' then ' / ' || oi.size else '' end || ' ×' || oi.quantity, ' + ' order by oi.id), '') from order_items oi where oi.order_id = ${orders.id})`,
    })
    .from(orders)
    .where(ordersWhere(f))
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(cap);
  return rows as (OrderRow & { itemsLabel: string })[];
}
