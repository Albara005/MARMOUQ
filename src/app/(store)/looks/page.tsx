import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { copyOf, getDisplayCurrency, getSettings } from "@/lib/settings";
import { listCategories, listLooks, type LookData } from "@/lib/catalog";
import { LookHotspots } from "@/components/store/look-hotspots";
import { AddLookButton } from "@/components/store/add-look-dialog";
import { MediaImage } from "@/components/ui/media-image";
import { ButtonLink } from "@/components/ui/button";
import { LookPieces, LookPriceBlock, atelierHrefForLook, pad2 } from "@/components/store/looks/look-parts";
import { imagesForColor } from "@/lib/product-images";
import type { Currency } from "@/lib/money";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "الإطلالات",
  description: "إطلالات مرموق المنسّقة من الياقة حتى الحذاء — تريكو إيطالي، قمصان، ربطات حرير، بناطيل وأحذية، بخصم خاص عند طلب الإطلالة كاملة.",
  alternates: { canonical: "/looks" },
};

export default async function LooksPage() {
  const [settings, looks, categories] = await Promise.all([getSettings(), listLooks(24), listCategories()]);
  const displayCurrency = await getDisplayCurrency(settings);
  const c = copyOf(settings);
  const ready = looks.filter((l) => l.items.length > 0);
  const maxDiscount = ready.reduce((m, l) => Math.max(m, l.discountPercent), 0);

  // Atelier band imagery: one knit per colour where possible
  const swatches = ready
    .flatMap((l) => l.items)
    .map((it) => imagesForColor(it.product.images, it.color)[0])
    .filter((m, i, arr) => m && arr.findIndex((x) => x?.id === m.id) === i)
    .slice(0, 3);

  return (
    <>
      {/* ───────── Masthead ───────── */}
      <header className="bg-ivory">
        <div className="container-luxe pb-10 pt-8 md:pb-16 md:pt-14">
          <nav aria-label="مسار التنقل" className="mb-6 text-xs text-taupe">
            <Link href="/" className="link-luxe py-1 hover:text-espresso">
              الرئيسية
            </Link>
            <span className="mx-2 opacity-60" aria-hidden>
              /
            </span>
            <span aria-current="page" className="text-umber">
              الإطلالات
            </span>
          </nav>
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <p className="eyebrow inline-flex items-center gap-3">
                <span className="h-px w-8 bg-gold/70" aria-hidden />
                {c["looks.eyebrow"]}
              </p>
              <h1 className="display mt-4 text-[2.6rem] leading-[1.1] text-espresso text-balance md:text-7xl">
                {c["looks.title1"]}
                <br />
                <span className="text-copper">{c["looks.title2"]}</span>
              </h1>
            </div>
            <div className="lg:col-span-4">
              <p className="text-[0.98rem] leading-8 text-umber text-pretty">
                {c["looks.intro"]}
              </p>
              {ready.length > 1 && (
                <ol className="mt-6 divide-y divide-line border-y border-line" aria-label="فهرس الإطلالات">
                  {ready.map((l, i) => (
                    <li key={l.id}>
                      <a href={`#look-${l.slug}`} className="group flex min-h-12 items-center gap-4 py-2 text-sm">
                        <span className="latin-italic w-7 text-lg text-copper">{pad2(i + 1)}</span>
                        <span className="flex-1 text-espresso">{l.title}</span>
                        {l.discountPercent > 0 && <span className="text-xs text-taupe">خصم {l.discountPercent}%</span>}
                        <ArrowLeft className="size-4 text-taupe transition-transform duration-500 group-hover:-translate-x-1 group-hover:text-espresso" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
        <div className="container-luxe">
          <div className="hairline" aria-hidden />
        </div>
      </header>

      {ready.length === 0 ? (
        <section className="bg-ivory py-20">
          <div className="container-luxe">
            <div className="studio-frame mx-auto flex max-w-3xl flex-col items-center rounded-2xl px-6 py-16 text-center">
              <p className="eyebrow">Coming soon</p>
              <h2 className="display mt-3 text-3xl text-espresso md:text-4xl">نصوّر إطلالات الموسم الآن</h2>
              <p className="mt-3 max-w-md text-sm leading-7 text-umber">
                قريباً تلاقي هنا أطقماً كاملة منسّقة بعناية. إلى ذلك الحين، نسّق إطلالتك بنفسك في الأتيليه.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/atelier" size="lg">
                  منسّق الإطلالة
                </ButtonLink>
                <ButtonLink href="/shop" size="lg" variant="outline">
                  تصفّح المجموعة
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>
      ) : (
        ready.map((look, i) => (
          <LookSpread key={look.id} look={look} index={i} currency={displayCurrency} atelierHref={atelierHrefForLook(look, categories)} />
        ))
      )}

      {/* ───────── Atelier invitation ───────── */}
      <section aria-labelledby="looks-atelier" className="bg-bone py-20 md:py-28">
        <div className="container-luxe grid items-center gap-12 md:grid-cols-2">
          <div className="relative mx-auto h-72 w-full max-w-sm md:h-96" aria-hidden data-reveal>
            {swatches.map((m, i) => (
              <div
                key={m!.id}
                className="absolute w-[46%] bg-paper p-1.5 shadow-[0_26px_44px_-24px_rgba(28,19,15,0.6)]"
                style={{
                  left: `${[4, 28, 52][i]}%`,
                  top: `${[14, 0, 18][i]}%`,
                  transform: `rotate(${[-7, 2, 8][i]}deg)`,
                  zIndex: [1, 3, 2][i],
                }}
              >
                <div className="studio-frame aspect-[4/5]">
                  <MediaImage media={m} sizes="200px" className="h-full w-full" alt="" />
                </div>
              </div>
            ))}
          </div>
          <div data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
            <p className="eyebrow inline-flex items-center gap-3">
              <span className="h-px w-8 bg-gold/70" aria-hidden />
              The Atelier
            </p>
            <h2 id="looks-atelier" className="display mt-4 text-[2.2rem] leading-[1.15] text-espresso text-balance md:text-5xl">
              {c["looks.atelierTitle"]}
            </h2>
            <p className="mt-4 max-w-md text-[0.98rem] leading-8 text-umber">
              {c["looks.atelierText"]}
            </p>
            <ButtonLink href="/atelier" size="lg" className="mt-8">
              <Sparkles className="size-4" aria-hidden />
              ادخل الأتيليه
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}

function LookSpread({ look, index, currency, atelierHref }: { look: LookData; index: number; currency: Currency; atelierHref: string }) {
  const dark = index % 2 === 1;
  const flip = index % 2 === 1;
  return (
    <section
      id={`look-${look.slug}`}
      aria-labelledby={`look-${look.slug}-title`}
      className={cn("relative isolate scroll-mt-20 overflow-hidden py-16 md:py-28", dark ? "grain bg-espresso text-paper" : "bg-ivory")}
    >
      {/* oversized folio number */}
      <span
        className={cn(
          "latin-italic pointer-events-none absolute -top-6 select-none text-[11rem] leading-none md:-top-10 md:text-[18rem]",
          flip ? "start-2 md:start-8" : "end-2 md:end-8",
          dark ? "text-paper/[0.04]" : "text-espresso/[0.04]",
        )}
        aria-hidden
      >
        {pad2(index + 1)}
      </span>

      <div className="container-luxe grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-16">
        <div className={cn("min-w-0 lg:col-span-7", flip && "lg:order-2")} data-reveal>
          <LookHotspots look={look} priority={index === 0} sizes="(min-width: 1024px) 55vw, 100vw" className="rounded-sm" />
          <p className={cn("mt-3 text-center text-xs", dark ? "text-paper/50" : "text-taupe")}>اضغط على النقاط لاكتشاف كل قطعة</p>
        </div>

        <div className={cn("min-w-0 lg:col-span-5", flip && "lg:order-1")} data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
          <p className={cn("eyebrow inline-flex items-center gap-3", dark && "text-copper-soft")}>
            <span className="h-px w-8 bg-gold/70" aria-hidden />
            Look N° {pad2(index + 1)}
          </p>
          <h2 id={`look-${look.slug}-title`} className={cn("display mt-4 text-[2.4rem] leading-[1.1] text-balance md:text-6xl", dark ? "text-paper" : "text-espresso")}>
            {look.title}
          </h2>
          {look.subtitle && <p className={cn("mt-3 text-lg", dark ? "text-copper-soft" : "text-copper-deep")}>{look.subtitle}</p>}
          {look.description && (
            <p className={cn("mt-4 max-w-lg text-[0.96rem] leading-8 text-pretty", dark ? "text-paper/70" : "text-umber")}>{look.description}</p>
          )}

          <LookPieces look={look} tone={dark ? "light" : "dark"} className="mt-8" />

          <div className={cn("mt-8 border-t pt-6", dark ? "border-paper/15" : "border-line")}>
            <LookPriceBlock look={look} currency={currency} tone={dark ? "light" : "dark"} />
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <AddLookButton look={look} variant={dark ? "light" : "primary"} className="w-full sm:w-auto" />
            <Link
              href={`/looks/${look.slug}`}
              className={cn("group inline-flex min-h-12 items-center justify-center gap-2 px-4 text-sm font-medium", dark ? "text-paper" : "text-espresso")}
            >
              <span className="link-luxe">تفاصيل الإطلالة</span>
              <ArrowLeft className="size-4 transition-transform duration-500 group-hover:-translate-x-1" aria-hidden />
            </Link>
          </div>
          <Link
            href={atelierHref}
            className={cn("mt-3 inline-flex min-h-11 items-center gap-2 text-xs", dark ? "text-paper/55 hover:text-paper" : "text-taupe hover:text-espresso")}
          >
            <Sparkles className="size-3.5" aria-hidden />
            <span className="link-luxe">عدّل عليها في منسّق الإطلالة</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
