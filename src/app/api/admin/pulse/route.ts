import { desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

/** Lightweight heartbeat for the admin shell: pending count + newest order (and how many arrived after `?since=<id>`). */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });

  const sinceRaw = new URL(request.url).searchParams.get("since");
  const since = sinceRaw && /^\d{1,10}$/.test(sinceRaw) ? Number(sinceRaw) : null;

  try {
    const [[pending], [latest], newer] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(orders).where(eq(orders.status, "pending")),
      db.select({ id: orders.id, number: orders.number }).from(orders).orderBy(desc(orders.id)).limit(1),
      since !== null ? db.select({ n: sql<number>`count(*)::int` }).from(orders).where(gt(orders.id, since)) : Promise.resolve([{ n: 0 }]),
    ]);
    return Response.json(
      {
        pending: pending?.n ?? 0,
        latestOrderId: latest?.id ?? null,
        latestNumber: latest?.number ?? null,
        newCount: newer[0]?.n ?? 0,
      },
      { headers: NO_STORE },
    );
  } catch (err) {
    console.error("[pulse]", err);
    return Response.json({ error: "unavailable" }, { status: 503, headers: NO_STORE });
  }
}
