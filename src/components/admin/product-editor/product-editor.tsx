"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, ExternalLink, Layers, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { Card } from "@/components/admin/ui";
import { toast } from "@/components/admin/ui-client";
import { ImageUploader, type MediaLike } from "@/components/admin/image-uploader";
import { checkProductSlugAction, saveProductAction } from "@/app/admin/(panel)/products/actions";
import {
  BRAND_COLORS,
  PRODUCT_STATUS_META,
  SIZE_PRESETS,
  variantKey,
  type CategoryOption,
  type EditorColor,
  type EditorImage,
  type EditorVariant,
  type ProductEditorData,
  type ProductPayload,
  type ProductStatus,
  type SizeGuide,
} from "./types";
import { cn, slugify } from "@/lib/utils";
import { DEFAULT_SET_PARTS, SET_LIMITS, SET_SEPARATOR, formatSetSize, isSetProduct, setCombos, type SetPart } from "@/lib/size-guides";
import { formatMoney, percentOff } from "@/lib/money";

type GuideOption = { id: string; name: string };
type Props = { initial: ProductEditorData; categories: CategoryOption[]; currencySymbol: string; sizeGuides?: GuideOption[] };

/** Rebuild the colour × size grid, keeping existing rows (ids, stock, sku…) where they still exist. */
function buildVariants(colors: EditorColor[], sizes: string[], prev: EditorVariant[]): EditorVariant[] {
  const cs = colors.length ? colors : [{ name: "", hex: "" }];
  const ss = sizes.length ? sizes : [""];
  const byKey = new Map(prev.map((v) => [variantKey(v.color, v.size), v]));
  const out: EditorVariant[] = [];
  for (const c of cs) {
    for (const s of ss) {
      const existing = byKey.get(variantKey(c.name, s));
      out.push(existing ? { ...existing, colorHex: c.hex } : { id: null, color: c.name, colorHex: c.hex, size: s, sku: "", stock: 0, priceOverride: null, isActive: true });
    }
  }
  return out;
}

