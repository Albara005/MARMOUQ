import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/catalog";
import { ShopView } from "@/components/store/catalog/shop-view";
import { parseShopParams } from "@/components/store/catalog/params";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(decodeURIComponent(slug));
  if (!category) notFound();
  return {
    title: category.name,
    description: category.description || `تسوّق ${category.name} من مرموق — ملابس رجالية راقية بتفاصيل مختارة بعناية.`,
    alternates: { canonical: `/shop/${category.slug}` },
    openGraph: {
      title: `${category.name} | مرموق MARMOUQ`,
      description: category.description,
      ...(category.image ? { images: [{ url: `/media/${category.image.id}/lg`, alt: category.name }] } : {}),
    },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ category: slug }, sp] = await Promise.all([params, searchParams]);
  const category = await getCategoryBySlug(decodeURIComponent(slug));
  if (!category) notFound();
  return <ShopView category={category} params={parseShopParams(sp)} />;
}
