import type { Metadata } from "next";
import { ArrowLeft, Sparkles } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { listLooks, listProducts, listShippingZones, type MediaRef, type ProductCardData } from "@/lib/catalog";
import { imagesForColor } from "@/lib/product-images";
import { PageHeader } from "@/components/store/page-header";
import { MediaImage } from "@/components/ui/media-image";
import { ButtonLink } from "@/components/ui/button";
import { InstagramIcon } from "@/components/ui/brand-icons";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "قصة مرموق",
  description: "مرموق: ملابس رجالية راقية بتفاصيل مختارة بعناية — تريكو قطني إيطالي، القصّة الكورية الصحيحة، وجذور يمنية تعرف ما يليق بمجالسنا.",
  alternates: { canonical: "/about" },
};

type Chapter = { latin: string; title: string; body: string; image: MediaRef | null };

export default async function AboutPage() {
  const [settings, { items: products }, looks, zones] = await Promise.all([getSettings(), listProducts({ limit: 24 }), listLooks(6), listShippingZones()]);

  const bySlug = (slug: string) => products.find((p) => p.slug === slug);
  const img = (p: ProductCardData | undefined, color?: string, nth = 0) => (p ? (imagesForColor(p.images, color)[nth] ?? p.images[0] ?? null) : null);
  const firstOf = (category: string) => products.find((p) => p.categorySlug === category);

  const knit = bySlug("half-zip-cable-knit-sweater") ?? firstOf("knitwear");
  const trousers = bySlug("korean-pleated-trousers-ivory") ?? firstOf("trousers");
  const tie = bySlug("paisley-silk-tie") ?? firstOf("accessories");
  const shoes = bySlug("italian-suede-tassel-loafers") ?? firstOf("shoes");
  const cover = looks.find((l) => l.cover)?.cover ?? img(knit);

  const chapters: Chapter[] = [
    {
      latin: "Italian Cotton",
      title: "قطن إيطالي، بلا مساومة",
      body: "تريكونا قطني 100% ومصنوع في إيطاليا 🇮🇹 — ضفائر كلاسيكية منتظمة، وسحّاب نصفي بلمسة جلدية، وألوان مأخوذة من دفء الخريف: البورغندي، الأسود، بني القهوة والكحلي. خامة تتنفّس في الصيف وتدفّيك في الشتاء.",
      image: img(knit, "برغندي", 1) ?? img(knit),
    },
    {
      latin: "The Korean Cut",
      title: "القصّة الكورية… كما يجب",
      body: "البنطال الكوري مو مجرد واسع أو ضيّق؛ هو قالب مدروس بكسرات أمامية وخصر مرتفع يسقط باستقامة على الحذاء. أخذنا وقتنا حتى ضبطنا القالب والقصّة الصحيحة، عشان يجلس عليك وكأنه مفصّل لك.",
      image: img(trousers),
    },
    {
      latin: "Details as Signature",
      title: "التفاصيل هي التوقيع",
      body: "ربطة حرير بنقشة بيزلي، ياقة إيطالية حادّة تقف بثبات تحت التريكو، وشرّابة على لوفر من الشامواه الطبيعي. نختار كل تفصيلة كما يختار الخيّاط إبرته — لأن الفرق الكبير يبدأ من الأشياء الصغيرة.",
      image: img(tie, "أحمر قرمزي"),
    },
    {
      latin: "Yemeni Roots",
      title: "جذور يمنية، وذوق عالمي",
      body: "وُلدنا في اليمن ونعرف ما يليق بمجالسنا ومناسباتنا. نوصل لكل المحافظات، نؤكّد كل طلب بأنفسنا، وتدفع عند الاستلام — لأن الثقة عندنا جزء من الأناقة، مو أقل منها.",
      image: img(shoes),
    },
  ];

  // Mosaic: look covers + one image per colour of the signature knit
  const seen = new Set<string>();
  const mosaic: MediaRef[] = [];
  const push = (m: MediaRef | null | undefined) => {
    if (m && !seen.has(m.id) && mosaic.length < 6) {
      seen.add(m.id);
      mosaic.push(m);
    }
  };
  for (const c of knit?.colors ?? []) push(img(knit, c.name));
  for (const l of looks) push(l.cover);
  for (const p of products) push(p.images[0]);

  const stats = [
    { value: "+69K", label: "رجل مرموق يتابعنا على إنستغرام" },
    { value: "100%", label: "قطن إيطالي في كل قطعة تريكو" },
    ...(zones.length ? [{ value: String(zones.length), label: "محافظة يوصلها طلبك" }] : []),
    { value: "3", label: "أيام لاستبدال المقاس أو اللون" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Our Story · قصتنا"
        title="قصة مرموق"
        subtitle={`${settings.tagline} — ملابس رجالية راقية بتفاصيل مختارة بعناية.`}
        media={cover}
        breadcrumbs={[{ label: "الرئيسية", href: "/" }, { label: "قصتنا" }]}
      />

      {/* ───────── The word ───────── */}
      <section aria-labelledby="meaning" className="bg-ivory py-20 md:py-32">
        <div className="container-luxe grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5" data-reveal>
            <p className="eyebrow inline-flex items-center gap-3">
              <span className="h-px w-8 bg-gold/70" aria-hidden />
              The Meaning
            </p>
            <h2 id="meaning" className="display mt-6 text-[5.5rem] leading-none text-espresso md:text-[8.5rem]">
              مَرموق
            </h2>
            <p className="mt-4">
              <span dir="ltr" className="latin-italic text-xl text-taupe">
                mar·mouq — <span className="not-italic">/mar-ˈmuːq/</span>
              </span>
            </p>
          </div>
          <div className="lg:col-span-7 lg:pt-10" data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
            <dl className="border-y border-line">
              <div className="flex gap-5 py-5">
                <dt className="latin-italic w-10 shrink-0 text-2xl text-copper">1.</dt>
                <dd className="text-lg leading-9 text-espresso">
                  <span className="text-sm text-taupe">(صفة)</span> مَن تُرمَق إليه الأبصار إعجاباً وتقديراً.
                </dd>
              </div>
              <div className="flex gap-5 border-t border-line py-5">
                <dt className="latin-italic w-10 shrink-0 text-2xl text-copper">2.</dt>
                <dd className="text-lg leading-9 text-espresso">رفيع المكانة، ذو حضور وشأن — يُعرَف قبل أن يتكلّم.</dd>
              </div>
            </dl>
            <p className="mt-8 text-[1.05rem] leading-9 text-umber text-pretty">
              اخترنا الاسم لأنه يختصر كل ما نريده لك: أن تدخل المجلس فتلتفت إليك الأنظار، لا لصخب ما تلبس، بل لاتّزانه. مرموق ليست ماركة تلبسها
              فقط — هي حالة توصل لها بالتفاصيل: ياقة تقف بثبات، ضفيرة تريكو منتظمة، وخط كيّ لا ينكسر.
            </p>
            <p className="display mt-8 text-2xl leading-relaxed text-copper-deep md:text-3xl">{settings.tagline}.</p>
          </div>
        </div>
      </section>

      {/* ───────── Chapters ───────── */}
      <section aria-label="ما نؤمن به" className="bg-paper py-20 md:py-28">
        <div className="container-luxe">
          <div className="mx-auto max-w-2xl text-center" data-reveal>
            <p className="eyebrow inline-flex items-center gap-3">
              <span className="h-px w-6 bg-gold/70" aria-hidden />
              What We Stand For
              <span className="h-px w-6 bg-gold/70" aria-hidden />
            </p>
            <h2 className="display mt-4 text-[2.2rem] leading-[1.2] text-espresso md:text-5xl">أربعة أشياء لا نتنازل عنها</h2>
          </div>

          <ol className="mt-16 space-y-20 md:mt-24 md:space-y-32">
            {chapters.map((c, i) => {
              const flip = i % 2 === 1;
              return (
                <li key={c.latin} className="grid items-center gap-8 md:grid-cols-12 md:gap-14">
                  <div className={cn("md:col-span-6", flip ? "md:order-2 md:col-start-7" : "")} data-reveal>
                    <div className={cn("relative mx-auto max-w-md md:max-w-none", flip ? "md:me-12" : "md:ms-12")}>
                      <div className="studio-frame aspect-[4/5] overflow-hidden rounded-sm">
                        <MediaImage media={c.image} sizes="(min-width: 768px) 42vw, 90vw" className="h-full w-full" alt="" />
                      </div>
                      <span
                        className={cn(
                          "latin-italic absolute -bottom-8 text-[6rem] leading-none text-copper/80 md:-bottom-12 md:text-[9rem]",
                          flip ? "-start-2 md:-start-10" : "-end-2 md:-end-10",
                        )}
                        aria-hidden
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                  </div>
                  <div className={cn("md:col-span-5", flip ? "md:order-1 md:col-start-1" : "md:col-start-8")} data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
                    <p className="eyebrow">
                      <span className="sr-only">{i + 1}. </span>
                      {c.latin}
                    </p>
                    <h3 className="display mt-4 text-3xl leading-[1.25] text-espresso md:text-[2.6rem]">{c.title}</h3>
                    <div className="mt-5 h-px w-16 bg-gold/70" aria-hidden />
                    <p className="mt-5 text-[1rem] leading-9 text-umber text-pretty">{c.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ───────── Numbers + manifesto ───────── */}
      <section aria-labelledby="manifesto" className="relative isolate overflow-hidden bg-espresso py-20 text-paper grain md:py-32">
        <div className="container-luxe">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-10 border-b border-paper/10 pb-16 md:grid-cols-4">
            {stats.map((s, i) => (
              <div key={s.label} data-reveal style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties}>
                <dt className="sr-only">{s.label}</dt>
                <dd>
                  <span className="latin-italic block text-5xl leading-none text-copper-soft md:text-7xl">{s.value}</span>
                  <span className="mt-3 block max-w-[12rem] text-sm leading-7 text-paper/65">{s.label}</span>
                </dd>
              </div>
            ))}
          </dl>

          <figure className="mx-auto mt-16 max-w-4xl text-center md:mt-24" data-reveal>
            <span className="latin-italic block text-7xl leading-none text-copper/60" aria-hidden>
              “
            </span>
            <blockquote id="manifesto" className="display text-[2rem] leading-[1.45] text-balance md:text-6xl md:leading-[1.35]">
              لما ذوقك يتعدّى مرحلة الفخامة… تصير مرموق.
            </blockquote>
            <figcaption className="eyebrow mt-8 text-copper-soft">— From the Marmouq notebook</figcaption>
          </figure>
        </div>
      </section>

      {/* ───────── Mosaic + CTA ───────── */}
      <section aria-labelledby="about-cta" className="bg-ivory py-20 md:py-28">
        <div className="container-luxe">
          {mosaic.length >= 3 && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4" data-reveal>
              {mosaic.map((m, i) => (
                <div
                  key={m.id}
                  className={cn(
                    "studio-frame aspect-[4/5] overflow-hidden rounded-sm",
                    i === 0 && "col-span-2 md:row-span-2",
                    i > 4 && "hidden",
                  )}
                >
                  <MediaImage media={m} sizes={i === 0 ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 50vw"} className="h-full w-full" alt="" />
                </div>
              ))}
            </div>
          )}

          <div className="mx-auto mt-16 max-w-2xl text-center md:mt-24" data-reveal>
            <p className="eyebrow inline-flex items-center gap-3">
              <span className="h-px w-6 bg-gold/70" aria-hidden />
              Begin Here
              <span className="h-px w-6 bg-gold/70" aria-hidden />
            </p>
            <h2 id="about-cta" className="display mt-4 text-[2.2rem] leading-[1.2] text-espresso text-balance md:text-5xl">
              ابدأ من قطعة واحدة… والباقي يتبعها
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[0.98rem] leading-8 text-umber">
              تصفّح المجموعة، أو خلّ الأتيليه ينسّق لك طقمك كامل من التريكو حتى الحذاء.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <ButtonLink href="/shop" size="lg">
                تسوّق المجموعة
                <ArrowLeft className="size-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/atelier" size="lg" variant="outline">
                <Sparkles className="size-4" aria-hidden />
                منسّق الإطلالة
              </ButtonLink>
            </div>
            {settings.instagram && (
              <a
                href={settings.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex min-h-11 items-center gap-2.5 text-sm text-umber transition-colors hover:text-espresso"
              >
                <InstagramIcon size={18} />
                <span className="link-luxe">انضم لأكثر من 69 ألف متابع على إنستغرام</span>
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
