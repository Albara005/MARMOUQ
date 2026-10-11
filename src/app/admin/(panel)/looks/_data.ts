import "server-only";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { lookItems, looks, media, productImages, products, productVariants } from "@/db/schema";

export type PickerProduct = { id: number; name: string; price: number; colors: { name: string; hex: string }[]; images: { id: string; color: string }[] };

export type LookEditorData = {
  id: number | null;
  title: string;
  subtitle: string;
  description: string;
  slug: string;
  discountPercent: number;
  isActive: boolean;
  sortOrder: number;
  cover: { id: string; blur: string; width: number; height: number } | null;
  items: { productId: number; color: string; x: number; y: number }[];
};

export async function listPickerProducts(): Promise<PickerProduct[]> {
  const rows = await db.select({ id: products.id, name: products.name, price: products.price }).from(products).where(ne(products.status, "archived")).orderBy(asc(products.sortOrder), asc(products.id));
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [vars, imgs] = await Promise.all([
    db.select({ productId: productVariants.productId, color: productVariants.color, hex: productVariants.colorHex }).from(productVariants).where(and(inArray(productVariants.productId, ids), eq(productVariants.isActive, true))),
    db.select({ productId: productImages.productId, id: productImages.mediaId, color: productImages.color }).from(productImages).where(inArray(productImages.productId, ids)).orderBy(asc(productImages.sortOrder), asc(productImages.id)),
  ]);
  return rows.map((r) => {
    const colors: PickerProduct["colors"] = [];
    for (const v of vars) if (v.productId === r.id && v.color && !colors.some((c) => c.name === v.color)) colors.push({ name: v.color, hex: v.hex });
    return { ...r, colors, images: imgs.filter((i) => i.productId === r.id).map((i) => ({ id: i.id, color: i.color })) };
  });
}

export async function loadLook(id: number): Promise<LookEditorData | null> {
  const [l] = await db.select().from(looks).where(eq(looks.id, id)).limit(1);
  if (!l) return null;
  const items = await db.select().from(lookItems).where(eq(lookItems.lookId, id)).orderBy(asc(lookItems.sortOrder));
  const cover = l.coverId ? (await db.select({ id: media.id, blur: media.blur, width: media.width, height: media.height }).from(media).where(eq(media.id, l.coverId)).limit(1))[0] ?? null : null;
  return {
    id: l.id,
    title: l.title,
    subtitle: l.subtitle,
    description: l.description,
    slug: l.slug,
    discountPercent: l.discountPercent,
    isActive: l.isActive,
    sortOrder: l.sortOrder,
    cover,
    items: items.map((i) => ({ productId: i.productId, color: i.color, x: i.x, y: i.y })),
  };
}
