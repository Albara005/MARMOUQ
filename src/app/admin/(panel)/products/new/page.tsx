import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Breadcrumbs } from "@/components/admin/ui";
import { ProductEditor } from "@/components/admin/product-editor/product-editor";
import { emptyProduct, listAddonOptions, listCategoryOptions } from "../_lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "منتج جديد" };

export default async function NewProductPage() {
  await requireAdmin();
  const [categories, settings, addonOptions] = await Promise.all([listCategoryOptions(), getSettings(), listAddonOptions()]);
  return (
    <>
      <Breadcrumbs items={[{ label: "المنتجات", href: "/admin/products" }, { label: "منتج جديد" }]} />
      <ProductEditor initial={emptyProduct()} categories={categories} currencySymbol={settings.currency.symbol} sizeGuides={settings.sizeGuides.map((g) => ({ id: g.id, name: g.name }))} addonOptions={addonOptions} />
    </>
  );
}
