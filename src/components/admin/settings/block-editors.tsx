"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, CircleAlert, CircleCheck, ExternalLink, PenLine, Plus, Search, X } from "lucide-react";
import {
  BLOCK_LIMITS,
  BLOCK_TONES,
  FEATURE_ICONS,
  parseVideoUrl,
  type Block,
  type BlockTone,
  type BannerBlock,
  type CountdownBlock,
  type FaqBlock,
  type FeatureIcon,
  type FeaturesBlock,
  type GalleryBlock,
  type HomeSectionKey,
  type ImageTextBlock,
  type LookBlock,
  type MarqueeBlock,
  type NewsletterBlock,
  type ProductsBlock,
  type SpacerBlock,
  type TextBlock,
  type VideoBlock,
} from "@/lib/blocks";
import type { MediaLike } from "@/components/ui/media-image";
import { cn } from "@/lib/utils";
import { Input, Select, Switch, Textarea } from "@/components/ui/field";
import { ActionFieldError, useActionFormState } from "@/components/admin/ui-client";
import { ImageUploader } from "@/components/admin/image-uploader";
import { ListEditor } from "./list-editors";
import { FEATURE_ICON_META, PIECES, countAr, type SectionsCatalog } from "./block-meta";

/** A partial update of one block (never its id or type). */
export type BlockPatch = Block extends infer T ? (T extends Block ? Partial<Omit<T, "id" | "type">> : never) : never;

/** <datalist> id with the store's internal links (rendered once by the sections editor). */
export const LINKS_DATALIST_ID = "sections-link-suggestions";

/* ─────────── field primitives ─────────── */

function useFieldError(path: string): string | undefined {
  const { state } = useActionFormState();
  return state && !state.ok ? state.fieldErrors?.[path] : undefined;
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-[0.8rem] font-medium text-umber">
      {children}
    </label>
  );
}

function Hint({ id, children, tone = "muted" }: { id?: string; children: ReactNode; tone?: "muted" | "warn" | "ok" }) {
  return (
    <p id={id} className={cn("mt-1.5 text-xs leading-5", tone === "warn" ? "text-warning" : tone === "ok" ? "text-success" : "text-taupe")}>
      {children}
    </p>
  );
}

type TextFieldProps = {
  id: string;
  path: string;
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  hint?: ReactNode;
  /** textarea rows (omit for a single-line input) */
  rows?: number;
  ltr?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  list?: string;
};

function TextField({ id, path, label, value, onChange, hint, rows, ltr, placeholder, maxLength, className, list }: TextFieldProps) {
  const err = useFieldError(path);
  const hintId = hint && !err ? `${id}-hint` : undefined;
  const common = {
    id,
    value,
    placeholder,
    maxLength,
    "aria-invalid": err ? true : undefined,
    "aria-describedby": hintId,
    dir: ltr ? "ltr" : undefined,
    style: ltr ? { textAlign: "right" as const } : undefined,
  };
  return (
    <div className={className} data-invalid={err ? "" : undefined}>
      <FieldLabel htmlFor={id}>
        {label}
      </FieldLabel>
      {rows ? (
        <Textarea {...common} rows={rows} className="min-h-0 text-sm" onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input {...common} list={list} className="h-11 text-sm" onChange={(e) => onChange(e.target.value)} />
      )}
      {err ? <ActionFieldError name={path} /> : hint ? <Hint id={hintId}>{hint}</Hint> : null}
    </div>
  );
}

function NumberField({ id, path, label, value, min, max, onChange, hint, suffix }: { id: string; path: string; label: ReactNode; value: number; min: number; max: number; onChange: (v: number) => void; hint?: ReactNode; suffix?: string }) {
  const err = useFieldError(path);
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n)));
  return (
    <div data-invalid={err ? "" : undefined}>
      <FieldLabel htmlFor={id}>
        {label}
      </FieldLabel>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          dir="ltr"
          style={{ textAlign: "right" }}
          className={cn("h-11 text-sm tabular-nums", suffix && "pe-16")}
          aria-invalid={err ? true : undefined}
          value={draft ?? String(value)}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value !== "" && Number.isFinite(n)) onChange(clamp(n));
          }}
          onBlur={() => setDraft(null)}
        />
        {suffix && <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-xs text-taupe">{suffix}</span>}
      </div>
      {err ? <ActionFieldError name={path} /> : hint ? <Hint>{hint}</Hint> : null}
    </div>
  );
}

/** Segmented single choice built on native radios (arrow keys, RTL and screen readers for free). */
function Choice<V extends string | number>({
  name,
  path,
  label,
  value,
  options,
  onChange,
  hint,
}: {
  name: string;
  path: string;
  label: ReactNode;
  value: V;
  options: { value: V; label: string }[];
  onChange: (v: V) => void;
  hint?: ReactNode;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1 text-[0.8rem] font-medium text-umber">{label}</legend>
      <div className="inline-flex max-w-full flex-wrap gap-0.5 rounded-2xl border border-line bg-paper p-1">
        {options.map((o) => (
          <label key={String(o.value)} className="relative">
            <input type="radio" name={name} className="peer sr-only" checked={o.value === value} onChange={() => onChange(o.value)} />
            <span className="inline-flex h-8 cursor-pointer select-none items-center rounded-xl px-3 text-[0.8rem] text-taupe transition-colors duration-200 hover:text-espresso peer-checked:bg-espresso peer-checked:font-medium peer-checked:text-paper peer-focus-visible:ring-2 peer-focus-visible:ring-copper/50">
              {o.label}
            </span>
          </label>
        ))}
      </div>
      <ActionFieldError name={path} />
      {hint && <Hint>{hint}</Hint>}
    </fieldset>
  );
}

