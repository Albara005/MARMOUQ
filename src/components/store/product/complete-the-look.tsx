import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LookHotspots } from "@/components/store/look-hotspots";
import { AddLookButton } from "@/components/store/add-look-dialog";
import { Price } from "@/components/store/store-provider";
import { MediaImage } from "@/components/ui/media-image";
import type { LookData } from "@/lib/catalog";
import { imagesForColor } from "@/lib/product-images";
import { cn } from "@/lib/utils";

/** "أكمل الإطلالة": the look photo with shoppable pins beside the full set and its bundle price. */
export function CompleteTheLook({ look, currentProductId, otherLooks }: { look: LookData; currentProductId: number; otherLooks: LookData[] }) {
  const saving = look.total - look.bundleTotal;
  return (
    <section aria-labelledby="complete-look" className="relative isolate overflow-hidden bg-espresso py-16 text-paper grain md:py-24">
      <div className="container-luxe grid items-center gap-10 md:grid-cols-2 md:gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:gap-24">
        <div data-reveal className="mx-auto w-full max-w-[34rem]">
          <LookHotspots look={look} sizes="(min-width: 768px) 45vw, 100vw" />
        </div>

        <div data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
          <p className="eyebrow inline-flex items-center gap-3 text-copper-soft">
            <span className="h-px w-8 bg-gold/70" aria-hidden />
            Complete the Look
          </p>
          <h2 id="complete-look" className="display mt-4 text-[2rem] leading-[1.2] md:text-5xl">
            أكمل الإطلالة
          </h2>
          <p className="mt-3 text-lg text-paper/85">{look.title}</p>
          {look.description && <p className="mt-3 max-w-lg text-[0.92rem] leading-8 text-paper/65 text-pretty">{look.description}</p>}

          <ul className="mt-8 divide-y divide-paper/10 border-y border-paper/10">
            {look.items.map((item) => {
              const img = imagesForColor(item.product.images, item.color)[0] ?? null;
              const current = item.product.id === currentProductId;
              const href = item.color ? `/product/${item.product.slug}?color=${encodeURIComponent(item.color)}` : `/product/${item.product.slug}`;
              return (
                <li key={item.product.id}>
                  <Link href={href} className="group flex items-center gap-4 py-3">
                    <span className="studio-frame aspect-[4/5] w-12 shrink-0 overflow-hidden rounded-md">
                      <MediaImage media={img} sizes="56px" className="h-full w-full" alt="" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-sm text-paper group-hover:underline group-hover:decoration-copper-soft group-hover:underline-offset-4">{item.product.name}</span>
                      <span className="mt-0.5 block text-xs text-paper/50">
                        {item.color}
                        {current && <span className="ms-2 rounded-full bg-paper/10 px-2 py-0.5 text-[0.65rem] text-copper-soft">تشاهدها الآن</span>}
                      </span>
                    </span>
                    <Price amount={item.product.price} className="shrink-0 text-sm text-paper/80" />
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs text-paper/55">سعر الطقم كامل</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-3">
                <Price amount={look.bundleTotal} className="text-2xl font-medium" />
                {saving > 0 && <Price amount={look.total} className="text-sm text-paper/45 line-through" />}
              </p>
            </div>
            {look.discountPercent > 0 && (
              <span className="rounded-full border border-copper-soft/40 px-3 py-1.5 text-xs text-copper-soft">وفّر {look.discountPercent}% على الطقم</span>
            )}
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <AddLookButton look={look} variant="light" className="w-full sm:w-auto" />
            <Link href={`/looks/${look.slug}`} className="group inline-flex min-h-11 items-center justify-center gap-2 px-2 text-sm text-paper/85 hover:text-paper">
              <span className="link-luxe pb-0.5">تفاصيل الإطلالة</span>
              <ArrowLeft className="size-4 transition-transform duration-500 group-hover:-translate-x-1" aria-hidden />
            </Link>
          </div>

          {otherLooks.length > 0 && (
            <p className={cn("mt-8 text-xs text-paper/50")}>
              تظهر أيضاً في:{" "}
              {otherLooks.map((l, i) => (
                <span key={l.id}>
                  {i > 0 && "، "}
                  <Link href={`/looks/${l.slug}`} className="text-paper/80 underline decoration-paper/30 underline-offset-4 hover:text-paper">
                    {l.title}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
