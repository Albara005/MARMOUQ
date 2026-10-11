#!/usr/bin/env node
/**
 * MARMOUQ — catalogue seed.
 *
 *   node scripts/seed.mjs            → seeds only when the catalogue is empty
 *   node scripts/seed.mjs --force    → wipes catalogue, orders, customers & media, then reseeds (admins & settings are kept)
 *   node scripts/seed.mjs --demo     → also creates ~45 realistic demo orders (or SEED_DEMO_ORDERS=1)
 *
 * Photos are read from seed/images/<name>.jpg. Optional extra angles named <name>-2.jpg, <name>-3.jpg …
 * are picked up automatically and appended to the same colour's gallery.
 */
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomBytes } from "node:crypto";
import { insertImage } from "./lib/image.mjs";
import { connect } from "./lib/db.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMAGES_DIR = path.join(ROOT, "seed", "images");
const EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

/* ═══════════════════════════ Catalogue data ═══════════════════════════ */

const CATEGORIES = [
  {
    slug: "knitwear",
    name: "التريكو",
    nameEn: "Knitwear",
    slot: "knit",
    cover: "collection-flatlay",
    description: "تريكو قطني إيطالي بضفائر كلاسيكية وسحّاب نصفي — القطعة التي يبدأ منها كل طقم مرموق.",
  },
  {
    slug: "shirts",
    name: "القمصان",
    nameEn: "Shirts",
    slot: "shirt",
    cover: "shirt-white-studio",
    description: "قمصان بياقات إيطالية حادّة تقف بثبات تحت التريكو وتحت الجاكيت.",
  },
  {
    slug: "accessories",
    name: "ربطات العنق",
    nameEn: "Ties",
    slot: "tie",
    cover: "tie-red-studio",
    description: "حرير بنقشات بيزلي مختارة — التفصيلة الصغيرة التي تصنع الفرق الكبير.",
  },
  {
    slug: "trousers",
    name: "البناطيل",
    nameEn: "Trousers",
    slot: "trousers",
    cover: "trousers-ivory-studio",
    description: "البنطال الكوري بالقالب والقصّة الصحيحة، وبناطيل رسمية بخط كيّ لا يتنازل.",
  },
  {
    slug: "shoes",
    name: "الأحذية",
    nameEn: "Shoes",
    slot: "shoes",
    cover: "loafers-sand-studio",
    description: "أحذية إيطالية من الشامواه الطبيعي تكمل الطقم بخطوة واثقة.",
  },
];

const SWEATER_COLORS = [
  { color: "برغندي", hex: "#5C1A26", code: "BUR" },
  { color: "أسود", hex: "#161414", code: "BLK" },
  { color: "بني قهوة", hex: "#3B261E", code: "BRN" },
  { color: "كحلي", hex: "#1D2638", code: "NVY" },
];

// Stock per sweater colour × size (M, L, XL, XXL). Black XXL & navy XXL run low, brown XL is sold out.
const SWEATER_STOCK = {
  BUR: [12, 18, 14, 5],
  BLK: [9, 15, 11, 2],
  BRN: [8, 12, 0, 6],
  NVY: [10, 14, 12, 3],
};

