import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { getMediaRefs, getProductBySlug, listCategories, listLooks, listProducts, type MediaRef, type ProductCardData, type ProductDetail } from "@/lib/catalog";
import { Marquee } from "@/components/store/marquee";
import { ColourStory } from "@/components/store/colour-story";
import { HomeHero } from "@/components/store/home/hero";
import { CategoriesGrid } from "@/components/store/home/categories-grid";
import { NewArrivals } from "@/components/store/home/new-arrivals";
import { LookOfSeason } from "@/components/store/home/look-of-season";
import { CraftValues } from "@/components/store/home/craft-values";
import { SocialProof } from "@/components/store/home/social-proof";
import { AtelierBand, type AtelierSlot } from "@/components/store/home/atelier-band";
import { BlocksRenderer } from "@/components/store/blocks/blocks-renderer";
import { resolveHomeLayout, type HomeSectionKey } from "@/lib/blocks";

export const dynamic = "force-dynamic";

const MARQUEE_TONE = { ivory: "light", espresso: "dark", copper: "copper", burgundy: "burgundy", navy: "navy" } as const;
const SLOT_LABELS: Record<string, string> = { knit: "التريكو", shirt: "القميص", tie: "الربطة", trousers: "البنطال", shoes: "الحذاء" };
const SLOT_ORDER = ["knit", "shirt", "tie", "trousers", "shoes"];
const slotRank = (slot: string) => (SLOT_ORDER.includes(slot) ? SLOT_ORDER.indexOf(slot) : 99);

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  let ogImage: string | undefined;
  if (s.hero.mediaId) ogImage = `/media/${s.hero.mediaId}/lg`;
  return {
    title: { absolute: s.seo.title },
    description: s.seo.description,
    alternates: { canonical: "/" },
    openGraph: {
      title: s.seo.title,
      description: s.seo.description,
      type: "website",
      locale: "ar_YE",
      siteName: `${s.storeName} ${s.storeNameEn}`,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
}

function firstImageFor(products: ProductCardData[], predicate: (p: ProductCardData) => boolean): MediaRef | null {
  const p = products.find((x) => predicate(x) && x.images.length > 0);
  return p?.images[0] ?? null;
}

export default async function HomePage() {
  const settings = await getSettings();
  const home = settings.home;
  const layout = resolveHomeLayout(settings.layouts, home.sections);
  const show = (key: HomeSectionKey) => layout.some((b) => b.type === "builtin" && b.key === key && b.enabled);
  const [categories, { items: products }, looks, signatureBySlug, arrivals] = await Promise.all([
    listCategories(),
    listProducts({ limit: 24 }),
    listLooks(12),
    show("colourStory") && home.colourStory.productSlug ? getProductBySlug(home.colourStory.productSlug) : Promise.resolve(null),
    !show("newArrivals")
      ? Promise.resolve(null)
      : home.newArrivals.source === "featured"
        ? listProducts({ featured: true, limit: 12 }).then((r) => r.items)
        : home.newArrivals.source === "newest"
          ? listProducts({ sort: "newest", limit: 12 }).then((r) => r.items)
          : Promise.resolve(null),
  ]);

  // Signature product for the colour story: the half-zip, else any multi-colour piece.
  let signature: ProductDetail | null = signatureBySlug;
  if (show("colourStory") && (!signature || signature.colors.length < 2)) {
    const alt = products.find((p) => p.colors.length >= 2);
    signature = alt ? await getProductBySlug(alt.slug) : null;
  }

  // Hero: configured media → first look cover → first product image
  const heroRefs = await getMediaRefs([settings.hero.mediaId, settings.hero.mobileMediaId].filter((x): x is string => !!x));
  const configuredHero = heroRefs.find((m) => m.id === settings.hero.mediaId) ?? null;
  const mobileHero = heroRefs.find((m) => m.id === settings.hero.mobileMediaId) ?? null;
  const heroMedia = configuredHero ?? looks.find((l) => l.cover)?.cover ?? products[0]?.images[0] ?? null;

  // Category fallbacks (first product photo of the category)
  const fallbacks: Record<string, MediaRef | null> = {};
  for (const c of categories) fallbacks[c.slug] = c.image ?? firstImageFor(products, (p) => p.categorySlug === c.slug);

  // Atelier slots, in outfit order
  const slots: AtelierSlot[] = [...categories]
    .filter((c) => c.slot)
    .sort((a, b) => slotRank(a.slot) - slotRank(b.slot))
    .map((c) => ({ label: SLOT_LABELS[c.slot] ?? c.name, media: fallbacks[c.slug] ?? null }));

  // Instagram-style gallery: look covers + one image per product, de-duplicated
  const seen = new Set<string>();
  const gallery: MediaRef[] = [];
  const pushMedia = (m: MediaRef | null | undefined) => {
    if (m && !seen.has(m.id)) {
      seen.add(m.id);
      gallery.push(m);
    }
  };
  if (signature) for (const c of signature.colors) pushMedia(signature.images.find((i) => i.color === c.name));
  for (const l of looks) pushMedia(l.cover);
  for (const p of products) pushMedia(p.images[0]);

  const featuredLook = (home.look.lookSlug ? looks.find((l) => l.slug === home.look.lookSlug && l.items.length > 0) : null) ?? looks.find((l) => l.items.length > 0) ?? null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: `${settings.storeName} ${settings.storeNameEn}`,
    description: settings.seo.description,
    inLanguage: "ar",
    potentialAction: {
      "@type": "SearchAction",
      target: "/shop?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <HomeHero
        media={heroMedia}
        eyebrow={settings.hero.eyebrow}
        title={settings.hero.title}
        subtitle={settings.hero.subtitle}
        ctaLabel={settings.hero.ctaLabel}
        ctaHref={settings.hero.ctaHref}
        mobileMedia={mobileHero}
        overlay={settings.hero.overlay}
        secondaryLabel={settings.hero.secondaryLabel}
        secondaryHref={settings.hero.secondaryHref}
        sideText={settings.hero.sideText}
      />

      <div id="home-after-hero" className="scroll-mt-20">
        {settings.bars.marquee.enabled && <Marquee items={settings.bars.marquee.items} tone={MARQUEE_TONE[settings.bars.marquee.tone] ?? "light"} speed={settings.bars.marquee.speed} />}
      </div>

      <BlocksRenderer
        blocks={layout}
        builtins={{
          categories: <CategoriesGrid categories={categories} fallbacks={fallbacks} copy={home.categories} />,
          colourStory: signature && signature.colors.length >= 2 ? <ColourStory product={signature} eyebrow={home.colourStory.eyebrow} title={home.colourStory.title} /> : null,
          newArrivals: <NewArrivals products={arrivals?.length ? arrivals : products} copy={home.newArrivals} />,
          look: featuredLook ? <LookOfSeason look={featuredLook} eyebrow={home.look.eyebrow} /> : null,
          craft: <CraftValues copy={home.craft} />,
          social: <SocialProof testimonials={settings.testimonials} instagram={settings.instagram} gallery={gallery} copy={home.social} />,
          atelier: <AtelierBand slots={slots} copy={home.atelier} />,
        }}
      />
    </>
  );
}
