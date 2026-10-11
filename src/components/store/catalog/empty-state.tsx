import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import type { CategoryData, ProductCardData } from "@/lib/catalog";
import { ProductCard } from "@/components/store/product-card";
import { ShopLink } from "@/components/store/catalog/shop-nav";

const SEARCH_IDEAS = ["تريكو", "قميص أبيض", "بنطال كوري", "ربطة بيزلي", "لوفر"];

/** No-results state: explains why, offers the quickest ways out, and keeps the page alive with picks. */
export function ShopEmptyState({
  query,
  clearHref,
  categories,
  picks,
}: {
  query: string;
  clearHref: string | null;
  categories: CategoryData[];
  picks: ProductCardData[];
}) {
  return (
    <div className="py-6 md:py-10">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <span className="studio-frame grid size-20 place-items-center rounded-full" aria-hidden>
          <Search className="size-7 text-taupe" strokeWidth={1.3} />
        </span>
        <h2 className="display mt-6 text-2xl text-espresso text-balance md:text-3xl">
          {query ? `ما لقينا شيء باسم «${query}»` : "ما في قطع تطابق هذا الاختيار"}
        </h2>
        <p className="mt-3 text-[0.95rem] leading-8 text-umber text-pretty">
          {query
            ? "جرّب كلمة أبسط أو تصفّح الأقسام — مجموعتنا مختصرة ومختارة بعناية، وأكيد بتلقى اللي يناسبك."
            : "يمكن المقاس أو اللون اللي اخترته نفد مؤقتاً. خفّف الفلاتر أو تواصل معنا ونبلغك أول ما يرجع."}
        </p>

        {clearHref && (
          <ShopLink
            href={clearHref}
            className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-espresso px-7 text-[0.95rem] font-medium text-paper transition-colors hover:bg-cocoa"
          >
            مسح الفلاتر
          </ShopLink>
        )}

        {query && (
          <div className="mt-8">
            <p className="text-xs text-taupe">ابحث مثلاً عن</p>
            <ul className="mt-3 flex flex-wrap justify-center gap-2">
              {SEARCH_IDEAS.map((t) => (
                <li key={t}>
                  <Link
                    href={`/shop?q=${encodeURIComponent(t)}`}
                    className="inline-flex h-10 items-center rounded-full border border-line bg-paper px-4 text-sm text-umber transition-colors hover:border-espresso/50 hover:text-espresso"
                  >
                    {t}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {categories.length > 0 && (
          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-1">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/shop/${c.slug}`} className="group inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-espresso">
                  <span className="link-luxe pb-0.5">{c.name}</span>
                  <ArrowLeft className="size-3.5 transition-transform duration-500 group-hover:-translate-x-1" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {picks.length > 0 && (
        <section aria-labelledby="empty-picks" className="mt-16 border-t border-line pt-12">
          <p className="eyebrow text-center">Our Picks</p>
          <h3 id="empty-picks" className="display mt-3 text-center text-2xl text-espresso md:text-3xl">
            قطع يرجع لها عملاؤنا دائماً
          </h3>
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
            {picks.map((p) => (
              <ProductCard key={p.id} product={p} sizes="(min-width: 768px) 22vw, 46vw" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
