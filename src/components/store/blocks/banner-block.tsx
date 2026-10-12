import { MediaImage } from "@/components/ui/media-image";
import { MixedEyebrow } from "@/components/store/home/mixed-eyebrow";
import type { BannerBlock } from "@/lib/blocks";
import type { MediaRef } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { BlockCta, SmartLink, linkTarget } from "./block-link";
import { blockDomId, txt } from "./tones";

/** Never shorter than a comfortable phone composition, never taller than the screen. */
const HEIGHT: Record<BannerBlock["height"], string> = {
  md: "min-h-[max(26rem,55svh)]",
  lg: "min-h-[max(32rem,75svh)]",
  screen: "min-h-[max(34rem,100svh)]",
};

const ALIGN: Record<BannerBlock["align"], { box: string; copy: string; eyebrow: string }> = {
  start: { box: "items-start justify-end", copy: "text-start", eyebrow: "" },
  center: { box: "items-center justify-center text-center", copy: "text-center", eyebrow: "justify-center" },
  end: { box: "items-end justify-end", copy: "text-start", eyebrow: "" },
};

/**
 * Full-bleed image with an editorial overlay. Optional portrait image for phones (art direction,
 * same approach as the hero). Without any image it becomes a dark editorial panel.
 */
export function BannerSection({ block, media, mobileMedia }: { block: BannerBlock; media: MediaRef | null; mobileMedia: MediaRef | null }) {
  const eyebrow = txt(block.eyebrow);
  const title = txt(block.title);
  const text = txt(block.text);
  const label = txt(block.ctaLabel);
  const target = linkTarget(block.ctaHref);
  const desktop = media ?? mobileMedia;
  const phone = media && mobileMedia ? mobileMedia : null;
  const align = ALIGN[block.align] ?? ALIGN.center;
  const height = HEIGHT[block.height] ?? HEIGHT.lg;
  const a = Math.min(90, Math.max(0, Number(block.overlay) || 0)) / 100;
  const titleId = blockDomId(block.id);
  const big = block.height !== "md";

  if (!desktop && !eyebrow && !title && !text && !label) return null;

  // Whole banner clickable when there is a link but no button label.
  const stretched = !label && target;

  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : eyebrow || "بانر"}
      className={cn("group/banner relative isolate flex overflow-hidden bg-espresso text-paper", height)}
    >
      {desktop ? (
        <>
          <div className={cn("absolute inset-0 -z-10", phone && "hidden md:block")}>
            <MediaImage
              media={desktop}
              sizes="100vw"
              className="h-full w-full"
              imgClassName={cn("transition-transform duration-[2400ms] ease-[var(--ease-out-expo)]", stretched && "group-hover/banner:scale-[1.03]")}
              alt={desktop.alt || ""}
            />
          </div>
          {phone && (
            <div className="absolute inset-0 -z-10 md:hidden">
              <MediaImage media={phone} sizes="100vw" className="h-full w-full" alt={phone.alt || ""} />
            </div>
          )}
          {/* Adjustable veil + a deeper floor where the copy sits */}
          {a > 0 && (
            <>
              <div className="absolute inset-0 -z-10" style={{ backgroundColor: `rgba(28,19,15,${(a * 0.6).toFixed(3)})` }} aria-hidden />
              <div
                className="absolute inset-0 -z-10"
                style={{
                  background:
                    block.align === "center"
                      ? `radial-gradient(70% 60% at 50% 50%, rgba(28,19,15,${(a * 0.45).toFixed(3)}), transparent 75%)`
                      : `linear-gradient(to top, rgba(28,19,15,${(a * 0.75).toFixed(3)}) 0%, transparent 65%)`,
                }}
                aria-hidden
              />
            </>
          )}
        </>
      ) : (
        <>
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-80"
            style={{ background: "radial-gradient(60% 70% at 85% 10%, rgba(169,100,58,0.30), transparent 70%), radial-gradient(55% 65% at 0% 100%, rgba(92,26,38,0.40), transparent 70%)" }}
            aria-hidden
          />
          <div className="grain pointer-events-none absolute inset-0 -z-10" aria-hidden />
        </>
      )}

      <div className={cn("container-luxe relative flex flex-1 flex-col py-16 md:py-20 lg:py-24", align.box)}>
        <div className={cn("max-w-2xl", align.copy)} data-reveal>
          {eyebrow && <MixedEyebrow text={eyebrow} className={align.eyebrow} latinClassName="text-copper-soft" arabicClassName="text-paper/85" />}
          {title && (
            <h2
              id={titleId}
              className={cn(
                "display whitespace-pre-line text-balance",
                eyebrow && "mt-5",
                big ? "text-[2.4rem] leading-[1.12] sm:text-5xl md:text-6xl lg:text-7xl lg:leading-[1.08]" : "text-[2.1rem] leading-[1.15] md:text-5xl",
              )}
            >
              {title}
            </h2>
          )}
          {text && (
            <p className={cn("max-w-xl whitespace-pre-line text-[0.98rem] leading-8 text-paper/80 text-pretty md:text-[1.05rem]", (eyebrow || title) && "mt-5", block.align === "center" && "mx-auto")}>
              {text}
            </p>
          )}
          <BlockCta label={label} href={target?.href} variant="light" className={cn("w-full sm:w-auto", (eyebrow || title || text) && "mt-9")} />
        </div>
      </div>

      {stretched && (
        <SmartLink href={target.href} className="absolute inset-0 z-10 focus-visible:outline-offset-[-6px]">
          <span className="sr-only">{title.replace(/\n/g, " ") || eyebrow || "اكتشف المزيد"}</span>
        </SmartLink>
      )}
    </section>
  );
}
