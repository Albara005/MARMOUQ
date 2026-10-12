import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, gte, ilike, inArray, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categories, lookItems, looks, media, productImages, products, productVariants, shippingZones } from "@/db/schema";
import { SET_SEPARATOR, splitSetSize, type SetPart } from "@/lib/size-guides";

/* ───────────── Types (safe to pass to client components) ───────────── */

export type MediaRef = { id: string; blur: string; width: number; height: number; alt: string };
export type ColorOption = { name: string; hex: string };
export type ProductImage = MediaRef & { color: string };

export type ProductCardData = {
  id: number;
  slug: string;
  name: string;
  subtitle: string;
  price: number;
  compareAtPrice: number | null;
  badge: string;
  isNew: boolean;
  isFeatured: boolean;
  categoryId: number | null;
  categorySlug: string | null;
  categoryName: string | null;
  /** Ordered gallery (first = cover, second = hover image) */
  images: ProductImage[];
  colors: ColorOption[];
  /** Plain sizes; for sets, every piece size (e.g. ["M","L","30","32"]) */
  sizes: string[];
  totalStock: number;
  inStock: boolean;
  /** Set sold with a size per piece (shirt + trousers…); null = single size choice */
  setParts: SetPart[] | null;
};

export type VariantData = {
  id: number;
  color: string;
  colorHex: string;
  size: string;
  stock: number;
  price: number;
};

export type ProductDetail = ProductCardData & {
  description: string;
  details: string[];
  material: string;
  origin: string;
  care: string;
  /** size guide id from settings ("none" = no guide) */
  sizeGuide: string;
  variants: VariantData[];
  /** Pieces offered with this product (watch, shoes…), in the merchant's order */
  addons: AddonProduct[];
  /** % off each add-on bought together with this product */
  addonDiscount: number;
};

/** An add-on offered on a product page, with its purchasable options. */
export type AddonProduct = ProductCardData & { variants: VariantData[] };

export type CategoryData = {
  id: number;
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  slot: string;
  image: MediaRef | null;
  productCount: number;
};

export type LookItemData = { product: ProductCardData; color: string; x: number; y: number };

export type LookData = {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  discountPercent: number;
  cover: MediaRef | null;
  items: LookItemData[];
  /** Sum of item prices */
  total: number;
  /** Total after the look discount */
  bundleTotal: number;
};

export type ShippingZoneData = { id: number; name: string; fee: number; eta: string };

export type ProductSort = "featured" | "newest" | "price-asc" | "price-desc";

export type ProductQuery = {
  category?: string;
  q?: string;
  sort?: ProductSort;
  color?: string;
  size?: string;
  min?: number;
  max?: number;
  featured?: boolean;
  isNew?: boolean;
  ids?: number[];
  excludeId?: number;
  limit?: number;
  offset?: number;
};

/* ───────────── Internals ───────────── */

const mediaCols = { id: media.id, blur: media.blur, width: media.width, height: media.height, alt: media.alt };

async function hydrateCards(
  rows: Array<{
    id: number;
    slug: string;
    name: string;
    subtitle: string;
    price: number;
    compareAtPrice: number | null;
    badge: string;
    isNew: boolean;
    isFeatured: boolean;
    categoryId: number | null;
    categorySlug: string | null;
    categoryName: string | null;
    setParts: SetPart[] | null;
  }>,
): Promise<ProductCardData[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [imgs, vars] = await Promise.all([
    db
      .select({ productId: productImages.productId, color: productImages.color, sortOrder: productImages.sortOrder, ...mediaCols })
      .from(productImages)
      .innerJoin(media, eq(media.id, productImages.mediaId))
      .where(inArray(productImages.productId, ids))
      .orderBy(asc(productImages.sortOrder), asc(productImages.id)),
    db
      .select()
      .from(productVariants)
      .where(and(inArray(productVariants.productId, ids), eq(productVariants.isActive, true)))
      .orderBy(asc(productVariants.sortOrder), asc(productVariants.id)),
  ]);

  return rows.map((r) => {
    const images: ProductImage[] = imgs
      .filter((i) => i.productId === r.id)
      .map((i) => ({ id: i.id, blur: i.blur, width: i.width, height: i.height, alt: i.alt || r.name, color: i.color }));
    const pv = vars.filter((v) => v.productId === r.id);
    const colors: ColorOption[] = [];
    for (const v of pv) if (v.color && !colors.some((c) => c.name === v.color)) colors.push({ name: v.color, hex: v.colorHex || "#999" });
    const sizes: string[] = [];
    const set = Array.isArray(r.setParts) && r.setParts.length >= 2 ? r.setParts : null;
    for (const v of pv) for (const sz of set ? splitSetSize(v.size, set.length) : [v.size]) if (sz && !sizes.includes(sz)) sizes.push(sz);
    const totalStock = pv.reduce((s, v) => s + Math.max(0, v.stock), 0);
    return { ...r, setParts: set, images, colors, sizes, totalStock, inStock: totalStock > 0 };
  });
}