const PRODUCTS = [
  {
    slug: "half-zip-cable-knit-sweater",
    category: "knitwear",
    code: "KNT",
    name: "سويتر تريكو بسحّاب نصفي",
    subtitle: "قطن إيطالي 100% · ضفائر كلاسيكية",
    description:
      "القطعة التي صنعت اسم مرموق. تريكو قطني بضفائر كلاسيكية منسوجة بكثافة تمنحه قواماً فاخراً يحافظ على شكله غسلة بعد غسلة، وياقة مرتفعة بسحّاب نصفي تفتحها فوق قميص أبيض وربطة عنق، أو تغلقها لإطلالة أهدأ.\n\nدفء الشتاء بلا ثقل، وأناقة تصلح للدوام والمجلس والسهرة. اختر لونك — وش يمنعك تلبس كذا؟",
    details: [
      "ضفائر كلاسيكية منسوجة بكثافة عالية تحافظ على شكلها",
      "سحّاب نصفي معدني بسحّابة جلدية بلون الكونياك",
      "ياقة مرتفعة تقف بثبات فوق ياقة القميص",
      "أساور وحافة سفلية مضلّعة تحتضن المعصم والخصر",
      "قصّة منتظمة مريحة — اطلب مقاسك المعتاد",
      "يُلبس فوق قميص وربطة، أو وحده فوق تيشيرت أبيض",
    ],
    material: "قطن 100% بغزل ممشّط",
    origin: "صُنع في إيطاليا",
    care: "غسيل يدوي بماء بارد أو دورة الصوف حتى 30°. يُجفّف مفروداً على سطح مستوٍ بعيداً عن الشمس، ويُكوى بخفّة من الداخل.",
    price: 25000,
    compareAtPrice: 29000,
    badge: "الأكثر طلباً",
    isFeatured: true,
    isNew: true,
    sizeGuide: "tops",
    sortOrder: 1,
    variants: SWEATER_COLORS.flatMap((c) =>
      ["M", "L", "XL", "XXL"].map((size, i) => ({ color: c.color, hex: c.hex, size, stock: SWEATER_STOCK[c.code][i], sku: `MRQ-KNT-${c.code}-${size}` })),
    ),
    images: [
      { file: "sweater-burgundy-studio", color: "برغندي", alt: "سويتر تريكو برغندي بسحّاب نصفي فوق قميص أبيض وربطة قرمزية" },
      { file: "sweater-burgundy-detail", color: "برغندي", alt: "تفاصيل الضفائر والسحّاب النصفي في السويتر البرغندي" },
      { file: "sweater-black-studio", color: "أسود", alt: "سويتر تريكو أسود بسحّاب نصفي مع قميص أبيض" },
      { file: "sweater-brown-studio", color: "بني قهوة", alt: "سويتر تريكو بني قهوة بسحّاب نصفي مع ربطة بيزلي فضية" },
      { file: "sweater-navy-studio", color: "كحلي", alt: "سويتر تريكو كحلي بسحّاب نصفي مع ربطة حمراء" },
    ],
  },
  {
    slug: "classic-white-dress-shirt",
    category: "shirts",
    code: "SHR",
    name: "قميص أبيض كلاسيكي",
    subtitle: "بوبلين قطني · ياقة إيطالية حادّة",
    description:
      "أساس كل طقم مرموق. قميص أبيض ناصع من البوبلين القطني بياقة إيطالية مشدودة صُمّمت لتقف بثبات تحت التريكو وتحت الجاكيت، وقصّة مضبوطة تنسدل بنظافة دون انتفاخ عند الخصر.\n\nالبسه وحده بأزرار مفتوحة في عطلة نهاية الأسبوع، أو مع ربطة بيزلي في مناسبتك القادمة.",
    details: [
      "ياقة إيطالية مدعّمة تحافظ على حدّتها طوال اليوم",
      "قماش بوبلين ناعم يتنفّس ولا يلتصق",
      "أساور بزرّين قابلة للضبط",
      "قصّة مضبوطة تنسدل بنظافة تحت السويتر",
      "أزرار بلون عاجي بلمسة صدفية",
    ],
    material: "قطن بوبلين 100%",
    origin: "تركيا",
    care: "غسيل آلي حتى 40° مع الألوان الفاتحة. يُكوى والقماش رطب قليلاً للحصول على ياقة مثالية.",
    price: 12000,
    compareAtPrice: null,
    badge: "قطعة أساسية",
    isFeatured: false,
    isNew: false,
    sizeGuide: "tops",
    sortOrder: 2,
    variants: [
      { color: "أبيض", hex: "#F5F2EA", size: "M", stock: 14, sku: "MRQ-SHR-WHT-M" },
      { color: "أبيض", hex: "#F5F2EA", size: "L", stock: 20, sku: "MRQ-SHR-WHT-L" },
      { color: "أبيض", hex: "#F5F2EA", size: "XL", stock: 16, sku: "MRQ-SHR-WHT-XL" },
      { color: "أبيض", hex: "#F5F2EA", size: "XXL", stock: 7, sku: "MRQ-SHR-WHT-XXL" },
    ],
    images: [{ file: "shirt-white-studio", color: "أبيض", alt: "قميص أبيض كلاسيكي بياقة إيطالية حادّة" }],
  },
  {
    slug: "paisley-silk-tie",
    category: "accessories",
    code: "TIE",
    name: "ربطة عنق حرير بنقشة بيزلي",
    subtitle: "حرير منسوج · نقشة بيزلي كلاسيكية",
    description:
      "التفصيلة التي تلفت النظر دون أن ترفع صوتها. ربطة حرير منسوجة بنقشة بيزلي محفورة تلتقط الضوء مع كل حركة، ببطانة داخلية تمنح عقدة ممتلئة ومتوازنة.\n\nالقرمزي يشعل التريكو الداكن، والفضي يهدّئ الألوان الدافئة — والاثنتان تكمّلان القميص الأبيض بلا مجهود.",
    details: [
      "حرير منسوج بنقشة بيزلي محفورة",
      "عرض 7.5 سم يناسب الياقات الكلاسيكية",
      "بطانة داخلية لعقدة ممتلئة ومتوازنة",
      "حلقة خلفية لتثبيت الطرف الرفيع",
      "تصل مغلّفة بعناية — هدية جاهزة",
    ],
    material: "حرير منسوج",
    origin: "إيطاليا",
    care: "تنظيف جاف فقط. تُفك العقدة بعد كل استخدام وتُعلّق أو تُلفّ بلطف لتستعيد شكلها.",
    price: 6000,
    compareAtPrice: null,
    badge: "",
    isFeatured: false,
    isNew: true,
    sizeGuide: "none",
    sortOrder: 3,
    variants: [
      { color: "أحمر قرمزي", hex: "#9E1B22", size: "", stock: 24, sku: "MRQ-TIE-RED" },
      { color: "فضي رمادي", hex: "#8E8E93", size: "", stock: 15, sku: "MRQ-TIE-SLV" },
    ],
    images: [
      { file: "tie-red-studio", color: "أحمر قرمزي", alt: "ربطة عنق حرير قرمزية بنقشة بيزلي مع قميص أبيض" },
      { file: "tie-silver-studio", color: "فضي رمادي", alt: "ربطة عنق حرير فضية رمادية بنقشة بيزلي" },
    ],
  },
  {
    slug: "korean-pleated-trousers-ivory",
    category: "trousers",
    code: "KPT",
    name: "بنطال كوري بكسرات — عاجي",
    subtitle: "القالب والقصّة الصحيحة",
    description:
      "البنطال الكوري كما يجب أن يكون: كسرة أمامية مزدوجة تمنح الحركة انسيابية، وخصر مرتفع قليلاً يضبط تناسق الطقم مع التريكو، وساق واسعة تضيق بلطف عند الكاحل.\n\nاللون العاجي يرفع أي لون داكن فوقه — جرّبه مع البرغندي وشوف الفرق.",
    details: [
      "كسرة أمامية مزدوجة لحركة مريحة وسقوط انسيابي",
      "خصر مرتفع قليلاً يوازن الطقم مع التريكو",
      "ساق واسعة تضيق بلطف عند الكاحل",
      "خط كيّ أمامي ثابت",
      "جيوب جانبية مائلة وجيبان خلفيان بأزرار",
    ],
    material: "مزيج فسكوز وبوليستر بملمس صوفي ناعم",
    origin: "تركيا",
    care: "غسيل آلي لطيف حتى 30° أو تنظيف جاف. يُكوى على حرارة متوسطة مع قطعة قماش فوقه.",
    price: 16000,
    compareAtPrice: null,
    badge: "جديد",
    isFeatured: true,
    isNew: true,
    sizeGuide: "bottoms",
    sortOrder: 4,
    variants: [
      { color: "عاجي", hex: "#EAE3D2", size: "30", stock: 6, sku: "MRQ-KPT-IVR-30" },
      { color: "عاجي", hex: "#EAE3D2", size: "32", stock: 13, sku: "MRQ-KPT-IVR-32" },
      { color: "عاجي", hex: "#EAE3D2", size: "34", stock: 15, sku: "MRQ-KPT-IVR-34" },
      { color: "عاجي", hex: "#EAE3D2", size: "36", stock: 9, sku: "MRQ-KPT-IVR-36" },
      { color: "عاجي", hex: "#EAE3D2", size: "38", stock: 2, sku: "MRQ-KPT-IVR-38" },
    ],
    images: [{ file: "trousers-ivory-studio", color: "عاجي", alt: "بنطال كوري عاجي بكسرات أمامية وخط كيّ" }],
  },
  {
    slug: "tailored-trousers-charcoal",
    category: "trousers",
    code: "TLT",
    name: "بنطال رسمي — فحمي",
    subtitle: "قصّة مستقيمة · ملمس صوفي",
    description:
      "بنطال رسمي بقصّة مستقيمة نظيفة ولون فحمي عميق يتماشى مع كل لون في خزانتك. خامة بملمس صوفي تحافظ على خط الكيّ، وخصر مريح يناسب يومك من الصباح حتى آخر الليل.\n\nشريكه المثالي: التريكو الأسود أو الكحلي وقميص أبيض.",
    details: [
      "قصّة مستقيمة بخط كيّ أمامي",
      "لون فحمي عميق يناسب الرسمي واليومي",
      "خصر بتصميم مريح وحلقات حزام",
      "جيوب جانبية وجيبان خلفيان بأزرار",
      "حاشية قابلة للتقصير عند الخيّاط",
    ],
    material: "مزيج بوليستر وفسكوز بملمس صوفي",
    origin: "تركيا",
    care: "غسيل آلي لطيف حتى 30° أو تنظيف جاف. يُعلّق من الحاشية للحفاظ على خط الكيّ.",
    price: 15000,
    compareAtPrice: null,
    badge: "",
    isFeatured: false,
    isNew: false,
    sizeGuide: "bottoms",
    sortOrder: 5,
    variants: [
      { color: "فحمي", hex: "#3A3B3F", size: "30", stock: 7, sku: "MRQ-TLT-CHR-30" },
      { color: "فحمي", hex: "#3A3B3F", size: "32", stock: 12, sku: "MRQ-TLT-CHR-32" },
      { color: "فحمي", hex: "#3A3B3F", size: "34", stock: 14, sku: "MRQ-TLT-CHR-34" },
      { color: "فحمي", hex: "#3A3B3F", size: "36", stock: 10, sku: "MRQ-TLT-CHR-36" },
      { color: "فحمي", hex: "#3A3B3F", size: "38", stock: 5, sku: "MRQ-TLT-CHR-38" },
    ],
    images: [{ file: "trousers-charcoal-studio", color: "فحمي", alt: "بنطال رسمي فحمي بقصّة مستقيمة" }],
  },
  {
    slug: "italian-suede-tassel-loafers",
    category: "shoes",
    code: "LOF",
    name: "حذاء لوفر إيطالي من الشامواه",
    subtitle: "شامواه طبيعي · شرّابة كلاسيكية",
    description:
      "شوز إيطالي بلمسة لا تخطئها العين. لوفر من الشامواه الطبيعي بلون رملي دافئ وشرّابة كلاسيكية، بخياطة يدوية حول المقدّمة ونعل مرن يريح خطوتك طوال اليوم.\n\nيكسر رسمية البنطال الفحمي، ويكمل البنطال العاجي كأنه صُنع له.",
    details: [
      "شامواه طبيعي ناعم بلون رملي دافئ",
      "شرّابة كلاسيكية وخياطة يدوية حول المقدّمة",
      "بطانة جلدية تسمح للقدم بالتنفّس",
      "نعل مرن خفيف مع كعب منخفض",
      "يُلبس بدون جوارب أو مع جوارب قصيرة مخفية",
    ],
    material: "جلد شامواه طبيعي · بطانة جلدية",
    origin: "صُنع في إيطاليا",
    care: "يُنظّف بفرشاة الشامواه باتجاه واحد، ويُرشّ بواقي الماء قبل أول استخدام. يُحفظ مع شدّاد خشبي.",
    price: 32000,
    compareAtPrice: 36000,
    badge: "شوز إيطالي",
    isFeatured: true,
    isNew: false,
    sizeGuide: "shoes",
    sortOrder: 6,
    variants: [
      { color: "رملي", hex: "#C8A27A", size: "40", stock: 6, sku: "MRQ-LOF-SND-40" },
      { color: "رملي", hex: "#C8A27A", size: "41", stock: 10, sku: "MRQ-LOF-SND-41" },
      { color: "رملي", hex: "#C8A27A", size: "42", stock: 14, sku: "MRQ-LOF-SND-42" },
      { color: "رملي", hex: "#C8A27A", size: "43", stock: 12, sku: "MRQ-LOF-SND-43" },
      { color: "رملي", hex: "#C8A27A", size: "44", stock: 8, sku: "MRQ-LOF-SND-44" },
      { color: "رملي", hex: "#C8A27A", size: "45", stock: 2, sku: "MRQ-LOF-SND-45" },
    ],
    images: [{ file: "loafers-sand-studio", color: "رملي", alt: "حذاء لوفر إيطالي من الشامواه الرملي بشرّابة" }],
  },
];

