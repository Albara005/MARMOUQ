import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { buttonClasses } from "@/components/ui/button";
import { MixedEyebrow } from "@/components/store/home/mixed-eyebrow";
import type { MediaRef } from "@/lib/catalog";

export function HomeHero({
  media,
  eyebrow,
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  mobileMedia = null,
  overlay = 45,
  secondaryLabel = "نسّق إطلالتك",
  secondaryHref = "/atelier",
  sideText = "Est. Yemen — Italian Craft",
}: {
  mobileMedia?: MediaRef | null;
  overlay?: number;
  secondaryLabel?: string;
  secondaryHref?: string;
  sideText?: string;
  media: MediaRef | null;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <section
      data-header-overlay
      aria-labelledby="hero-title"
      className="relative isolate -mt-16 flex min-h-[calc(100svh-2.25rem)] flex-col overflow-hidden bg-espresso text-paper grain lg:-mt-20 lg:min-h-[max(640px,calc(100svh-2.25rem))]"
    >
      <style href="marmouq-hero-kf" precedence="default">{`
        @keyframes mq-scroll-cue { 0% { transform: translateY(-100%); } 60%, 100% { transform: translateY(220%); } }
      `}</style>

      {media && (
        <div className={mobileMedia ? "absolute inset-0 -z-10 hidden md:block" : "absolute inset-0 -z-10"}>
          <MediaImage media={media} priority sizes="100vw" className="h-full w-full" imgClassName="animate-slow-zoom object-[50%_40%]" alt={media.alt || title.replace(/\n/g, " ")} />
        </div>
      )}
      {mobileMedia && (
        <div className="absolute inset-0 -z-10 md:hidden">
          <MediaImage media={mobileMedia} priority sizes="100vw" className="h-full w-full" imgClassName="animate-slow-zoom object-center" alt={mobileMedia.alt || title.replace(/\n/g, " ")} />
        </div>
      )}
      {/* Legibility: adjustable overlay + deep floor + a darker reading side (start = right) */}
      <div className="absolute inset-0 -z-10 bg-espresso" style={{ opacity: Math.min(90, Math.max(0, overlay)) / 100 }} aria-hidden />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-espresso/90 via-transparent to-transparent" aria-hidden />
      <div className="absolute inset-0 -z-10 bg-gradient-to-l from-espresso/75 via-espresso/25 to-transparent" aria-hidden />

      <div className="container-luxe relative flex flex-1 flex-col justify-end pb-24 pt-36 md:pb-28 lg:pb-32">
        <div className="max-w-3xl">
          {eyebrow && (
            <div className="animate-fade-up [animation-delay:150ms]">
              <MixedEyebrow text={eyebrow} latinClassName="text-copper-soft" arabicClassName="text-paper/85" />
            </div>
          )}
          <h1 id="hero-title" className="display mt-5 whitespace-pre-line text-[2.85rem] leading-[1.12] text-balance animate-fade-up [animation-delay:300ms] sm:text-6xl md:text-7xl lg:text-[5.75rem] lg:leading-[1.08]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-6 max-w-xl text-[0.98rem] leading-8 text-paper/78 text-pretty animate-fade-up [animation-delay:450ms] md:text-[1.05rem]">{subtitle}</p>
          )}
          <div className="mt-9 flex flex-col gap-3 animate-fade-up [animation-delay:600ms] sm:flex-row sm:items-center">
            <Link href={ctaHref || "/shop"} className={buttonClasses("light", "lg", "group w-full sm:w-auto")}>
              {ctaLabel || "تسوّق المجموعة"}
              <ArrowLeft className="size-4 transition-transform duration-500 group-hover:-translate-x-1" aria-hidden />
            </Link>
            {secondaryLabel && (
              <Link
                href={secondaryHref || "/atelier"}
                className={buttonClasses("outline", "lg", "w-full border-paper/50 text-paper backdrop-blur-[2px] hover:border-paper hover:bg-paper hover:text-espresso sm:w-auto")}
              >
                {secondaryLabel}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Vertical latin signature on the end (left) edge */}
      {sideText && <div className="pointer-events-none absolute inset-y-0 end-5 hidden items-center md:flex lg:end-9" aria-hidden>
        <div className="flex rotate-180 items-center gap-4 [writing-mode:vertical-rl]">
          <span className="h-16 w-px bg-paper/30" />
          <span className="font-[family-name:var(--font-latin)] text-[0.72rem] uppercase tracking-[0.5em] text-paper/60">{sideText}</span>
          <span className="h-16 w-px bg-paper/30" />
        </div>
      </div>}

      {/* Scroll cue */}
      <a
        href="#home-after-hero"
        className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2.5 text-paper/70 transition-colors hover:text-paper"
        aria-label="انزل لاكتشاف المجموعة"
      >
        <span className="font-[family-name:var(--font-latin)] text-[0.65rem] uppercase tracking-[0.4em]">Scroll</span>
        <span className="relative block h-11 w-px overflow-hidden bg-paper/25">
          <span className="absolute inset-x-0 top-0 block h-1/2 bg-paper motion-safe:animate-[mq-scroll-cue_2.4s_var(--ease-luxe)_infinite]" />
        </span>
      </a>
    </section>
  );
}
