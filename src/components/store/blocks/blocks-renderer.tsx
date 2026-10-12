import { Fragment, Suspense } from "react";
import { BLOCK_LIMITS, blockMediaIds, type Block, type HomeSectionKey, type LookBlock, type ProductsBlock } from "@/lib/blocks";
import { getLookBySlug, getMediaRefs, listLooks, listProducts, type LookData, type MediaRef, type ProductCardData } from "@/lib/catalog";
import { BlockBoundary } from "./block-boundary";
import { BannerSection } from "./banner-block";
import { CountdownSection } from "./countdown-block";
import { FaqSection } from "./faq-block";
import { FeaturesSection } from "./features-block";
import { GallerySection } from "./gallery-block";
import { ImageTextSection } from "./image-text-block";
import { LookSection } from "./look-block";
import { MarqueeSection } from "./marquee-block";
import { NewsletterSection } from "./newsletter-block";
import { ProductsSection } from "./products-block";
import { SpacerSection } from "./spacer-block";
import { TextSection } from "./text-block";
import { VideoSection } from "./video-block";
import { TONES, txt } from "./tones";

/* ───────────── Data (one batch per page, every source isolated) ───────────── */

type BlockData = {
  media: Map<string, MediaRef>;
  /** keyed by the block object itself (robust to duplicated ids) */
  products: Map<ProductsBlock, ProductCardData[]>;
  looks: Map<LookBlock, LookData | null>;
};

async function attempt<T>(label: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (err) {
    console.error(`[blocks] ${label} failed:`, err);
    return fallback;
  }
}