const LOOKS = [
  {
    slug: "burgundy-edit",
    title: "إطلالة البورغندي",
    subtitle: "Burgundy Edit · اويلي البورغندي",
    description:
      "لون يحكي عن ثقتك قبل أن تتكلم. سويتر تريكو برغندي بسحّاب نصفي فوق قميص أبيض وربطة بيزلي قرمزية، يوازنه بنطال كوري عاجي ولوفر شامواه رملي. طقم مدروس من الياقة حتى الحذاء — اطلبه كاملاً ووفّر 10%.",
    cover: "look-burgundy-cover",
    discountPercent: 10,
    sortOrder: 1,
    items: [
      { product: "half-zip-cable-knit-sweater", color: "برغندي", x: 34, y: 42 },
      { product: "classic-white-dress-shirt", color: "أبيض", x: 58, y: 17 },
      { product: "paisley-silk-tie", color: "أحمر قرمزي", x: 50, y: 29 },
      { product: "korean-pleated-trousers-ivory", color: "عاجي", x: 44, y: 70 },
      { product: "italian-suede-tassel-loafers", color: "رملي", x: 58, y: 92 },
    ],
  },
  {
    slug: "noir-classic",
    title: "الكلاسيكية السوداء",
    subtitle: "Noir Classic · حضور هادئ لا يُنسى",
    description:
      "حين تريد حضوراً هادئاً لا يُنسى. تريكو أسود فوق قميص أبيض وربطة بيزلي فضية، مع بنطال فحمي بقصّة مستقيمة ولوفر شامواه يكسر حدّة الأسود بدفء. اطلب الطقم كاملاً ووفّر 8%.",
    cover: "look-black-cover",
    discountPercent: 8,
    sortOrder: 2,
    items: [
      { product: "half-zip-cable-knit-sweater", color: "أسود", x: 64, y: 41 },
      { product: "classic-white-dress-shirt", color: "أبيض", x: 42, y: 16 },
      { product: "paisley-silk-tie", color: "فضي رمادي", x: 50, y: 28 },
      { product: "tailored-trousers-charcoal", color: "فحمي", x: 55, y: 69 },
      { product: "italian-suede-tassel-loafers", color: "رملي", x: 42, y: 92 },
    ],
  },
];

