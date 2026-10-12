"use client";

import { ArrowDown, ArrowUp, Plus, RotateCcw, Ruler, Trash2, X } from "lucide-react";
import { Input, Select, Textarea } from "@/components/ui/field";
import { ActionFieldError } from "@/components/admin/ui-client";
import { ListEditor } from "./list-editors";
import { BUILTIN_GUIDE_IDS, DEFAULT_SIZE_GUIDES, SIZE_GUIDE_DIAGRAMS, SIZE_GUIDE_LIMITS, newGuideId, type SizeGuideDef, type SizeGuideDiagram } from "@/lib/size-guides";
import { cn } from "@/lib/utils";

const cell = "h-9 w-full min-w-[4.5rem] rounded-lg border border-line bg-paper px-2 text-center text-sm tabular-nums outline-none transition-colors focus:border-copper";
const iconBtn = "grid size-8 place-items-center rounded-full text-taupe transition-colors hover:bg-bone hover:text-espresso disabled:pointer-events-none disabled:opacity-30";

/** Edits every size guide table (sizes × measurements), its note and tips. */
export function SizeGuidesEditor({ guides, onChange, usage }: { guides: SizeGuideDef[]; onChange: (next: SizeGuideDef[]) => void; usage: Record<string, number> }) {
  const update = (i: number, patch: Partial<SizeGuideDef>) => onChange(guides.map((g, k) => (k === i ? { ...g, ...patch } : g)));
  const add = () =>
    onChange([
      ...guides,
      { id: newGuideId(), name: "دليل جديد", diagram: "none", headers: ["المقاس", "القياس"], cm: [false, true], rows: [["", ""]], note: "", tips: [] },
    ]);

  return (
    <div className="space-y-5">
      {guides.map((g, i) => (
        <GuideCard
          key={g.id}
          guide={g}
          index={i}
          used={usage[g.id] ?? 0}
          onChange={(patch) => update(i, patch)}
          onRemove={() => onChange(guides.filter((_, k) => k !== i))}
        />
      ))}
      <button
        type="button"
        onClick={add}
        disabled={guides.length >= SIZE_GUIDE_LIMITS.guides}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-sand text-sm font-medium text-umber transition-colors hover:border-espresso hover:text-espresso disabled:pointer-events-none disabled:opacity-40"
      >
        <Plus className="size-4" aria-hidden />
        إضافة دليل مقاسات جديد
      </button>
    </div>
  );
}

