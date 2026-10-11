"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FolderTree, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { MediaImage } from "@/components/ui/media-image";
import { Card, EmptyState } from "@/components/admin/ui";
import { toast } from "@/components/admin/ui-client";
import { ImageUploader, type MediaLike } from "@/components/admin/image-uploader";
import { deleteCategoryAction, saveCategoryAction, type CategoryInput } from "@/app/admin/(panel)/categories/actions";

export type CategoryRow = {
  id: number;
  name: string;
  nameEn: string;
  slug: string;
  description: string;
  slot: string;
  sortOrder: number;
  isActive: boolean;
  imageId: string | null;
  imageBlur: string | null;
  productCount: number;
};

const SLOT_LABELS: Record<string, string> = { "": "لا يظهر في المنسّق", knit: "التريكو", shirt: "القميص", tie: "ربطة العنق", trousers: "البنطال", shoes: "الحذاء" };

type Draft = CategoryInput & { image: MediaLike[] };

const blank = (order: number): Draft => ({ id: null, name: "", nameEn: "", slug: "", description: "", slot: "", imageId: null, sortOrder: order, isActive: true, image: [] });

export function CategoryManager({ rows }: { rows: CategoryRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const edit = (r: CategoryRow) =>
    setDraft({
      id: r.id,
      name: r.name,
      nameEn: r.nameEn,
      slug: r.slug,
      description: r.description,
      slot: (r.slot as Draft["slot"]) ?? "",
      imageId: r.imageId,
      sortOrder: r.sortOrder,
      isActive: r.isActive,
      image: r.imageId ? [{ id: r.imageId, blur: r.imageBlur ?? "" }] : [],
    });

  const save = () => {
    if (!draft) return;
    setErrors({});
    const { image, ...rest } = draft;
    start(async () => {
      const res = await saveCategoryAction({ ...rest, imageId: image[0]?.id ?? null, sortOrder: Number(rest.sortOrder) || 0 });
      if (res?.ok) {
        toast(res.message ?? "تم الحفظ");
        setDraft(null);
        router.refresh();
      } else {
        setErrors(res?.fieldErrors ?? {});
        toast(res?.error ?? "تعذّر الحفظ", "error");
      }
    });
  };

  const remove = (r: CategoryRow) => {
    if (!window.confirm(`حذف تصنيف «${r.name}»؟ ستبقى منتجاته (${r.productCount}) بدون تصنيف.`)) return;
    start(async () => {
      const res = await deleteCategoryAction(r.id);
      if (res?.ok) {
        toast(res.message ?? "حُذف");
        router.refresh();
      } else toast(res?.error ?? "تعذّر الحذف", "error");
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <Card
        padded={false}
        title={`${rows.length} تصنيف`}
        actions={
          <Button size="sm" onClick={() => setDraft(blank((rows.at(-1)?.sortOrder ?? 0) + 1))}>
            <Plus className="size-4" aria-hidden /> تصنيف جديد
          </Button>
        }
      >
        {rows.length === 0 ? (
          <EmptyState icon={<FolderTree />} title="لا تصنيفات بعد" description="أضف أقساماً مثل التريكو والقمصان والأحذية." />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-4 px-4 py-3 md:px-6">
                <MediaImage media={r.imageId ? { id: r.imageId, blur: r.imageBlur ?? "" } : null} sizes="64px" className="studio-frame aspect-[4/5] w-14 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-espresso">
                    {r.name}
                    {r.nameEn && <span className="latin-italic text-sm text-taupe">{r.nameEn}</span>}
                    {!r.isActive && <Badge>مخفي</Badge>}
                  </p>
                  <p className="mt-0.5 text-xs text-taupe">
                    <span dir="ltr">/shop/{r.slug}</span> · {r.productCount} منتج · المنسّق: {SLOT_LABELS[r.slot] ?? r.slot} · الترتيب {r.sortOrder}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => edit(r)} className="grid size-9 place-items-center rounded-full text-taupe hover:bg-bone hover:text-espresso" aria-label={`تعديل ${r.name}`}>
                    <Pencil className="size-4" />
                  </button>
                  <button type="button" onClick={() => remove(r)} className="grid size-9 place-items-center rounded-full text-taupe hover:bg-danger/10 hover:text-danger" aria-label={`حذف ${r.name}`}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {draft ? (
        <Card
          title={draft.id ? "تعديل التصنيف" : "تصنيف جديد"}
          actions={
            <button type="button" onClick={() => setDraft(null)} className="grid size-8 place-items-center rounded-full text-taupe hover:bg-bone" aria-label="إغلاق">
              <X className="size-4" />
            </button>
          }
          className="h-fit lg:sticky lg:top-24"
        >
          <div className="space-y-4">
            <Field label="الاسم" htmlFor="cat-name" error={errors.name}>
              <Input id="cat-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="التريكو" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="الاسم بالإنجليزية" htmlFor="cat-en">
                <Input id="cat-en" dir="ltr" value={draft.nameEn} onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })} placeholder="Knitwear" />
              </Field>
              <Field label="الرابط" htmlFor="cat-slug" error={errors.slug}>
                <Input id="cat-slug" dir="ltr" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="knitwear" />
              </Field>
            </div>
            <Field label="الوصف" htmlFor="cat-desc">
              <Textarea id="cat-desc" rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="خانة المنسّق" htmlFor="cat-slot">
                <Select id="cat-slot" value={draft.slot} onChange={(e) => setDraft({ ...draft, slot: e.target.value as Draft["slot"] })}>
                  {Object.entries(SLOT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="الترتيب" htmlFor="cat-order">
                <Input id="cat-order" type="number" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })} />
              </Field>
            </div>
            <ImageUploader value={draft.image} onChange={(image) => setDraft({ ...draft, image })} multiple={false} label="صورة الغلاف" alt={draft.name} />
            <Switch label="ظاهر في المتجر" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
            <div className="flex gap-2 pt-1">
              <Button onClick={save} loading={pending} className="flex-1">
                حفظ
              </Button>
              <Button variant="ghost" onClick={() => setDraft(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="hidden h-fit lg:block">
          <p className="text-sm leading-relaxed text-taupe">اختر تصنيفاً لتعديله، أو أضف تصنيفاً جديداً. صورة الغلاف تظهر في شبكة الأقسام على الصفحة الرئيسية وفي رأس صفحة القسم.</p>
        </Card>
      )}
    </div>
  );
}