const SHIPPING_ZONES = [
  ["صنعاء", 1500, "1–2 يوم"],
  ["عدن", 3000, "2–3 أيام"],
  ["تعز", 2500, "2–3 أيام"],
  ["إب", 2000, "1–2 يوم"],
  ["الحديدة", 2500, "2–3 أيام"],
  ["حضرموت (المكلا)", 4500, "3–5 أيام"],
  ["ذمار", 2000, "1–2 يوم"],
  ["مأرب", 3500, "2–4 أيام"],
  ["عمران", 2000, "1–2 يوم"],
  ["حجة", 3000, "2–3 أيام"],
  ["البيضاء", 3000, "2–3 أيام"],
  ["المحويت", 2500, "2–3 أيام"],
  ["صعدة", 3500, "2–4 أيام"],
  ["لحج", 3000, "2–4 أيام"],
  ["أبين", 3500, "3–4 أيام"],
  ["شبوة", 4000, "3–5 أيام"],
  ["المهرة", 5500, "4–6 أيام"],
  ["الضالع", 3000, "2–3 أيام"],
  ["ريمة", 3500, "3–4 أيام"],
  ["الجوف", 4500, "3–5 أيام"],
  ["سقطرى", 6000, "5–8 أيام"],
];

const COUPONS = [
  { code: "WELCOME10", type: "percent", value: 10, minSubtotal: 0 },
  { code: "MARMOUQ5000", type: "fixed", value: 5000, minSubtotal: 50000 },
];

/* ═══════════════════════════ Helpers ═══════════════════════════ */

// Timestamps are sent as ISO strings: drizzle() replaces postgres-js' Date serializer on a shared client.
const iso = (d) => new Date(d).toISOString();

function findPhoto(base) {
  for (const ext of EXTENSIONS) {
    const p = path.join(IMAGES_DIR, base + ext);
    if (existsSync(p)) return p;
  }
  return null;
}

/** The main photo plus any optional extra angles (<base>-2 … <base>-9). */
function photoSet(base) {
  const out = [];
  const main = findPhoto(base);
  if (main) out.push(main);
  for (let i = 2; i <= 9; i++) {
    const extra = findPhoto(`${base}-${i}`);
    if (extra) out.push(extra);
  }
  return out;
}

function makeImageStore(tx, log) {
  let count = 0;
  return {
    get count() {
      return count;
    },
    /** Inserts the main photo (or null when missing). */
    async one(base, alt) {
      const p = findPhoto(base);
      if (!p) {
        log(`  ! seed/images/${base}.jpg not found — skipped`);
        return null;
      }
      count++;
      return insertImage(tx, await readFile(p), alt);
    },
    /** Inserts the main photo and every optional extra angle. */
    async all(base, alt) {
      const files = photoSet(base);
      if (!files.length) log(`  ! seed/images/${base}.jpg not found — skipped`);
      const ids = [];
      for (const f of files) {
        count++;
        ids.push(await insertImage(tx, await readFile(f), alt));
      }
      return ids;
    },
  };
}

async function wipe(tx, log) {
  log("  wiping catalogue, orders, customers and media (admins & settings kept)…");
  await tx`
    truncate table order_events, order_items, orders, customers,
      look_items, looks, product_images, product_variants, products, categories,
      shipping_zones, coupons, media
    restart identity cascade
  `;
}

async function setHeroImage(tx, heroId) {
  const patch = JSON.stringify({ hero: { mediaId: heroId } });
  await tx`
    insert into settings (key, value, updated_at)
    values ('store', ${patch}::jsonb, now())
    on conflict (key) do update set
      value = coalesce(settings.value, '{}'::jsonb)
        || jsonb_build_object('hero', coalesce(settings.value->'hero', '{}'::jsonb) || jsonb_build_object('mediaId', ${heroId}::text)),
      updated_at = now()
  `;
}

/* ═══════════════════════════ Catalogue seed ═══════════════════════════ */

