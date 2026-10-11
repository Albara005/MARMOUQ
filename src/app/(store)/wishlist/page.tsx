import type { Metadata } from "next";
import { listProducts } from "@/lib/catalog";
import { PageHeader } from "@/components/store/page-header";
import { WishlistView } from "@/components/store/catalog/wishlist-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "قائمتي المفضلة",
  robots: { index: false, follow: true },
};

export default async function WishlistPage() {
  let picks: Awaited<ReturnType<typeof listProducts>>["items"] = [];
  try {
    picks = (await listProducts({ featured: true, limit: 4 })).items;
    if (picks.length < 4) picks = (await listProducts({ limit: 4 })).items;
  } catch (err) {
    console.error("[wishlist] picks unavailable", err);
  }
  return (
    <>
      <PageHeader
        eyebrow="Wishlist"
        title="قائمتي المفضلة"
        subtitle="القطع اللي لفتت نظرك، محفوظة هنا لين تقرر. القائمة محفوظة على هذا الجهاز."
        breadcrumbs={[{ label: "الرئيسية", href: "/" }, { label: "المفضلة" }]}
      />
      <WishlistView picks={picks} />
    </>
  );
}
