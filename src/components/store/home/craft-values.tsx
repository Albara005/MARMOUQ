import { SectionHeading } from "@/components/store/section-heading";

const VALUES = [
  {
    title: "الخامة أولاً",
    en: "Pure cotton",
    body: "قطن 100% بملمس ناعم يتنفّس معك طول اليوم، ويحافظ على شكله وألوانه غسلة بعد غسلة.",
  },
  {
    title: "صنعة إيطالية",
    en: "Made in Italy",
    body: "تريكو بضفائر كلاسيكية وسحّاب معدني متين، مصنوع في إيطاليا بمعايير الدور العريقة.",
  },
  {
    title: "القصّة الصحيحة",
    en: "The right cut",
    body: "بناطيل بالقالب الكوري الصحيح: بِليتس أمامية وخصر مرتفع يعطيك وقفة أطول وأرتب.",
  },
  {
    title: "تنسيق متكامل",
    en: "Styled to match",
    body: "كل قطعة مختارة لتكمل الأخرى — من ربطة العنق الحريرية حتى الشوز الإيطالي.",
  },
] as const;

export function CraftValues() {
  return (
    <section aria-labelledby="craft-title" className="bg-ivory py-20 md:py-28">
      <div className="container-luxe">
        <div data-reveal>
          <SectionHeading id="craft-title" eyebrow="The Marmouq Standard" title="تفاصيل مختارة بعناية" align="center" subtitle="أربعة مبادئ نلتزم فيها بكل قطعة توصلك — لأن الأناقة الحقيقية في التفاصيل." />
        </div>
        <div className="hairline mt-14 md:mt-20" aria-hidden />
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v, i) => (
            <li
              key={v.title}
              data-reveal
              style={{ "--reveal-delay": `${i * 110}ms` } as React.CSSProperties}
              className="group relative border-b border-line px-1 py-10 sm:px-6 sm:[&:nth-child(odd)]:border-e lg:border-b-0 lg:border-e lg:px-8 lg:py-14 lg:last:border-e-0 lg:first:ps-0"
            >
              <span className="latin-italic block text-[3.5rem] leading-none text-copper/80 transition-colors duration-500 group-hover:text-copper">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="display mt-6 text-2xl text-espresso">{v.title}</h3>
              <p className="eyebrow mt-1.5 text-[0.68rem] text-taupe">{v.en}</p>
              <p className="mt-4 max-w-xs text-[0.92rem] leading-7 text-umber">{v.body}</p>
            </li>
          ))}
        </ol>
        <div className="hairline" aria-hidden />
      </div>
    </section>
  );
}
