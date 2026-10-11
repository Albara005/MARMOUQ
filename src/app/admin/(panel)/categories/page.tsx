import type { Metadata } from "next";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, media, products } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { CategoryManager, type CategoryRow } from "@/components/admin/category-manager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "التصنيفات" };

export default async function CategoriesPage() {
  await requireAdmin();
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      nameEn: categories.nameEn,
      slug: categories.slug,
      description: categories.description,
      slot: categories.slot,
      sortOrder: categories.sortOrder,
      isActive: categories.isActive,
      imageId: categories.imageId,
      imageBlur: media.blur,
      productCount: sql<number>`(select count(*)::int from ${products} p where p.category_id = ${categories.id} and p.status <> 'archived')`,
    })
    .from(categories)
    .leftJoin(media, eq(media.id, categories.imageId))
    .orderBy(asc(categories.sortOrder), asc(categories.id));

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader eyebrow="COLLECTIONS" title="التصنيفات" description="أقسام المتجر وصور أغلفتها. «خانة المنسّق» تحدد أين تظهر قطع التصنيف في منسّق الإطلالة." />
      <CategoryManager rows={rows as CategoryRow[]} />
    </div>
  );
}
