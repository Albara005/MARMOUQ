import type { Metadata, Viewport } from "next";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "لوحة التحكم", template: "%s · لوحة تحكم مرموق" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#f7f3ee" };

async function getPulse(): Promise<{ pending: number; latestId: number | null }> {
  try {
    const [[p], [latest]] = await Promise.all([
      db.select({ n: sql<number>`count(*)::int` }).from(orders).where(eq(orders.status, "pending")),
      db.select({ id: orders.id }).from(orders).orderBy(desc(orders.id)).limit(1),
    ]);
    return { pending: p?.n ?? 0, latestId: latest?.id ?? null };
  } catch (err) {
    console.error("[admin layout] pulse", err);
    return { pending: 0, latestId: null };
  }
}

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const pulse = await getPulse();

  return (
    <AdminShell admin={{ name: admin.name, email: admin.email, role: admin.role }} initialPending={pulse.pending} initialLatestId={pulse.latestId}>
      {children}
    </AdminShell>
  );
}
