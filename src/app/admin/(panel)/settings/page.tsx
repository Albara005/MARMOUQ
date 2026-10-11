import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getMediaRefs } from "@/lib/catalog";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/settings/settings-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "الإعدادات" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin("manager");
  const sp = await searchParams;
  const settings = await getSettings();
  const [heroMedia] = settings.hero.mediaId ? await getMediaRefs([settings.hero.mediaId]) : [];
  const initial = heroMedia ? settings : { ...settings, hero: { ...settings.hero, mediaId: null } };

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
      <SettingsForm initial={initial} heroMedia={heroMedia ?? null} initialTab={typeof sp.tab === "string" ? sp.tab : "identity"} />
    </div>
  );
}
