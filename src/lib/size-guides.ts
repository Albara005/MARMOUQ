/**
 * Size guides (editable from Settings → «دليل المقاسات») and two-piece sets
 * (e.g. shirt + trousers) where the customer picks a size for each piece.
 *
 * A set product stores its pieces in `products.set_parts`; each variant's size is the
 * pieces' sizes joined with SET_SEPARATOR ("L / 32"), so cart, stock and orders keep
 * working on plain variants.
 *
 * Plain module — safe in server and client components.
 */

export type SizeGuideDiagram = "tops" | "bottoms" | "shoes" | "none";

export type SizeGuideDef = {
  /** referenced by products.size_guide */
  id: string;
  name: string;
  diagram: SizeGuideDiagram;
  /** first column is the size itself */
  headers: string[];
  /** per column: true when the values are centimetres (offers a cm ⇄ inch toggle) */
  cm: boolean[];
  /** each row: [size, value, value…] — same length as headers */
  rows: string[][];
  note: string;
  tips: { title: string; body: string }[];
};

export const SIZE_GUIDE_DIAGRAMS: { value: SizeGuideDiagram; label: string }[] = [
  { value: "tops", label: "رسم قطعة علوية" },
  { value: "bottoms", label: "رسم بنطال" },
  { value: "shoes", label: "رسم قدم" },
  { value: "none", label: "بدون رسم" },
];

export const DEFAULT_SIZE_GUIDES: SizeGuideDef[] = [
  {
    id: "tops",
    name: "قطع علوية (تريكو، قمصان)",
    diagram: "tops",
    headers: ["المقاس", "محيط الصدر", "الطول", "عرض الأكتاف"],
    cm: [false, true, true, true],
    rows: [
      ["M", "104", "69", "45"],
      ["L", "110", "71", "47"],
      ["XL", "116", "73", "49"],
      ["XXL", "122", "75", "51"],
    ],
    note: "القياسات للقطعة نفسها وهي مفرودة، بفارق ±1 سم.",
    tips: [
      { title: "محيط الصدر", body: "لفّ المتر تحت الإبطين على أعرض نقطة في الصدر، وخلّه مرتاح لا مشدود ولا مرخي." },
      { title: "تلبسه فوق قميص؟", body: "التريكو الإيطالي قصّته مضبوطة على الجسم. إذا كنت بين مقاسين وبتلبسه فوق قميص رسمي، اختر الأكبر." },
      { title: "قارن بقطعة تحبها", body: "افرد أفضل سويتر عندك وقِس عرضه من إبط لإبط واضربه في 2 — هذا أدق رقم تقارن به." },
    ],
  },
  {
    id: "bottoms",
    name: "بناطيل",
    diagram: "bottoms",
    headers: ["المقاس", "محيط الخصر", "الطول الداخلي", "الطول الكلي"],
    cm: [false, true, true, true],
    rows: [
      ["30", "76", "76", "100"],
      ["32", "81", "77", "101"],
      ["34", "86", "78", "102"],
      ["36", "91", "79", "103"],
      ["38", "97", "80", "104"],
    ],
    note: "القصّة الكورية بخصر عالٍ وساق مستدقّة تنتهي فوق الكاحل بقليل.",
    tips: [
      { title: "محيط الخصر", body: "قِس عند خط الخصر الطبيعي فوق السرّة بقليل، حيث يجلس البنطال الكوري العالي." },
      { title: "الطول الداخلي", body: "من أعلى الفخذ الداخلي حتى الكاحل. القصّة تنتهي فوقه بقليل لتُظهر الحذاء بأناقة." },
      { title: "بين مقاسين؟", body: "اختر مقاسك المعتاد — الكسرات الأمامية تعطي راحة كافية في الجلوس والحركة." },
    ],
  },
  {
    id: "shoes",
    name: "أحذية",
    diagram: "shoes",
    headers: ["EU", "UK", "طول القدم"],
    cm: [false, false, true],
    rows: [
      ["40", "6.5", "25.5"],
      ["41", "7", "26"],
      ["42", "8", "26.7"],
      ["43", "9", "27.3"],
      ["44", "9.5", "28"],
      ["45", "10.5", "28.6"],
    ],
    note: "طول القدم من الكعب حتى أطول إصبع، والقدم على الأرض.",
    tips: [
      { title: "قِس آخر النهار", body: "القدم تتمدد خلال اليوم، فالقياس مساءً أصدق. قِس القدمين واعتمد الأطول." },
      { title: "الشامواه يلين", body: "الجلد الطبيعي يتشكّل على قدمك بعد أيام. اللوفر يُلبس مريحاً من غير ارتخاء عند الكعب." },
      { title: "بين مقاسين؟", body: "مع جوارب رقيقة اختر الأصغر، ومع جوارب سميكة أو قدم عريضة اختر الأكبر." },
    ],
  },
];

export const BUILTIN_GUIDE_IDS = new Set(DEFAULT_SIZE_GUIDES.map((g) => g.id));

export const SIZE_GUIDE_LIMITS = { guides: 12, columns: 8, rows: 30, tips: 6 } as const;

export function findGuide(guides: SizeGuideDef[], id: string | null | undefined): SizeGuideDef | null {
  if (!id || id === "none") return null;
  return guides.find((g) => g.id === id) ?? null;
}

export function newGuideId(): string {
  const c = globalThis.crypto;
  const r = c?.randomUUID ? c.randomUUID().replace(/-/g, "").slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `g-${r}`;
}

/* ───────────── Two-piece sets ───────────── */

/** One piece of a set: its name, size guide and sizes, e.g. { label: "القميص", guide: "tops", sizes: ["M","L"] }. */
export type SetPart = { label: string; guide: string; sizes: string[] };

export const SET_SEPARATOR = " / ";
export const SET_LIMITS = { parts: 3, sizesPerPart: 12 } as const;

export const DEFAULT_SET_PARTS: SetPart[] = [
  { label: "القميص", guide: "tops", sizes: ["M", "L", "XL", "XXL"] },
  { label: "البنطلون", guide: "bottoms", sizes: ["30", "32", "34", "36", "38"] },
];

/** True when the product is sold as a set with a size per piece. */
export function isSetProduct(parts: SetPart[] | null | undefined): parts is SetPart[] {
  return Array.isArray(parts) && parts.length >= 2;
}

/** Variant size for a choice of piece sizes: ["L", "32"] → "L / 32". */
export function setSizeKey(values: string[]): string {
  return values.join(SET_SEPARATOR);
}

/** "L / 32" → ["L", "32"] (padded with "" to the number of pieces). */
export function splitSetSize(size: string, pieces: number): string[] {
  const parts = size.split(SET_SEPARATOR);
  return Array.from({ length: pieces }, (_, i) => parts[i] ?? "");
}

/** Every size combination of a set, in piece order (the variant grid). */
export function setCombos(parts: SetPart[]): string[] {
  let acc: string[][] = [[]];
  for (const p of parts) {
    const sizes = p.sizes.length ? p.sizes : [""];
    acc = acc.flatMap((prefix) => sizes.map((s) => [...prefix, s]));
  }
  return acc.map(setSizeKey);
}

/** Human label for a set variant: "القميص L · البنطلون 32" (plain size when not a set). */
export function formatSetSize(parts: SetPart[] | null | undefined, size: string): string {
  if (!isSetProduct(parts) || !size.includes(SET_SEPARATOR.trim())) return size;
  const values = splitSetSize(size, parts.length);
  return parts.map((p, i) => `${p.label} ${values[i]}`.trim()).join(" · ");
}
