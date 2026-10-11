import type { Metadata } from "next";
import { asc, desc } from "drizzle-orm";
import { ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { PageHeader, ROLE_LABELS } from "@/components/admin/ui";
import { TeamManager, type TeamMember } from "@/components/admin/team/team-manager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "الفريق" };

const ROLE_ORDER = { owner: 0, manager: 1, staff: 2 } as const;

export default async function TeamPage() {
  const me = await requireAdmin("owner");
  const rows = await db
    .select({ id: admins.id, name: admins.name, email: admins.email, role: admins.role, isActive: admins.isActive, lastLoginAt: admins.lastLoginAt, createdAt: admins.createdAt })
    .from(admins)
    .orderBy(desc(admins.isActive), asc(admins.createdAt));
  const members: TeamMember[] = rows
    .sort((a, b) => Number(b.isActive) - Number(a.isActive) || ROLE_ORDER[a.role] - ROLE_ORDER[b.role])
    .map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      isActive: r.isActive,
      lastLogin: r.lastLoginAt ? formatDateTime(r.lastLoginAt) : null,
      createdAt: r.createdAt.toISOString(),
    }));
  const counts = (["owner", "manager", "staff"] as const).map((r) => ({ role: r, n: rows.filter((x) => x.role === r && x.isActive).length }));

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader eyebrow="THE HOUSE" title="الفريق" description="من يدير مرموق معك، وماذا يستطيع كل منهم أن يرى ويعدّل." />
      <div className="flex flex-wrap gap-2">
        {counts.map((c) => (
          <span key={c.role} className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3.5 py-1.5 text-sm text-umber">
            <ShieldCheck className="size-4 text-copper" aria-hidden />
            {ROLE_LABELS[c.role]}
            <span className="tabular-nums font-semibold text-espresso">{c.n}</span>
          </span>
        ))}
      </div>
      <TeamManager members={members} meId={me.id} />
      <p className="text-xs leading-6 text-taupe">
        المالك يدير الفريق والإعدادات · المدير يدير الإعدادات والكتالوج والطلبات · الموظف يتابع الطلبات والعملاء والكتالوج. لا يمكن إيقاف أو تخفيض آخر مالك نشط.
      </p>
    </div>
  );
}
