import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Shirt } from "lucide-react";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { lookItems, looks, media, products } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MediaImage } from "@/components/ui/media-image";
import { Card, EmptyState, PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "الإطلالات" };

export default async function LooksAdminPage() {
  await requireAdmin();
  const [settings, rows] = await Promise.all([
    getSettings(),
    db
      .select({
        id: looks.id,
        title: looks.title,
        subtitle: looks.subtitle,
        discountPercent: looks.discountPercent,
        isActive: looks.isActive,
        coverId: looks.coverId,
        coverBlur: media.blur,
        items: sql<number>`(select count(*)::int from ${lookItems} li where li.look_id = ${looks.id})`,
        total: sql<number>`(select coalesce(sum(p.price), 0)::int from ${lookItems} li join ${products} p on p.id = li.product_id where li.look_id = ${looks.id})`,
      })
      .from(looks)
      .leftJoin(media, eq(media.id, looks.coverId))
      .orderBy(asc(looks.sortOrder), asc(looks.id)),
  ]);
  const money = (n: number) => formatMoney(n, settings.currency);

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="LOOKBOOK"
        title="الإطلالات"
        description="أطقم كاملة بخصم عند شرائها معاً — مع نقاط تفاعلية على صورة الإطلالة."
        actions={
          <Link href="/admin/looks/new" className={buttonClasses("primary", "md")}>
            <Plus className="size-4" aria-hidden /> إطلالة جديدة
          </Link>
        }
      />
      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={<Shirt />} title="لا إطلالات بعد" description="نسّق طقماً من منتجاتك واعرضه بخصم يشجع على شراء القطع معاً." />
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((l) => (
            <li key={l.id}>
              <Link href={`/admin/looks/${l.id}`} className="group block overflow-hidden rounded-2xl border border-line bg-paper transition-shadow hover:shadow-[0_12px_32px_-16px_rgba(28,19,15,0.35)]">
                <MediaImage media={l.coverId ? { id: l.coverId, blur: l.coverBlur ?? "" } : null} sizes="(min-width:1280px) 30vw, (min-width:640px) 45vw, 90vw" className="studio-frame aspect-[4/3]" imgClassName="transition-transform duration-700 group-hover:scale-[1.03]" />
                <div className="space-y-1.5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="display truncate text-lg text-espresso">{l.title}</p>
                    <Badge tone={l.isActive ? "success" : "neutral"} dot>
                      {l.isActive ? "منشورة" : "مخفية"}
                    </Badge>
                  </div>
                  <p className="text-xs text-taupe">
                    {l.items} قطع · {money(l.total)}
                    {l.discountPercent > 0 && <span className="text-copper-deep"> · خصم {l.discountPercent}%</span>}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