const cardSelect = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  subtitle: products.subtitle,
  price: products.price,
  compareAtPrice: products.compareAtPrice,
  badge: products.badge,
  isNew: products.isNew,
  isFeatured: products.isFeatured,
  categoryId: products.categoryId,
  categorySlug: categories.slug,
  categoryName: categories.name,
  setParts: products.setParts,
};

/* ───────────── Public API ───────────── */

export async function listProducts(query: ProductQuery = {}): Promise<{ items: ProductCardData[]; total: number }> {
  const where: SQL[] = [eq(products.status, "active")];
  if (query.category) where.push(eq(categories.slug, query.category));
  if (query.featured) where.push(eq(products.isFeatured, true));
  if (query.isNew) where.push(eq(products.isNew, true));
  if (query.ids?.length) where.push(inArray(products.id, query.ids));
  if (query.excludeId) where.push(ne(products.id, query.excludeId));
  if (query.min != null && Number.isFinite(query.min)) where.push(gte(products.price, query.min));
  if (query.max != null && Number.isFinite(query.max)) where.push(lte(products.price, query.max));
  if (query.q?.trim()) {
    const term = `%${query.q.trim().replace(/[%_]/g, "")}%`;
    where.push(or(ilike(products.name, term), ilike(products.subtitle, term), ilike(products.description, term), ilike(categories.name, term))!);
  }
  if (query.color) {
    where.push(
      sql`exists (select 1 from ${productVariants} v where v.product_id = ${products.id} and v.is_active and v.color = ${query.color})`,
    );
  }
  if (query.size) {
    where.push(
      sql`exists (select 1 from ${productVariants} v where v.product_id = ${products.id} and v.is_active and v.stock > 0 and ${query.size} = any(string_to_array(v.size, ${SET_SEPARATOR})))`,
    );
  }

  const order =
    query.sort === "price-asc"
      ? [asc(products.price)]
      : query.sort === "price-desc"
        ? [desc(products.price)]
        : query.sort === "newest"
          ? [desc(products.createdAt)]
          : [desc(products.isFeatured), asc(products.sortOrder), desc(products.createdAt)];

  const whereSql = and(...where);
  const [rows, [{ count }]] = await Promise.all([
    db
      .select(cardSelect)
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(whereSql)
      .orderBy(...order, asc(products.id))
      .limit(Math.min(query.limit ?? 24, 100))
      .offset(query.offset ?? 0),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(whereSql),
  ]);

  return { items: await hydrateCards(rows), total: count };
}

