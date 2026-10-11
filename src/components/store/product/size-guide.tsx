"use client";

import { useId, useRef, useState } from "react";
import { Ruler, X } from "lucide-react";
import { Portal, useModal, usePresence } from "@/components/store/overlay";
import { cn } from "@/lib/utils";

export type SizeGuideKind = "tops" | "bottoms" | "shoes";

type Table = { headers: string[]; units: ("cm" | "none")[]; rows: { size: string; values: (number | string)[] }[]; note: string };

const TABLES: Record<SizeGuideKind, Table> = {
  tops: {
    headers: ["المقاس", "محيط الصدر", "الطول", "عرض الأكتاف"],
    units: ["none", "cm", "cm", "cm"],
    rows: [
      { size: "M", values: ["M", 104, 69, 45] },
      { size: "L", values: ["L", 110, 71, 47] },
      { size: "XL", values: ["XL", 116, 73, 49] },
      { size: "XXL", values: ["XXL", 122, 75, 51] },
    ],
    note: "القياسات للقطعة نفسها وهي مفرودة، بفارق ±1 سم.",
  },
  bottoms: {
    headers: ["المقاس", "محيط الخصر", "الطول الداخلي", "الطول الكلي"],
    units: ["none", "cm", "cm", "cm"],
    rows: [
      { size: "30", values: ["30", 76, 76, 100] },
      { size: "32", values: ["32", 81, 77, 101] },
      { size: "34", values: ["34", 86, 78, 102] },
      { size: "36", values: ["36", 91, 79, 103] },
      { size: "38", values: ["38", 97, 80, 104] },
    ],
    note: "القصّة الكورية بخصر عالٍ وساق مستدقّة تنتهي فوق الكاحل بقليل.",
  },
  shoes: {
    headers: ["EU", "UK", "طول القدم"],
    units: ["none", "none", "cm"],
    rows: [
      { size: "40", values: ["40", "6.5", 25.5] },
      { size: "41", values: ["41", "7", 26] },
      { size: "42", values: ["42", "8", 26.7] },
      { size: "43", values: ["43", "9", 27.3] },
      { size: "44", values: ["44", "9.5", 28] },
      { size: "45", values: ["45", "10.5", 28.6] },
    ],
    note: "طول القدم من الكعب حتى أطول إصبع، والقدم على الأرض.",
  },
};

const TIPS: Record<SizeGuideKind, { title: string; body: string }[]> = {
  tops: [
    { title: "محيط الصدر", body: "لفّ المتر تحت الإبطين على أعرض نقطة في الصدر، وخلّه مرتاح لا مشدود ولا مرخي." },
    { title: "تلبسه فوق قميص؟", body: "التريكو الإيطالي قصّته مضبوطة على الجسم. إذا كنت بين مقاسين وبتلبسه فوق قميص رسمي، اختر الأكبر." },
    { title: "قارن بقطعة تحبها", body: "افرد أفضل سويتر عندك وقِس عرضه من إبط لإبط واضربه في 2 — هذا أدق رقم تقارن به." },
  ],
  bottoms: [
    { title: "محيط الخصر", body: "قِس عند خط الخصر الطبيعي فوق السرّة بقليل، حيث يجلس البنطال الكوري العالي." },
    { title: "الطول الداخلي", body: "من أعلى الفخذ الداخلي حتى الكاحل. القصّة تنتهي فوقه بقليل لتُظهر الحذاء بأناقة." },
    { title: "بين مقاسين؟", body: "اختر مقاسك المعتاد — الكسرات الأمامية تعطي راحة كافية في الجلوس والحركة." },
  ],
  shoes: [
    { title: "قِس آخر النهار", body: "القدم تتمدد خلال اليوم، فالقياس مساءً أصدق. قِس القدمين واعتمد الأطول." },
    { title: "الشامواه يلين", body: "الجلد الطبيعي يتشكّل على قدمك بعد أيام. اللوفر يُلبس مريحاً من غير ارتخاء عند الكعب." },
    { title: "بين مقاسين؟", body: "مع جوارب رقيقة اختر الأصغر، ومع جوارب سميكة أو قدم عريضة اختر الأكبر." },
  ],
};

