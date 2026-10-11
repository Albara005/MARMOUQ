import { eq } from "drizzle-orm";
import { db } from "@/db";
import { media } from "@/db/schema";

const SIZES = new Set(["sm", "md", "lg"]);

export async function GET(request: Request, ctx: { params: Promise<{ id: string; size: string }> }) {
  const { id, size } = await ctx.params;
  if (!/^[a-f0-9]{8,64}$/.test(id) || !SIZES.has(size)) return new Response("Not found", { status: 404 });

  const etag = `"${id}-${size}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": "public, max-age=31536000, immutable" } });
  }

  const col = size === "sm" ? media.sm : size === "lg" ? media.lg : media.md;
  const rows = await db.select({ data: col }).from(media).where(eq(media.id, id)).limit(1);
  if (!rows[0]) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(rows[0].data), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: etag,
    },
  });
}
