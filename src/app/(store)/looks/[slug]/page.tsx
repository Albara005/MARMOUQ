import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronLeft, RefreshCcw, Sparkles, Truck, Wallet } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getLookBySlug, listCategories, listLooks } from "@/lib/catalog";
import { imagesForColor } from "@/lib/product-images";
import { formatMoney } from "@/lib/money";
import { LookHotspots } from "@/components/store/look-hotspots";
import { AddLookButton } from "@/components/store/add-look-dialog";
import { ProductCard } from "@/components/store/product-card";
import { SectionHeading } from "@/components/store/section-heading";
import { MediaImage } from "@/components/ui/media-image";
import { Price } from "@/components/store/store-provider";
import { LookCard, LookPriceBlock, atelierHrefForLook, itemHref, pad2 } from "@/components/store/looks/look-parts";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const look = await getLookBySlug(slug);
  if (!look) return { title: "الإطلالة غير موجودة" };
  const description = look.description || look.subtitle || `إطلالة ${look.title} من مرموق — ${look.items.map((i) => i.product.name).join("، ")}.`;
  return {
    title: look.title,
    description,
    alternates: { canonical: `/looks/${look.slug}` },
    openGraph: {
      title: `${look.title} — مرموق`,
      description,
      type: "website",
      ...(look.cover ? { images: [{ url: `/media/${look.cover.id}/lg`, alt: look.cover.alt || look.title }] } : {}),
    },
  };
}