export function ProductEditor({ initial, categories, currencySymbol, sizeGuides = [] }: Props) {
  const router = useRouter();
  const [d, setD] = useState<ProductEditorData>(initial);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));
  const [slugState, setSlugState] = useState<{ available: boolean; suggestion: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [newColor, setNewColor] = useState<EditorColor>({ name: "", hex: "#5C1A26" });
  const [newSize, setNewSize] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const dirty = useRef(false);

  const set = <K extends keyof ProductEditorData>(k: K, v: ProductEditorData[K]) => {
    dirty.current = true;
    setD((prev) => ({ ...prev, [k]: v }));
  };

  // Auto slug from the name for new products until the slug is edited by hand
  useEffect(() => {
    if (!slugTouched) setD((prev) => ({ ...prev, slug: slugify(prev.name) }));
  }, [d.name, slugTouched]);

  // Live slug availability
  useEffect(() => {
    if (!d.slug || d.slug.length < 2) return setSlugState(null);
    const t = setTimeout(async () => {
      const res = await checkProductSlugAction(d.slug, d.id);
      setSlugState({ available: res.available, suggestion: res.suggestion });
    }, 450);
    return () => clearTimeout(t);
  }, [d.slug, d.id]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, []);

  const setColors = (colors: EditorColor[]) => setD((p) => ({ ...p, colors, variants: buildVariants(colors, isSetProduct(p.setParts) ? setCombos(p.setParts) : p.sizes, p.variants) }));
  const setSizes = (sizes: string[]) => setD((p) => ({ ...p, sizes, variants: buildVariants(p.colors, sizes, p.variants) }));
  /** Set mode: the size grid is every combination of the pieces' sizes ("L / 32"). */
  const setParts = (parts: SetPart[] | null) => {
    dirty.current = true;
    setD((p) => {
      const sizes = isSetProduct(parts) ? setCombos(parts) : p.sizes.filter((x) => !x.includes(SET_SEPARATOR));
      return { ...p, setParts: parts, variants: buildVariants(p.colors, sizes, p.variants) };
    });
  };
  const updatePart = (i: number, patch: Partial<SetPart>) => d.setParts && setParts(d.setParts.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const updateVariant = (i: number, patch: Partial<EditorVariant>) => {
    dirty.current = true;
    setD((p) => ({ ...p, variants: p.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) }));
  };

  const addColor = (c: EditorColor) => {
    const name = c.name.trim();
    if (!name || d.colors.some((x) => x.name === name)) return;
    dirty.current = true;
    setColors([...d.colors, { name, hex: c.hex }]);
    setNewColor({ name: "", hex: c.hex });
  };
  const removeColor = (name: string) => {
    dirty.current = true;
    setColors(d.colors.filter((c) => c.name !== name));
    setD((p) => ({ ...p, images: p.images.map((img) => (img.color === name ? { ...img, color: "" } : img)) }));
  };
  const addSizes = (sizes: string[]) => {
    const next = [...d.sizes];
    for (const s of sizes.map((x) => x.trim())) if (!next.includes(s)) next.push(s);
    dirty.current = true;
    setSizes(next.filter((s, i, a) => !(s === "" && a.length > 1)));
  };

  const totalStock = d.variants.filter((v) => v.isActive).reduce((s, v) => s + (Number(v.stock) || 0), 0);
  const off = percentOff(d.price, d.compareAtPrice);
  const money = (n: number) => formatMoney(n, { code: "", symbol: currencySymbol, position: "after" });
  const statusMeta = PRODUCT_STATUS_META[d.status];
  const imagesAsMedia: MediaLike[] = useMemo(() => d.images.map((i) => ({ id: i.id, blur: i.blur, width: i.width, height: i.height, alt: i.alt })), [d.images]);

  const onImages = (next: MediaLike[]) => {
    dirty.current = true;
    setD((p) => ({
      ...p,
      images: next.map((m): EditorImage => ({ ...m, color: p.images.find((x) => x.id === m.id)?.color ?? "" })),
    }));
  };

  const save = (intent: "save" | "draft") => {
    setErrors({});
    setFormError(null);
    const payload: ProductPayload = {
      id: d.id,
      intent,
      name: d.name,
      subtitle: d.subtitle,
      slug: d.slug,
      categoryId: d.categoryId,
      description: d.description,
      details: d.details.map((x) => x.trim()).filter(Boolean),
      material: d.material,
      origin: d.origin,
      care: d.care,
      sizeGuide: d.sizeGuide,
      price: Number(d.price) || 0,
      compareAtPrice: d.compareAtPrice ? Number(d.compareAtPrice) : null,
      status: d.status,
      isFeatured: d.isFeatured,
      isNew: d.isNew,
      badge: d.badge,
      sortOrder: Number(d.sortOrder) || 0,
      images: d.images.map((i) => ({ id: i.id, color: i.color })),
      setParts: isSetProduct(d.setParts) ? d.setParts.map((x) => ({ label: x.label.trim(), guide: x.guide, sizes: x.sizes })) : null,
      variants: d.variants.map((v) => ({ ...v, stock: Number(v.stock) || 0, priceOverride: v.priceOverride ? Number(v.priceOverride) : null })),
    };
    start(async () => {
      const res = await saveProductAction(payload);
      if (!res) return;
      if (res.ok) {
        dirty.current = false;
        toast(res.message ?? "تم الحفظ", "success");
        const id = Number(res.data?.id);
        const status = res.data?.status as ProductStatus | undefined;
        if (status) setD((p) => ({ ...p, status }));
        if (!d.id && id) router.replace(`/admin/products/${id}`);
        else router.refresh();
      } else {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error ?? "تعذّر الحفظ");
        toast(res.error ?? "تحقق من الحقول المعلّمة", "error");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  const err = (k: string) => errors[k] ?? null;

  return (
    <div className="pb-28">
      {/* ── Sticky action bar ── */}
      <div className="sticky top-16 z-20 -mx-4 mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-ivory/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="display truncate text-xl text-espresso md:text-2xl">{d.id ? d.name || "منتج بدون اسم" : "منتج جديد"}</h1>
          <Badge tone={statusMeta.tone} dot>
            {statusMeta.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {d.id && d.status === "active" && (
            <a href={`/product/${encodeURIComponent(d.slug)}`} target="_blank" rel="noreferrer" className="hidden h-10 items-center gap-1.5 rounded-full px-4 text-sm text-umber hover:bg-bone sm:inline-flex">
              <ExternalLink className="size-4" aria-hidden /> معاينة
            </a>
          )}
          <Button variant="outline" size="sm" className="h-10" disabled={pending} onClick={() => save("draft")}>
            حفظ كمسودة
          </Button>
          <Button variant="primary" size="sm" className="h-10 px-5" loading={pending} onClick={() => save("save")}>
            {d.status === "active" ? (d.id ? "حفظ التغييرات" : "نشر المنتج") : "حفظ"}
          </Button>
        </div>
      </div>

      {formError && (
        <div role="alert" className="mb-5 rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
          {formError}
          {Object.keys(errors).length > 0 && (
            <ul className="mt-1.5 list-inside list-disc text-xs">
              {Object.entries(errors).map(([k, v]) => (
                <li key={k}>{v}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* ── Basics ── */}
          <Card title="المعلومات الأساسية" description="ما يراه العميل أولاً — اكتب بلغة راقية وواضحة.">
            <div className="grid gap-4">
              <Field label="اسم المنتج" htmlFor="name" error={err("name")}>
                <Input id="name" value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="مثال: سويتر بولو كيبل نِت بنصف سحاب" aria-invalid={!!err("name")} />
              </Field>
              <Field label="وصف قصير" htmlFor="subtitle" error={err("subtitle")} hint="سطر واحد يظهر تحت الاسم — الخامة أو أبرز ميزة.">
                <Input id="subtitle" value={d.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="قطن إيطالي 100% · صنع في إيطاليا" />
              </Field>
              <Field
                label="رابط المنتج"
                htmlFor="slug"
                error={err("slug") ?? (slugState && !slugState.available ? `الرابط مستخدم — جرّب «${slugState.suggestion}»` : null)}
                hint={d.slug ? `/product/${d.slug}` : "يُولَّد تلقائياً من الاسم"}
              >
                <div className="relative">
                  <Input
                    id="slug"
                    dir="ltr"
                    className="pe-10 text-start"
                    value={d.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      set("slug", slugify(e.target.value) || e.target.value.toLowerCase());
                    }}
                  />
                  {slugState?.available && <Check className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-success" aria-label="الرابط متاح" />}
                </div>
              </Field>
              <Field label="الوصف" htmlFor="description" error={err("description")}>
                <Textarea id="description" rows={5} value={d.description} onChange={(e) => set("description", e.target.value)} placeholder="احكِ قصة القطعة: الخامة، القصّة، ومتى تُلبس…" />
              </Field>

              <div>
                <p className="mb-1.5 text-sm font-medium text-umber">نقاط التفاصيل</p>
                <ul className="space-y-2">
                  {d.details.map((line, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-gold" aria-hidden>
                        ✦
                      </span>
                      <Input value={line} onChange={(e) => set("details", d.details.map((x, idx) => (idx === i ? e.target.value : x)))} className="h-10" aria-label={`نقطة ${i + 1}`} />
                      <IconBtn label="أعلى" disabled={i === 0} onClick={() => set("details", swap(d.details, i, i - 1))}>
                        <ArrowUp className="size-4" />
                      </IconBtn>
                      <IconBtn label="أسفل" disabled={i === d.details.length - 1} onClick={() => set("details", swap(d.details, i, i + 1))}>
                        <ArrowDown className="size-4" />
                      </IconBtn>
                      <IconBtn label="حذف" onClick={() => set("details", d.details.filter((_, idx) => idx !== i))}>
                        <X className="size-4" />
                      </IconBtn>
                    </li>
                  ))}
                </ul>
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => set("details", [...d.details, ""])} disabled={d.details.length >= 20}>
                  <Plus className="size-4" aria-hidden /> إضافة نقطة
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="الخامة" htmlFor="material" error={err("material")}>
                  <Input id="material" value={d.material} onChange={(e) => set("material", e.target.value)} placeholder="قطن 100%" />
                </Field>
                <Field label="بلد الصنع" htmlFor="origin" error={err("origin")}>
                  <Input id="origin" value={d.origin} onChange={(e) => set("origin", e.target.value)} placeholder="إيطاليا 🇮🇹" />
                </Field>
              </div>
              <Field label="العناية" htmlFor="care" error={err("care")}>
                <Textarea id="care" rows={2} value={d.care} onChange={(e) => set("care", e.target.value)} placeholder="غسيل يدوي بماء بارد، يُجفف مسطحاً…" />
              </Field>
            </div>
          </Card>

          {/* ── Images ── */}
          <Card title="الصور" description="الصورة الأولى هي الغلاف. اربط كل صورة بلونها ليتبدّل المعرض حين يختار العميل اللون.">
            <ImageUploader value={imagesAsMedia} onChange={onImages} multiple max={24} alt={d.name} hint="JPG أو PNG أو WebP حتى 12MB — تُعالَج تلقائياً بثلاثة مقاسات." />
            {d.images.length > 0 && d.colors.length > 0 && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="mb-3 text-sm font-medium text-umber">ربط الصور بالألوان</p>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {d.images.map((img, i) => (
                    <li key={img.id} className="flex items-center gap-2 rounded-xl border border-line bg-ivory p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/media/${img.id}/sm`} alt="" className="aspect-[4/5] w-11 shrink-0 rounded-md object-cover" />
                      <select
                        value={img.color}
                        aria-label={`لون الصورة ${i + 1}`}
                        onChange={(e) => set("images", d.images.map((x) => (x.id === img.id ? { ...x, color: e.target.value } : x)))}
                        className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-paper px-2 text-xs"
                      >
                        <option value="">كل الألوان</option>
                        {d.colors.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {/* ── Variants ── */}
          <Card title="الألوان والمقاسات" description="أضف الألوان والمقاسات ثم حدّد الكمية لكل تركيبة. التركيبات المعطّلة لا تظهر للعميل.">
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-medium text-umber">الألوان</p>
                <div className="flex flex-wrap gap-2">
                  {d.colors.map((c) => (
                    <span key={c.name} className="inline-flex items-center gap-2 rounded-full border border-line bg-paper py-1 pe-1.5 ps-3 text-sm">
                      <span className="size-4 rounded-full ring-1 ring-black/10" style={{ background: c.hex || "#ccc" }} aria-hidden />
                      {c.name}
                      <input
                        type="color"
                        value={c.hex || "#cccccc"}
                        aria-label={`تعديل درجة ${c.name}`}
                        onChange={(e) => setColors(d.colors.map((x) => (x.name === c.name ? { ...x, hex: e.target.value } : x)))}
                        className="size-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
                      />
                      <button type="button" onClick={() => removeColor(c.name)} className="grid size-6 place-items-center rounded-full text-taupe hover:bg-bone hover:text-danger" aria-label={`حذف ${c.name}`}>
                        <X className="size-3.5" />
                      </button>
                    </span>
                  ))}
                  {d.colors.length === 0 && <span className="text-sm text-mist">بدون ألوان — منتج بلون واحد</span>}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Input value={newColor.name} onChange={(e) => setNewColor({ ...newColor, name: e.target.value })} placeholder="اسم اللون" className="h-10 w-40" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addColor(newColor))} />
                  <input type="color" value={newColor.hex} onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })} className="size-10 cursor-pointer rounded-lg border border-line bg-paper p-1" aria-label="درجة اللون" />
                  <Button variant="outline" size="sm" className="h-10" onClick={() => addColor(newColor)} disabled={!newColor.name.trim()}>
                    <Plus className="size-4" aria-hidden /> إضافة
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {BRAND_COLORS.filter((b) => !d.colors.some((c) => c.name === b.name)).map((b) => (
                    <button key={b.name} type="button" onClick={() => addColor(b)} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-bone px-3 text-xs text-umber hover:bg-sand">
                      <span className="size-3 rounded-full ring-1 ring-black/10" style={{ background: b.hex }} aria-hidden />
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-line bg-ivory/60 p-3.5">
                <Switch
                  checked={isSetProduct(d.setParts)}
                  onChange={(e) => setParts(e.target.checked ? structuredClone(DEFAULT_SET_PARTS) : null)}
                  label={
                    <span>
                      <span className="block text-sm font-medium text-espresso">طقم بمقاس لكل قطعة</span>
                      <span className="block text-xs text-taupe">مثل قميص + بنطلون: يختار العميل مقاس القميص ومقاس البنطلون كلٌّ على حدة.</span>
                    </span>
                  }
                />
              </div>

              {isSetProduct(d.setParts) ? (
                <div className="space-y-3">
                  {d.setParts.map((part, i) => (
                    <SetPartEditor
                      key={i}
                      index={i}
                      part={part}
                      guides={sizeGuides}
                      canRemove={d.setParts!.length > 2}
                      onChange={(patch) => updatePart(i, patch)}
                      onRemove={() => setParts(d.setParts!.filter((_, k) => k !== i))}
                    />
                  ))}
                  {d.setParts.length < SET_LIMITS.parts && (
                    <button
                      type="button"
                      onClick={() => setParts([...d.setParts!, { label: "القطعة الثالثة", guide: "none", sizes: ["M", "L", "XL"] }])}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-copper-deep hover:bg-bone"
                    >
                      <Plus className="size-4" aria-hidden />
                      إضافة قطعة (مثل الصديري)
                    </button>
                  )}
                  {err("setParts") && <p className="text-xs text-danger">{err("setParts")}</p>}
                </div>
              ) : (
              <div>
                <p className="mb-2 text-sm font-medium text-umber">المقاسات</p>
                <div className="flex flex-wrap gap-2">
                  {d.sizes.map((s) => (
                    <span key={s || "one"} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-paper pe-1.5 ps-3.5 text-sm tabular-nums">
                      {s || "مقاس واحد"}
                      <button type="button" onClick={() => setSizes(d.sizes.filter((x) => x !== s))} className="grid size-6 place-items-center rounded-full text-taupe hover:bg-bone hover:text-danger" aria-label={`حذف المقاس ${s || "الواحد"}`}>
                        <X className="size-3.5" />
                      </button>
                    </span>
                  ))}
                  {d.sizes.length === 0 && <span className="text-sm text-mist">بدون مقاسات</span>}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {SIZE_PRESETS.map((p) => (
                    <button key={p.label} type="button" onClick={() => addSizes(p.sizes)} className="h-8 rounded-full bg-bone px-3 text-xs text-umber hover:bg-sand">
                      {p.label}
                    </button>
                  ))}
                  <Input value={newSize} onChange={(e) => setNewSize(e.target.value)} placeholder="مقاس آخر" className="h-9 w-28" onKeyDown={(e) => e.key === "Enter" && newSize.trim() && (e.preventDefault(), addSizes([newSize]), setNewSize(""))} />
                </div>
              </div>
              )}

              <div className="rounded-xl border border-line">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-ivory px-4 py-3">
                  <p className="flex items-center gap-2 text-sm text-umber">
                    <Layers className="size-4 text-copper" aria-hidden />
                    {d.variants.length} تركيبة · إجمالي المخزون <span className="font-semibold tabular-nums text-espresso">{totalStock}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <Input value={bulkStock} onChange={(e) => setBulkStock(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="كمية للكل" className="h-9 w-28" />
                    <Button variant="outline" size="sm" disabled={!bulkStock} onClick={() => (setD((p) => ({ ...p, variants: p.variants.map((v) => ({ ...v, stock: Number(bulkStock) })) })), (dirty.current = true), setBulkStock(""))}>
                      تطبيق
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead className="text-xs text-taupe">
                      <tr className="border-b border-line">
                        <th className="px-4 py-2.5 text-start font-medium">التركيبة</th>
                        <th className="px-2 py-2.5 text-start font-medium">الكمية</th>
                        <th className="px-2 py-2.5 text-start font-medium">SKU</th>
                        <th className="px-2 py-2.5 text-start font-medium">سعر خاص</th>
                        <th className="px-4 py-2.5 text-start font-medium">متاح</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.variants.map((v, i) => (
                        <tr key={variantKey(v.color, v.size)} className={cn("border-b border-line/70 last:border-0", !v.isActive && "opacity-55")}>
                          <td className="px-4 py-2">
                            <span className="flex items-center gap-2">
                              {v.color && <span className="size-3.5 rounded-full ring-1 ring-black/10" style={{ background: v.colorHex || "#ccc" }} aria-hidden />}
                              <span className="text-espresso">{[v.color, isSetProduct(d.setParts) ? formatSetSize(d.setParts, v.size) : v.size].filter(Boolean).join(" / ") || "الخيار الافتراضي"}</span>
                              {v.id && d.orderedVariantIds.includes(v.id) && <span className="text-[0.65rem] text-mist">· عليه طلبات</span>}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min={0}
                              value={v.stock}
                              onChange={(e) => updateVariant(i, { stock: Math.max(0, Number(e.target.value) || 0) })}
                              className={cn("h-9 w-20 rounded-lg border bg-paper px-2 tabular-nums outline-none focus:border-copper", v.stock === 0 ? "border-danger/40 text-danger" : "border-line")}
                              aria-label={`كمية ${v.color} ${v.size}`}
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} dir="ltr" className="h-9 w-28 rounded-lg border border-line bg-paper px-2 text-xs outline-none focus:border-copper" aria-label="SKU" />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min={0}
                              value={v.priceOverride ?? ""}
                              placeholder={String(d.price || "")}
                              onChange={(e) => updateVariant(i, { priceOverride: e.target.value ? Number(e.target.value) : null })}
                              className="h-9 w-28 rounded-lg border border-line bg-paper px-2 tabular-nums outline-none focus:border-copper"
                              aria-label="سعر خاص لهذه التركيبة"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Switch checked={v.isActive} onChange={(e) => updateVariant(i, { isActive: e.target.checked })} aria-label="متاح للبيع" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {err("variants") && <p className="text-xs text-danger">{err("variants")}</p>}
            </div>
          </Card>
        </div>

        {/* ── Side column ── */}
        <aside className="space-y-5">
          <Card title="الحالة والظهور">
            <div className="space-y-4">
              <Field label="الحالة" htmlFor="status" error={err("status")}>
                <Select id="status" value={d.status} onChange={(e) => set("status", e.target.value as ProductStatus)}>
                  <option value="active">منشور في المتجر</option>
                  <option value="draft">مسودة (مخفي)</option>
                  <option value="archived">مؤرشف</option>
                </Select>
              </Field>
              <Switch label="منتج مميز (يظهر أولاً)" checked={d.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} />
              <Switch label="شارة «جديد»" checked={d.isNew} onChange={(e) => set("isNew", e.target.checked)} />
              <Field label="شارة مخصصة" htmlFor="badge" error={err("badge")} hint="مثال: الأكثر طلباً · كمية محدودة">
                <Input id="badge" value={d.badge} onChange={(e) => set("badge", e.target.value)} maxLength={30} />
              </Field>
              <Field label="ترتيب الظهور" htmlFor="sortOrder" error={err("sortOrder")} hint="الأصغر يظهر أولاً">
                <Input id="sortOrder" type="number" value={d.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value) || 0)} />
              </Field>
            </div>
          </Card>

          <Card title="التسعير">
            <div className="space-y-4">
              <Field label={`سعر البيع (${currencySymbol})`} htmlFor="price" error={err("price")}>
                <Input id="price" type="number" min={0} inputMode="numeric" value={d.price || ""} onChange={(e) => set("price", Number(e.target.value) || 0)} aria-invalid={!!err("price")} />
              </Field>
              <Field label="السعر قبل الخصم" htmlFor="compare" error={err("compareAtPrice")} hint={off > 0 ? `يظهر للعميل خصم ${off}%` : "اتركه فارغاً إن لم يوجد خصم"}>
                <Input id="compare" type="number" min={0} inputMode="numeric" value={d.compareAtPrice ?? ""} onChange={(e) => set("compareAtPrice", e.target.value ? Number(e.target.value) : null)} />
              </Field>
              {d.price > 0 && (
                <p className="rounded-xl bg-bone px-3 py-2.5 text-sm text-umber">
                  يظهر في المتجر: <span className="font-semibold text-espresso">{money(d.price)}</span>
                  {off > 0 && d.compareAtPrice ? <s className="ms-2 text-mist">{money(d.compareAtPrice)}</s> : null}
                </p>
              )}
            </div>
          </Card>

          <Card title="التصنيف">
            <div className="space-y-4">
              <Field label="التصنيف" htmlFor="category" error={err("categoryId")}>
                <Select id="category" value={d.categoryId ?? ""} onChange={(e) => set("categoryId", e.target.value ? Number(e.target.value) : null)}>
                  <option value="">بدون تصنيف</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="دليل المقاسات" htmlFor="sizeGuide">
                <Select id="sizeGuide" value={d.sizeGuide} onChange={(e) => set("sizeGuide", e.target.value as SizeGuide)} disabled={isSetProduct(d.setParts)}>
                  {sizeGuides.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                  {!sizeGuides.some((g) => g.id === d.sizeGuide) && d.sizeGuide !== "none" && <option value={d.sizeGuide}>دليل محذوف</option>}
                  <option value="none">بدون دليل مقاسات</option>
                </Select>
                <p className="mt-1.5 text-xs leading-5 text-taupe">
                  {isSetProduct(d.setParts) ? "للطقم: اختر دليلاً لكل قطعة في قسم المقاسات." : (
                    <>
                      تعدّل الجداول من{" "}
                      <Link href="/admin/settings?tab=sizes" className="text-copper-deep underline-offset-2 hover:underline">
                        الإعدادات ← دليل المقاسات
                      </Link>
                    </>
                  )}
                </p>
              </Field>
            </div>
          </Card>

          {d.id && (
            <p className="px-1 text-xs leading-relaxed text-taupe">
              بيع من هذا المنتج <span className="font-semibold tabular-nums text-umber">{d.unitsSold}</span> قطعة.{" "}
              <Link href="/admin/products" className="underline-offset-4 hover:underline">
                العودة للمنتجات
              </Link>
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function swap<T>(arr: T[], a: number, b: number): T[] {
  if (b < 0 || b >= arr.length) return arr;
  const next = [...arr];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="grid size-9 shrink-0 place-items-center rounded-full text-taupe hover:bg-bone hover:text-espresso disabled:opacity-30">
      {children}
    </button>
  );
}


/** One piece of a set: its name, size guide and sizes. */
function SetPartEditor({
  index,
  part,
  guides,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  part: SetPart;
  guides: GuideOption[];
  canRemove: boolean;
  onChange: (patch: Partial<SetPart>) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState("");
  const add = (sizes: string[]) => {
    const next = [...part.sizes];
    for (const raw of sizes) {
      const s = raw.trim().replace(/\//g, "-");
      if (s && !next.includes(s) && next.length < SET_LIMITS.sizesPerPart) next.push(s);
    }
    onChange({ sizes: next });
  };
  return (
    <div className="rounded-xl border border-line bg-paper p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-espresso text-xs text-copper-soft tabular-nums">{index + 1}</span>
        <Input aria-label={`اسم القطعة ${index + 1}`} value={part.label} onChange={(e) => onChange({ label: e.target.value })} className="h-9 w-36" maxLength={20} />
        <Select aria-label={`دليل مقاسات القطعة ${index + 1}`} value={part.guide} onChange={(e) => onChange({ guide: e.target.value })} className="h-9 w-auto min-w-40 text-sm">
          {guides.map((g) => (
            <option key={g.id} value={g.id}>
              دليل: {g.name}
            </option>
          ))}
          <option value="none">بدون دليل</option>
        </Select>
        {canRemove && (
          <button type="button" onClick={onRemove} className="ms-auto grid size-8 place-items-center rounded-full text-taupe hover:bg-danger/10 hover:text-danger" aria-label={`حذف القطعة ${part.label}`}>
            <X className="size-4" />
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {part.sizes.map((s) => (
          <span key={s} className="inline-flex h-8 items-center gap-1 rounded-full border border-line bg-ivory pe-1 ps-3 text-sm tabular-nums">
            {s}
            <button type="button" onClick={() => onChange({ sizes: part.sizes.filter((x) => x !== s) })} className="grid size-6 place-items-center rounded-full text-taupe hover:bg-bone hover:text-danger" aria-label={`حذف مقاس ${s} من ${part.label}`}>
              <X className="size-3" />
            </button>
          </span>
        ))}
        {part.sizes.length === 0 && <span className="text-sm text-danger">أضف مقاساً واحداً على الأقل</span>}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {SIZE_PRESETS.filter((p) => p.sizes[0] !== "").map((p) => (
          <button key={p.label} type="button" onClick={() => add(p.sizes)} className="h-8 rounded-full bg-bone px-3 text-xs text-umber hover:bg-sand">
            {p.label}
          </button>
        ))}
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="مقاس آخر"
          aria-label={`مقاس آخر لـ ${part.label}`}
          className="h-8 w-24 text-sm"
          onKeyDown={(e) => e.key === "Enter" && draft.trim() && (e.preventDefault(), add([draft]), setDraft(""))}
        />
      </div>
    </div>
  );
}
