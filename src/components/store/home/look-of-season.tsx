import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { Price } from "@/components/store/store-provider";
import { LookHotspots } from "@/components/store/look-hotspots";
import { AddLookButton } from "@/components/store/add-look-dialog";
import { imagesForColor } from "@/lib/product-images";
import type { LookData } from "@/lib/catalog";

export function LookOfSeason({ look }: { look: LookData }) {
  if (look.items.length === 0) return null;
  const savings = look.total - look.bundleTotal;

  return (
    <section aria-labelledby="look-title" className="relative bg-bone py-20 md:py-28">
      <div className="container-luxe grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6" data-reveal>
          <LookHotspots look={look} sizes="(min-width: 1024px) 46vw, 100vw" />
          <p className="mt-3 text-center text-xs text-taupe">اضغط على النقاط لاكتشاف كل قطعة</p>
        </div>

        <div className="lg:col-span-6" data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
          <p className="eyebrow inline-flex items-center gap-3">
            <span className="h-px w-8 bg-gold/70" aria-hidden />
            Look of the Season
          </p>
          <h2 id="look-title" className="display mt-4 text-[2.4rem] leading-[1.12] text-espresso text-balance md:text-6xl">
            {look.title}
          </h2>
          {(look.subtitle || look.description) && (
            <p className="mt-4 max-w-lg text-[0.98rem] leading-8 text-umber text-pretty">{look.description || look.subtitle}</p>
          )}

          <ol className="mt-9 divide-y divide-line border-y border-line">
            {look.items.map((item, i) => {
              const img = imagesForColor(item.product.images, item.color)[0] ?? null;
              const href = item.color ? `/product/${item.product.slug}?color=${encodeURIComponent(item.color)}` : `/product/${item.product.slug}`;
              return (
                <li key={item.product.id}>
                  <Link href={href} className="group flex items-center gap-4 py-3.5">
                    <span className="latin-italic w-6 shrink-0 text-sm text-taupe">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="studio-frame block aspect-[4/5] w-12 shrink-0 overflow-hidden rounded-sm">
                      <MediaImage media={img} sizes="56px" className="h-full w-full" alt="" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.95rem] text-espresso group-hover:underline group-hover:decoration-copper/60 group-hover:underline-offset-4">
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

          <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs text-taupe">سعر الإطلالة كاملة</p>
              <Price amount={look.bundleTotal} compareAt={savings > 0 ? look.total : null} className="display mt-1 block text-3xl text-espresso" />
            </div>
            {look.discountPercent > 0 && (
              <span className="rounded-full bg-copper px-3.5 py-1.5 text-xs font-medium text-paper">خصم {look.discountPercent}% عند شرائها كاملة</span>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <AddLookButton look={look} className="w-full sm:w-auto" />
            <Link href="/looks" className="group inline-flex min-h-12 items-center justify-center gap-2 px-4 text-sm font-medium text-espresso">
              <span className="link-luxe">كل الإطلالات</span>
              <ArrowLeft className="size-4 transition-transform duration-500 group-hover:-translate-x-1" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
