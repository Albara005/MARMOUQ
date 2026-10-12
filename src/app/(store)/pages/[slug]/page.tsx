import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EyeOff } from "lucide-react";
import { getSettings, type StoreSettings } from "@/lib/settings";
import { getSession } from "@/lib/auth";
import { pageSlug, type CustomPage } from "@/lib/blocks";
import { PageHeader } from "@/components/store/page-header";
import { BlocksRenderer } from "@/components/store/blocks/blocks-renderer";
import { ButtonLink } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

function findPage(settings: StoreSettings, raw: string): CustomPage | null {
  let slug = raw;
  try {
    slug = decodeURIComponent(raw);
  } catch {
    /* keep the raw value */
  }
  const wanted = [slug.toLowerCase(), pageSlug(slug)];
  return settings.customPages.find((p) => wanted.includes(p.slug)) ?? null;
}

/** Published pages for everyone; drafts only for a signed-in admin (preview). */
async function loadPage(raw: string): Promise<{ page: CustomPage; draft: boolean } | null> {
  const page = findPage(await getSettings(), raw);
  if (!page) return null;
  if (page.published) return { page, draft: false };
  return (await getSession()) ? { page, draft: true } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = await loadPage(slug);
  if (!found) return { title: "الصفحة غير موجودة" };
  const { page } = found;
  const path = `/pages/${encodeURIComponent(page.slug)}`;
  return {
    title: page.title,
    description: page.description || page.intro || undefined,
    alternates: { canonical: path },
    openGraph: { title: page.title, description: page.description || page.intro || undefined, url: path, type: "website", locale: "ar_YE" },
    ...(found.draft ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function CustomStorePage({ params }: Props) {
  const { slug } = await params;
  const found = await loadPage(slug);
  if (!found) notFound();
  const { page, draft } = found;
  const hasBlocks = page.blocks.some((b) => b.enabled);

  return (
    <>
      {draft && (
        <div className="border-b border-copper/25 bg-copper/10">
          <p className="container-luxe flex items-center gap-2 py-2.5 text-[0.82rem] text-copper-deep">
            <EyeOff className="size-4 shrink-0" aria-hidden />
            مسودة — هذه الصفحة غير ظاهرة للعملاء، تراها لأنك مسجّل دخول كمدير.
          </p>
        </div>
      )}

      {page.showHeader && (
        <PageHeader
          eyebrow={page.eyebrow || undefined}
          title={page.title}
          subtitle={page.intro || undefined}
          breadcrumbs={[{ label: "الرئيسية", href: "/" }, { label: page.title }]}
        />
      )}

      {hasBlocks ? (
        <BlocksRenderer blocks={page.blocks} />
      ) : (
        !page.showHeader && (
          <section className="container-luxe flex min-h-[50svh] flex-col items-center justify-center py-20 text-center">
            <p className="eyebrow">Coming soon</p>
            <h1 className="display mt-3 text-4xl text-espresso">{page.title}</h1>
            <p className="mt-3 max-w-md text-sm leading-7 text-umber">نجهّز هذه الصفحة الآن — تصفّح المجموعة إلى ذلك الحين.</p>
            <ButtonLink href="/shop" className="mt-8">
              تسوّق المجموعة
            </ButtonLink>
          </section>
        )
      )}
    </>
  );
}
