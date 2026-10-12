import type { TextBlock } from "@/lib/blocks";
import { cn } from "@/lib/utils";
import { BlockEyebrow } from "./block-heading";
import { BlockCta, hasCta } from "./block-link";
import { blockDomId, toneStyle, txt } from "./tones";

/**
 * Editorial text. Centred: a quiet statement with gold rules.
 * Start-aligned: title and paragraph side by side on desktop, like a magazine opener.
 */
export function TextSection({ block }: { block: TextBlock }) {
  const t = toneStyle(block.tone);
  const eyebrow = txt(block.eyebrow);
  const title = txt(block.title);
  const text = txt(block.text);
  const cta = hasCta(block.ctaLabel, block.ctaHref);
  if (!eyebrow && !title && !text && !cta) return null;

  const titleId = blockDomId(block.id);
  const center = block.align === "center";
  const sectionCls = cn("relative isolate overflow-hidden py-20 md:py-28", t.surface, t.dark && "grain");
  const label = title ? { "aria-labelledby": titleId } : { "aria-label": eyebrow || "نص" };

  if (center) {
    return (
      <section {...label} className={sectionCls}>
        <div className="container-luxe flex flex-col items-center text-center" data-reveal>
          <BlockEyebrow text={eyebrow} tone={t} center />
          {title && (
            <h2 id={titleId} className={cn("display max-w-3xl whitespace-pre-line text-[2.1rem] leading-[1.18] text-balance md:text-5xl lg:text-[3.4rem]", eyebrow && "mt-5", t.title)}>
              {title}
            </h2>
          )}
          {text && (
            <p className={cn("max-w-2xl whitespace-pre-line text-[1rem] leading-9 text-pretty md:text-[1.08rem]", (eyebrow || title) && "mt-6", t.body)}>{text}</p>
          )}
          {cta && <BlockCta label={block.ctaLabel} href={block.ctaHref} variant={t.button} className={cn("w-full sm:w-auto", (eyebrow || title || text) && "mt-10")} />}
        </div>
      </section>
    );
  }

  const split = !!title && !!text;
  return (
    <section {...label} className={sectionCls}>
      <div className={cn("container-luxe", split && "grid gap-8 lg:grid-cols-12 lg:gap-16")}>
        <div className={cn(split ? "lg:col-span-5" : "max-w-3xl")} data-reveal>
          <BlockEyebrow text={eyebrow} tone={t} />
          {title && (
            <h2 id={titleId} className={cn("display whitespace-pre-line text-[2.1rem] leading-[1.18] text-balance md:text-5xl", eyebrow && "mt-5", t.title)}>
              {title}
            </h2>
          )}
          {!split && text && <p className={cn("max-w-2xl whitespace-pre-line text-[1rem] leading-9 text-pretty md:text-[1.08rem]", (eyebrow || title) && "mt-6", t.body)}>{text}</p>}
          {!split && cta && <BlockCta label={block.ctaLabel} href={block.ctaHref} variant={t.button} className={cn("w-full sm:w-auto", (eyebrow || title || text) && "mt-10")} />}
        </div>
        {split && (
          <div className="lg:col-span-6 lg:col-start-7 lg:pt-12" data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
            <div className={cn("h-px w-12", t.rule)} aria-hidden />
            <p className={cn("mt-6 max-w-2xl whitespace-pre-line text-[1rem] leading-9 text-pretty md:text-[1.08rem]", t.body)}>{text}</p>
            {cta && <BlockCta label={block.ctaLabel} href={block.ctaHref} variant={t.button} className="mt-10 w-full sm:w-auto" />}
          </div>
        )}
      </div>
    </section>
  );
}
