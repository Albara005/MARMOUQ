import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getFxTable } from "@/lib/fx";
import { CURRENCY_CATALOG } from "@/lib/currency-catalog";
import { getMediaRefs, listCategories, listLooks, listProducts } from "@/lib/catalog";
import { db } from "@/db";
import { products as productsTable } from "@/db/schema";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/settings/settings-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "الإعدادات" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin("manager");
  const sp = await searchParams;
  const settings = await getSettings();
  const ids = [settings.hero.mediaId, settings.hero.mobileMediaId].filter((x): x is string => !!x);
  const [refs, products, looks, categories, guideRows, fxTable] = await Promise.all([
    ids.length ? getMediaRefs(ids) : Promise.resolve([]),
    listProducts({ limit: 100 }),
    listLooks(50),
    listCategories(),
    db.select({ guide: productsTable.sizeGuide, parts: productsTable.setParts }).from(productsTable),
    getFxTable(),
  ]);
  const fxCodes = new Set([...CURRENCY_CATALOG.map((c) => c.code), settings.currency.code.toUpperCase()]);
  const fx = fxTable ? { rates: Object.fromEntries(Object.entries(fxTable.rates).filter(([k]) => fxCodes.has(k))), updatedAt: fxTable.updatedAt, source: fxTable.source } : null;
  const guideUsage: Record<string, number> = {};
  for (const r of guideRows) {
    const ids = new Set([r.guide, ...(r.parts ?? []).map((p) => p.guide)]);
    for (const id of ids) guideUsage[id] = (guideUsage[id] ?? 0) + 1;
  }
  // listProducts caps a page at 100 — fetch a second page for the section builder's picker (up to 200)
  const more = products.total > products.items.length ? (await listProducts({ limit: 100, offset: 100 })).items : [];
  const heroMedia = refs.find((m) => m.id === settings.hero.mediaId);
  const mobileHeroMedia = refs.find((m) => m.id === settings.hero.mobileMediaId) ?? null;
  const initial = {
    ...settings,
    hero: { ...settings.hero, mediaId: heroMedia ? settings.hero.mediaId : null, mobileMediaId: mobileHeroMedia ? settings.hero.mobileMediaId : null },
  };
  const productOptions = products.items.filter((p) => p.colors.length >= 2).map((p) => ({ slug: p.slug, name: p.name }));
  const lookOptions = looks.map((l) => ({ slug: l.slug, title: l.title }));
  const catalog = {
    products: [...products.items, ...more].map((p) => ({ id: p.id, name: p.name, imageId: p.images[0]?.id ?? null })),
    categories: categories.map((c) => ({ slug: c.slug, name: c.name })),
    looks: lookOptions,
  };

  return (
    <div>
      <PageHeader
        eyebrow="SETTINGS"
        title="الإعدادات"
        description="كل ما يخص هوية مرموق وتجربة العميل — يظهر التغيير في المتجر فور الحفظ."
        actions={
          <Link href="/" target="_blank" className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-taupe transition-colors hover:bg-bone hover:text-espresso">
            عرض المتجر
            <ArrowUpLeft className="size-4" aria-hidden />
          </Link>
        }
      />
      <SettingsForm
        initial={initial}
        heroMedia={heroMedia ?? null}
        mobileHeroMedia={mobileHeroMedia}
        productOptions={productOptions}
        lookOptions={lookOptions}
        catalog={catalog}
        guideUsage={guideUsage}
        fx={fx}
        initialTab={typeof sp.tab === "string" ? sp.tab : "identity"} />
    </div>
  );
}
