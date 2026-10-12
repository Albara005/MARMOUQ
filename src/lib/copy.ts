/**
 * Editable storefront copy & images.
 * Every string the merchant can change lives here with its default; the dashboard
 * builds its "Store pages" editor from COPY_GROUPS automatically.
 * Plain module — safe in server and client components.
 */

export type CopyFieldType = "text" | "textarea" | "image";
export type CopyField = { key: string; label: string; type: CopyFieldType; def: string; hint?: string };
export type CopyGroup = { id: string; label: string; href?: string; fields: CopyField[] };

const t = (key: string, label: string, def: string, hint?: string): CopyField => ({ key, label, type: "text", def, hint });
const ta = (key: string, label: string, def: string, hint?: string): CopyField => ({ key, label, type: "textarea", def, hint });
const img = (key: string, label: string, hint?: string): CopyField => ({ key, label, type: "image", def: "", hint });

export const COPY_GROUPS: CopyGroup[] = [
  {
    id: "shop",
    label: "المتجر (كل القطع)",
    href: "/shop",
    fields: [
      t("shop.eyebrow", "العنوان الصغير", "The Collection"),
      t("shop.title", "العنوان", "كل القطع"),
      ta("shop.subtitle", "الوصف", "تشكيلة مختصرة ومدروسة: كل قطعة هنا اخترناها لتكمّل الأخرى — من التريكو الإيطالي بالضفائر حتى اللوفر الشامواه."),
      img("shop.cover", "صورة رأس الصفحة (اختيارية)"),
    ],
  },
  {
    id: "product",
    label: "صفحة المنتج",
    fields: [
      t("product.trust1", "ميزة 1", "توصيل لكل المحافظات"),
      t("product.trust2", "ميزة 2", "الدفع عند الاستلام"),
      t("product.trust3", "ميزة 3", "استبدال خلال 3 أيام"),
    ],
  },
  {
    id: "looks",
    label: "الإطلالات",
    href: "/looks",
    fields: [
      t("looks.eyebrow", "العنوان الصغير", "The Lookbook · Autumn Edit"),
      t("looks.title1", "العنوان — السطر الأول", "إطلالات مكتملة،"),
      t("looks.title2", "العنوان — السطر الثاني (بلون مميز)", "من الياقة حتى الحذاء"),
      ta("looks.intro", "المقدمة", "وش يمنعك تلبس كذا؟ كل إطلالة هنا منسّقة قطعة قطعة على يد فريق مرموق — اطلبها كاملة واستمتع بخصم الطقم."),
      t("looks.atelierTitle", "عنوان دعوة المنسّق", "ما لقيت طقمك؟ نسّقه بنفسك."),
      ta("looks.atelierText", "نص دعوة المنسّق", "اختر التريكو ولونه، القميص، الربطة، البنطال والحذاء — وشوف الطقم يكتمل قدّامك على طاولة الأتيليه قبل ما تطلبه."),
    ],
  },
  {
    id: "atelier",
    label: "منسّق الإطلالة",
    href: "/atelier",
    fields: [
      t("atelier.eyebrow", "العنوان الصغير", "The Atelier · الأتيليه"),
      t("atelier.title", "العنوان", "منسّق الإطلالة"),
      ta("atelier.intro", "المقدمة", "قطعة لكل خانة، من التريكو حتى الحذاء — وشوف طقمك يكتمل قدّامك قبل ما تطلبه. ما تدري من وين تبدأ؟ خلّنا نلهمك."),
    ],
  },
  {
    id: "about",
    label: "قصتنا",
    href: "/about",
    fields: [
      t("about.eyebrow", "العنوان الصغير", "Our Story · قصتنا"),
      t("about.title", "العنوان", "قصة مرموق"),
      ta("about.subtitle", "الوصف تحت العنوان", "طريقك لتكون شخصية مرموقة — ملابس رجالية راقية بتفاصيل مختارة بعناية."),
      img("about.cover", "صورة رأس الصفحة"),
      t("about.word", "الكلمة الكبيرة", "مَرموق"),
      t("about.def1", "التعريف الأول", "مَن تُرمَق إليه الأبصار إعجاباً وتقديراً."),
      t("about.def2", "التعريف الثاني", "رفيع المكانة، ذو حضور وشأن — يُعرَف قبل أن يتكلّم."),
      ta("about.meaning", "فقرة معنى الاسم", "اخترنا الاسم لأنه يختصر كل ما نريده لك: أن تدخل المجلس فتلتفت إليك الأنظار، لا لصخب ما تلبس، بل لاتّزانه. مرموق ليست ماركة تلبسها فقط — هي حالة توصل لها بالتفاصيل: ياقة تقف بثبات، ضفيرة تريكو منتظمة، وخط كيّ لا ينكسر."),
      t("about.valuesTitle", "عنوان المبادئ", "أربعة أشياء لا نتنازل عنها"),
      t("about.ch1.latin", "المبدأ 1 — بالإنجليزية", "Italian Cotton"),
      t("about.ch1.title", "المبدأ 1 — العنوان", "قطن إيطالي، بلا مساومة"),
      ta("about.ch1.body", "المبدأ 1 — النص", "تريكونا قطني 100% ومصنوع في إيطاليا 🇮🇹 — ضفائر كلاسيكية منتظمة، وسحّاب نصفي بلمسة جلدية، وألوان مأخوذة من دفء الخريف: البورغندي، الأسود، بني القهوة والكحلي. خامة تتنفّس في الصيف وتدفّيك في الشتاء."),
      img("about.ch1.image", "المبدأ 1 — الصورة"),
      t("about.ch2.latin", "المبدأ 2 — بالإنجليزية", "The Korean Cut"),
      t("about.ch2.title", "المبدأ 2 — العنوان", "القصّة الكورية… كما يجب"),
      ta("about.ch2.body", "المبدأ 2 — النص", "البنطال الكوري مو مجرد واسع أو ضيّق؛ هو قالب مدروس بكسرات أمامية وخصر مرتفع يسقط باستقامة على الحذاء. أخذنا وقتنا حتى ضبطنا القالب والقصّة الصحيحة، عشان يجلس عليك وكأنه مفصّل لك."),
      img("about.ch2.image", "المبدأ 2 — الصورة"),
      t("about.ch3.latin", "المبدأ 3 — بالإنجليزية", "Details as Signature"),
      t("about.ch3.title", "المبدأ 3 — العنوان", "التفاصيل هي التوقيع"),
      ta("about.ch3.body", "المبدأ 3 — النص", "ربطة حرير بنقشة بيزلي، ياقة إيطالية حادّة تقف بثبات تحت التريكو، وشرّابة على لوفر من الشامواه الطبيعي. نختار كل تفصيلة كما يختار الخيّاط إبرته — لأن الفرق الكبير يبدأ من الأشياء الصغيرة."),
      img("about.ch3.image", "المبدأ 3 — الصورة"),
      t("about.ch4.latin", "المبدأ 4 — بالإنجليزية", "Yemeni Roots"),
      t("about.ch4.title", "المبدأ 4 — العنوان", "جذور يمنية، وذوق عالمي"),
      ta("about.ch4.body", "المبدأ 4 — النص", "وُلدنا في اليمن ونعرف ما يليق بمجالسنا ومناسباتنا. نوصل لكل المحافظات، نؤكّد كل طلب بأنفسنا، وتدفع عند الاستلام — لأن الثقة عندنا جزء من الأناقة، مو أقل منها."),
      img("about.ch4.image", "المبدأ 4 — الصورة"),
      t("about.stat1.value", "رقم 1", "+69K"),
      t("about.stat1.label", "وصف الرقم 1", "رجل مرموق يتابعنا على إنستغرام"),
      t("about.stat2.value", "رقم 2", "100%"),
      t("about.stat2.label", "وصف الرقم 2", "قطن إيطالي في كل قطعة تريكو"),
      t("about.stat3.value", "رقم 3", "3"),
      t("about.stat3.label", "وصف الرقم 3", "أيام لاستبدال المقاس أو اللون"),
      ta("about.quote", "الاقتباس الكبير", "لما ذوقك يتعدّى مرحلة الفخامة… تصير مرموق."),
      t("about.ctaTitle", "عنوان الخاتمة", "ابدأ من قطعة واحدة… والباقي يتبعها"),
      ta("about.ctaText", "نص الخاتمة", "تصفّح المجموعة، أو خلّ الأتيليه ينسّق لك طقمك كامل من التريكو حتى الحذاء."),
    ],
  },
  {
    id: "contact",
    label: "تواصل معنا",
    href: "/contact",
    fields: [
      t("contact.eyebrow", "العنوان الصغير", "Concierge · تواصل معنا"),
      t("contact.title", "العنوان", "حيّاك في مرموق"),
      ta("contact.subtitle", "الوصف", "فريقنا يرد عليك بنفسه — نساعدك تختار المقاس، ننسّق لك طقمك، ونتابع طلبك لين يوصل بابك."),
    ],
  },
  {
    id: "cart",
    label: "السلة وإتمام الطلب",
    fields: [
      t("cart.title", "عنوان السلة", "سلّة التسوق"),
      ta("cart.subtitle", "وصف السلة", "راجع قطعك قبل الإتمام — يمكنك تعديل الكمية أو المقاس في أي وقت، ونؤكد معك كل التفاصيل قبل الشحن."),
      t("checkout.title", "عنوان إتمام الطلب", "إتمام الطلب"),
      ta("checkout.subtitle", "وصف إتمام الطلب", "خطوة وحدة وتصير قطعك في الطريق إليك — بدون تسجيل حساب، وتدفع عند الاستلام."),
    ],
  },
  {
    id: "other",
    label: "صفحات أخرى",
    fields: [
      t("track.title", "تتبّع الطلب — العنوان", "تتبّع طلبك"),
      ta("track.subtitle", "تتبّع الطلب — الوصف", "أدخل رقم الطلب ورقم الجوال اللي طلبت به، ونوريك وين وصل طلبك بالضبط."),
      t("wishlist.title", "المفضلة — العنوان", "قائمتي المفضلة"),
      ta("wishlist.subtitle", "المفضلة — الوصف", "القطع اللي لفتت نظرك، محفوظة هنا لين تقرر. القائمة محفوظة على هذا الجهاز."),
      t("notFound.title", "صفحة غير موجودة — العنوان", "هذه الصفحة غير موجودة… لكن إطلالتك القادمة موجودة"),
      ta("notFound.text", "صفحة غير موجودة — النص", "يمكن الرابط تغيّر أو القطعة انتقلت لمكان جديد. خلّنا نرجّعك للطريق الصحيح."),
    ],
  },
  {
    id: "footer",
    label: "أسفل الموقع",
    fields: [
      t("footer.listEyebrow", "القائمة الخاصة — العنوان الصغير", "The Private List"),
      t("footer.listTitle", "القائمة الخاصة — العنوان", "انضم لقائمة مرموق الخاصة"),
      ta("footer.listText", "القائمة الخاصة — النص", "كن أول من يعرف بالمجموعات الجديدة والقطع المحدودة قبل نزولها على إنستغرام."),
      t("footer.pay1", "طريقة دفع 1", "الدفع عند الاستلام"),
      t("footer.pay2", "طريقة دفع 2", "الكريمي"),
      t("footer.pay3", "طريقة دفع 3", "المحافظ الإلكترونية"),
    ],
  },
];

export const DEFAULT_COPY: Record<string, string> = Object.fromEntries(COPY_GROUPS.flatMap((g) => g.fields.map((f) => [f.key, f.def])));

export const COPY_KEYS = new Set(Object.keys(DEFAULT_COPY));

/** Merges saved overrides over the defaults (empty override = use default for text, "none" for images). */
export function resolveCopy(overrides: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = { ...DEFAULT_COPY };
  for (const [k, v] of Object.entries(overrides ?? {})) if (COPY_KEYS.has(k) && typeof v === "string" && v.trim()) out[k] = v;
  return out;
}

/** Navigation links shown in the header & mobile menu. */
export type NavLink = { label: string; href: string };
export const DEFAULT_NAV: NavLink[] = [
  { label: "الإطلالات", href: "/looks" },
  { label: "منسّق الإطلالة", href: "/atelier" },
  { label: "قصتنا", href: "/about" },
];
