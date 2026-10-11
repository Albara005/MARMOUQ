import type { Metadata } from "next";
import { listProducts, type ProductCardData } from "@/lib/catalog";
import { PageHeader } from "@/components/store/page-header";
import { CartView } from "@/components/store/checkout/cart-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "سلّة التسوق",
  robots: { index: false, follow: true },
};

async function loadSuggestions(): Promise<ProductCardData[]> {
  try {
    const featured = await listProducts({ featured: true, limit: 8 });
    const items = featured.items.filter((p) => p.inStock);
    if (items.length >= 4) return items;
    const more = await listProducts({ limit: 8 });
    const seen = new Set(items.map((p) => p.id));
    return [...items, ...more.items.filter((p) => p.inStock && !seen.has(p.id))];
  } catch (err) {
    console.error("[cart] suggestions unavailable", err);
    return [];
  }
}

export default async function CartPage() {
  const suggestions = await loadSuggestions();
  return (
    <>
      <PageHeader
        eyebrow="SHOPPING BAG"
        title="سلّة التسوق"
        subtitle="راجع قطعك قبل الإتمام — يمكنك تعديل الكمية أو المقاس في أي وقت، ونؤكد معك كل التفاصيل قبل الشحن."
        breadcrumbs={[{ label: "الرئيسية", href: "/" }, { label: "سلّة التسوق" }]}
        className="[&>div:first-child]:pb-8 md:[&>div:first-child]:pb-10"
      />
      <CartView suggestions={suggestions} />
    </>
  );
}