export default async function LookPage({ params }: Props) {
  const { slug } = await params;
  const [look, settings, allLooks, categories] = await Promise.all([getLookBySlug(slug), getSettings(), listLooks(24), listCategories()]);
  if (!look) notFound();

  const currency = settings.currency;
  const savings = look.total - look.bundleTotal;
  const index = Math.max(0, allLooks.findIndex((l) => l.id === look.id));
  const others = allLooks.filter((l) => l.id !== look.id && l.items.length > 0).slice(0, 3);
  const hasItems = look.items.length > 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: look.title,
    itemListElement: look.items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: itemHref(it),
      name: it.product.name,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <div className="bg-ivory pb-28 md:pb-0">
        <div className="container-luxe pt-5 md:pt-8">
          <nav aria-label="مسار التنقل">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-taupe">
              <li className="inline-flex items-center gap-1.5">
                <Link href="/" className="link-luxe py-1 hover:text-espresso">
                  الرئيسية
                </Link>
                <ChevronLeft className="size-3 opacity-60" aria-hidden />
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Link href="/looks" className="link-luxe py-1 hover:text-espresso">
                  الإطلالات
                </Link>
                <ChevronLeft className="size-3 opacity-60" aria-hidden />
              </li>
              <li aria-current="page" className="text-umber">
                {look.title}
              </li>
            </ol>
          </nav>
        </div>

        {/* ───────── Cover + purchase panel ───────── */}
        <section className="container-luxe mt-5 grid grid-cols-1 gap-10 md:mt-8 lg:grid-cols-12 lg:gap-14" aria-labelledby="look-title">
          <div className="min-w-0 lg:col-span-7">
            <LookHotspots look={look} priority sizes="(min-width: 1024px) 56vw, 100vw" className="rounded-sm" />
            <p className="mt-3 text-center text-xs text-taupe">اضغط على النقاط لاكتشاف كل قطعة</p>
          </div>

          <aside className="min-w-0 lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <p className="eyebrow inline-flex items-center gap-3">
                <span className="h-px w-8 bg-gold/70" aria-hidden />
                The Complete Look · N° {pad2(index + 1)}
              </p>
              <h1 id="look-title" className="display mt-4 text-[2.5rem] leading-[1.1] text-espresso text-balance md:text-6xl">
                {look.title}
              </h1>
              {look.subtitle && <p className="mt-3 text-lg text-copper-deep">{look.subtitle}</p>}
              {look.description && <p className="mt-4 text-[0.96rem] leading-8 text-umber text-pretty">{look.description}</p>}

              {hasItems ? (
                <>
                  <ol className="mt-8 divide-y divide-line border-y border-line">
                    {look.items.map((item, i) => {
                      const img = imagesForColor(item.product.images, item.color)[0] ?? null;
                      return (
                        <li key={`${item.product.id}-${item.color}`}>
                          <Link href={itemHref(item)} className="group flex items-center gap-4 py-3">
                            <span className="latin-italic w-6 shrink-0 text-sm text-taupe">{pad2(i + 1)}</span>
                            <span className="studio-frame block aspect-[4/5] w-12 shrink-0 overflow-hidden rounded-sm">
                              <MediaImage media={img} sizes="56px" className="h-full w-full" alt="" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[0.93rem] text-espresso group-hover:underline group-hover:decoration-copper/60 group-hover:underline-offset-4">
                                {item.product.name}
                              </span>
                              {item.color && <span className="block text-xs text-taupe">{item.color}</span>}
                            </span>
                            <Price amount={item.product.price} className="shrink-0 text-sm text-umber" />
                          </Link>
                        </li>
                      );
                    })}
                  </ol>

                  <LookPriceBlock look={look} currency={currency} className="mt-7" />
                  <AddLookButton look={look} className="mt-6 w-full" />

                  <ul className="mt-6 grid grid-cols-3 gap-2 text-center text-[0.7rem] leading-5 text-taupe">
                    <li className="flex flex-col items-center gap-1.5 rounded-xl bg-bone/60 px-2 py-3">
                      <Wallet className="size-4 text-copper" strokeWidth={1.6} aria-hidden />
                      الدفع عند الاستلام
                    </li>
                    <li className="flex flex-col items-center gap-1.5 rounded-xl bg-bone/60 px-2 py-3">
                      <Truck className="size-4 text-copper" strokeWidth={1.6} aria-hidden />
                      توصيل لكل المحافظات
                    </li>
                    <li className="flex flex-col items-center gap-1.5 rounded-xl bg-bone/60 px-2 py-3">
                      <RefreshCcw className="size-4 text-copper" strokeWidth={1.6} aria-hidden />
                      استبدال خلال 3 أيام
                    </li>
                  </ul>

                  <Link
                    href={atelierHrefForLook(look, categories)}
                    className="group mt-6 flex items-center gap-3 rounded-xl border border-line bg-paper px-4 py-3.5 text-sm text-umber transition-colors hover:border-espresso/40"
                  >
                    <Sparkles className="size-4 shrink-0 text-copper" aria-hidden />
                    <span className="flex-1">
                      تبغى لون ثاني للسويتر؟ <span className="font-medium text-espresso">عدّلها في منسّق الإطلالة</span>
                    </span>
                    <ArrowLeft className="size-4 shrink-0 transition-transform duration-500 group-hover:-translate-x-1" aria-hidden />
                  </Link>
                </>
              ) : (
                <p className="mt-8 rounded-xl bg-bone/60 px-5 py-6 text-sm leading-7 text-umber">
                  نجهّز قطع هذه الإطلالة من جديد — تابعنا على إنستغرام أو تصفّح المجموعة إلى أن تعود.
                </p>
              )}
            </div>
          </aside>
        </section>

        {/* ───────── The pieces ───────── */}
        {hasItems && (
          <section aria-labelledby="pieces-title" className="mt-20 border-t border-line bg-paper py-16 md:mt-28 md:py-24">
            <div className="container-luxe">
              <SectionHeading
                id="pieces-title"
                eyebrow="The Pieces"
                title="قطع الإطلالة"
                subtitle="كل قطعة تقدر تطلبها لوحدها — أو خذ الإطلالة كاملة ووفّر."
              />
              <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-5">
                {look.items.map((item) => (
                  <ProductCard
                    key={`${item.product.id}-${item.color}`}
                    product={item.product}
                    color={item.color || undefined}
                    sizes="(min-width: 1024px) 18vw, (min-width: 768px) 30vw, 46vw"
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ───────── Other looks ───────── */}
        <section aria-labelledby="other-looks" className="bg-ivory py-16 md:py-24">
          <div className="container-luxe">
            <SectionHeading id="other-looks" eyebrow="More Looks" title="إطلالات أخرى" action={{ label: "كل الإطلالات", href: "/looks" }} />
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((l) => (
                <LookCard key={l.id} look={l} currency={currency} index={allLooks.findIndex((x) => x.id === l.id)} />
              ))}
              <Link
                href="/atelier"
                className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-xl bg-espresso p-7 text-paper grain"
              >
                <span className="latin-italic absolute end-6 top-4 text-[7rem] leading-none text-paper/[0.06]" aria-hidden>
                  A
                </span>
                <span className="eyebrow text-copper-soft">The Atelier</span>
                <span className="display mt-3 text-3xl leading-tight">نسّق إطلالتك بنفسك</span>
                <span className="mt-3 max-w-xs text-sm leading-7 text-paper/65">خمس خانات، ألوان لا تنتهي — وطقمك يكتمل قدّامك قبل ما تطلبه.</span>
                <span className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium">
                  <span className="link-luxe">ادخل الأتيليه</span>
                  <ArrowLeft className="size-4 transition-transform duration-500 group-hover:-translate-x-1" aria-hidden />
                </span>
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* ───────── Sticky mobile purchase bar ───────── */}
      {hasItems && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_-20px_rgba(28,19,15,0.35)] backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.7rem] text-taupe">{savings > 0 ? `الإطلالة كاملة · وفّر ${formatMoney(savings, currency)}` : "الإطلالة كاملة"}</p>
              <p className="display text-lg leading-tight tabular-nums text-espresso">{formatMoney(look.bundleTotal, currency)}</p>
            </div>
            <AddLookButton look={look} label="أضف الإطلالة" size="md" className="shrink-0" />
          </div>
        </div>
      )}
    </>
  );
}
