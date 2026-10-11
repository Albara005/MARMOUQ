import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

const startedAt = Date.now();

/** Liveness + database check used by Railway's healthcheck (and uptime monitors). */
export async function GET() {
  const t0 = Date.now();
  try {
    await Promise.race([
      db.execute(sql`select 1`),
      new Promise((_, reject) => setTimeout(() => reject(new Error("database timeout")), 4000)),
    ]);
    return Response.json(
      { ok: true, db: "up", latencyMs: Date.now() - t0, uptimeS: Math.round((Date.now() - startedAt) / 1000) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[health] database check failed:", err instanceof Error ? err.message : err);
    return Response.json({ ok: false, db: "down" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
