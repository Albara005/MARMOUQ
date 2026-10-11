import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import type { LookData } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/**
 * Editorial interstitial that breaks the product grid (spans two columns):
 * a look teaser when one exists, otherwise a brand line in the house voice.
 */
export function EditorialTile({ look, instagram, className }: { look: LookData | null; instagram: string; className?: string }) {
  if (look) {
    const pieces = look.items.length;
    return (
      <Link
        href={`/looks/${look.slug}`}
        className={cn(
          "group/tile relative isolate col-span-2 flex min-h-[15rem] overflow-hidden bg-espresso text-paper grain",
          "focus-visible:outline-offset-4",
          className,
        )}
      >
        <div className="relative w-[46%] shrink-0 overflow-hidden sm:w-1/2">
          <MediaImage
            media={look.cover}
            sizes="(min-width: 1024px) 22vw, 46vw"
            className="h-full w-full"
            imgClassName="transition-transform duration-[2000ms] ease-[var(--ease-out-expo)] group-hover/tile:scale-[1.05]"
            alt={look.cover?.alt || look.title}
          />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-espresso/40" aria-hidden />
        </div>
        <div className="relative flex min-w-0 flex-1 flex-col justify-between gap-5 p-5 sm:p-7 xl:p-9">
          <div>
            <p className="eyebrow text-[0.66rem] text-copper-soft sm:text-[0.72rem]">The Edit</p>
            <p className="display mt-3 text-[1.35rem] leading-snug text-balance sm:text-3xl">{look.title}</p>
            {look.subtitle && <p className="mt-2 line-clamp-3 text-[0.8rem] leading-6 text-paper/65 sm:text-sm sm:leading-7">{look.subtitle}</p>}
          </div>
          <div>
            {look.discountPercent > 0 && (
              <p className="mb-3 text-[0.78rem] text-paper/80">
                <span className="text-copper-soft">وفّر {look.discountPercent}%</span> عند طلب الطقم كامل · {pieces} قطع
              </p>
            )}
            <span className="inline-flex min-h-11 items-center gap-2 text-sm font-medium">
              <span className="link-luxe pb-0.5">اكتشف الإطلالة</span>
              <ArrowLeft className="size-4 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover/tile:-translate-x-1" aria-hidden />
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <figure className={cn("relative isolate col-span-2 flex min-h-[15rem] flex-col justify-between overflow-hidden bg-burgundy p-7 text-paper grain md:p-10", className)}>
      <span className="latin-italic pointer-events-none absolute -bottom-10 end-4 text-[9rem] leading-none text-paper/[0.06]" aria-hidden>
        M
      </span>
      <p className="eyebrow text-copper-soft">Marmouq Notes</p>
      <blockquote className="display max-w-md text-2xl leading-[1.5] text-balance md:text-4xl md:leading-[1.4]">«لما ذوقك يتعدى مرحلة الفخامة… تصير التفاصيل هي التوقيع»</blockquote>
      {instagram ? (
        <figcaption>
          <a href={instagram} target="_blank" rel="noopener noreferrer" className="link-luxe inline-flex min-h-11 items-center text-sm text-paper/80 hover:text-paper">
            شاهد كيف يلبسها عملاؤنا على إنستغرام
          </a>
        </figcaption>
      ) : (
        <figcaption className="text-sm text-paper/70">مرموق — طريقك لتكون شخصية مرموقة</figcaption>
      )}
    </figure>
  );
}
