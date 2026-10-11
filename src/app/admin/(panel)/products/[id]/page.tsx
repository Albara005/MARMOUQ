import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Breadcrumbs } from "@/components/admin/ui";
import { ProductEditor } from "@/components/admin/product-editor/product-editor";
import { listCategoryOptions, loadProductForEditor } from "../_lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "تعديل منتج" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const productId = Number.parseInt(id, 10);
  if (!Number.isFinite(productId) || productId <= 0) notFound();
  const [product, categories, settings] = await Promise.all([loadProductForEditor(productId), listCategoryOptions(), getSettings()]);
  if (!product) notFound();
  return (
    <>
      <Breadcrumbs items={[{ label: "المنتجات", href: "/admin/products" }, { label: product.name }]} />
      <ProductEditor key={product.updatedAt ?? product.id ?? "p"} initial={product} categories={categories} currencySymbol={settings.currency.symbol} />
    </>
  );
}
