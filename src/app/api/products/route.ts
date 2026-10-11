import { z } from "zod";
import { listProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const MAX_IDS = 48;

const idsSchema = z
  .string()
  .max(600)
  .catch("")
  .transform((raw) => [...new Set(raw.split(",").map((s) => Number(s.trim())))].filter((n) => Number.isInteger(n) && n > 0 && n < 2 ** 31).slice(0, MAX_IDS));

/**
 * Product cards by id, in the order requested (wishlist, recently viewed):
 * GET /api/products?ids=1,2,3 → { items: ProductCardData[] }. Inactive/unknown ids are skipped.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = idsSchema.parse(searchParams.get("ids") ?? "");
  if (ids.length === 0) return Response.json({ items: [] });
  try {
    const { items } = await listProducts({ ids, limit: ids.length });
    const order = new Map(ids.map((id, i) => [id, i]));
    items.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return Response.json({ items }, { headers: { "Cache-Control": "private, max-age=30" } });
  } catch (err) {
    console.error("[api/products]", err);
    return Response.json({ items: [], error: "تعذّر تحميل القطع الآن" }, { status: 500 });
  }
}