async function productsFor(b: ProductsBlock): Promise<ProductCardData[]> {
  const limit = Math.min(24, Math.max(1, Math.round(Number(b.limit) || 8)));
  switch (b.source) {
    case "featured":
      return (await listProducts({ featured: true, limit })).items;
    case "new":
      return (await listProducts({ isNew: true, sort: "newest", limit })).items;
    case "category": {
      const slug = txt(b.categorySlug);
      return slug ? (await listProducts({ category: slug, limit })).items : [];
    }
    case "manual": {
      // The merchant's own order; pieces that were deleted or hidden are skipped.
      const ids = [...new Set((Array.isArray(b.productIds) ? b.productIds : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, BLOCK_LIMITS.manualProducts);
      if (ids.length === 0) return [];
      const byId = new Map((await listProducts({ ids, limit: ids.length })).items.map((p) => [p.id, p]));
      return ids.map((id) => byId.get(id)).filter((p): p is ProductCardData => !!p);
    }
    default:
      return (await listProducts({ sort: "newest", limit })).items;
  }
}

/** Looks by slug; an empty, missing or empty-handed slug falls back to the first look that has pieces. */
async function looksFor(blocks: LookBlock[]): Promise<Map<LookBlock, LookData | null>> {
  const out = new Map<LookBlock, LookData | null>();
  if (blocks.length === 0) return out;

  const firstWithItems = (list: LookData[]) => list.find((l) => l.items.length > 0) ?? null;
  const slugs = [...new Set(blocks.map((b) => txt(b.lookSlug)).filter(Boolean))];
  const wantsFirst = blocks.some((b) => !txt(b.lookSlug));
  const [found, list] = await Promise.all([
    Promise.all(slugs.map((s) => attempt(`look "${s}"`, () => getLookBySlug(s), null))),
    wantsFirst ? attempt("looks", () => listLooks(12), []) : Promise.resolve(null),
  ]);
  const bySlug = new Map(slugs.map((s, i) => [s, found[i]?.items.length ? found[i] : null]));

  let first = list ? firstWithItems(list) : null;
  if (!list && blocks.some((b) => !bySlug.get(txt(b.lookSlug)))) first = firstWithItems(await attempt("looks", () => listLooks(12), []));

  for (const b of blocks) out.set(b, bySlug.get(txt(b.lookSlug)) ?? first);
  return out;
}

async function loadBlockData(blocks: Block[]): Promise<BlockData> {
  const productBlocks = blocks.filter((b): b is ProductsBlock => b.type === "products");
  const lookBlocks = blocks.filter((b): b is LookBlock => b.type === "look");
  // Per block, so one malformed block cannot hide the images of the others.
  const mediaIds = [
    ...new Set(
      blocks.flatMap((b) => {
        try {
          return blockMediaIds([b]);
        } catch {
          return [];
        }
      }),
    ),
  ];

  const [refs, productLists, looks] = await Promise.all([
    mediaIds.length ? attempt("media", () => getMediaRefs(mediaIds), [] as MediaRef[]) : Promise.resolve([] as MediaRef[]),
    Promise.all(productBlocks.map((b) => attempt(`products block ${b.id}`, () => productsFor(b), [] as ProductCardData[]))),
    attempt("looks", () => looksFor(lookBlocks), new Map<LookBlock, LookData | null>()),
  ]);

  return {
    media: new Map(refs.map((m) => [m.id, m])),
    products: new Map(productBlocks.map((b, i) => [b, productLists[i]])),
    looks,
  };
}

/* ───────────── Surfaces (lets a spacer continue its neighbour's background) ───────────── */

const BUILTIN_SURFACE: Partial<Record<HomeSectionKey, string>> = {
  categories: "bg-ivory",
  newArrivals: "bg-ivory",
  look: "bg-bone",
  craft: "bg-ivory",
  social: "bg-paper",
  atelier: "bg-espresso",
};

function surfaceOf(b: Block | undefined): string | null {
  switch (b?.type) {
    case "text":
    case "features":
      return (TONES[b.tone] ?? TONES.paper).surface;
    case "imageText":
      return (TONES[b.tone] ?? TONES.ivory).surface;
    case "newsletter":
    case "countdown":
      return (TONES[b.tone] ?? TONES.dark).surface;
    case "products":
    case "faq":
      return "bg-ivory";
    case "gallery":
      return "bg-paper";
    case "video":
      return "bg-espresso";
    case "look":
      return "bg-bone";
    case "builtin":
      return BUILTIN_SURFACE[b.key] ?? null;
    default:
      return null;
  }
}

/* ───────────── Rendering ───────────── */

function renderBlock(b: Block, data: BlockData, neighbours: { prev?: Block; next?: Block }): React.ReactNode {
  const media = (id: string | null | undefined) => (id ? data.media.get(id) ?? null : null);
  switch (b.type) {
    case "banner":
      return <BannerSection block={b} media={media(b.mediaId)} mobileMedia={media(b.mobileMediaId)} />;
    case "products":
      return <ProductsSection block={b} products={data.products.get(b) ?? []} />;
    case "text":
      return <TextSection block={b} />;
    case "imageText":
      return <ImageTextSection block={b} media={media(b.mediaId)} />;
    case "gallery":
      return <GallerySection block={b} media={data.media} />;
    case "features":
      return <FeaturesSection block={b} />;
    case "video":
      return <VideoSection block={b} poster={media(b.posterId)} />;
    case "marquee":
      return <MarqueeSection block={b} />;
    case "look":
      return <LookSection block={b} look={data.looks.get(b) ?? null} />;
    case "newsletter":
      return <NewsletterSection block={b} />;
    case "faq":
      return <FaqSection block={b} />;
    case "countdown":
      return <CountdownSection block={b} />;
    case "spacer":
      return <SpacerSection block={b} surface={surfaceOf(neighbours.prev) ?? surfaceOf(neighbours.next)} />;
    default:
      return null; // unknown / future block types are skipped
  }
}

/**
 * Renders the enabled blocks of a layout in order. `builtin` blocks render the matching node
 * from `builtins` (nothing when absent). Loads everything the blocks need in one parallel batch;
 * a failing data source or section is skipped, never fatal to the page.
 */
export async function BlocksRenderer({ blocks, builtins }: { blocks: Block[]; builtins?: Partial<Record<HomeSectionKey, React.ReactNode>> }) {
  const list = (Array.isArray(blocks) ? blocks : []).filter((b): b is Block => !!b && typeof b === "object" && b.enabled === true);
  if (list.length === 0) return null;

  const data = await loadBlockData(list);

  // Blocks known to render nothing do not count as neighbours for spacers.
  const visible = list.filter((b) => {
    if (b.type === "builtin") return builtins?.[b.key] != null;
    if (b.type === "products") return !!data.products.get(b)?.length;
    if (b.type === "look") return !!data.looks.get(b);
    return true;
  });

  return (
    <>
      {list.map((b, i) => {
        const key = `${b.id}-${i}`;
        if (b.type === "builtin") return <Fragment key={key}>{builtins?.[b.key] ?? null}</Fragment>;
        const at = visible.indexOf(b);
        const node = renderBlock(b, data, { prev: visible[at - 1], next: visible[at + 1] });
        if (!node) return null;
        return (
          // Suspense + boundary: a section that throws is dropped (client-rendered as nothing) instead of failing the page.
          <Suspense key={key} fallback={null}>
            <BlockBoundary type={b.type}>{node}</BlockBoundary>
          </Suspense>
        );
      })}
    </>
  );
}
