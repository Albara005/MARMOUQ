import type { Metadata } from "next";
import { copyOf, getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/store/page-header";
import { TrackForm } from "@/components/store/checkout/track-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تتبّع طلبك",
  description: "تابع حالة طلبك من مرموق برقم الطلب ورقم الجوال.",
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<{ number?: string | string[] }> };

export default async function TrackPage({ searchParams }: Props) {
  const c = copyOf(await getSettings());
  const sp = await searchParams;
  const raw = typeof sp.number === "string" ? sp.number : "";
  const number = raw.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24);

  return (
    <>
      <PageHeader
        eyebrow="TRACK YOUR ORDER"
        title={c["track.title"]}
        subtitle={c["track.subtitle"]}
        breadcrumbs={[{ label: "الرئيسية", href: "/" }, { label: "تتبّع الطلب" }]}
      />
      <div className="container-luxe pb-20 pt-10 md:pb-28 md:pt-14">
        <TrackForm defaultNumber={number} />
      </div>
    </>
  );
}
