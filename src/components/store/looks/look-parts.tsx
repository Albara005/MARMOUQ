import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { Price } from "@/components/store/store-provider";
import { imagesForColor } from "@/lib/product-images";
import { formatMoney, type Currency } from "@/lib/money";
import type { CategoryData, LookData, LookItemData } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export const pad2 = (n: number) => String(n).padStart(2, "0");

export function itemHref(item: LookItemData) {
  return item.color ? `/product/${item.product.slug}?color=${encodeURIComponent(item.color)}` : `/product/${item.product.slug}`;
}

/** Pre-fills the Atelier with this look's pieces so the shopper can tweak it. */
export function atelierHrefForLook(look: LookData, categories: CategoryData[]): string {
  const slotOf = new Map(categories.map((c) => [c.slug, c.slot]));
  const q = new URLSearchParams();
  for (const slot of ["knit", "shirt", "tie", "trousers", "shoes"]) q.set(slot, "none");
  for (const it of look.items) {
    const slot = it.product.categorySlug ? slotOf.get(it.product.categorySlug) : undefined;
    if (slot && q.get(slot) === "none") q.set(slot, `${it.product.slug}~${it.color || it.product.colors[0]?.name || ""}`);
  }
  return `/atelier?${q.toString()}`;
}

/** Small portrait cards for each piece of a look — a rail on phones, a row on desktop. */
export function LookPieces({ look, tone = "dark", className }: { look: LookData; tone?: "dark" | "light"; className?: string }) {
  const light = tone === "light";
  return (
    <ol
      className={cn(
        "no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 md:-mx-10 md:px-10 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-2.5 lg:overflow-visible lg:px-0",
        className,
      )}
    >
      {look.items.map((item, i) => {
        const img = imagesForColor(item.product.images, item.color)[0] ?? null;
        return (
          <li key={`${item.product.id}-${item.color}`} className="w-[30%] shrink-0 snap-start sm:w-[22%] lg:w-auto">
            <Link href={itemHref(item)} className="group block">
              <span className="studio-frame relative block aspect-[4/5] overflow-hidden rounded-md">
                <MediaImage
                  media={img}
                  sizes="(min-width: 1024px) 9vw, 30vw"
                  className="h-full w-full"
                  imgClassName="transition-transform duration-[1.4s] ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
                  alt=""
                />
                <span className="latin-italic absolute start-1.5 top-1 text-[0.8rem] text-espresso/70">{pad2(i + 1)}</span>
              </span>
              <span className={cn("mt-2 line-clamp-2 text-[0.74rem] leading-[1.35rem]", light ? "text-paper/90 group-hover:text-paper" : "text-espresso")}>
                {item.product.name}
              </span>
              <span className={cn("mt-0.5 flex items-center gap-1 text-[0.68rem]", light ? "text-paper/55" : "text-taupe")}>
                {item.color && (
                  <span
                    className="size-2 shrink-0 rounded-full ring-1 ring-black/15"
                    style={{ backgroundColor: item.product.colors.find((c) => c.name === item.color)?.hex ?? "transparent" }}
                    aria-hidden
                  />
                )}
                <span className="truncate">{item.color}</span>
              </span>
              <Price amount={item.product.price} className={cn("mt-0.5 block text-[0.72rem]", light ? "text-paper/75" : "text-umber")} />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/** Bundle price: total struck → bundle total, with the saving called out. */
export function LookPriceBlock({ look, currency, tone = "dark", className }: { look: LookData; currency: Currency; tone?: "dark" | "light"; className?: string }) {
  const light = tone === "light";
  const savings = look.total - look.bundleTotal;
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div>
        <p className={cn("text-xs", light ? "text-paper/60" : "text-taupe")}>سعر الإطلالة كاملة · {look.items.length} قطع</p>
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-3">
          <span className={cn("display text-[2rem] leading-none tabular-nums md:text-4xl", light ? "text-paper" : "text-espresso")}>
            {formatMoney(look.bundleTotal, currency)}
          </span>
          {savings > 0 && <s className={cn("text-sm tabular-nums", light ? "text-paper/45" : "text-mist")}>{formatMoney(look.total, currency)}</s>}
        </p>
      </div>
      {savings > 0 && (
        <span className={cn("rounded-full px-3.5 py-1.5 text-xs font-medium", light ? "bg-copper-soft/15 text-copper-soft" : "bg-copper/10 text-copper-deep")}>
          وفّر {formatMoney(savings, currency)} · خصم {look.discountPercent}%
        </span>
      )}
    </div>
  );
}

/** Compact card linking to another look. */
export function LookCard({ look, currency, index }: { look: LookData; currency: Currency; index: number }) {
  const savings = look.total - look.bundleTotal;
  return (
    <Link href={`/looks/${look.slug}`} className="group block">
      <span className="studio-frame relative block aspect-[4/5] overflow-hidden rounded-xl">
        <MediaImage
          media={look.cover}
          sizes="(min-width: 1024px) 30vw, 90vw"
          className="h-full w-full"
          imgClassName="transition-transform duration-[1.6s] ease-[var(--ease-out-expo)] group-hover:scale-[1.05]"
          alt={look.cover?.alt || look.title}
        />
        <span className="absolute inset-0 bg-gradient-to-t from-espresso/75 via-espresso/5 to-transparent" aria-hidden />
        <span className="absolute inset-x-5 bottom-5 text-paper">
          <span className="latin-italic text-sm text-copper-soft">Look N° {pad2(index + 1)}</span>
          <span className="display mt-1 block text-2xl leading-tight md:text-3xl">{look.title}</span>
          <span className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="tabular-nums">{formatMoney(look.bundleTotal, currency)}</span>
            {savings > 0 && <s className="text-xs tabular-nums text-paper/55">{formatMoney(look.total, currency)}</s>}
          </span>
        </span>
        {look.discountPercent > 0 && (
          <span className="absolute start-4 top-4 rounded-full bg-paper/90 px-3 py-1 text-[0.7rem] font-medium text-espresso backdrop-blur-sm">
            خصم {look.discountPercent}%
          </span>
        )}
      </span>
      <span className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-espresso">
        <span className="link-luxe">اكتشف الإطلالة</span>
        <ArrowLeft className="size-4 transition-transform duration-500 group-hover:-translate-x-1" aria-hidden />
      </span>
    </Link>
  );
}