async function seedCatalogue(tx, log) {
  const images = makeImageStore(tx, log);

  // Hero / settings
  log("  hero & settings…");
  const heroId = await images.one("hero-atelier", "مرموق — تريكو قطني إيطالي فوق قميص أبيض وربطة بيزلي");
  if (heroId) await setHeroImage(tx, heroId);

  // Categories
  log("  categories…");
  const categoryIds = {};
  for (const [i, c] of CATEGORIES.entries()) {
    const imageId = await images.one(c.cover, `${c.name} — مرموق`);
    const [row] = await tx`
      insert into categories (slug, name, name_en, description, image_id, slot, sort_order, is_active)
      values (${c.slug}, ${c.name}, ${c.nameEn}, ${c.description}, ${imageId}, ${c.slot}, ${i + 1}, true)
      returning id
    `;
    categoryIds[c.slug] = row.id;
  }

  // Products
  log("  products, variants & photos…");
  const productIds = {};
  const now = Date.now();
  for (const p of PRODUCTS) {
    // Stagger creation dates so "newest" sorting is meaningful.
    const createdAt = new Date(now - (PRODUCTS.length - p.sortOrder + (p.isNew ? 0 : 20)) * 86400000);
    const [row] = await tx`
      insert into products (slug, name, subtitle, description, details, material, origin, care, category_id,
        price, compare_at_price, status, is_featured, is_new, badge, size_guide, sort_order, created_at, updated_at)
      values (${p.slug}, ${p.name}, ${p.subtitle}, ${p.description}, ${JSON.stringify(p.details)}::jsonb,
        ${p.material}, ${p.origin}, ${p.care}, ${categoryIds[p.category]}, ${p.price}, ${p.compareAtPrice},
        'active', ${p.isFeatured}, ${p.isNew}, ${p.badge}, ${p.sizeGuide}, ${p.sortOrder}, ${iso(createdAt)}, ${iso(createdAt)})
      returning id
    `;
    productIds[p.slug] = row.id;

    for (const [i, v] of p.variants.entries()) {
      await tx`
        insert into product_variants (product_id, color, color_hex, size, sku, stock, price_override, is_active, sort_order)
        values (${row.id}, ${v.color}, ${v.hex}, ${v.size}, ${v.sku}, ${v.stock}, null, true, ${i})
      `;
    }

    let sort = 0;
    for (const img of p.images) {
      for (const mediaId of await images.all(img.file, img.alt)) {
        await tx`
          insert into product_images (product_id, media_id, color, sort_order)
          values (${row.id}, ${mediaId}, ${img.color}, ${sort++})
        `;
      }
    }
  }

  // Looks
  log("  looks & hotspots…");
  for (const l of LOOKS) {
    const coverId = await images.one(l.cover, `${l.title} — إطلالة كاملة من مرموق`);
    const [row] = await tx`
      insert into looks (slug, title, subtitle, description, cover_id, discount_percent, is_active, sort_order)
      values (${l.slug}, ${l.title}, ${l.subtitle}, ${l.description}, ${coverId}, ${l.discountPercent}, true, ${l.sortOrder})
      returning id
    `;
    for (const [i, it] of l.items.entries()) {
      await tx`
        insert into look_items (look_id, product_id, color, x, y, sort_order)
        values (${row.id}, ${productIds[it.product]}, ${it.color}, ${it.x}, ${it.y}, ${i})
      `;
    }
  }

  // Shipping & coupons
  log("  shipping zones & coupons…");
  for (const [i, [name, fee, eta]] of SHIPPING_ZONES.entries()) {
    await tx`insert into shipping_zones (name, fee, eta, is_active, sort_order) values (${name}, ${fee}, ${eta}, true, ${i})`;
  }
  for (const c of COUPONS) {
    await tx`
      insert into coupons (code, type, value, min_subtotal, is_active)
      values (${c.code}, ${c.type}, ${c.value}, ${c.minSubtotal}, true)
      on conflict (code) do nothing
    `;
  }

  return { images: images.count };
}

/* ═══════════════════════════ Demo orders ═══════════════════════════ */

