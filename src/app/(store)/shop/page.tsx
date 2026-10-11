import type { Metadata } from "next";
import { getCategoryBySlug } from "@/lib/catalog";
import { ShopView } from "@/components/store/catalog/shop-view";
import { parseShopParams } from "@/components/store/catalog/params";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function firstParam(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v ?? "").trim();
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const params = parseShopParams(sp);
  const slug = firstParam(sp.category);
  const category = slug ? await getCategoryBySlug(slug) : null;
  if (category) {
    return { title: category.name, description: category.description, alternates: { canonical: `/shop/${category.slug}` } };
  }
  if (params.q) return { title: `نتائج البحث: ${params.q}`, robots: { index: false, follow: true } };
  return {
    title: "كل القطع",
    description: "تسوّق مجموعة مرموق كاملة: تريكو قطني إيطالي بسحّاب نصفي، قمصان رسمية، ربطات حرير بيزلي، بناطيل كورية وأحذية لوفر إيطالية.",
    alternates: { canonical: "/shop" },
  };
}

/** /shop — the whole collection, search results, and legacy /shop?category= links. */
export default async function ShopPage({ searchParams }: Props) {
  const sp = await searchParams;
  const slug = firstParam(sp.category);
  const category = slug ? await getCategoryBySlug(slug) : null;
  return <ShopView category={category} params={parseShopParams(sp)} />;
}
