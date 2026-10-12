import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { getProductBySlug, listLooksForProduct, listProducts, type ProductCardData, type ProductDetail } from "@/lib/catalog";
import { SectionHeading } from "@/components/store/section-heading";
import { Breadcrumbs } from "@/components/store/product/breadcrumbs";
import { ProductExperience } from "@/components/store/product/product-experience";
import { ProductDetails } from "@/components/store/product/product-details";
import { CompleteTheLook } from "@/components/store/product/complete-the-look";
import { ProductRail } from "@/components/store/product/product-rail";
import { RecentlyViewed } from "@/components/store/product/recently-viewed";
import { PageBlocks } from "@/components/store/blocks/page-blocks";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

function summary(p: ProductDetail): string {
  const text = [p.subtitle, p.description].filter(Boolean).join(" — ").replace(/\s+/g, " ").trim();
  return text.length > 158 ? `${text.slice(0, 155)}…` : text;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(decodeURIComponent(slug));
  if (!product) notFound();
  const cover = product.images[0];
  const description = summary(product);
  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: "website",
      title: `${product.name} | مرموق MARMOUQ`,
      description,
      url: `/product/${product.slug}`,
      ...(cover ? { images: [{ url: `/media/${cover.id}/lg`, width: cover.width, height: cover.height, alt: cover.alt || product.name }] } : {}),
    },
    twitter: { card: "summary_large_image", title: product.name, description },
  };
}

function jsonLd(product: ProductDetail, currencyCode: string) {
  const prices = product.variants.map((v) => v.price);
  const lo = prices.length ? Math.min(...prices) : product.price;
  const hi = prices.length ? Math.max(...prices) : product.price;
  const availability = product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
  const url = `${SITE}/product/${product.slug}`;
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: summary(product),
      sku: `MRQ-${product.id}`,
      url,
      image: product.images.map((i) => `${SITE}/media/${i.id}/lg`),
      brand: { "@type": "Brand", name: "MARMOUQ مرموق" },
      ...(product.categoryName ? { category: product.categoryName } : {}),
      ...(product.material ? { material: product.material } : {}),
      ...(product.colors.length ? { color: product.colors.map((c) => c.name).join("، ") } : {}),
      offers:
        lo === hi
          ? { "@type": "Offer", price: lo, priceCurrency: currencyCode, availability, url, itemCondition: "https://schema.org/NewCondition" }
          : { "@type": "AggregateOffer", lowPrice: lo, highPrice: hi, offerCount: product.variants.length, priceCurrency: currencyCode, availability, url },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "المتجر", item: `${SITE}/shop` },
        ...(product.categorySlug
          ? [{ "@type": "ListItem", position: 3, name: product.categoryName, item: `${SITE}/shop/${product.categorySlug}` }]
          : []),
        { "@type": "ListItem", position: product.categorySlug ? 4 : 3, name: product.name, item: url },
      ],
    },
  ];
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default async function ProductPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const product = await getProductBySlug(decodeURIComponent(slug));
  if (!product) notFound();

  const [settings, looks, sameCategory, others] = await Promise.all([
    getSettings(),
    listLooksForProduct(product.id),
    product.categorySlug ? listProducts({ category: product.categorySlug, excludeId: product.id, limit: 4 }) : Promise.resolve({ items: [] as ProductCardData[], total: 0 }),
    listProducts({ excludeId: product.id, limit: 8 }),
  ]);

  const seen = new Set<number>();
  const related = [...sameCategory.items, ...others.items].filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true))).slice(0, 4);
  const rawColor = Array.isArray(sp.color) ? sp.color[0] : sp.color;
  const initialColor = rawColor && product.colors.some((c) => c.name === rawColor) ? rawColor : null;
  const [look, ...otherLooks] = looks;

  return (
    <>
      <div className="container-luxe py-3 md:py-5">
        <Breadcrumbs
          items={[
            { label: "الرئيسية", href: "/" },
            { label: "المتجر", href: "/shop" },
            ...(product.categorySlug && product.categoryName ? [{ label: product.categoryName, href: `/shop/${product.categorySlug}` }] : []),
            { label: product.name },
          ]}
        />
      </div>

      <ProductExperience
        product={product}
        initialColor={initialColor}
        details={<ProductDetails product={product} policies={{ shipping: settings.policies.shipping, returns: settings.policies.returns }} />}
        sizeGuides={settings.sizeGuides}
      />

      <div className="h-20 md:h-28" aria-hidden />

      <PageBlocks page="product" position="top" />

      {look && look.items.length > 0 && <CompleteTheLook look={look} currentProductId={product.id} otherLooks={otherLooks} />}

      {related.length > 0 && (
        <section aria-labelledby="related" className="container-luxe py-16 md:py-24">
          <SectionHeading eyebrow="You May Also Like" title="قد يعجبك أيضاً" id="related" action={{ label: "تسوّق المجموعة", href: "/shop" }} />
          <ProductRail items={related} className="mt-10 md:mt-12" />
        </section>
      )}

      <RecentlyViewed currentId={product.id} />

      <PageBlocks page="product" position="bottom" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(product, settings.currency.code) }} />
    </>
  );
}
