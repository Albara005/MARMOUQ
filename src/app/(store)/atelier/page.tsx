import type { Metadata } from "next";
import { copyOf, getSettings } from "@/lib/settings";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listCategories, listLooks, listProducts } from "@/lib/catalog";
import { imagesForColor } from "@/lib/product-images";
import { AtelierStudio } from "@/components/store/atelier/atelier-studio";
import {
  RECIPES,
  SLOT_META,
  SLOT_ORDER,
  isSlotKey,
  optionKey,
  parseSelection,
  resolveRecipe,
  type AtelierOption,
  type AtelierSlot,
  type LookMatch,
} from "@/components/store/atelier/model";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "منسّق الإطلالة — الأتيليه",
  description: "نسّق إطلالتك قطعة قطعة: التريكو، القميص، الربطة، البنطال والحذاء — وشاهدها تكتمل أمامك قبل أن تطلبها.",
  alternates: { canonical: "/atelier" },
};

export default async function AtelierPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const c = copyOf(await getSettings());
  const [params, categories, looks] = await Promise.all([searchParams, listCategories(), listLooks(24)]);

  const slotCategories = categories
    .filter((c) => isSlotKey(c.slot))
    .sort((a, b) => SLOT_ORDER.indexOf(a.slot as never) - SLOT_ORDER.indexOf(b.slot as never));

  // One category per slot (the first, if a slot is mapped twice)
  const seen = new Set<string>();
  const unique = slotCategories.filter((c) => (seen.has(c.slot) ? false : (seen.add(c.slot), true)));

  const productLists = await Promise.all(unique.map((c) => listProducts({ category: c.slug, limit: 24 })));

  const slots: AtelierSlot[] = unique
    .map((c, i) => {
      const options: AtelierOption[] = [];
      for (const p of productLists[i].items) {
        const colors = p.colors.length ? p.colors : [{ name: "", hex: "" }];
        for (const col of colors) {
          options.push({
            key: optionKey(p.slug, col.name),
            productId: p.id,
            slug: p.slug,
            name: p.name,
            subtitle: p.subtitle,
            color: col.name,
            colorHex: col.hex,
            price: p.price,
            compareAtPrice: p.compareAtPrice,
            image: imagesForColor(p.images, col.name || null)[0] ?? null,
            inStock: p.inStock,
          });
        }
      }
      const key = c.slot as AtelierSlot["key"];
      return { key, label: SLOT_META[key].label, categoryName: c.name, categorySlug: c.slug, description: c.description, options };
    })
    .filter((s) => s.options.length > 0);

  const lookMatches: LookMatch[] = looks
    .filter((l) => l.items.length > 0)
    .map((l) => ({
      slug: l.slug,
      title: l.title,
      discountPercent: l.discountPercent,
      keys: l.items.map((it) => optionKey(it.product.slug, it.color || it.product.colors[0]?.name || "")),
    }));

  const fallback = resolveRecipe(RECIPES[0], slots);
  const { selection } = parseSelection(params, slots, fallback);

  return (
    <div className="bg-ivory pb-28 lg:pb-24">
      <header className="container-luxe pb-6 pt-6 md:pb-8 md:pt-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow inline-flex items-center gap-3">
              <span className="h-px w-8 bg-gold/70" aria-hidden />
              {c["atelier.eyebrow"]}
            </p>
            <h1 className="display mt-3 text-[2.35rem] leading-[1.12] text-espresso text-balance md:text-[3.4rem]">{c["atelier.title"]}</h1>
            <p className="mt-3 max-w-xl text-[0.95rem] leading-8 text-umber text-pretty md:text-base">
              {c["atelier.intro"]}
            </p>
          </div>
          <ol className="hidden shrink-0 gap-8 text-sm text-umber lg:flex" aria-label="خطوات التنسيق">
            {["اختر القطع والألوان", "حدّد مقاس كل قطعة", "أضف الطقم للحقيبة"].map((s, i) => (
              <li key={s} className="flex items-baseline gap-2.5">
                <span className="latin-italic text-2xl text-copper">{String(i + 1).padStart(2, "0")}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </header>

      {slots.length === 0 ? (
        <section className="container-luxe">
          <div className="studio-frame flex min-h-[50svh] flex-col items-center justify-center rounded-2xl px-6 py-16 text-center">
            <p className="eyebrow">Coming soon</p>
            <h2 className="display mt-3 text-3xl text-espresso">الأتيليه يتجهّز لموسمه الجديد</h2>
            <p className="mt-3 max-w-md text-sm leading-7 text-umber">نرتّب القطع على الطاولة الآن. إلى ذلك الحين، تصفّح المجموعة أو الإطلالات الجاهزة.</p>
            <Link href="/looks" className="group mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-espresso">
              <span className="link-luxe">الإطلالات الجاهزة</span>
              <ArrowLeft className="size-4 transition-transform duration-500 group-hover:-translate-x-1" aria-hidden />
            </Link>
          </div>
        </section>
      ) : (
        <AtelierStudio slots={slots} looks={lookMatches} initial={selection} />
      )}
    </div>
  );
}
