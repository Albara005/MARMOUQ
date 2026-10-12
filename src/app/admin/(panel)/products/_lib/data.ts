import "server-only";
import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, media, orderItems, productImages, products, productVariants } from "@/db/schema";
import { normalizeDetails, type CategoryOption, type EditorColor, type ProductEditorData } from "@/components/admin/product-editor/types";

export async function listCategoryOptions(): Promise<CategoryOption[]> {
  return db.select({ id: categories.id, name: categories.name, slot: categories.slot }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.id));
}

export function emptyProduct(): ProductEditorData {
  return {
    id: null,
    name: "",
    subtitle: "",
    slug: "",
    categoryId: null,
    description: "",
    details: [],
    material: "",
    origin: "",
    care: "",
    sizeGuide: "tops",
    price: 0,
    compareAtPrice: null,
    status: "draft",
    isFeatured: false,
    isNew: true,
    badge: "",
    sortOrder: 0,
    images: [],
    colors: [],
    sizes: [],
    setParts: null,
    variants: [],
    orderedVariantIds: [],
    unitsSold: 0,
    updatedAt: null,
  };
}

/** Everything the editor needs for one product (no binary media columns). */
export async function loadProductForEditor(id: number): Promise<ProductEditorData | null> {
  const [p] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!p) return null;
  const [imgs, vars, ordered] = await Promise.all([
    db
      .select({ id: media.id, blur: media.blur, width: media.width, height: media.height, alt: media.alt, color: productImages.color })
      .from(productImages)
      .innerJoin(media, eq(media.id, productImages.mediaId))
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.sortOrder), asc(productImages.id)),
    db.select().from(productVariants).where(eq(productVariants.productId, id)).orderBy(asc(productVariants.sortOrder), asc(productVariants.id)),
    db
      .select({ variantId: orderItems.variantId, qty: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int` })
      .from(orderItems)
      .where(and(eq(orderItems.productId, id), isNotNull(orderItems.variantId)))
      .groupBy(orderItems.variantId),
  ]);

  const colors: EditorColor[] = [];
  const sizes: string[] = [];
  // Active variants define the matrix; inactive-only combos still show (switched off) so nothing is hidden.
  for (const v of vars) {
    if (v.color && !colors.some((c) => c.name === v.color)) colors.push({ name: v.color, hex: v.colorHex || "#8E8E93" });
    if (!sizes.includes(v.size)) sizes.push(v.size);
  }
  // Products with one-size variants only keep [""]; mixed "" + sized lists drop the empty one.
  const cleanSizes = sizes.length > 1 ? sizes.filter((s) => s !== "") : sizes;

  return {
    id: p.id,
    name: p.name,
    subtitle: p.subtitle,
    slug: p.slug,
    categoryId: p.categoryId,
    description: p.description,
    details: normalizeDetails(p.details),
    material: p.material,
    origin: p.origin,
    care: p.care,
    sizeGuide: p.sizeGuide,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    status: p.status,
    isFeatured: p.isFeatured,
    isNew: p.isNew,
    badge: p.badge,
    sortOrder: p.sortOrder,
    images: imgs.map((i) => ({ id: i.id, blur: i.blur, width: i.width, height: i.height, alt: i.alt, color: i.color })),
    colors,
    sizes: cleanSizes,
    setParts: Array.isArray(p.setParts) && p.setParts.length >= 2 ? p.setParts : null,
    variants: vars.map((v) => ({
      id: v.id,
      color: v.color,
      colorHex: v.colorHex,
      size: v.size,
      sku: v.sku,
      stock: v.stock,
      priceOverride: v.priceOverride,
      isActive: v.isActive,
    })),
    orderedVariantIds: ordered.map((o) => o.variantId).filter((x): x is number => x != null),
    unitsSold: ordered.reduce((s, o) => s + Number(o.qty), 0),
    updatedAt: p.updatedAt.toISOString(),
  };
}

/** Product ids that appear on at least one order line. */
export async function orderedProductIds(ids: number[]): Promise<Set<number>> {
  if (!ids.length) return new Set();
  const rows = await db.selectDistinct({ id: orderItems.productId }).from(orderItems).where(inArray(orderItems.productId, ids));
  return new Set(rows.map((r) => r.id).filter((x): x is number => x != null));
}
