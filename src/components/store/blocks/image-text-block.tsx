import { MediaImage } from "@/components/ui/media-image";
import type { ImageTextBlock } from "@/lib/blocks";
import type { MediaRef } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { BlockEyebrow } from "./block-heading";
import { BlockCta, hasCta } from "./block-link";
import { blockDomId, toneStyle, txt } from "./tones";

/** Image beside copy (stacked on phones, image first). Without an image it reads as a text section. */
export function ImageTextSection({ block, media }: { block: ImageTextBlock; media: MediaRef | null }) {
  const t = toneStyle(block.tone, "ivory");
  const eyebrow = txt(block.eyebrow);
  const title = txt(block.title);
  const text = txt(block.text);
  const cta = hasCta(block.ctaLabel, block.ctaHref);
  if (!media && !eyebrow && !title && !text && !cta) return null;

  const titleId = blockDomId(block.id);
  const end = block.imageSide === "end";
  const hasCopy = !!(eyebrow || title || text || cta);

  const copy = hasCopy ? (
    <div className={cn(media ? "lg:col-span-5 lg:row-start-1" : "max-w-3xl", media && (end ? "lg:col-start-1" : "lg:col-start-8"))} data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
      <BlockEyebrow text={eyebrow} tone={t} />
      {title && (
        <h2 id={titleId} className={cn("display whitespace-pre-line text-[2.1rem] leading-[1.18] text-balance md:text-5xl", eyebrow && "mt-5", t.title)}>
          {title}
        </h2>
      )}
      {text && <p className={cn("max-w-xl whitespace-pre-line text-[1rem] leading-9 text-pretty", (eyebrow || title) && "mt-6", t.body)}>{text}</p>}
      {cta && <BlockCta label={block.ctaLabel} href={block.ctaHref} variant={t.button} className={cn("w-full sm:w-auto", (eyebrow || title || text) && "mt-10")} />}
    </div>
  ) : null;

  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : eyebrow || "صورة ونص"}
      className={cn("relative isolate overflow-hidden py-16 md:py-24 lg:py-28", t.surface, t.dark && "grain")}
    >
      <div className={cn("container-luxe", media && "grid items-center gap-10 md:gap-14 lg:grid-cols-12 lg:gap-x-8")}>
        {media && (
          <div className={hasCopy ? cn("lg:col-span-6 lg:row-start-1", end ? "lg:col-start-7" : "lg:col-start-1") : "lg:col-span-12"} data-reveal>
            <div className={cn("studio-frame relative w-full", hasCopy ? "aspect-[4/5] sm:aspect-[4/3] lg:aspect-[4/5]" : "aspect-[4/5] sm:aspect-[16/9]")}>
              <MediaImage
                media={media}
                sizes={hasCopy ? "(min-width: 1024px) 46vw, 100vw" : "100vw"}
                className="absolute inset-0 h-full w-full"
                alt={media.alt || ""}
              />
            </div>
          </div>
        )}
        {copy}
      </div>
    </section>
  );
}