/** Colour swatches (native radios) with the chosen name spelled out. */
function Swatches<V extends string>({ name, path, label, value, options, onChange }: { name: string; path: string; label: ReactNode; value: V; options: { value: V; label: string; swatch: string }[]; onChange: (v: V) => void }) {
  const current = options.find((o) => o.value === value);
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1 text-[0.8rem] font-medium text-umber">
        {label}
        {current && <span className="ms-1.5 font-normal text-taupe">— {current.label}</span>}
      </legend>
      <div className="flex flex-wrap gap-2 pt-0.5">
        {options.map((o) => (
          <label key={o.value} className="relative" title={o.label}>
            <input type="radio" name={name} className="peer sr-only" checked={o.value === value} onChange={() => onChange(o.value)} />
            <span className={cn("block size-9 cursor-pointer rounded-full ring-1 ring-line ring-offset-2 ring-offset-paper transition-shadow peer-checked:ring-2 peer-checked:ring-copper peer-focus-visible:ring-2 peer-focus-visible:ring-copper/60", o.swatch)} />
            <span className="sr-only">{o.label}</span>
          </label>
        ))}
      </div>
      <ActionFieldError name={path} />
    </fieldset>
  );
}

const TONE_SWATCH: Record<BlockTone, string> = {
  paper: "bg-paper border border-line",
  ivory: "bg-ivory border border-line",
  bone: "bg-bone",
  dark: "bg-espresso",
  accent: "bg-copper",
};
const TONE_OPTIONS = BLOCK_TONES.map((t) => ({ ...t, swatch: TONE_SWATCH[t.value] }));

function ToneField({ name, path, value, onChange, label = "لون الخلفية" }: { name: string; path: string; value: BlockTone; onChange: (t: BlockTone) => void; label?: string }) {
  return <Swatches name={name} path={path} label={label} value={value} options={TONE_OPTIONS} onChange={onChange} />;
}

type MarqueeTone = MarqueeBlock["tone"];
const MARQUEE_TONES: { value: MarqueeTone; label: string; swatch: string; preview: string }[] = [
  { value: "ivory", label: "عاجي", swatch: "bg-bone border border-line", preview: "bg-bone text-espresso border border-line" },
  { value: "espresso", label: "إسبريسو", swatch: "bg-espresso", preview: "bg-espresso text-paper/90" },
  { value: "copper", label: "نحاسي", swatch: "bg-copper", preview: "bg-copper text-paper" },
  { value: "burgundy", label: "برغندي", swatch: "bg-burgundy", preview: "bg-burgundy text-paper/90" },
  { value: "navy", label: "كحلي", swatch: "bg-navy", preview: "bg-navy text-paper/90" },
];

function ImageField({ path, label, hint, value, onChange, alt }: { path: string; label: string; hint?: string; value: string | null; onChange: (id: string | null) => void; alt?: string }) {
  return (
    <div className="min-w-0">
      <ImageUploader value={value ? [{ id: value }] : []} onChange={(v) => onChange(v[0]?.id ?? null)} multiple={false} label={label} hint={hint} alt={alt} />
      <ActionFieldError name={path} />
    </div>
  );
}

function Group({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-4 border-t border-line pt-5 first:border-t-0 first:pt-0", className)}>
      {title && <p className="text-xs font-semibold text-mist">{title}</p>}
      {children}
    </div>
  );
}

/* Binds a text field to block[key]: <TextField label="…" {...f("title")} /> */
function binder<T extends Block>(b: T, set: (p: Partial<T>) => void, path: string, id: string) {
  return <K extends keyof T & string>(key: K) => ({
    id: `${id}-${key}`,
    path: `${path}.${key}`,
    value: String(b[key] ?? ""),
    onChange: (v: string) => set({ [key]: v } as unknown as Partial<T>),
  });
}

type EditorProps<T extends Block> = { b: T; set: (p: Partial<T>) => void; path: string; id: string; catalog: SectionsCatalog };

const LIMITS = { eyebrow: 60, title: 120, subtitle: 300, text: 800, cta: 30, href: 200 } as const;
const ltr = (t: string) => <bdi dir="ltr">{t}</bdi>;
const HREF_HINT = (
  <>
    صفحة داخلية مثل {ltr("/shop")} أو {ltr("/pages/…")}، أو رابط كامل يبدأ بـ {ltr("https://")}
  </>
);

function HeadingFields<T extends Block & { eyebrow: string; title: string }>({ b, set, path, id, body }: EditorProps<T> & { body?: { key: "subtitle" | "text"; label: string; rows?: number } }) {
  const f = binder(b, set, path, id);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField label="العنوان الصغير (فوق العنوان)" placeholder="اختياري" maxLength={LIMITS.eyebrow} {...f("eyebrow")} />
      <TextField label="العنوان" maxLength={LIMITS.title} {...f("title")} />
      {body && (
        <TextField
          className="sm:col-span-2"
          label={body.label}
          rows={body.rows ?? 3}
          maxLength={body.key === "subtitle" ? LIMITS.subtitle : LIMITS.text}
          {...f(body.key as keyof T & string)}
        />
      )}
    </div>
  );
}

