import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { SectionHeading } from "@/components/store/section-heading";
import { categoryHref } from "@/components/store/nav";
import type { CategoryData, MediaRef } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/** Arabic plural for piece counts. */
function pieces(n: number) {
  if (n === 0) return "قريباً";
  if (n === 1) return "قطعة واحدة";
  if (n === 2) return "قطعتان";
  if (n <= 10) return `${n} قطع`;
  return `${n} قطعة`;
}

/**
 * Asymmetric editorial grid: the first category is a tall feature tile,
 * the rest sit in a 2×2 block beside it (desktop) / a 2-column grid (mobile).
 */
export function CategoriesGrid({ categories, fallbacks }: { categories: CategoryData[]; fallbacks: Record<string, MediaRef | null> }) {
  const list = categories.filter((c) => c.productCount > 0 || c.image).slice(0, 5);
  if (list.length === 0) return null;
  const count = list.length;

  return (
    <section aria-labelledby="cats-title" className="bg-ivory py-20 md:py-28">
      <div className="container-luxe">
        <div data-reveal>
          <SectionHeading
            id="cats-title"
            eyebrow="The Wardrobe"
            title="خزانة الرجل المرموق"
            subtitle="من التريكو الإيطالي إلى الشوز المصنوع يدوياً — كل قسم منتقى ليكمل الآخر."
            action={{ label: "تسوّق كل القطع", href: "/shop" }}
          />
        </div>

        <ul className={cn("mt-12 grid grid-cols-2 gap-3 md:mt-16 md:gap-5", count >= 3 ? "lg:grid-cols-12" : "lg:grid-cols-2")}>
          {list.map((c, i) => {
            const feature = i === 0 && count >= 3;
            const media = c.image ?? fallbacks[c.slug] ?? null;
            return (
              <li
                key={c.slug}
                data-reveal
                style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties}
                className={cn(
                  feature ? "col-span-2 lg:col-span-6 lg:row-span-2" : count >= 3 ? "lg:col-span-3" : "",
                  // an odd leftover on mobile spans both columns
                  !feature && count >= 3 && (count - 1) % 2 === 1 && i === count - 1 && "col-span-2 lg:col-span-3",
                )}
              >
                <Link
                  href={categoryHref(c.slug)}
                  className={cn("group studio-frame relative block h-full overflow-hidden", feature ? "aspect-[4/5] lg:aspect-auto" : "aspect-[4/5]")}
                >
                  <div className="absolute inset-0 transition-transform duration-[1800ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.06]">
                    <MediaImage media={media} sizes={feature ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"} className="h-full w-full" alt="" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-espresso/80 via-espresso/10 to-transparent transition-opacity duration-700 group-hover:opacity-90" aria-hidden />
                  <span className="latin-italic absolute start-4 top-3.5 text-sm text-paper/80 md:start-5 md:top-4" dir="ltr">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className={cn("absolute inset-x-4 bottom-4 text-paper md:inset-x-6 md:bottom-6", feature && "lg:inset-x-10 lg:bottom-10")}>
                    {c.nameEn && <p className={cn("latin-italic text-copper-soft", feature ? "text-lg md:text-xl" : "text-sm md:text-base")}>{c.nameEn}</p>}
                    <h3 className={cn("display leading-tight", feature ? "text-3xl md:text-5xl" : "text-xl md:text-2xl")}>{c.name}</h3>
                    <div className="mt-2 flex items-center gap-2 text-xs text-paper/75 md:text-[0.8rem]">
                      <span className="tabular-nums">{pieces(c.productCount)}</span>
                      <span className="inline-flex items-center gap-1.5 overflow-hidden">
                        <span className="h-px w-4 bg-paper/50 transition-all duration-700 ease-[var(--ease-out-expo)] group-hover:w-8" aria-hidden />
                        <span className="translate-x-3 opacity-0 transition-all duration-700 ease-[var(--ease-out-expo)] group-hover:translate-x-0 group-hover:opacity-100">تسوّق الآن</span>
                        <ArrowLeft className="size-3.5 translate-x-3 opacity-0 transition-all duration-700 ease-[var(--ease-out-expo)] group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