/** Small deterministic PRNG so demo data is identical on every run. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  "عبدالله", "محمد", "أحمد", "علي", "سالم", "عمر", "خالد", "يوسف", "فيصل", "هشام", "عمّار", "ماجد",
  "صالح", "نبيل", "وليد", "طارق", "بسّام", "أنس", "مازن", "حمزة", "ياسر", "رائد", "زكريا", "إبراهيم",
];
const FAMILY_NAMES = [
  "الحمادي", "الشامي", "العولقي", "باوزير", "الأغبري", "المقطري", "الصبري", "الذبحاني", "الكبسي", "الأهدل",
  "الحضرمي", "العريقي", "السقاف", "المخلافي", "الجنيد", "الشرعبي", "العبسي", "الوصابي", "باحميش", "الإرياني",
];

// [zone name, weight, sample addresses]
const CITY_POOL = [
  ["صنعاء", 30, ["شارع حدة، عمارة الريان، الدور الثالث", "الأصبحي، خلف جامع الخير", "شارع الستين الغربي، قرب جولة عصر", "شارع الزبيري، جوار البنك اليمني", "حي السبعين، شارع القاهرة"]],
  ["عدن", 14, ["خور مكسر، شارع العرشي", "المنصورة، بلوك 4", "كريتر، الشارع الرئيسي", "الشيخ عثمان، قرب السوق المركزي"]],
  ["تعز", 12, ["شارع جمال، قرب جولة المسبح", "الحوبان، جولة القصر", "حي الروضة، خلف المدرسة"]],
  ["إب", 8, ["شارع العدين، جوار الجامعة", "حي الظهار، الشارع العام"]],
  ["حضرموت (المكلا)", 8, ["فوّة، الشارع العام", "الديس، قرب الكورنيش"]],
  ["الحديدة", 6, ["شارع صنعاء، حي الربصة", "الحالي، قرب السوق"]],
  ["ذمار", 5, ["شارع رداع، قرب الجامعة"]],
  ["مأرب", 5, ["المدينة، شارع الأربعين"]],
  ["عمران", 3, ["الشارع العام، قرب مكتب البريد"]],
  ["البيضاء", 3, ["رداع، الشارع الرئيسي"]],
  ["لحج", 3, ["الحوطة، قرب السوق"]],
  ["شبوة", 3, ["عتق، شارع المحافظة"]],
];

const ORDER_NOTES = [
  "يرجى الاتصال قبل التوصيل",
  "التوصيل بعد العصر لو سمحتم",
  "هدية — بدون فاتورة داخل الطرد",
  "أرسلوا لي صورة القطعة قبل الشحن",
  "",
  "",
  "",
  "",
  "",
];

const CANCEL_NOTES = ["اعتذر العميل عن إكمال الطلب", "تعذّر التواصل مع العميل بعد ثلاث محاولات", "طلب مكرر — تم دمجه مع طلب آخر"];
const RETURN_NOTES = ["استبدال — المقاس غير مناسب", "أعاد العميل القطعة خلال مدة الاستبدال"];

const HOUR = 3600000;

function buildTimeline(status, paymentMethod, paymentStatus, t0, now, rnd, admin) {
  // Each step: [status, note, hours after the previous step]
  const steps = [["pending", "تم استلام الطلب من المتجر", 0]];
  const confirmed = ["confirmed", "تم تأكيد الطلب هاتفياً مع العميل", 0.4 + rnd() * 5];
  const processing = ["processing", "نجهّز القطع ونغلّفها بعناية", 1 + rnd() * 14];
  const shipped = ["shipped", "سُلّمت الشحنة لمندوب التوصيل", 6 + rnd() * 24];
  const delivered = ["delivered", "تم التسليم للعميل", 18 + rnd() * 50];
  const paidStep = (h) => ["payment:paid", "تم تأكيد استلام الدفع", h];

  const route = {
    pending: [],
    confirmed: [confirmed],
    processing: [confirmed, processing],
    shipped: [confirmed, processing, shipped],
    delivered: [confirmed, processing, shipped, delivered],
    returned: [confirmed, processing, shipped, delivered, ["returned", RETURN_NOTES[Math.floor(rnd() * RETURN_NOTES.length)], 24 + rnd() * 48]],
    cancelled: rnd() < 0.5 ? [["cancelled", CANCEL_NOTES[Math.floor(rnd() * CANCEL_NOTES.length)], 2 + rnd() * 20]] : [confirmed, ["cancelled", CANCEL_NOTES[0], 3 + rnd() * 20]],
  }[status];
  steps.push(...route);

  // Payment events
  if (paymentStatus !== "unpaid") {
    if (paymentMethod === "transfer") {
      // Transfer receipts arrive right after confirmation.
      const idx = steps.findIndex((s) => s[0] === "confirmed");
      steps.splice(idx + 1, 0, paidStep(0.2 + rnd() * 2));
    } else {
      const idx = steps.findIndex((s) => s[0] === "delivered");
      steps.splice(idx + 1, 0, paidStep(0.05 + rnd() * 0.3));
    }
    if (paymentStatus === "refunded") steps.push(["payment:refunded", "تم استرداد المبلغ", 0.5 + rnd() * 6]);
  }

  // Fit the timeline between the order time and now.
  const total = steps.reduce((s, x) => s + x[2], 0);
  const available = Math.max(0.1, (now - t0) / HOUR - 0.25);
  const scale = total > available ? available / total : 1;
  let t = t0;
  return steps.map(([st, note, h]) => {
    t += h * scale * HOUR;
    return { status: st, note, at: new Date(Math.round(t)), adminId: st === "pending" ? null : admin };
  });
}

function pickWeighted(rnd, entries) {
  const total = entries.reduce((s, e) => s + e[1], 0);
  let r = rnd() * total;
  for (const e of entries) {
    r -= e[1];
    if (r <= 0) return e;
  }
  return entries[entries.length - 1];
}

function statusForAge(days, rnd) {
  const table =
    days > 10
      ? [["delivered", 80], ["cancelled", 12], ["returned", 8]]
      : days > 4
        ? [["delivered", 55], ["shipped", 20], ["processing", 10], ["cancelled", 10], ["confirmed", 5]]
        : days > 1
          ? [["shipped", 30], ["processing", 25], ["confirmed", 25], ["pending", 10], ["cancelled", 10]]
          : [["pending", 60], ["confirmed", 30], ["processing", 10]];
  return pickWeighted(rnd, table)[0];
}

async function seedDemoOrders(tx, log, { count = 45, days = 60 } = {}) {
  const rnd = mulberry32(20261011);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const now = Date.now();

  const products = await tx`select id, slug, name, price from products where status = 'active'`;
  if (!products.length) {
    log("  ! no products — demo orders skipped");
    return { orders: 0 };
  }
  const bySlug = Object.fromEntries(products.map((p) => [p.slug, p]));
  const variants = await tx`select id, product_id, color, size, stock, price_override from product_variants where is_active`;
  const images = await tx`select product_id, media_id, color from product_images order by sort_order, id`;
  const zones = await tx`select id, name, fee from shipping_zones where is_active`;
  const zoneByName = Object.fromEntries(zones.map((z) => [z.name, z]));
  const lookRows = await tx`select id, slug, discount_percent from looks where is_active`;
  const lookItemRows = await tx`select look_id, product_id, color from look_items`;
  const couponRows = await tx`select id, code, type, value, min_subtotal from coupons where is_active`;
  const [owner] = await tx`select id from admins where role = 'owner' and is_active order by id limit 1`;
  const [settingsRow] = await tx`select value from settings where key = 'store'`;
  const freeShippingThreshold = Number(settingsRow?.value?.freeShippingThreshold ?? 60000); // DEFAULT_SETTINGS.freeShippingThreshold

  // Live stock while we "sell" — variants close to running out are never touched,
  // so the curated low-stock / sold-out states survive the demo data.
  const stock = new Map(variants.map((v) => [v.id, v.stock]));
  const SIZE_WEIGHT = { M: 3, L: 5, XL: 4, XXL: 2, "30": 2, "32": 5, "34": 5, "36": 3, "38": 1, "40": 2, "41": 3, "42": 5, "43": 4, "44": 2, "45": 1, "": 1 };

  function chooseVariant(productId, color, qty) {
    const options = variants.filter(
      (v) => v.product_id === productId && (!color || v.color === color) && (stock.get(v.id) ?? 0) >= qty + 3,
    );
    if (!options.length) return null;
    return pickWeighted(rnd, options.map((v) => [v, SIZE_WEIGHT[v.size] ?? 2]))[0];
  }

  // Customer pool (some customers come back for more)
  const usedPhones = new Set();
  const customerPool = Array.from({ length: 36 }, () => {
    let phone;
    do {
      phone = pick(["77", "77", "77", "73", "73", "71", "70"]) + String(Math.floor(rnd() * 1e7)).padStart(7, "0");
    } while (usedPhones.has(phone));
    usedPhones.add(phone);
    const [city, , addresses] = pickWeighted(rnd, CITY_POOL);
    return { name: `${pick(FIRST_NAMES)} ${pick(FAMILY_NAMES)}`, phone, city, address: pick(addresses) };
  });

  // Order dates: denser in recent weeks, chronological so order numbers grow with time.
  const ages = Array.from({ length: count }, (_, i) => {
    if (i < 4) return rnd() * 0.9; // fresh orders waiting today
    if (i < 13) return 1 + rnd() * 6; // this week's pipeline
    return Math.pow(rnd(), 1.2) * days;
  }).sort((a, b) => b - a);

  const lookDefs = lookRows.map((l) => ({
    id: l.id,
    slug: l.slug,
    discount: l.discount_percent,
    items: lookItemRows.filter((i) => i.look_id === l.id),
  }));

  let created = 0;
  for (const ageDays of ages) {
    const t0 = now - ageDays * 86400000 - rnd() * 3 * HOUR;
    const customer = rnd() < 0.25 && created > 6 ? customerPool[Math.floor(rnd() * 8)] : pick(customerPool);
    const zone = zoneByName[customer.city] ?? zones[0];

    // ── Basket ──
    /** @type {{variant:any, product:any, qty:number, lookId:number|null}[]} */
    let lines = [];
    const add = (slug, color, qty = 1, lookId = null) => {
      const product = bySlug[slug];
      if (!product) return false;
      const variant = chooseVariant(product.id, color, qty);
      if (!variant) return false;
      lines.push({ variant, product, qty, lookId });
      stock.set(variant.id, stock.get(variant.id) - qty);
      return true;
    };
    const roll = rnd();
    if (roll < 0.22 && lookDefs.length) {
      const look = pick(lookDefs);
      const ok = look.items.every((it) => {
        const product = products.find((p) => p.id === it.product_id);
        return product && add(product.slug, it.color, 1, look.id);
      });
      if (!ok) {
        // roll back partial bundle
        for (const l of lines) stock.set(l.variant.id, stock.get(l.variant.id) + l.qty);
        lines = [];
      }
    } else if (roll < 0.6) {
      add("half-zip-cable-knit-sweater", pick(SWEATER_COLORS).color, rnd() < 0.15 ? 2 : 1);
      if (rnd() < 0.55) add("classic-white-dress-shirt", null);
      if (rnd() < 0.45) add("paisley-silk-tie", null);
    } else if (roll < 0.8) {
      add(pick(["korean-pleated-trousers-ivory", "tailored-trousers-charcoal"]), null);
      if (rnd() < 0.5) add("classic-white-dress-shirt", null);
      if (rnd() < 0.3) add("italian-suede-tassel-loafers", null);
    } else {
      add("italian-suede-tassel-loafers", null);
      if (rnd() < 0.4) add("paisley-silk-tie", null);
    }
    if (!lines.length) add("half-zip-cable-knit-sweater", null);
    if (!lines.length) add("paisley-silk-tie", null);
    if (!lines.length) continue;

    // ── Pricing (mirrors src/lib/pricing.ts) ──
    const unit = (l) => l.variant.price_override ?? l.product.price;
    const subtotal = lines.reduce((s, l) => s + unit(l) * l.qty, 0);
    const lineDiscount = new Map();
    let lookDiscount = 0;
    for (const look of lookDefs) {
      const group = lines.filter((l) => l.lookId === look.id);
      if (!group.length || look.discount <= 0) continue;
      const complete = look.items.every((it) => group.some((g) => g.product.id === it.product_id));
      if (!complete) continue;
      for (const l of group) {
        const d = Math.round((unit(l) * l.qty * look.discount) / 100);
        lineDiscount.set(l, d);
        lookDiscount += d;
      }
    }
    const afterLooks = subtotal - lookDiscount;
    let coupon = null;
    const cRoll = rnd();
    if (cRoll < 0.14) coupon = couponRows.find((c) => c.code === "WELCOME10");
    else if (cRoll < 0.24) coupon = couponRows.find((c) => c.code === "MARMOUQ5000" && afterLooks >= c.min_subtotal);
    let couponDiscount = 0;
    if (coupon) {
      couponDiscount = coupon.type === "percent" ? Math.round((afterLooks * coupon.value) / 100) : Math.min(afterLooks, coupon.value);
    }
    const discount = lookDiscount + couponDiscount;
    const merchandise = Math.max(0, subtotal - discount);
    const shippingFee = freeShippingThreshold > 0 && merchandise >= freeShippingThreshold ? 0 : zone.fee;
    const total = merchandise + shippingFee;

    // ── Status & payment ──
    const status = statusForAge(ageDays, rnd);
    const paymentMethod = rnd() < 0.72 ? "cod" : "transfer";
    let paymentStatus = "unpaid";
    if (status === "delivered") paymentStatus = "paid";
    else if (status === "returned") paymentStatus = "refunded";
    else if (paymentMethod === "transfer" && ["confirmed", "processing", "shipped"].includes(status)) paymentStatus = rnd() < 0.85 ? "paid" : "unpaid";

    const events = buildTimeline(status, paymentMethod, paymentStatus, t0, now, rnd, owner?.id ?? null);
    if (rnd() < 0.12 && status !== "pending") {
      const after = events[1]?.at ?? new Date(t0);
      events.push({ status: "note", note: pick(["العميل طلب تغليف هدية مع بطاقة", "تم إرسال صورة القطعة للعميل عبر واتساب", "العميل يفضّل التواصل مساءً"]), at: new Date(after.getTime() + 10 * 60000), adminId: owner?.id ?? null });
      events.sort((a, b) => a.at - b.at);
    }
    const createdAt = new Date(t0);
    const updatedAt = events[events.length - 1].at;

    // ── Persist ──
    const [cust] = await tx`
      insert into customers (name, phone, city, address, created_at)
      values (${customer.name}, ${customer.phone}, ${zone.name}, ${customer.address}, ${iso(createdAt)})
      on conflict (phone) do update set name = excluded.name, city = excluded.city, address = excluded.address
      returning id
    `;
    const token = randomBytes(16).toString("hex");
    const [order] = await tx`
      insert into orders (number, access_token, customer_id, customer_name, phone, city, address, notes, status,
        payment_method, payment_status, subtotal, discount, shipping_fee, total, coupon_code, shipping_zone_id, created_at, updated_at)
      values (${"TMP-" + token.slice(0, 12)}, ${token}, ${cust.id}, ${customer.name}, ${customer.phone}, ${zone.name},
        ${customer.address}, ${pick(ORDER_NOTES)}, ${status}, ${paymentMethod}, ${paymentStatus}, ${subtotal}, ${discount},
        ${shippingFee}, ${total}, ${coupon?.code ?? ""}, ${zone.id}, ${iso(createdAt)}, ${iso(updatedAt)})
      returning id
    `;
    await tx`update orders set number = ${"MRQ-" + (10000 + order.id)} where id = ${order.id}`;

    for (const l of lines) {
      const img =
        images.find((i) => i.product_id === l.product.id && i.color && i.color === l.variant.color) ??
        images.find((i) => i.product_id === l.product.id);
      await tx`
        insert into order_items (order_id, product_id, variant_id, name, color, size, image_id, unit_price, quantity, line_discount)
        values (${order.id}, ${l.product.id}, ${l.variant.id}, ${l.product.name}, ${l.variant.color}, ${l.variant.size},
          ${img?.media_id ?? null}, ${unit(l)}, ${l.qty}, ${lineDiscount.get(l) ?? 0})
      `;
    }
    for (const e of events) {
      await tx`
        insert into order_events (order_id, status, note, admin_id, created_at)
        values (${order.id}, ${e.status}, ${e.note}, ${e.adminId}, ${iso(e.at)})
      `;
    }

    // Stock: only statuses that hold stock keep the units out of inventory.
    const holding = ["pending", "confirmed", "processing", "shipped", "delivered"].includes(status);
    if (holding) {
      for (const l of lines) await tx`update product_variants set stock = stock - ${l.qty} where id = ${l.variant.id}`;
    } else {
      for (const l of lines) stock.set(l.variant.id, stock.get(l.variant.id) + l.qty);
    }
    if (coupon) await tx`update coupons set used_count = used_count + 1 where id = ${coupon.id}`;
    created++;
  }

  // Keep the customer's "member since" date aligned with their first order.
  await tx`
    update customers c set created_at = sub.first_at
    from (select customer_id, min(created_at) as first_at from orders group by customer_id) sub
    where sub.customer_id = c.id
  `;
  return { orders: created };
}

