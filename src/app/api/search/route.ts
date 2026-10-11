import { z } from "zod";
import { listProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

const querySchema = z.string().trim().max(60).catch("");

/** Instant search for the storefront overlay: GET /api/search?q= → { items: ProductCardData[] } (max 6). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = querySchema.parse(searchParams.get("q") ?? "");
  if (q.length < 1) return Response.json({ items: [] });
  try {
    const { items } = await listProducts({ q, limit: 6 });
    return Response.json({ items }, { headers: { "Cache-Control": "private, max-age=30" } });
  } catch (err) {
    console.error("[api/search]", err);
    return Response.json({ items: [], error: "تعذّر البحث الآن" }, { status: 500 });
  }
}
