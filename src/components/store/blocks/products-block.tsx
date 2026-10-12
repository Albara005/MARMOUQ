import { ProductCard } from "@/components/store/product-card";
import type { ProductsBlock } from "@/lib/blocks";
import type { ProductCardData } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { BlockHeading } from "./block-heading";
import { hasCta } from "./block-link";
import { CarouselControls } from "./carousel-controls";
import { TONES, blockDomId, txt } from "./tones";

/** Product cards as a grid (2 → 3 → 4 columns) or a scroll-snap rail with desktop arrows. */
export function ProductsSection({ block, products }: { block: ProductsBlock; products: ProductCardData[] }) {
  if (products.length === 0) return null;
  const titleId = blockDomId(block.id);
  const railId = blockDomId(block.id, "rail");
  const carousel = block.layout === "carousel";
  const title = txt(block.title);
  const textual = !!(txt(block.eyebrow) || title || txt(block.subtitle) || hasCta(block.ctaLabel, block.ctaHref));
  const controls = carousel && products.length > 1 ? <CarouselControls targetId={railId} className="hidden lg:flex" /> : null;
  const gap = textual ? "mt-10 md:mt-14" : controls ? "lg:mt-6" : "";

  return (
    <section aria-labelledby={title ? titleId : undefined} aria-label={title ? undefined : "منتجات مختارة"} className="overflow-hidden bg-ivory py-20 md:py-28">
      <div className="container-luxe">
        {textual ? (
          <div data-reveal>
            <BlockHeading
              id={titleId}
              eyebrow={block.eyebrow}
              title={title}
              subtitle={block.subtitle}
              tone={TONES.ivory}
              action={{ label: block.ctaLabel, href: block.ctaHref }}
              aside={controls}
            />
          </div>
        ) : (
          controls && <div className="hidden justify-end lg:flex">{controls}</div>
        )}

        {carousel ? (
          <ul
            id={railId}
            className={cn("no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto overscroll-x-contain px-5 pb-2 md:-mx-10 md:scroll-px-10 md:px-10 lg:gap-6", gap)}
            aria-label={title || "منتجات مختارة"}
          >
            {products.map((p, i) => (
              <li
                key={p.id}
                className="w-[68%] shrink-0 snap-start sm:w-[42%] md:w-[31%] lg:w-[calc((100%-4.5rem)/4)]"
                data-reveal
                style={{ "--reveal-delay": `${Math.min(i, 3) * 80}ms` } as React.CSSProperties}
              >
                <ProductCard product={p} sizes="(min-width: 1024px) 23vw, (min-width: 640px) 42vw, 68vw" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className={cn("grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-6 md:gap-y-14 lg:grid-cols-4", gap)} aria-label={title || "منتجات مختارة"}>
            {products.map((p, i) => (
              <li key={p.id} data-reveal style={{ "--reveal-delay": `${(i % 4) * 80}ms` } as React.CSSProperties}>
                <ProductCard product={p} sizes="(min-width: 1024px) 23vw, (min-width: 768px) 31vw, 48vw" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