function GuideCard({ guide: g, index, used, onChange, onRemove }: { guide: SizeGuideDef; index: number; used: number; onChange: (patch: Partial<SizeGuideDef>) => void; onRemove: () => void }) {
  const builtin = BUILTIN_GUIDE_IDS.has(g.id);
  const path = `sizeGuides.${index}`;
  const cols = g.headers.length;

  const setHeader = (c: number, v: string) => onChange({ headers: g.headers.map((h, k) => (k === c ? v : h)) });
  const setCm = (c: number, on: boolean) => onChange({ cm: g.headers.map((_, k) => (k === c ? on : !!g.cm[k])) });
  const setCell = (r: number, c: number, v: string) => onChange({ rows: g.rows.map((row, k) => (k === r ? g.headers.map((_, j) => (j === c ? v : (row[j] ?? ""))) : row)) });
  const addRow = () => onChange({ rows: [...g.rows, g.headers.map(() => "")] });
  const removeRow = (r: number) => onChange({ rows: g.rows.filter((_, k) => k !== r) });
  const moveRow = (r: number, d: -1 | 1) => {
    const j = r + d;
    if (j < 0 || j >= g.rows.length) return;
    const rows = g.rows.slice();
    [rows[r], rows[j]] = [rows[j], rows[r]];
    onChange({ rows });
  };
  const addCol = () => onChange({ headers: [...g.headers, "قياس جديد"], cm: [...g.headers.map((_, k) => !!g.cm[k]), true], rows: g.rows.map((r) => [...g.headers.map((_, j) => r[j] ?? ""), ""]) });
  const removeCol = (c: number) =>
    onChange({ headers: g.headers.filter((_, k) => k !== c), cm: g.headers.map((_, k) => !!g.cm[k]).filter((_, k) => k !== c), rows: g.rows.map((r) => r.filter((_, k) => k !== c)) });
  const reset = () => {
    const def = DEFAULT_SIZE_GUIDES.find((d) => d.id === g.id);
    if (def && window.confirm("إرجاع هذا الدليل لقياساته الأصلية؟")) onChange(structuredClone(def));
  };

  return (
    <section className="rounded-2xl border border-line bg-paper p-5 shadow-[0_1px_2px_rgba(28,19,15,0.04)] md:p-6" aria-label={g.name}>
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-bone text-copper-deep" aria-hidden>
          <Ruler className="size-5" />
        </span>
        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <Input aria-label="اسم الدليل" className="h-10 font-medium" value={g.name} onChange={(e) => onChange({ name: e.target.value })} />
            <ActionFieldError name={`${path}.name`} />
            <p className="mt-1 text-xs text-taupe">{used > 0 ? `مستخدم في ${used} ${used === 1 ? "منتج" : "منتجات"}` : "غير مستخدم في أي منتج بعد"}</p>
          </div>
          <Select aria-label="الرسم التوضيحي" className="h-10 text-sm" value={g.diagram} onChange={(e) => onChange({ diagram: e.target.value as SizeGuideDiagram })}>
            {SIZE_GUIDE_DIAGRAMS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </div>
        {builtin ? (
          <button type="button" onClick={reset} className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-xs text-taupe hover:bg-bone hover:text-espresso">
            <RotateCcw className="size-3.5" aria-hidden />
            الأصلي
          </button>
        ) : (
          <button
            type="button"
            onClick={() => window.confirm(used ? `هذا الدليل مستخدم في ${used} منتج — سيختفي منها. حذف؟` : "حذف هذا الدليل؟") && onRemove()}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-xs text-taupe hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="size-3.5" aria-hidden />
            حذف
          </button>
        )}
      </div>

      {/* table */}
      <div className="mt-5 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead className="bg-ivory">
            <tr>
              {g.headers.map((h, c) => (
                <th key={c} scope="col" className="border-b border-line p-2 align-top font-normal">
                  <input aria-label={`عنوان العمود ${c + 1}`} className={cn(cell, "font-medium")} value={h} onChange={(e) => setHeader(c, e.target.value)} />
                  <div className="mt-1.5 flex items-center justify-center gap-1">
                    {c > 0 && (
                      <label className="inline-flex cursor-pointer items-center gap-1 text-[0.7rem] text-taupe" title="قيم بالسنتيمتر — يقدر العميل يحوّلها للإنش">
                        <input type="checkbox" className="size-3.5 accent-[var(--color-copper)]" checked={!!g.cm[c]} onChange={(e) => setCm(c, e.target.checked)} />
                        سم
                      </label>
                    )}
                    {c > 0 && cols > 2 && (
                      <button type="button" className={cn(iconBtn, "size-6 hover:text-danger")} onClick={() => removeCol(c)} aria-label={`حذف عمود ${h}`}>
                        <X className="size-3" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-24 border-b border-line p-2">
                <button type="button" onClick={addCol} disabled={cols >= SIZE_GUIDE_LIMITS.columns} className="inline-flex h-9 items-center gap-1 rounded-full px-2.5 text-xs text-copper-deep hover:bg-bone disabled:opacity-30">
                  <Plus className="size-3.5" aria-hidden />
                  عمود
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {g.rows.map((row, r) => (
              <tr key={r} className="border-b border-line/70 last:border-0">
                {g.headers.map((_, c) => (
                  <td key={c} className="p-1.5">
                    <input
                      aria-label={c === 0 ? `المقاس في الصف ${r + 1}` : `${g.headers[c]} للمقاس ${row[0] || r + 1}`}
                      className={cn(cell, c === 0 && "font-semibold text-espresso")}
                      dir="ltr"
                      value={row[c] ?? ""}
                      placeholder={c === 0 ? "L" : "—"}
                      onChange={(e) => setCell(r, c, e.target.value)}
                    />
                  </td>
                ))}
                <td className="p-1.5">
                  <div className="flex items-center justify-center">
                    <button type="button" className={iconBtn} onClick={() => moveRow(r, -1)} disabled={r === 0} aria-label="نقل الصف للأعلى">
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button type="button" className={iconBtn} onClick={() => moveRow(r, 1)} disabled={r === g.rows.length - 1} aria-label="نقل الصف للأسفل">
                      <ArrowDown className="size-3.5" />
                    </button>
                    <button type="button" className={cn(iconBtn, "hover:bg-danger/10 hover:text-danger")} onClick={() => removeRow(r)} aria-label={`حذف المقاس ${row[0] || r + 1}`}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addRow}
        disabled={g.rows.length >= SIZE_GUIDE_LIMITS.rows}
        className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-copper-deep hover:bg-bone disabled:opacity-30"
      >
        <Plus className="size-4" aria-hidden />
        إضافة مقاس
      </button>
      <ActionFieldError name={`${path}.headers`} />
      <ActionFieldError name={`${path}.rows`} />

      <div className="mt-4">
        <label htmlFor={`guide-note-${g.id}`} className="mb-1 block text-[0.8rem] font-medium text-umber">
          ملاحظة تحت الجدول
        </label>
        <Textarea id={`guide-note-${g.id}`} rows={2} className="text-sm" value={g.note} onChange={(e) => onChange({ note: e.target.value })} />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[0.8rem] font-medium text-umber">نصائح «كيف أختار مقاسي؟»</p>
        <ListEditor
          items={g.tips}
          onChange={(tips) => onChange({ tips })}
          create={() => ({ title: "", body: "" })}
          max={SIZE_GUIDE_LIMITS.tips}
          addLabel="إضافة نصيحة"
          emptyLabel="بدون نصائح."
          itemLabel={(k) => `النصيحة ${k + 1}`}
          render={(t, upd, k) => (
            <div className="grid gap-2">
              <Input aria-label="عنوان النصيحة" className="h-10 text-sm" value={t.title} onChange={(e) => upd({ ...t, title: e.target.value })} placeholder="مثلاً: محيط الصدر" />
              <ActionFieldError name={`${path}.tips.${k}.title`} />
              <Textarea aria-label="نص النصيحة" rows={2} className="min-h-0 text-sm" value={t.body} onChange={(e) => upd({ ...t, body: e.target.value })} />
            </div>
          )}
        />
      </div>
    </section>
  );
}
