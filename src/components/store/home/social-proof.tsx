import { ArrowUpLeft, Quote } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { InstagramIcon } from "@/components/ui/brand-icons";
import { buttonClasses } from "@/components/ui/button";
import { instagramHandle } from "@/components/store/nav";
import type { MediaRef } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type Testimonial = { name: string; city: string; quote: string };

export function SocialProof({
  testimonials,
  instagram,
  gallery,
  copy = { eyebrow: "The Community", statValue: "69K", title: "رجل مرموق يتابعنا", text: "" },
}: {
  testimonials: Testimonial[];
  instagram: string;
  gallery: MediaRef[];
  copy?: { eyebrow: string; statValue: string; title: string; text: string };
}) {
  const quotes = testimonials.filter((t) => t.quote?.trim()).slice(0, 3);
  const handle = instagram ? instagramHandle(instagram) : "";
  const tiles = gallery.slice(0, 6);

  return (
    <section aria-labelledby="proof-title" className="bg-paper py-20 md:py-28">
      <div className="container-luxe">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Followers */}
          <div className="lg:col-span-5" data-reveal>
            <p className="eyebrow inline-flex items-center gap-3">
              <span className="h-px w-8 bg-gold/70" aria-hidden />
              {copy.eyebrow}
            </p>
            {copy.statValue && (
              <p className="mt-6 flex items-start gap-1 font-[family-name:var(--font-latin)] text-[5.5rem] font-medium leading-[0.85] text-espresso md:text-[8rem]" dir="ltr">
                <span className="text-copper">+</span>
                {copy.statValue}
              </p>
            )}
            <h2 id="proof-title" className="display mt-5 text-3xl leading-tight text-espresso md:text-4xl">
              {copy.title}
            </h2>
            {copy.text && <p className="mt-3 max-w-sm text-[0.95rem] leading-8 text-umber">{copy.text}</p>}
            {instagram && (
              <a href={instagram} target="_blank" rel="noopener noreferrer" className={buttonClasses("outline", "lg", "group mt-8")}>
                <InstagramIcon size={18} />
                تابعنا <span dir="ltr">{handle}</span>
                <ArrowUpLeft className="size-4 transition-transform duration-500 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
              </a>
            )}
          </div>

          {/* Testimonials */}
          {quotes.length > 0 && (
            <ul className="grid gap-4 lg:col-span-7 lg:gap-5">
              {quotes.map((t, i) => (
                <li
                  key={`${t.name}-${i}`}
                  data-reveal
                  style={{ "--reveal-delay": `${i * 110}ms` } as React.CSSProperties}
                  className={cn("relative rounded-2xl border border-line bg-ivory p-6 md:p-8", i === 1 && "lg:ms-12", i === 2 && "lg:ms-6")}
                >
                  <Quote className="absolute end-6 top-6 size-7 rotate-180 text-gold/60" strokeWidth={1.2} aria-hidden />
                  <blockquote className="display max-w-lg text-lg leading-9 text-espresso md:text-xl md:leading-10">«{t.quote}»</blockquote>
                  <p className="mt-4 flex items-center gap-2 text-sm text-taupe">
                    <span className="h-px w-5 bg-copper/60" aria-hidden />
                    <span className="font-medium text-umber">{t.name}</span>
                    {t.city && <span>· {t.city}</span>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Instagram gallery */}
        {tiles.length >= 3 && instagram && (
          <div className="mt-16 md:mt-24" data-reveal>
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-taupe">
                من حسابنا على إنستغرام <span dir="ltr" className="text-espresso">{handle}</span>
              </p>
            </div>
            <ul className="mt-5 grid grid-cols-3 gap-1.5 md:grid-cols-6 md:gap-3">
              {tiles.map((m, i) => (
                <li key={`${m.id}-${i}`} className={cn(i >= 3 && "hidden md:block")}>
                  <a href={instagram} target="_blank" rel="noopener noreferrer" className="group studio-frame relative block aspect-square overflow-hidden" aria-label={`صورة من إنستغرام ${handle}`}>
                    <div className="absolute inset-0 transition-transform duration-[1400ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.06]">
                      <MediaImage media={m} sizes="(min-width: 768px) 16vw, 33vw" className="h-full w-full" alt="" />
                    </div>
                    <span className="absolute inset-0 grid place-items-center bg-espresso/0 text-paper opacity-0 transition-all duration-500 group-hover:bg-espresso/40 group-hover:opacity-100" aria-hidden>
                      <InstagramIcon size={26} />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
