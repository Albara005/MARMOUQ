/**
 * Atelier ("منسّق الإطلالة") — shared, framework-free model.
 * Safe to import from server components and client components alike (no hooks, no "use client").
 */
import type { MediaRef } from "@/lib/catalog";

export type SlotKey = "knit" | "shirt" | "tie" | "trousers" | "shoes";

export const SLOT_ORDER: SlotKey[] = ["knit", "shirt", "tie", "trousers", "shoes"];

export const SLOT_META: Record<SlotKey, { label: string; latin: string; choose: string; skipped: string }> = {
  knit: { label: "التريكو", latin: "Knitwear", choose: "اختر قطعة التريكو", skipped: "بدون تريكو" },
  shirt: { label: "القميص", latin: "Shirt", choose: "اختر القميص", skipped: "بدون قميص" },
  tie: { label: "الربطة", latin: "Silk Tie", choose: "اختر ربطة العنق", skipped: "بدون ربطة" },
  trousers: { label: "البنطال", latin: "Trousers", choose: "اختر البنطال", skipped: "بدون بنطال" },
  shoes: { label: "الحذاء", latin: "Shoes", choose: "اختر الحذاء", skipped: "بدون حذاء" },
};

export function isSlotKey(v: string): v is SlotKey {
  return (SLOT_ORDER as string[]).includes(v);
}

/** One selectable piece = a product in one colour. `key` is `${slug}~${color}` (URL-safe once encoded). */
export type AtelierOption = {
  key: string;
  productId: number;
  slug: string;
  name: string;
  subtitle: string;
  color: string;
  colorHex: string;
  price: number;
  compareAtPrice: number | null;
  image: MediaRef | null;
  inStock: boolean;
};

export type AtelierSlot = {
  key: SlotKey;
  label: string;
  categoryName: string;
  categorySlug: string;
  description: string;
  options: AtelierOption[];
};

/** slot → option key, or null when the shopper skipped the slot */
export type Selection = Record<SlotKey, string | null>;

export type LookMatch = { slug: string; title: string; discountPercent: number; keys: string[] };

export type Recipe = { id: string; name: string; line: string; colors: Partial<Record<SlotKey, string>> };

/** Curated, harmonious combinations for "ألهمني". Resolved by colour name, so they survive catalogue edits. */
export const RECIPES: Recipe[] = [
  {
    id: "burgundy",
    name: "البورغندي الملكي",
    line: "اويلي البورغندي — دفء النبيذ على صفاء العاجي.",
    colors: { knit: "برغندي", shirt: "أبيض", tie: "أحمر قرمزي", trousers: "عاجي", shoes: "رملي" },
  },
  {
    id: "noir",
    name: "الأسود الكلاسيكي",
    line: "أسود وفحمي… حضور هادئ لا يحتاج شرح.",
    colors: { knit: "أسود", shirt: "أبيض", tie: "فضي رمادي", trousers: "فحمي", shoes: "رملي" },
  },
  {
    id: "navy",
    name: "الكحلي الأنيق",
    line: "كحلي على عاجي — توازن رجل يعرف ما يريد.",
    colors: { knit: "كحلي", shirt: "أبيض", tie: "فضي رمادي", trousers: "عاجي", shoes: "رملي" },
  },
  {
    id: "mocha",
    name: "بنّي القهوة",
    line: "دافئة كفنجان الصباح، وراقية كمجلس المساء.",
    colors: { knit: "بني قهوة", shirt: "أبيض", tie: "أحمر قرمزي", trousers: "عاجي", shoes: "رملي" },
  },
  {
    id: "midnight",
    name: "منتصف الليل",
    line: "كحلي وفحمي بلمسة قرمزية — للمناسبات المسائية.",
    colors: { knit: "كحلي", shirt: "أبيض", tie: "أحمر قرمزي", trousers: "فحمي", shoes: "رملي" },
  },
];

export const optionKey = (slug: string, color: string) => `${slug}~${color}`;

/** Resolves a recipe against the available slots. Slots without any option stay null. */
export function resolveRecipe(recipe: Recipe, slots: AtelierSlot[]): Selection {
  const out = emptySelection();
  for (const slot of slots) {
    const wanted = recipe.colors[slot.key];
    const inStock = slot.options.filter((o) => o.inStock);
    const pool = inStock.length ? inStock : slot.options;
    const match = (wanted ? pool.find((o) => o.color === wanted) : undefined) ?? pool[0];
    out[slot.key] = match?.key ?? null;
  }
  return out;
}

export function emptySelection(): Selection {
  return { knit: null, shirt: null, tie: null, trousers: null, shoes: null };
}

/** Which recipe (if any) the selection is exactly. */
export function matchRecipe(sel: Selection, slots: AtelierSlot[]): Recipe | null {
  for (const r of RECIPES) {
    const resolved = resolveRecipe(r, slots);
    if (slots.every((s) => resolved[s.key] === sel[s.key])) return r;
  }
  return null;
}

/** An existing look that the composition reproduces exactly (same pieces, same colours). */
export function matchLook(sel: Selection, looks: LookMatch[]): LookMatch | null {
  const chosen = SLOT_ORDER.map((k) => sel[k]).filter((v): v is string => !!v);
  if (!chosen.length) return null;
  const set = new Set(chosen);
  return looks.find((l) => l.keys.length === set.size && l.keys.every((k) => set.has(k))) ?? null;
}

/** Parses `?knit=slug~colour&tie=none` style params. Unknown or missing slots fall back to `fallback`. */
export function parseSelection(
  params: Record<string, string | string[] | undefined>,
  slots: AtelierSlot[],
  fallback: Selection,
): { selection: Selection; fromUrl: boolean } {
  const out = { ...fallback };
  let fromUrl = false;
  for (const slot of slots) {
    const raw = params[slot.key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (!value) continue;
    fromUrl = true;
    if (value === "none") {
      out[slot.key] = null;
      continue;
    }
    const exact = slot.options.find((o) => o.key === value);
    const bySlug = exact ?? slot.options.find((o) => o.slug === value.split("~")[0]);
    if (bySlug) out[slot.key] = bySlug.key;
  }
  return { selection: out, fromUrl };
}

export function selectionToQuery(sel: Selection, slots: AtelierSlot[]): string {
  const q = new URLSearchParams();
  for (const slot of slots) q.set(slot.key, sel[slot.key] ?? "none");
  return q.toString();
}
