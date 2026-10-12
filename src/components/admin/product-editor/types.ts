/**
 * Shared shapes between the product editor (client) and its server actions / loaders.
 * No directive on purpose: importable from server and client code.
 */
import type { SetPart } from "@/lib/size-guides";

export type ProductStatus = "active" | "draft" | "archived";
/** id of a size guide from settings, or "none" */
export type SizeGuide = string;

export type EditorImage = { id: string; blur?: string; width?: number; height?: number; alt?: string; color: string };
export type EditorColor = { name: string; hex: string };

export type EditorVariant = {
  id: number | null;
  color: string;
  colorHex: string;
  /** "" = one size */
  size: string;
  sku: string;
  stock: number;
  priceOverride: number | null;
  isActive: boolean;
};

export type CategoryOption = { id: number; name: string; slot: string };

export type ProductEditorData = {
  id: number | null;
  name: string;
  subtitle: string;
  slug: string;
  categoryId: number | null;
  description: string;
  details: string[];
  material: string;
  origin: string;
  care: string;
  sizeGuide: SizeGuide;
  price: number;
  compareAtPrice: number | null;
  status: ProductStatus;
  isFeatured: boolean;
  isNew: boolean;
  badge: string;
  sortOrder: number;
  images: EditorImage[];
  colors: EditorColor[];
  sizes: string[];
  /** Set sold with a size per piece (shirt + trousers…); null = one size list */
  setParts: SetPart[] | null;
  /** Add-on products offered on this product's page (watch, shoes…) */
  addonIds: number[];
  variants: EditorVariant[];
  /** Variants that appear on past orders (cannot be hard-deleted) */
  orderedVariantIds: number[];
  /** Units sold across all orders (informational) */
  unitsSold: number;
  updatedAt: string | null;
};

export type ProductPayload = {
  id: number | null;
  intent: "save" | "draft";
  name: string;
  subtitle: string;
  slug: string;
  categoryId: number | null;
  description: string;
  details: string[];
  material: string;
  origin: string;
  care: string;
  sizeGuide: SizeGuide;
  price: number;
  compareAtPrice: number | null;
  status: ProductStatus;
  isFeatured: boolean;
  isNew: boolean;
  badge: string;
  sortOrder: number;
  images: { id: string; color: string }[];
  setParts: SetPart[] | null;
  addonIds: number[];
  variants: EditorVariant[];
};

/** A product that can be offered as an add-on (for the picker). */
export type AddonOption = { id: number; name: string; price: number; imageId: string | null; status: ProductStatus; isSet: boolean };
export const ADDON_LIMIT = 6;

export const PRODUCT_STATUS_META: Record<ProductStatus, { label: string; tone: "success" | "neutral" | "warning" }> = {
  active: { label: "منشور", tone: "success" },
  draft: { label: "مسودة", tone: "warning" },
  archived: { label: "مؤرشف", tone: "neutral" },
};


/** Brand palette (matches the seeded colours) for one-tap colour creation. */
export const BRAND_COLORS: EditorColor[] = [
  { name: "برغندي", hex: "#5C1A26" },
  { name: "أسود", hex: "#161414" },
  { name: "بني قهوة", hex: "#3B261E" },
  { name: "كحلي", hex: "#1D2638" },
  { name: "أبيض", hex: "#F5F2EA" },
  { name: "عاجي", hex: "#EAE3D2" },
  { name: "رملي", hex: "#C8A27A" },
  { name: "فحمي", hex: "#3A3B3F" },
  { name: "أحمر قرمزي", hex: "#9E1B22" },
  { name: "فضي رمادي", hex: "#8E8E93" },
  { name: "زيتي", hex: "#4B4A2F" },
  { name: "كونياك", hex: "#8A4B2A" },
];

export const SIZE_PRESETS: { label: string; sizes: string[] }[] = [
  { label: "M · L · XL · XXL", sizes: ["M", "L", "XL", "XXL"] },
  { label: "S – XXL", sizes: ["S", "M", "L", "XL", "XXL"] },
  { label: "30 – 38", sizes: ["30", "32", "34", "36", "38"] },
  { label: "40 – 45", sizes: ["40", "41", "42", "43", "44", "45"] },
  { label: "مقاس واحد", sizes: [""] },
];

/** jsonb that was double-encoded by raw SQL comes back as a string — accept both. */
export function normalizeDetails(raw: unknown): string[] {
  let v = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return v ? [v as string] : [];
    }
  }
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export const variantKey = (color: string, size: string) => `${color}\u0000${size}`;
