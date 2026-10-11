import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Breadcrumbs } from "@/components/admin/ui";
import { LookEditor } from "@/components/admin/look-editor/look-editor";
import { listPickerProducts } from "../_data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "إطلالة جديدة" };

export default async function NewLookPage() {
  await requireAdmin();
  const [products, settings] = await Promise.all([listPickerProducts(), getSettings()]);
  return (
    <>
      <Breadcrumbs items={[{ label: "الإطلالات", href: "/admin/looks" }, { label: "إطلالة جديدة" }]} />
      <LookEditor
        initial={{ id: null, title: "", subtitle: "", description: "", slug: "", discountPercent: 10, isActive: true, sortOrder: 0, cover: null, items: [] }}
        products={products}
        currencySymbol={settings.currency.symbol}
      />
    </>
  );
}
