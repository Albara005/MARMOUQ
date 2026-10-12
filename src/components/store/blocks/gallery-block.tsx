import { ArrowLeft } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import type { GalleryBlock } from "@/lib/blocks";
import type { MediaRef } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { BlockHeading } from "./block-heading";
import { SmartLink, linkTarget } from "./block-link";
import { TONES, blockDomId, txt } from "./tones";

const COLUMNS: Record<GalleryBlock["columns"], string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-3 lg:grid-cols-4",
};
const SIZES: Record<GalleryBlock["columns"], string> = {
  2: "(min-width: 768px) 46vw, 50vw",
  3: "(min-width: 768px) 31vw, 50vw",
  4: "(min-width: 1024px) 23vw, (min-width: 768px) 31vw, 50vw",
};
const ASPECT: Record<GalleryBlock["aspect"], string> = {
  portrait: "aspect-[4/5]",
  square: "aspect-square",
  landscape: "aspect-[4/3]",
};

/** Image grid with optional captions and links (collections, lookbooks, Instagram picks). */
export function GallerySection({ block, media }: { block: GalleryBlock; media: Map<string, MediaRef> }) {
  const tiles = (Array.isArray(block.items) ? block.items : [])
    .map((it) => ({ media: it?.mediaId ? media.get(it.mediaId) ?? null : null, caption: txt(it?.caption), href: linkTarget(it?.href)?.href ?? "" }))
    .filter((it): it is { media: MediaRef; caption: string; href: string } => !!it.media);
  if (tiles.length === 0) return null;

  const cols = COLUMNS[block.columns] ? block.columns : 3;
  const aspect = ASPECT[block.aspect] ?? ASPECT.portrait;
  const title = txt(block.title);
  const titleId = blockDomId(block.id);
  const heading = !!(title || txt(block.eyebrow));

  return (
    <section aria-labelledby={title ? titleId : undefined} aria-label={title ? undefined : "معرض الصور"} className="bg-paper py-20 md:py-28">
      <div className="container-luxe">
        {heading && (
          <div data-reveal>
            <BlockHeading id={titleId} eyebrow={block.eyebrow} title={title} align="center" tone={TONES.paper} />
          </div>
        )}

        <ul className={cn("grid grid-cols-2 gap-x-2.5 gap-y-8 md:gap-x-5 md:gap-y-12", COLUMNS[cols], heading && "mt-12 md:mt-16")}>
          {tiles.map((tile, i) => {
            const frame = (
              <div className={cn("studio-frame relative w-full overflow-hidden", aspect)}>
                <div className={cn("absolute inset-0", tile.href && "transition-transform duration-[1600ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]")}>
                  <MediaImage media={tile.media} sizes={SIZES[cols]} className="h-full w-full" alt={tile.media.alt || ""} />
                </div>
                {tile.href && <div className="absolute inset-0 bg-espresso/0 transition-colors duration-700 group-hover:bg-espresso/10" aria-hidden />}
              </div>
            );
            const caption = tile.caption ? (
              <span className="mt-3 flex items-baseline gap-2.5 md:mt-4">
                <span className="latin-italic shrink-0 text-xs text-taupe" dir="ltr" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={cn("min-w-0 text-[0.88rem] leading-6 text-espresso md:text-[0.95rem]", tile.href && "link-luxe")}>{tile.caption}</span>
                {tile.href && (
                  <ArrowLeft className="size-3.5 shrink-0 translate-x-2 self-center text-copper opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />
                )}
              </span>
            ) : null;

            return (
              <li key={`${tile.media.id}-${i}`} data-reveal style={{ "--reveal-delay": `${(i % cols) * 90}ms` } as React.CSSProperties}>
                {tile.href ? (
                  <SmartLink href={tile.href} className="group block" aria-label={tile.caption ? undefined : tile.media.alt || title || "عرض المزيد"}>
                    {frame}
                    {caption}
                  </SmartLink>
                ) : (
                  <figure className="group">
                    {frame}
                    {caption && <figcaption>{caption}</figcaption>}
                  </figure>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