/* ═══════════════════════════ Entry points ═══════════════════════════ */

/**
 * @param {import("postgres").Sql} sql
 * @param {{ force?: boolean, demo?: boolean, log?: (msg: string) => void }} [opts]
 */
export async function seed(sql, { force = false, demo = false, log = console.log } = {}) {
  const started = Date.now();
  const [{ count: productCount }] = await sql`select count(*)::int as count from products`;
  const result = { catalogue: false, images: 0, orders: 0 };

  if (productCount > 0 && !force) {
    log(`[seed] catalogue already has ${productCount} products — skipped (use --force to rebuild).`);
  } else {
    log(force ? "[seed] rebuilding catalogue (--force)…" : "[seed] empty catalogue — seeding…");
    await sql.begin(async (tx) => {
      if (force) await wipe(tx, log);
      const r = await seedCatalogue(tx, log);
      result.images = r.images;
    });
    result.catalogue = true;
  }

  if (demo) {
    const [{ count: orderCount }] = await sql`select count(*)::int as count from orders`;
    if (orderCount > 0) {
      log(`[seed] ${orderCount} orders already exist — demo orders skipped.`);
    } else {
      log("[seed] creating demo orders…");
      await sql.begin(async (tx) => {
        const r = await seedDemoOrders(tx, log);
        result.orders = r.orders;
      });
    }
  }

  log(`[seed] done in ${((Date.now() - started) / 1000).toFixed(1)}s — ${result.images} photos, ${result.orders} demo orders.`);
  return result;
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isCli) {
  const args = new Set(process.argv.slice(2));
  const force = args.has("--force");
  const demo = args.has("--demo") || process.env.SEED_DEMO_ORDERS === "1" || process.env.SEED_DEMO_ORDERS === "true";
  let sql;
  try {
    sql = await connect();
    await seed(sql, { force, demo });
    const counts = await sql`
      select (select count(*) from products)::int as products, (select count(*) from product_variants)::int as variants,
             (select count(*) from media)::int as media, (select count(*) from looks)::int as looks,
             (select count(*) from shipping_zones)::int as zones, (select count(*) from orders)::int as orders,
             (select count(*) from customers)::int as customers
    `;
    console.log("[seed] totals:", counts[0]);
    await sql.end({ timeout: 5 });
  } catch (err) {
    console.error("[seed] FAILED:", err);
    await sql?.end({ timeout: 1 }).catch(() => {});
    process.exit(1);
  }
}