function CtaFields<T extends Block & { ctaLabel: string; ctaHref: string }>({ b, set, path, id }: EditorProps<T>) {
  const f = binder(b, set, path, id);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField label="نص الزر" hint="اتركه فارغاً لإخفاء الزر." maxLength={LIMITS.cta} {...f("ctaLabel")} />
      <TextField label="رابط الزر" ltr placeholder="/shop" hint={HREF_HINT} maxLength={LIMITS.href} list={LINKS_DATALIST_ID} {...f("ctaHref")} />
    </div>
  );
}

/* ─────────── per-type editors ─────────── */

function BannerEditor(p: EditorProps<BannerBlock>) {
  const { b, set, path, id } = p;
  return (
    <>
      <Group>
        <div className="grid gap-5 md:grid-cols-2">
          <ImageField path={`${path}.mediaId`} label="الصورة" hint="صورة أفقية عريضة بجودة عالية (يُفضّل 16:9 أو أعرض)." value={b.mediaId} onChange={(mediaId) => set({ mediaId })} alt={b.title} />
          <ImageField path={`${path}.mobileMediaId`} label="صورة خاصة بالجوال (اختيارية)" hint="صورة عمودية تظهر على الجوال بدلاً من الصورة الرئيسية." value={b.mobileMediaId} onChange={(mobileMediaId) => set({ mobileMediaId })} alt={b.title} />
        </div>
      </Group>
      <Group title="النص">
        <HeadingFields {...p} body={{ key: "text", label: "النص", rows: 2 }} />
        <CtaFields {...p} />
      </Group>
      <Group title="المظهر">
        <div className="grid gap-4 sm:grid-cols-2">
          <Choice
            name={`${id}-align`}
            path={`${path}.align`}
            label="موضع النص"
            value={b.align}
            onChange={(align) => set({ align })}
            options={[
              { value: "start", label: "يمين" },
              { value: "center", label: "وسط" },
              { value: "end", label: "يسار" },
            ]}
          />
          <Choice
            name={`${id}-height`}
            path={`${path}.height`}
            label="الارتفاع"
            value={b.height}
            onChange={(height) => set({ height })}
            options={[
              { value: "md", label: "متوسط" },
              { value: "lg", label: "كبير" },
              { value: "screen", label: "ملء الشاشة" },
            ]}
          />
        </div>
        <div className="sm:w-1/2">
          <FieldLabel htmlFor={`${id}-overlay`}>
            {`تعتيم الصورة: ${b.overlay}%`}
          </FieldLabel>
          <input id={`${id}-overlay`} type="range" min={0} max={90} step={5} value={b.overlay} onChange={(e) => set({ overlay: Number(e.target.value) })} className="w-full accent-copper" />
          <Hint>زِده إذا كان النص غير واضح فوق الصورة.</Hint>
          <ActionFieldError name={`${path}.overlay`} />
        </div>
      </Group>
    </>
  );
}

const PRODUCT_SOURCES: { value: ProductsBlock["source"]; label: string }[] = [
  { value: "newest", label: "الأحدث إضافةً" },
  { value: "featured", label: "المنتجات المميزة" },
  { value: "new", label: "المعلَّمة «جديد»" },
  { value: "category", label: "من تصنيف معيّن" },
  { value: "manual", label: "اختيار يدوي" },
];

