import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Breadcrumbs } from "@/components/admin/ui";
import { LookEditor } from "@/components/admin/look-editor/look-editor";
import { listPickerProducts, loadLook } from "../_data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "تعديل إطلالة" };

export default async function EditLookPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const lookId = Number.parseInt(id, 10);
  if (!Number.isFinite(lookId) || lookId <= 0) notFound();
  const [look, products, settings] = await Promise.all([loadLook(lookId), listPickerProducts(), getSettings()]);
  if (!look) notFound();
  return (
    <>
      <Breadcrumbs items={[{ label: "الإطلالات", href: "/admin/looks" }, { label: look.title }]} />
      <LookEditor initial={look} products={products} currencySymbol={settings.currency.symbol} />
    </>
  );
}