function Diagram({ kind }: { kind: SizeGuideKind }) {
  const stroke = "var(--color-umber)";
  const accent = "var(--color-copper)";
  if (kind === "tops") {
    return (
      <svg viewBox="0 0 220 180" className="h-40 w-auto" aria-hidden>
        <path
          d="M80 22 L60 28 L22 52 L34 92 L56 84 L56 162 L164 162 L164 84 L186 92 L198 52 L160 28 L140 22 Q110 40 80 22 Z"
          fill="var(--color-paper)"
          stroke={stroke}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M110 34 L110 70" stroke={stroke} strokeWidth="1.2" />
        <path d="M60 28 L160 28" stroke={accent} strokeWidth="1.4" strokeDasharray="3 3" />
        <path d="M56 96 L164 96" stroke={accent} strokeWidth="1.4" strokeDasharray="3 3" />
        <path d="M176 24 L176 162" stroke={accent} strokeWidth="1.4" strokeDasharray="3 3" />
        <text x="110" y="18" textAnchor="middle" fontSize="11" fill={accent}>ج</text>
        <text x="110" y="112" textAnchor="middle" fontSize="11" fill={accent}>أ</text>
        <text x="190" y="128" textAnchor="middle" fontSize="11" fill={accent}>ب</text>
      </svg>
    );
  }
  if (kind === "bottoms") {
    return (
      <svg viewBox="0 0 200 200" className="h-40 w-auto" aria-hidden>
        <path
          d="M64 18 L136 18 L142 60 L134 186 L108 186 L100 78 L92 186 L66 186 L58 60 Z"
          fill="var(--color-paper)"
          stroke={stroke}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M86 18 L88 50 M114 18 L112 50" stroke={stroke} strokeWidth="1" />
        <path d="M64 26 L136 26" stroke={accent} strokeWidth="1.4" strokeDasharray="3 3" />
        <path d="M101 84 L106 182" stroke={accent} strokeWidth="1.4" strokeDasharray="3 3" />
        <path d="M156 18 L156 186" stroke={accent} strokeWidth="1.4" strokeDasharray="3 3" />
        <text x="100" y="12" textAnchor="middle" fontSize="11" fill={accent}>أ</text>
        <text x="118" y="140" textAnchor="middle" fontSize="11" fill={accent}>ب</text>
        <text x="168" y="104" textAnchor="middle" fontSize="11" fill={accent}>ج</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 240 120" className="h-28 w-auto" aria-hidden>
      <path
        d="M24 78 Q22 52 48 48 L118 40 Q150 30 176 44 Q214 58 216 80 Q214 96 186 96 L44 96 Q26 96 24 78 Z"
        fill="var(--color-paper)"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M118 40 Q126 58 150 60" stroke={stroke} strokeWidth="1" fill="none" />
      <circle cx="138" cy="62" r="3" fill={stroke} />
      <path d="M24 110 L216 110" stroke={accent} strokeWidth="1.4" strokeDasharray="3 3" />
      <path d="M24 104 L24 116 M216 104 L216 116" stroke={accent} strokeWidth="1.4" />
      <text x="120" y="106" textAnchor="middle" fontSize="11" fill={accent}>طول القدم</text>
    </svg>
  );
}

/** Ruler link that opens the size-guide drawer (bottom sheet on phones, side drawer on desktop). */
export function SizeGuide({
  kind,
  selectedSize,
  helpHref,
  helpLabel,
}: {
  kind: SizeGuideKind;
  selectedSize: string | null;
  helpHref: string | null;
  helpLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const { mounted, visible } = usePresence(open, 500);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useModal({ open, onClose: () => setOpen(false), containerRef: panelRef });
  const table = TABLES[kind];

  const fmt = (v: number | string, u: "cm" | "none") => {
    if (typeof v === "string" || u === "none") return String(v);
    return unit === "cm" ? String(v) : (v / 2.54).toFixed(1);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex min-h-11 items-center gap-1.5 text-[0.82rem] text-umber underline decoration-sand underline-offset-[6px] transition-colors hover:text-espresso hover:decoration-copper"
      >
        <Ruler className="size-4" strokeWidth={1.5} aria-hidden />
        دليل المقاسات
      </button>

      {mounted && (
        <Portal>
          <div className="fixed inset-0 z-[70]">
            <div
              className={cn("absolute inset-0 bg-espresso/45 backdrop-blur-[2px] transition-opacity duration-500", visible ? "opacity-100" : "opacity-0")}
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              tabIndex={-1}
              className={cn(
                "absolute flex flex-col bg-ivory shadow-[0_-24px_60px_-20px_rgba(28,19,15,0.45)] outline-none transition-transform duration-500 ease-[var(--ease-out-expo)]",
                "inset-x-0 bottom-0 max-h-[90svh] rounded-t-3xl",
                "md:inset-y-0 md:end-0 md:start-auto md:max-h-none md:w-[480px] md:rounded-none",
                visible ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-y-0 md:-translate-x-full",
              )}
            >
              <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-sand md:hidden" aria-hidden />
              <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-4 md:px-8 md:pt-8">
                <div>
                  <p className="eyebrow text-[0.7rem]">Size Guide</p>
                  <h2 id={titleId} className="display mt-2 text-2xl text-espresso">
                    دليل المقاسات
                  </h2>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="-me-2 grid size-11 place-items-center rounded-full text-espresso hover:bg-bone" aria-label="إغلاق دليل المقاسات">
                  <X className="size-5" strokeWidth={1.6} aria-hidden />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-8 md:px-8">
                <div className="studio-frame flex items-center justify-center rounded-2xl py-6">
                  <Diagram kind={kind} />
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <p className="text-sm font-medium text-espresso">جدول القياسات</p>
                  {table.units.includes("cm") && (
                    <div role="radiogroup" aria-label="وحدة القياس" className="inline-flex rounded-full border border-line bg-paper p-0.5 text-xs">
                      {(["cm", "in"] as const).map((u) => (
                        <button
                          key={u}
                          type="button"
                          role="radio"
                          aria-checked={unit === u}
                          onClick={() => setUnit(u)}
                          className={cn("h-9 min-w-14 rounded-full px-3 transition-colors", unit === u ? "bg-espresso text-paper" : "text-umber hover:text-espresso")}
                        >
                          {u === "cm" ? "سم" : "إنش"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-paper">
                  <table className="w-full text-center text-sm">
                    <caption className="sr-only">قياسات المقاسات {unit === "cm" ? "بالسنتيمتر" : "بالإنش"}</caption>
                    <thead>
                      <tr className="bg-bone/60 text-[0.75rem] text-taupe">
                        {table.headers.map((h, i) => (
                          <th key={h} scope="col" className={cn("px-2 py-3 font-medium", i === 0 && "text-espresso")}>
                            {h}
                            {table.units[i] === "cm" && <span className="block text-[0.65rem] font-normal text-mist">{unit === "cm" ? "سم" : "إنش"}</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((r) => {
                        const active = selectedSize === r.size;
                        return (
                          <tr key={r.size} className={cn("border-t border-line tabular-nums transition-colors", active ? "bg-copper/10" : "")} aria-current={active ? "true" : undefined}>
                            {r.values.map((v, i) =>
                              i === 0 ? (
                                <th key={i} scope="row" className="px-2 py-3.5 font-semibold text-espresso">
                                  {v}
                                  {active && <span className="ms-1.5 inline-block size-1.5 rounded-full bg-copper align-middle" aria-hidden />}
                                </th>
                              ) : (
                                <td key={i} className="px-2 py-3.5 text-umber">
                                  {fmt(v, table.units[i])}
                                </td>
                              ),
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs leading-6 text-taupe">{table.note}</p>

                <h3 className="display mt-9 text-xl text-espresso">كيف أختار مقاسي؟</h3>
                <ol className="mt-4 space-y-5">
                  {TIPS[kind].map((t, i) => (
                    <li key={t.title} className="flex gap-4">
                      <span className="latin-italic mt-0.5 w-5 shrink-0 text-xl leading-none text-copper">{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium text-espresso">{t.title}</p>
                        <p className="mt-1 text-sm leading-7 text-umber">{t.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                {helpHref && (
                  <div className="mt-9 rounded-2xl bg-espresso p-5 text-paper">
                    <p className="text-sm font-medium">لسّا محتار؟</p>
                    <p className="mt-1 text-[0.82rem] leading-6 text-paper/70">أرسل لنا طولك ووزنك ونقترح لك المقاس الأنسب خلال دقائق.</p>
                    <a
                      href={helpHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex h-11 items-center rounded-full bg-paper px-5 text-sm font-medium text-espresso transition-colors hover:bg-bone"
                    >
                      {helpLabel}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
