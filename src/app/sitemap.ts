import type { MetadataRoute } from "next";
import { listCategories, listLooks, listProducts } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = ["", "/shop", "/looks", "/atelier", "/about", "/contact", "/policies/shipping", "/policies/returns", "/policies/privacy"].map(
    (p) => ({ url: `${base}${p}`, lastModified: now, changeFrequency: p === "" ? "daily" : "weekly", priority: p === "" ? 1 : 0.7 }),
  );
  try {
    const [categories, looks, products, settings] = await Promise.all([listCategories(), listLooks(50), listProducts({ limit: 100 }), getSettings()]);
    return [
      ...staticPages,
      ...settings.customPages
        .filter((p) => p.published)
        .map((p) => ({ url: `${base}/pages/${encodeURIComponent(p.slug)}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 })),
      ...categories.map((c) => ({ url: `${base}/shop/${encodeURIComponent(c.slug)}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 })),
      ...products.items.map((p) => ({ url: `${base}/product/${encodeURIComponent(p.slug)}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.9 })),
      ...looks.map((l) => ({ url: `${base}/looks/${encodeURIComponent(l.slug)}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 })),
    ];
  } catch {
    return staticPages;
  }
}
