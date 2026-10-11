"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Crosshair, ExternalLink, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Switch, Textarea } from "@/components/ui/field";
import { Card } from "@/components/admin/ui";
import { toast } from "@/components/admin/ui-client";
import { ImageUploader, type MediaLike } from "@/components/admin/image-uploader";
import { deleteLookAction, saveLookAction } from "@/app/admin/(panel)/looks/actions";
import type { LookEditorData, PickerProduct } from "@/app/admin/(panel)/looks/_data";
import { formatMoney } from "@/lib/money";
import { cn, slugify } from "@/lib/utils";

type Item = LookEditorData["items"][number];

export function LookEditor({ initial, products, currencySymbol }: { initial: LookEditorData; products: PickerProduct[]; currencySymbol: string }) {
  const router = useRouter();
  const [d, setD] = useState(initial);
  const [cover, setCover] = useState<MediaLike[]>(initial.cover ? [initial.cover] : []);
  const [active, setActive] = useState<number | null>(initial.items[0]?.productId ?? null);
  const [query, setQuery] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const stage = useRef<HTMLDivElement>(null);
  const dragging = useRef<number | null>(null);

  const byId = (id: number) => products.find((p) => p.id === id);
  const money = (n: number) => formatMoney(n, { code: "", symbol: currencySymbol, position: "after" });
  const total = d.items.reduce((s, i) => s + (byId(i.productId)?.price ?? 0), 0);
  const bundle = total - Math.round((total * d.discountPercent) / 100);

  const setItems = (items: Item[]) => setD((p) => ({ ...p, items }));
  const addItem = (p: PickerProduct) => {
    if (d.items.some((i) => i.productId === p.id) || d.items.length >= 10) return;
    const n = d.items.length;
    setItems([...d.items, { productId: p.id, color: p.colors[0]?.name ?? "", x: 30 + ((n * 17) % 45), y: 20 + ((n * 23) % 60) }]);
    setActive(p.id);
  };

  const placeAt = (clientX: number, clientY: number, productId: number) => {
    const el = stage.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(97, Math.max(3, ((clientX - r.left) / r.width) * 100));
    const y = Math.min(97, Math.max(3, ((clientY - r.top) / r.height) * 100));
    setItems(d.items.map((i) => (i.productId === productId ? { ...i, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 } : i)));
  };

  const save = () => {
    setErrors({});
    start(async () => {
      const res = await saveLookAction({
        id: d.id,
        title: d.title,
        subtitle: d.subtitle,
        description: d.description,
        slug: d.slug || slugify(d.title),
        discountPercent: Number(d.discountPercent) || 0,
        isActive: d.isActive,
        sortOrder: Number(d.sortOrder) || 0,
        coverId: cover[0]?.id ?? null,
        items: d.items,
      });
      if (res?.ok) {
        toast(res.message ?? "تم الحفظ");
        const id = Number(res.data?.id);
        if (!d.id && id) router.replace(`/admin/looks/${id}`);
        else router.refresh();
      } else {
        setErrors(res?.fieldErrors ?? {});
        toast(res?.error ?? "تعذّر الحفظ", "error");
      }
    });
  };

  const remove = () => {
    if (!d.id || !window.confirm("حذف هذه الإطلالة نهائياً؟ المنتجات نفسها لن تتأثر.")) return;
    start(async () => {
      const res = await deleteLookAction(d.id!);
      if (res?.ok) {
        toast(res.message ?? "حُذفت");
        router.replace("/admin/looks");
      } else toast(res?.error ?? "تعذّر الحذف", "error");
    });
  };

  const filtered = products.filter((p) => !query.trim() || p.name.includes(query.trim()));

  return (
    <div className="pb-24">
      <div className="sticky top-16 z-20 -mx-4 mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-ivory/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <h1 className="display truncate text-xl text-espresso md:text-2xl">{d.id ? d.title || "إطلالة" : "إطلالة جديدة"}</h1>
        <div className="flex items-center gap-2">
          {d.id && d.isActive && (
            <a href={`/looks/${encodeURIComponent(d.slug)}`} target="_blank" rel="noreferrer" className="hidden h-10 items-center gap-1.5 rounded-full px-4 text-sm text-umber hover:bg-bone sm:inline-flex">
              <ExternalLink className="size-4" aria-hidden /> معاينة
            </a>
          )}
          {d.id && (
            <Button variant="ghost" size="sm" className="h-10 text-danger" onClick={remove} disabled={pending}>
              <Trash2 className="size-4" aria-hidden /> حذف
            </Button>
          )}
          <Button size="sm" className="h-10 px-5" loading={pending} onClick={save}>
            حفظ الإطلالة
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Hotspot stage */}
        <Card title="الصورة والنقاط" description="اختر قطعة من القائمة ثم اضغط على الصورة لوضع نقطتها، أو اسحب النقاط لضبطها.">
          {cover[0] ? (
            <div
              ref={stage}
              className="studio-frame relative aspect-[4/5] w-full cursor-crosshair select-none overflow-hidden rounded-xl"
              onClick={(e) => active && placeAt(e.clientX, e.clientY, active)}
              onPointerMove={(e) => dragging.current && placeAt(e.clientX, e.clientY, dragging.current)}
              onPointerUp={() => (dragging.current = null)}
              onPointerLeave={() => (dragging.current = null)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/media/${cover[0].id}/md`} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" draggable={false} />
              {d.items.map((it, i) => (
                <button
                  key={it.productId}
                  type="button"
                  aria-label={`نقطة ${byId(it.productId)?.name ?? ""}`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                    dragging.current = it.productId;
                    setActive(it.productId);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "absolute grid size-8 -translate-x-1/2 -translate-y-1/2 touch-none place-items-center rounded-full text-xs font-semibold shadow-lg ring-2 transition-transform",
                    active === it.productId ? "scale-110 bg-copper text-paper ring-paper" : "bg-paper text-espresso ring-copper/60",
                  )}
                  style={{ left: `${it.x}%`, top: `${it.y}%` }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-bone px-4 py-10 text-center text-sm text-taupe">ارفع صورة الإطلالة أولاً لوضع النقاط عليها.</p>
          )}
          <ImageUploader value={cover} onChange={setCover} multiple={false} label="صورة الإطلالة (4:5)" alt={d.title} className="mt-4" />
        </Card>

        <div className="space-y-5">
          <Card title="التفاصيل">
            <div className="space-y-4">
              <Field label="العنوان" htmlFor="look-title" error={errors.title}>
                <Input id="look-title" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="إطلالة البورغندي" />
              </Field>
              <Field label="سطر تعريفي" htmlFor="look-sub">
                <Input id="look-sub" value={d.subtitle} onChange={(e) => setD({ ...d, subtitle: e.target.value })} />
              </Field>
              <Field label="الوصف" htmlFor="look-desc">
                <Textarea id="look-desc" rows={3} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="خصم الطقم %" htmlFor="look-off" error={errors.discountPercent}>
                  <Input id="look-off" type="number" min={0} max={50} value={d.discountPercent} onChange={(e) => setD({ ...d, discountPercent: Number(e.target.value) || 0 })} />
                </Field>
                <Field label="الترتيب" htmlFor="look-order">
                  <Input id="look-order" type="number" value={d.sortOrder} onChange={(e) => setD({ ...d, sortOrder: Number(e.target.value) || 0 })} />
                </Field>
                <Field label="الرابط" htmlFor="look-slug" error={errors.slug}>
                  <Input id="look-slug" dir="ltr" value={d.slug} onChange={(e) => setD({ ...d, slug: e.target.value })} placeholder={slugify(d.title)} />
                </Field>
              </div>
              <Switch label="منشورة في المتجر" checked={d.isActive} onChange={(e) => setD({ ...d, isActive: e.target.checked })} />
            </div>
          </Card>

          <Card title={`قطع الإطلالة (${d.items.length})`} description={total ? `المجموع ${money(total)} — سعر الطقم ${money(bundle)}` : undefined}>
            {errors.items && <p className="mb-3 text-xs text-danger">{errors.items}</p>}
            <ol className="space-y-2">
              {d.items.map((it, i) => {
                const p = byId(it.productId);
                const img = p?.images.find((x) => x.color === it.color) ?? p?.images[0];
                return (
                  <li key={it.productId} className={cn("flex items-center gap-3 rounded-xl border p-2", active === it.productId ? "border-copper bg-copper/5" : "border-line bg-paper")}>
                    <button type="button" onClick={() => setActive(it.productId)} className="flex min-w-0 flex-1 items-center gap-3 text-start" aria-label={`تحديد ${p?.name} لوضع نقطته`}>
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-espresso text-[0.7rem] text-paper">{i + 1}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {img ? <img src={`/media/${img.id}/sm`} alt="" className="aspect-[4/5] w-10 shrink-0 rounded-md object-cover" /> : <span className="aspect-[4/5] w-10 shrink-0 rounded-md bg-bone" />}
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-espresso">{p?.name ?? "منتج محذوف"}</span>
                        <span className="text-xs text-taupe">{p ? money(p.price) : ""}</span>
                      </span>
                      {active === it.productId && <Crosshair className="ms-auto size-4 shrink-0 text-copper" aria-hidden />}
                    </button>
                    {p && p.colors.length > 0 && (
                      <select
                        value={it.color}
                        onChange={(e) => setItems(d.items.map((x) => (x.productId === it.productId ? { ...x, color: e.target.value } : x)))}
                        className="h-9 w-28 shrink-0 rounded-lg border border-line bg-paper px-2 text-xs"
                        aria-label="اللون"
                      >
                        {p.colors.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="flex shrink-0">
                      <SmallBtn label="أعلى" disabled={i === 0} onClick={() => setItems(move(d.items, i, i - 1))}>
                        <ArrowUp className="size-4" />
                      </SmallBtn>
                      <SmallBtn label="أسفل" disabled={i === d.items.length - 1} onClick={() => setItems(move(d.items, i, i + 1))}>
                        <ArrowDown className="size-4" />
                      </SmallBtn>
                      <SmallBtn label="إزالة" onClick={() => setItems(d.items.filter((x) => x.productId !== it.productId))}>
                        <X className="size-4" />
                      </SmallBtn>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-4 border-t border-line pt-4">
              <div className="relative mb-2">
                <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-mist" aria-hidden />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن منتج لإضافته…" className="h-10 ps-9" />
              </div>
              <ul className="max-h-64 space-y-1 overflow-y-auto">
                {filtered.map((p) => {
                  const added = d.items.some((i) => i.productId === p.id);
                  return (
                    <li key={p.id}>
                      <button type="button" disabled={added} onClick={() => addItem(p)} className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-start text-sm hover:bg-bone disabled:opacity-45">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {p.images[0] ? <img src={`/media/${p.images[0].id}/sm`} alt="" className="aspect-[4/5] w-8 rounded object-cover" /> : <span className="aspect-[4/5] w-8 rounded bg-bone" />}
                        <span className="flex-1 truncate">{p.name}</span>
                        {added ? <span className="text-xs text-taupe">مضاف</span> : <Plus className="size-4 text-copper" aria-hidden />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function move<T>(arr: T[], a: number, b: number): T[] {
  if (b < 0 || b >= arr.length) return arr;
  const next = [...arr];
  const [x] = next.splice(a, 1);
  next.splice(b, 0, x);
  return next;
}

function SmallBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="grid size-8 place-items-center rounded-full text-taupe hover:bg-bone hover:text-espresso disabled:opacity-30">
      {children}
    </button>
  );
}