function ProductsEditor(p: EditorProps<ProductsBlock>) {
  const { b, set, path, id, catalog } = p;
  const lim = BLOCK_LIMITS.manualProducts;
  return (
    <>
      <Group>
        <HeadingFields {...p} body={{ key: "subtitle", label: "الوصف (اختياري)", rows: 2 }} />
      </Group>
      <Group title="المنتجات المعروضة">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor={`${id}-source`}>
              مصدر المنتجات
            </FieldLabel>
            <Select id={`${id}-source`} className="h-11 text-sm" value={b.source} onChange={(e) => set({ source: e.target.value as ProductsBlock["source"] })}>
              {PRODUCT_SOURCES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <ActionFieldError name={`${path}.source`} />
          </div>
          {b.source === "category" && (
            <div>
              <FieldLabel htmlFor={`${id}-categorySlug`}>التصنيف</FieldLabel>
              <Select id={`${id}-categorySlug`} className="h-11 text-sm" value={b.categorySlug} onChange={(e) => set({ categorySlug: e.target.value })}>
                <option value="">اختر تصنيفاً…</option>
                {catalog.categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
                {b.categorySlug && !catalog.categories.some((c) => c.slug === b.categorySlug) && <option value={b.categorySlug}>{`${b.categorySlug} (غير موجود)`}</option>}
              </Select>
              <ActionFieldError name={`${path}.categorySlug`} />
              {!catalog.categories.length && <Hint tone="warn">لا توجد تصنيفات بعد — أضفها من صفحة «التصنيفات».</Hint>}
            </div>
          )}
          {b.source !== "manual" && <NumberField id={`${id}-limit`} path={`${path}.limit`} label="عدد القطع" min={2} max={24} value={b.limit} onChange={(limit) => set({ limit })} hint="من 2 إلى 24 قطعة." />}
        </div>
        {b.source === "manual" && (
          <ProductPicker
            id={`${id}-picker`}
            path={`${path}.productIds`}
            ids={b.productIds}
            products={catalog.products}
            max={lim}
            // keep the display limit in step with the hand-picked list
            onChange={(productIds) => set({ productIds, limit: Math.min(24, Math.max(2, productIds.length)) })}
          />
        )}
        <Choice
          name={`${id}-layout`}
          path={`${path}.layout`}
          label="طريقة العرض"
          value={b.layout}
          onChange={(layout) => set({ layout })}
          options={[
            { value: "grid", label: "شبكة" },
            { value: "carousel", label: "شريط أفقي متحرك" },
          ]}
        />
      </Group>
      <Group title="الزر">
        <CtaFields {...p} />
      </Group>
    </>
  );
}

/** Light Arabic normalisation so «احذيه» finds «أحذية». */
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[ً-ْـ]/g, "")
    .trim();

function ProductPicker({ id, path, ids, products, max, onChange }: { id: string; path: string; ids: number[]; products: SectionsCatalog["products"]; max: number; onChange: (ids: number[]) => void }) {
  const [q, setQ] = useState("");
  const byId = new Map(products.map((x) => [x.id, x]));
  const full = ids.length >= max;
  const term = norm(q);
  const results = term ? products.filter((x) => norm(x.name).includes(term)) : products;
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    const next = ids.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const thumb = (imageId: string | null | undefined, size = "w-9") =>
    imageId ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`/media/${imageId}/sm`} alt="" loading="lazy" className={cn("aspect-[4/5] shrink-0 rounded-md object-cover", size)} />
    ) : (
      <span className={cn("aspect-[4/5] shrink-0 rounded-md bg-bone", size)} />
    );
  const btn = "grid size-8 place-items-center rounded-full text-taupe transition-colors hover:bg-bone hover:text-espresso aria-disabled:pointer-events-none aria-disabled:opacity-30";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="min-w-0">
        <p className="mb-1.5 flex items-center justify-between text-[0.8rem] font-medium text-umber">
          القطع المختارة
          <span className="text-xs font-normal tabular-nums text-taupe">{`${ids.length}/${max}`}</span>
        </p>
        <ActionFieldError name={path} className="mb-2 mt-0" />
        {ids.length === 0 ? (
          <p className="rounded-xl border border-dashed border-sand px-4 py-6 text-center text-sm leading-6 text-taupe">ابحث عن قطعة وأضفها — تظهر بالترتيب الذي تختاره.</p>
        ) : (
          <ol className="space-y-1.5" aria-label="القطع المختارة">
            {ids.map((pid, i) => {
              const prod = byId.get(pid);
              const name = prod?.name ?? `منتج غير متاح (#${pid})`;
              return (
                <li key={pid} className="flex items-center gap-2.5 rounded-xl border border-line bg-paper p-1.5 ps-2">
                  <span className="w-4 shrink-0 text-center text-[0.7rem] tabular-nums text-mist" aria-hidden>
                    {i + 1}
                  </span>
                  {thumb(prod?.imageId)}
                  <span className={cn("min-w-0 flex-1 truncate text-sm", prod ? "text-espresso" : "text-danger")}>{name}</span>
                  <span className="flex shrink-0">
                    <button type="button" className={btn} aria-disabled={i === 0 || undefined} onClick={() => move(i, -1)} aria-label={`تقديم ${name}`}>
                      <ArrowUp className="size-4" aria-hidden />
                    </button>
                    <button type="button" className={btn} aria-disabled={i === ids.length - 1 || undefined} onClick={() => move(i, 1)} aria-label={`تأخير ${name}`}>
                      <ArrowDown className="size-4" aria-hidden />
                    </button>
                    <button type="button" className={cn(btn, "hover:bg-danger/10 hover:text-danger")} onClick={() => onChange(ids.filter((x) => x !== pid))} aria-label={`إزالة ${name}`}>
                      <X className="size-4" aria-hidden />
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <div className="min-w-0">
        <FieldLabel htmlFor={`${id}-q`}>
          إضافة قطع
        </FieldLabel>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-mist" aria-hidden />
          <Input id={`${id}-q`} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم المنتج…" className="h-10 ps-9 text-sm" autoComplete="off" />
        </div>
        {full && <Hint tone="warn">{`وصلت للحد الأقصى (${countAr(max, PIECES)}) — أزل قطعة لإضافة أخرى.`}</Hint>}
        <ul className="mt-2 max-h-72 space-y-0.5 overflow-y-auto overscroll-contain rounded-xl border border-line bg-paper p-1" aria-label="نتائج البحث">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-taupe">{products.length ? "لا نتائج مطابقة." : "لا توجد منتجات منشورة بعد."}</li>}
          {results.map((x) => {
            const added = ids.includes(x.id);
            return (
              <li key={x.id}>
                <button
                  type="button"
                  disabled={added || full}
                  onClick={() => onChange([...ids, x.id])}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-start text-sm transition-colors hover:bg-bone focus-visible:bg-bone disabled:cursor-default disabled:hover:bg-transparent"
                >
                  {thumb(x.imageId, "w-8")}
                  <span className={cn("min-w-0 flex-1 truncate", added || full ? "text-taupe" : "text-espresso")}>{x.name}</span>
                  {added ? <CircleCheck className="size-4 shrink-0 text-success" aria-label="مضاف" /> : !full && <Plus className="size-4 shrink-0 text-copper" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function TextEditor(p: EditorProps<TextBlock>) {
  const { b, set, path, id } = p;
  return (
    <>
      <Group>
        <HeadingFields {...p} body={{ key: "text", label: "النص", rows: 5 }} />
        <CtaFields {...p} />
      </Group>
      <Group title="المظهر">
        <div className="grid gap-4 sm:grid-cols-2">
          <Choice
            name={`${id}-align`}
            path={`${path}.align`}
            label="محاذاة النص"
            value={b.align}
            onChange={(align) => set({ align })}
            options={[
              { value: "start", label: "يمين" },
              { value: "center", label: "وسط" },
            ]}
          />
          <ToneField name={`${id}-tone`} path={`${path}.tone`} value={b.tone} onChange={(tone) => set({ tone })} />
        </div>
      </Group>
    </>
  );
}

function ImageTextEditor(p: EditorProps<ImageTextBlock>) {
  const { b, set, path, id } = p;
  return (
    <>
      <Group>
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <ImageField path={`${path}.mediaId`} label="الصورة" hint="يُفضّل صورة عمودية 4:5." value={b.mediaId} onChange={(mediaId) => set({ mediaId })} alt={b.title} />
          <div className="space-y-4">
            <Choice
              name={`${id}-imageSide`}
              path={`${path}.imageSide`}
              label="موضع الصورة"
              value={b.imageSide}
              onChange={(imageSide) => set({ imageSide })}
              options={[
                { value: "start", label: "يمين النص" },
                { value: "end", label: "يسار النص" },
              ]}
              hint="على الجوال تظهر الصورة أولاً دائماً."
            />
            <ToneField name={`${id}-tone`} path={`${path}.tone`} value={b.tone} onChange={(tone) => set({ tone })} />
          </div>
        </div>
      </Group>
      <Group title="النص">
        <HeadingFields {...p} body={{ key: "text", label: "النص", rows: 4 }} />
        <CtaFields {...p} />
      </Group>
    </>
  );
}

function GalleryEditor(p: EditorProps<GalleryBlock>) {
  const { b, set, path, id } = p;
  const max = BLOCK_LIMITS.galleryItems;
  const media: MediaLike[] = b.items.flatMap((it) => (it.mediaId ? [{ id: it.mediaId, alt: it.caption }] : []));
  // The uploader owns order & removal; captions/links follow their image.
  const onMedia = (next: MediaLike[]) => {
    const pool = b.items.filter((it) => it.mediaId);
    const items = next.map((m) => {
      const k = pool.findIndex((it) => it.mediaId === m.id);
      return k >= 0 ? pool.splice(k, 1)[0] : { mediaId: m.id, caption: "", href: "" };
    });
    set({ items: [...items, ...b.items.filter((it) => !it.mediaId)] });
  };
  const update = (i: number, patch: Partial<GalleryBlock["items"][number]>) => set({ items: b.items.map((it, k) => (k === i ? { ...it, ...patch } : it)) });
  const aspect = b.aspect === "square" ? "aspect-square" : b.aspect === "landscape" ? "aspect-[4/3]" : "aspect-[4/5]";

  return (
    <>
      <Group>
        <HeadingFields {...p} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Choice
            name={`${id}-columns`}
            path={`${path}.columns`}
            label="عدد الأعمدة (على الكمبيوتر)"
            value={b.columns}
            onChange={(columns) => set({ columns })}
            options={[
              { value: 2, label: "2" },
              { value: 3, label: "3" },
              { value: 4, label: "4" },
            ]}
            hint="على الجوال تظهر الصور في عمودين."
          />
          <Choice
            name={`${id}-aspect`}
            path={`${path}.aspect`}
            label="شكل الصور"
            value={b.aspect}
            onChange={(aspect) => set({ aspect })}
            options={[
              { value: "portrait", label: "طولية" },
              { value: "square", label: "مربعة" },
              { value: "landscape", label: "عرضية" },
            ]}
          />
        </div>
      </Group>
      <Group title={`الصور (${b.items.length}/${max})`}>
        <ImageUploader value={media} onChange={onMedia} multiple max={max} alt={b.title} hint="ارفع عدة صور دفعة واحدة واسحبها لترتيبها، ثم أضف لكل صورة عنواناً ورابطاً (اختياريين)." />
        <ActionFieldError name={`${path}.items`} />
        {b.items.length > 0 && (
          <ol className="space-y-2" aria-label="عناوين الصور وروابطها">
            {b.items.map((it, i) => (
              <li key={`${it.mediaId ?? "x"}-${i}`} className="flex items-start gap-3 rounded-xl border border-line bg-paper p-2.5">
                {it.mediaId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/media/${it.mediaId}/sm`} alt="" loading="lazy" className={cn("w-14 shrink-0 rounded-lg object-cover", aspect)} />
                ) : (
                  <span className={cn("grid w-14 shrink-0 place-items-center rounded-lg bg-bone text-[0.6rem] text-taupe", aspect)}>بلا صورة</span>
                )}
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`${id}-cap-${i}`} className="sr-only">{`عنوان الصورة ${i + 1}`}</label>
                    <Input id={`${id}-cap-${i}`} className="h-10 text-sm" placeholder={`عنوان الصورة ${i + 1} (اختياري)`} maxLength={80} value={it.caption} onChange={(e) => update(i, { caption: e.target.value })} />
                    <ActionFieldError name={`${path}.items.${i}.caption`} />
                    <ActionFieldError name={`${path}.items.${i}.mediaId`} />
                  </div>
                  <div>
                    <label htmlFor={`${id}-href-${i}`} className="sr-only">{`رابط الصورة ${i + 1}`}</label>
                    <Input id={`${id}-href-${i}`} className="h-10 text-sm" dir="ltr" style={{ textAlign: "right" }} placeholder="/shop/… (اختياري)" list={LINKS_DATALIST_ID} maxLength={200} value={it.href} onChange={(e) => update(i, { href: e.target.value })} />
                    <ActionFieldError name={`${path}.items.${i}.href`} />
                  </div>
                </div>
                {!it.mediaId && (
                  <button type="button" onClick={() => set({ items: b.items.filter((_, k) => k !== i) })} className="grid size-9 shrink-0 place-items-center rounded-full text-taupe hover:bg-danger/10 hover:text-danger" aria-label={`حذف العنصر ${i + 1}`}>
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
      </Group>
    </>
  );
}

function FeaturesEditor(p: EditorProps<FeaturesBlock>) {
  const { b, set, path, id } = p;
  return (
    <>
      <Group>
        <HeadingFields {...p} body={{ key: "subtitle", label: "الوصف (اختياري)", rows: 2 }} />
        <ToneField name={`${id}-tone`} path={`${path}.tone`} value={b.tone} onChange={(tone) => set({ tone })} />
      </Group>
      <Group title="المميزات">
        <ActionFieldError name={`${path}.items`} />
        <ListEditor
          items={b.items}
          onChange={(items) => set({ items })}
          create={() => ({ icon: FEATURE_ICONS[0], title: "", body: "" })}
          max={BLOCK_LIMITS.featureItems}
          addLabel="إضافة ميزة"
          emptyLabel="لا مميزات بعد."
          itemLabel={(i) => `الميزة ${i + 1}`}
          render={(it, update, i) => {
            const Icon = FEATURE_ICON_META[it.icon]?.icon ?? FEATURE_ICON_META.star.icon;
            return (
              <div className="grid gap-2 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
                <div className="flex items-center gap-2">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-bone text-copper-deep" aria-hidden>
                    <Icon className="size-[1.1rem]" strokeWidth={1.6} />
                  </span>
                  <Select aria-label={`أيقونة الميزة ${i + 1}`} className="h-10 min-w-0 flex-1 text-sm" value={it.icon} onChange={(e) => update({ ...it, icon: e.target.value as FeatureIcon })}>
                    {FEATURE_ICONS.map((k) => (
                      <option key={k} value={k}>
                        {FEATURE_ICON_META[k].label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Input aria-label={`عنوان الميزة ${i + 1}`} className="h-10 text-sm" placeholder="توصيل لكل المحافظات" maxLength={60} value={it.title} onChange={(e) => update({ ...it, title: e.target.value })} />
                  <ActionFieldError name={`${path}.items.${i}.title`} />
                </div>
                <div className="sm:col-span-2">
                  <Textarea aria-label={`وصف الميزة ${i + 1}`} rows={2} className="min-h-0 text-sm" placeholder="سطر قصير يشرح الميزة (اختياري)" maxLength={200} value={it.body} onChange={(e) => update({ ...it, body: e.target.value })} />
                  <ActionFieldError name={`${path}.items.${i}.body`} />
                </div>
              </div>
            );
          }}
        />
      </Group>
    </>
  );
}

function VideoEditor(p: EditorProps<VideoBlock>) {
  const { b, set, path, id } = p;
  const f = binder(b, set, path, id);
  const parsed = parseVideoUrl(b.url);
  const isFile = parsed?.kind === "file";
  const status = !b.url.trim() ? null : parsed ? (
    <Hint tone="ok">
      <CircleCheck className="me-1 inline size-3.5 align-[-2px]" aria-hidden />
      {parsed.kind === "youtube" ? "رابط يوتيوب صالح" : parsed.kind === "vimeo" ? "رابط فيميو صالح" : "ملف فيديو مباشر صالح"}
    </Hint>
  ) : (
    <Hint tone="warn">
      <CircleAlert className="me-1 inline size-3.5 align-[-2px]" aria-hidden />
      رابط غير مدعوم — استخدم رابط يوتيوب أو فيميو، أو ملف {ltr(".mp4")} يبدأ بـ {ltr("https://")}
    </Hint>
  );
  return (
    <>
      <Group>
        <div>
          <TextField label="رابط الفيديو" ltr placeholder="https://www.youtube.com/watch?v=…" maxLength={500} {...f("url")} />
          <div aria-live="polite">{status ?? <Hint>يوتيوب، فيميو، أو رابط مباشر لملف {ltr(".mp4")} أو {ltr(".webm")}</Hint>}</div>
        </div>
        <HeadingFields {...p} body={{ key: "text", label: "نص قصير (اختياري)", rows: 2 }} />
      </Group>
      <Group title="ملف الفيديو المباشر">
        <div className="grid gap-5 md:grid-cols-2">
          <ImageField path={`${path}.posterId`} label="صورة الغلاف (اختيارية)" hint="تظهر قبل تشغيل ملف الفيديو — يوتيوب وفيميو يستخدمان صورتهما." value={b.posterId} onChange={(posterId) => set({ posterId })} alt={b.title} />
          <div>
            <Switch checked={b.autoplay} onChange={(e) => set({ autoplay: e.target.checked })} label="تشغيل تلقائي صامت ومتكرر" disabled={!isFile && !!parsed} />
            <Hint>{isFile || !parsed ? "مثالي للفيديوهات القصيرة كخلفية متحركة. يعمل مع ملفات ‎.mp4 فقط." : "التشغيل التلقائي متاح لملفات ‎.mp4 فقط."}</Hint>
            <ActionFieldError name={`${path}.autoplay`} />
          </div>
        </div>
      </Group>
    </>
  );
}

function MarqueeEditor({ b, set, path, id }: EditorProps<MarqueeBlock>) {
  const tone = MARQUEE_TONES.find((t) => t.value === b.tone) ?? MARQUEE_TONES[0];
  return (
    <>
      <Group>
        <div className={cn("overflow-hidden whitespace-nowrap rounded-lg px-4 py-2.5 text-center text-[0.8rem]", tone.preview)} aria-hidden>
          {b.items.filter(Boolean).length ? b.items.filter(Boolean).join("  ✦  ") : "لن يظهر الشريط"}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Swatches name={`${id}-tone`} path={`${path}.tone`} label="اللون" value={b.tone} options={MARQUEE_TONES} onChange={(t) => set({ tone: t })} />
          <NumberField id={`${id}-speed`} path={`${path}.speed`} label="سرعة الحركة" suffix="ثانية" min={10} max={120} value={b.speed} onChange={(speed) => set({ speed })} hint="مدة الدورة الكاملة — الأقل أسرع." />
        </div>
      </Group>
      <Group title="العبارات">
        <ActionFieldError name={`${path}.items`} />
        <ListEditor
          items={b.items}
          onChange={(items) => set({ items })}
          create={() => ""}
          max={BLOCK_LIMITS.marqueeItems}
          addLabel="إضافة عبارة"
          emptyLabel="لا عبارات — لن يظهر الشريط."
          itemLabel={(i) => `العبارة ${i + 1}`}
          render={(item, update, i) => (
            <>
              <label htmlFor={`${id}-mq-${i}`} className="sr-only">{`العبارة ${i + 1}`}</label>
              <Input id={`${id}-mq-${i}`} className="h-10 text-sm" value={item} maxLength={60} onChange={(e) => update(e.target.value)} placeholder="مثلاً: شحن دولي لدول الخليج" />
              <ActionFieldError name={`${path}.items.${i}`} />
            </>
          )}
        />
      </Group>
    </>
  );
}

function LookEditor({ b, set, path, id, catalog }: EditorProps<LookBlock>) {
  const f = binder(b, set, path, id);
  return (
    <Group>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="العنوان الصغير" placeholder="Shop the Look" maxLength={LIMITS.eyebrow} {...f("eyebrow")} />
        <div>
          <FieldLabel htmlFor={`${id}-lookSlug`}>
            الإطلالة
          </FieldLabel>
          <Select id={`${id}-lookSlug`} className="h-11 text-sm" value={b.lookSlug} onChange={(e) => set({ lookSlug: e.target.value })}>
            <option value="">أول إطلالة متاحة</option>
            {catalog.looks.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.title}
              </option>
            ))}
            {b.lookSlug && !catalog.looks.some((l) => l.slug === b.lookSlug) && <option value={b.lookSlug}>{`${b.lookSlug} (غير متاحة)`}</option>}
          </Select>
          <ActionFieldError name={`${path}.lookSlug`} />
        </div>
      </div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-taupe">
        صورة الإطلالة ونقاط القطع وخصم الطقم تُعدَّل من صفحة الإطلالات.
        <a href="/admin/looks" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-copper-deep underline-offset-4 hover:underline">
          إدارة الإطلالات
          <ExternalLink className="size-3" aria-hidden />
        </a>
      </p>
    </Group>
  );
}

function NewsletterEditor(p: EditorProps<NewsletterBlock>) {
  const { b, set, path, id } = p;
  return (
    <Group>
      <HeadingFields {...p} body={{ key: "text", label: "النص", rows: 2 }} />
      <ToneField name={`${id}-tone`} path={`${path}.tone`} value={b.tone} onChange={(tone) => set({ tone })} />
      <Hint>يُحفظ البريد في قائمة العملاء المشتركين.</Hint>
    </Group>
  );
}

function FaqEditor(p: EditorProps<FaqBlock>) {
  const { b, set, path } = p;
  return (
    <>
      <Group>
        <HeadingFields {...p} />
      </Group>
      <Group title="الأسئلة">
        <ActionFieldError name={`${path}.items`} />
        <ListEditor
          items={b.items}
          onChange={(items) => set({ items })}
          create={() => ({ q: "", a: "" })}
          max={BLOCK_LIMITS.faqItems}
          addLabel="إضافة سؤال"
          emptyLabel="لا أسئلة بعد."
          itemLabel={(i) => `السؤال ${i + 1}`}
          render={(it, update, i) => (
            <div className="grid gap-2">
              <Input aria-label={`السؤال ${i + 1}`} className="h-10 text-sm" value={it.q} maxLength={160} onChange={(e) => update({ ...it, q: e.target.value })} placeholder="كم يأخذ التوصيل؟" />
              <ActionFieldError name={`${path}.items.${i}.q`} />
              <Textarea aria-label={`إجابة السؤال ${i + 1}`} rows={2} className="min-h-0 text-sm" value={it.a} maxLength={1500} onChange={(e) => update({ ...it, a: e.target.value })} placeholder="الإجابة" />
              <ActionFieldError name={`${path}.items.${i}.a`} />
            </div>
          )}
        />
      </Group>
    </>
  );
}

const DATE_FMT = new Intl.DateTimeFormat("ar-YE-u-nu-latn", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });

function CountdownEditor(p: EditorProps<CountdownBlock>) {
  const { b, set, path, id } = p;
  const f = binder(b, set, path, id);
  const err = useFieldError(`${path}.endsAt`);
  const date = b.endsAt ? new Date(b.endsAt) : null;
  const valid = date && !Number.isNaN(date.getTime());
  return (
    <>
      <Group>
        <div className="grid gap-4 sm:grid-cols-2">
          <div data-invalid={err ? "" : undefined}>
            <FieldLabel htmlFor={`${id}-endsAt`}>
              ينتهي في
            </FieldLabel>
            <Input
              id={`${id}-endsAt`}
              type="datetime-local"
              dir="ltr"
              style={{ textAlign: "right" }}
              className="h-11 text-sm tabular-nums"
              aria-invalid={err ? true : undefined}
              value={b.endsAt.slice(0, 16)}
              onChange={(e) => set({ endsAt: e.target.value })}
            />
            {err ? <ActionFieldError name={`${path}.endsAt`} /> : <Hint tone={valid ? "muted" : "warn"}>{valid ? DATE_FMT.format(date) : "حدّد التاريخ والساعة (بتوقيت المتجر)."}</Hint>}
          </div>
          <TextField label="النص بعد الانتهاء" hint="اتركه فارغاً لإخفاء القسم تلقائياً بعد انتهاء الوقت." maxLength={LIMITS.title} {...f("endedText")} />
        </div>
      </Group>
      <Group title="النص">
        <HeadingFields {...p} body={{ key: "text", label: "النص (اختياري)", rows: 2 }} />
        <CtaFields {...p} />
        <ToneField name={`${id}-tone`} path={`${path}.tone`} value={b.tone} onChange={(tone) => set({ tone })} />
      </Group>
    </>
  );
}

function SpacerEditor({ b, set, path, id }: EditorProps<SpacerBlock>) {
  return (
    <Group>
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <Choice
          name={`${id}-size`}
          path={`${path}.size`}
          label="المسافة"
          value={b.size}
          onChange={(size) => set({ size })}
          options={[
            { value: "sm", label: "صغيرة" },
            { value: "md", label: "متوسطة" },
            { value: "lg", label: "كبيرة" },
          ]}
        />
        <Switch checked={b.line} onChange={(e) => set({ line: e.target.checked })} label="خط رفيع في المنتصف" className="h-10" />
      </div>
    </Group>
  );
}

/* ─────────── dispatcher ─────────── */

/**
 * The fields of one block. `path` is the zod error path prefix of the block
 * (e.g. "layouts.home.3" or "customPages.1.blocks.0").
 */
export function BlockFields({
  block,
  onChange,
  path,
  catalog,
  onEditBuiltin,
}: {
  block: Block;
  onChange: (patch: BlockPatch) => void;
  path: string;
  catalog: SectionsCatalog;
  /** jump to where a built-in section's content is edited */
  onEditBuiltin?: (key: HomeSectionKey) => void;
}) {
  const id = `blk-${block.id}`;
  const common = { path, id, catalog };
  const set = onChange as (p: object) => void;
  switch (block.type) {
    case "builtin":
      return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-bone/60 px-4 py-3.5">
          <p className="text-sm leading-6 text-umber">قسم من تصميم مرموق الأصلي — يمكنك إخفاؤه أو نقله أو حذفه هنا، ويُعدَّل نصه من تبويب «الواجهة الرئيسية».</p>
          {onEditBuiltin && (
            <button type="button" onClick={() => onEditBuiltin(block.key)} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-paper px-4 text-sm text-espresso ring-1 ring-line transition-colors hover:bg-espresso hover:text-paper">
              <PenLine className="size-3.5" aria-hidden />
              تعديل المحتوى
            </button>
          )}
        </div>
      );
    case "banner":
      return <BannerEditor b={block} set={set} {...common} />;
    case "products":
      return <ProductsEditor b={block} set={set} {...common} />;
    case "text":
      return <TextEditor b={block} set={set} {...common} />;
    case "imageText":
      return <ImageTextEditor b={block} set={set} {...common} />;
    case "gallery":
      return <GalleryEditor b={block} set={set} {...common} />;
    case "features":
      return <FeaturesEditor b={block} set={set} {...common} />;
    case "video":
      return <VideoEditor b={block} set={set} {...common} />;
    case "marquee":
      return <MarqueeEditor b={block} set={set} {...common} />;
    case "look":
      return <LookEditor b={block} set={set} {...common} />;
    case "newsletter":
      return <NewsletterEditor b={block} set={set} {...common} />;
    case "faq":
      return <FaqEditor b={block} set={set} {...common} />;
    case "countdown":
      return <CountdownEditor b={block} set={set} {...common} />;
    case "spacer":
      return <SpacerEditor b={block} set={set} {...common} />;
  }
}
