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

export const dynamic = "force-dynamic";

const SIGNATURE_SLUG = "half-zip-cable-knit-sweater";
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
  const [categories, { items: products }, looks, signatureBySlug] = await Promise.all([
    listCategories(),
    listProducts({ limit: 24 }),
    listLooks(4),
    getProductBySlug(SIGNATURE_SLUG),
  ]);

  // Signature product for the colour story: the half-zip, else any multi-colour piece.
  let signature: ProductDetail | null = signatureBySlug;
  if (!signature || signature.colors.length < 2) {
    const alt = products.find((p) => p.colors.length >= 2);
    signature = alt ? await getProductBySlug(alt.slug) : null;
  }

  // Hero: configured media → first look cover → first product image
  const configuredHero = settings.hero.mediaId ? ((await getMediaRefs([settings.hero.mediaId]))[0] ?? null) : null;
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

  const featuredLook = looks.find((l) => l.items.length > 0) ?? null;
  const show = settings.home.sections;

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
      />

      <div id="home-after-hero" className="scroll-mt-20">
        {settings.bars.marquee.enabled && <Marquee items={settings.bars.marquee.items} tone={MARQUEE_TONE[settings.bars.marquee.tone] ?? "light"} speed={settings.bars.marquee.speed} />}
      </div>

      {show.categories && <CategoriesGrid categories={categories} fallbacks={fallbacks} />}

      {show.colourStory && signature && signature.colors.length >= 2 && <ColourStory product={signature} />}

      {show.newArrivals && <NewArrivals products={products} />}

      {show.look && featuredLook && <LookOfSeason look={featuredLook} />}

      {show.craft && <CraftValues />}

      {show.social && <SocialProof testimonials={settings.testimonials} instagram={settings.instagram} gallery={gallery} />}

      {show.atelier && <AtelierBand slots={slots} />}
    </>
  );
}