export const getProductBySlug = cache(async (slug: string): Promise<ProductDetail | null> => {
  const row = await db
    .select({
      ...cardSelect,
      description: products.description,
      details: products.details,
      material: products.material,
      origin: products.origin,
      care: products.care,
      sizeGuide: products.sizeGuide,
      addonIds: products.addonIds,
      addonDiscount: products.addonDiscount,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.slug, slug), eq(products.status, "active")))
    .limit(1);
  if (!row[0]) return null;
  const r = row[0];
  const [[card], vars, addons] = await Promise.all([
    hydrateCards([r]),
    db
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.productId, r.id), eq(productVariants.isActive, true)))
      .orderBy(asc(productVariants.sortOrder), asc(productVariants.id)),
    loadAddons(Array.isArray(r.addonIds) ? r.addonIds.filter((id) => id !== r.id) : []),
  ]);
  return {
    ...card,
    description: r.description,
    details: r.details ?? [],
    material: r.material,
    origin: r.origin,
    care: r.care,
    sizeGuide: r.sizeGuide,
    variants: vars.map((v) => ({ id: v.id, color: v.color, colorHex: v.colorHex, size: v.size, stock: v.stock, price: v.priceOverride ?? r.price })),
    addons,
    addonDiscount: addons.length ? Math.min(90, Math.max(0, r.addonDiscount)) : 0,
  };
});

/** Active, in-stock add-on products (sets excluded — they need a size per piece). */
async function loadAddons(ids: number[]): Promise<AddonProduct[]> {
  if (!ids.length) return [];
  try {
    const rows = await db
      .select(cardSelect)
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .where(and(inArray(products.id, ids.slice(0, 12)), eq(products.status, "active")));
    const cards = await hydrateCards(rows);
    const vars = await db
      .select()
      .from(productVariants)
      .where(and(inArray(productVariants.productId, ids), eq(productVariants.isActive, true)))
      .orderBy(asc(productVariants.sortOrder), asc(productVariants.id));
    const byId = new Map(cards.map((c) => [c.id, c]));
    return ids
      .map((id) => byId.get(id))
      .filter((c): c is ProductCardData => !!c && !c.setParts && c.inStock)
      .map((c) => ({
        ...c,
        variants: vars.filter((v) => v.productId === c.id).map((v) => ({ id: v.id, color: v.color, colorHex: v.colorHex, size: v.size, stock: v.stock, price: v.priceOverride ?? c.price })),
      }));
  } catch (err) {
    console.error("[catalog] add-ons unavailable", err);
    return [];
  }
}

/** Distinct colours & sizes across the active catalogue (for shop filters). */
export async function getFilterFacets(category?: string): Promise<{ colors: ColorOption[]; sizes: string[]; priceMin: number; priceMax: number }> {
  const catWhere = category ? sql`and c.slug = ${category}` : sql``;
  const facetRows = await db.execute<{ color: string; color_hex: string; size: string }>(sql`
    select distinct v.color, v.color_hex, v.size
    from ${productVariants} v
    join ${products} p on p.id = v.product_id and p.status = 'active'
    left join ${categories} c on c.id = p.category_id
    where v.is_active ${catWhere}
  `);
  const priceRows = await db.execute<{ min: number | null; max: number | null }>(sql`
    select min(p.price)::int as min, max(p.price)::int as max
    from ${products} p left join ${categories} c on c.id = p.category_id
    where p.status = 'active' ${catWhere}
  `);
  const colors: ColorOption[] = [];
  const sizes: string[] = [];
  for (const r of facetRows) {
    if (r.color && !colors.some((c) => c.name === r.color)) colors.push({ name: r.color, hex: r.color_hex || "#999" });
    for (const sz of r.size.split(SET_SEPARATOR)) if (sz && !sizes.includes(sz)) sizes.push(sz);
  }
  const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
  sizes.sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a);
    const ib = SIZE_ORDER.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });
  return { colors, sizes, priceMin: priceRows[0]?.min ?? 0, priceMax: priceRows[0]?.max ?? 0 };
}

export const listCategories = cache(async (): Promise<CategoryData[]> => {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      nameEn: categories.nameEn,
      description: categories.description,
      slot: categories.slot,
      imageId: categories.imageId,
      imgBlur: media.blur,
      imgW: media.width,
      imgH: media.height,
      imgAlt: media.alt,
      productCount: sql<number>`(select count(*)::int from ${products} p where p.category_id = ${categories.id} and p.status = 'active')`,
    })
    .from(categories)
    .leftJoin(media, eq(media.id, categories.imageId))
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder), asc(categories.id));
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    nameEn: r.nameEn,
    description: r.description,
    slot: r.slot,
    productCount: r.productCount,
    image: r.imageId ? { id: r.imageId, blur: r.imgBlur ?? "", width: r.imgW ?? 1, height: r.imgH ?? 1, alt: r.imgAlt || r.name } : null,
  }));
});

export async function getCategoryBySlug(slug: string): Promise<CategoryData | null> {
  const all = await listCategories();
  return all.find((c) => c.slug === slug) ?? null;
}

async function buildLooks(lookRows: (typeof looks.$inferSelect)[]): Promise<LookData[]> {
  if (lookRows.length === 0) return [];
  const lookIds = lookRows.map((l) => l.id);
  const items = await db.select().from(lookItems).where(inArray(lookItems.lookId, lookIds)).orderBy(asc(lookItems.sortOrder));
  const productIds = [...new Set(items.map((i) => i.productId))];
  const { items: cards } = productIds.length ? await listProducts({ ids: productIds, limit: 100 }) : { items: [] as ProductCardData[] };
  const coverIds = lookRows.map((l) => l.coverId).filter((x): x is string => !!x);
  const covers = coverIds.length ? await db.select(mediaCols).from(media).where(inArray(media.id, coverIds)) : [];
  return lookRows.map((l) => {
    const li: LookItemData[] = items
      .filter((i) => i.lookId === l.id)
      .map((i) => ({ product: cards.find((c) => c.id === i.productId)!, color: i.color, x: i.x, y: i.y }))
      .filter((i) => !!i.product);
    const total = li.reduce((s, i) => s + i.product.price, 0);
    const cover = covers.find((c) => c.id === l.coverId);
    return {
      id: l.id,
      slug: l.slug,
      title: l.title,
      subtitle: l.subtitle,
      description: l.description,
      discountPercent: l.discountPercent,
      cover: cover ? { ...cover, alt: cover.alt || l.title } : null,
      items: li,
      total,
      bundleTotal: total - Math.round((total * l.discountPercent) / 100),
    };
  });
}

export async function listLooks(limit = 12): Promise<LookData[]> {
  const rows = await db.select().from(looks).where(eq(looks.isActive, true)).orderBy(asc(looks.sortOrder), desc(looks.id)).limit(limit);
  return buildLooks(rows);
}

export async function getLookBySlug(slug: string): Promise<LookData | null> {
  const rows = await db.select().from(looks).where(and(eq(looks.slug, slug), eq(looks.isActive, true))).limit(1);
  return (await buildLooks(rows))[0] ?? null;
}

/** Looks that contain a given product ("complete the look"). */
export async function listLooksForProduct(productId: number): Promise<LookData[]> {
  const rows = await db
    .select({ look: looks })
    .from(looks)
    .innerJoin(lookItems, eq(lookItems.lookId, looks.id))
    .where(and(eq(lookItems.productId, productId), eq(looks.isActive, true)))
    .limit(3);
  return buildLooks(rows.map((r) => r.look));
}

export const listShippingZones = cache(async (): Promise<ShippingZoneData[]> => {
  const rows = await db
    .select({ id: shippingZones.id, name: shippingZones.name, fee: shippingZones.fee, eta: shippingZones.eta })
    .from(shippingZones)
    .where(eq(shippingZones.isActive, true))
    .orderBy(asc(shippingZones.sortOrder), asc(shippingZones.id));
  return rows;
});

/** Lightweight look rules for the client-side pricing estimate. */
export async function getLookRules(lookIds: number[]): Promise<{ id: number; discountPercent: number; productIds: number[] }[]> {
  if (!lookIds.length) return [];
  const rows = await db.select().from(looks).where(and(inArray(looks.id, lookIds), eq(looks.isActive, true)));
  const items = await db.select().from(lookItems).where(inArray(lookItems.lookId, lookIds));
  return rows.map((l) => ({ id: l.id, discountPercent: l.discountPercent, productIds: items.filter((i) => i.lookId === l.id).map((i) => i.productId) }));
}

/** Media metadata (no binary) for a set of ids. */
export async function getMediaRefs(ids: string[]): Promise<MediaRef[]> {
  if (!ids.length) return [];
  return db.select(mediaCols).from(media).where(inArray(media.id, ids));
}
