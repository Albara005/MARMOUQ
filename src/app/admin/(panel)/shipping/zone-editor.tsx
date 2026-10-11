"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/field";
import { ActionFieldError, ActionForm, SubmitButton } from "@/components/admin/ui-client";
import { ActionButton } from "@/components/admin/settings/action-button";
import { cn, formatNumber } from "@/lib/utils";
import { createZoneAction, updateZoneAction } from "./actions";

export type ZoneDTO = { id: number; name: string; fee: number; eta: string; isActive: boolean; sortOrder: number; orders: number };

const cell =
  "h-10 w-full min-w-0 rounded-lg border border-line bg-paper px-2.5 text-sm text-espresso outline-none transition-colors focus:border-copper focus:bg-paper focus:ring-2 focus:ring-copper/15 md:border-transparent md:bg-transparent md:hover:border-line";

const GRID = "md:grid-cols-[3.25rem_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.1fr)_5.5rem_8.5rem] md:items-center md:gap-3";

export function ZoneHeader({ currencySymbol }: { currencySymbol: string }) {
  return (
    <div className={cn("hidden border-b border-line px-6 py-3 text-[0.75rem] font-medium text-taupe md:grid", GRID)} aria-hidden>
      <span className="px-2.5 text-center">الترتيب</span>
      <span className="px-2.5">المنطقة</span>
      <span className="px-2.5">رسوم التوصيل ({currencySymbol})</span>
      <span className="px-2.5">مدة التوصيل</span>
      <span>متاحة</span>
      <span />
    </div>
  );
}

export function ZoneRow({ zone, currencySymbol }: { zone: ZoneDTO; currencySymbol: string }) {
  const [dirty, setDirty] = useState(false);
  const id = `zone-${zone.id}`;
  const mobileLabel = "mb-1 block text-[0.7rem] text-taupe md:sr-only";
  return (
    <ActionForm
      action={updateZoneAction}
      onInput={() => setDirty(true)}
      onChange={() => setDirty(true)}
      onResult={(r) => r.ok && setDirty(false)}
      className={cn("relative px-4 py-3.5 transition-colors md:px-6 md:py-2.5", dirty && "bg-copper/[0.035]", !zone.isActive && !dirty && "bg-ivory/60")}
      aria-label={`منطقة ${zone.name}`}
    >
      <input type="hidden" name="id" value={zone.id} />
      <div className={cn("grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4.25rem] items-center gap-x-2.5 gap-y-2 md:grid", GRID)}>
        {/* name (+ delete on phones) */}
        <div className="col-span-2 flex min-w-0 items-center gap-1 md:order-2 md:col-span-1 md:block">
          <div className="min-w-0 flex-1">
            <label htmlFor={`${id}-name`} className="sr-only">
              اسم المنطقة
            </label>
            <input
              id={`${id}-name`}
              name="name"
              defaultValue={zone.name}
              required
              className="h-10 w-full min-w-0 rounded-lg border border-transparent bg-transparent px-1 text-base font-semibold text-espresso outline-none transition-colors hover:border-line focus:border-copper focus:bg-paper focus:ring-2 focus:ring-copper/15 md:px-2.5 md:text-sm"
            />
            <ActionFieldError name="name" className="px-1 md:px-2.5" />
            {zone.orders > 0 && <p className="hidden text-[0.7rem] text-taupe md:block md:px-2.5">{formatNumber(zone.orders)} طلب حتى الآن</p>}
          </div>
          <span className="md:hidden">
            <DeleteZone zone={zone} />
          </span>
        </div>
        <div className="flex justify-end md:order-5 md:justify-start">
          <Switch name="isActive" defaultChecked={zone.isActive} aria-label={`${zone.name} متاحة للطلب`} />
        </div>
        <div className="md:order-3">
          <label htmlFor={`${id}-fee`} className={mobileLabel}>
            الرسوم ({currencySymbol})
          </label>
          <input id={`${id}-fee`} name="fee" defaultValue={zone.fee} inputMode="numeric" className={cn(cell, "tabular-nums")} dir="ltr" style={{ textAlign: "right" }} />
          <ActionFieldError name="fee" />
        </div>
        <div className="md:order-4">
          <label htmlFor={`${id}-eta`} className={mobileLabel}>
            مدة التوصيل
          </label>
          <input id={`${id}-eta`} name="eta" defaultValue={zone.eta} placeholder="1–2 يوم" className={cell} />
          <ActionFieldError name="eta" />
        </div>
        <div className="md:order-1">
          <label htmlFor={`${id}-sort`} className={mobileLabel}>
            الترتيب
          </label>
          <input id={`${id}-sort`} name="sortOrder" defaultValue={zone.sortOrder} inputMode="numeric" className={cn(cell, "text-center tabular-nums")} />
        </div>
        {dirty && (
          <div className="col-span-3 md:hidden">
            <SubmitButton name="intent" value="save" size="sm" className="mt-1 w-full">
              حفظ التغييرات
            </SubmitButton>
          </div>
        )}
        <div className="hidden items-center justify-end gap-1 md:order-6 md:flex">
          <SubmitButton name="intent" value="save" size="sm" variant={dirty ? "primary" : "ghost"} className={cn("h-9", !dirty && "text-taupe")} disabled={!dirty}>
            حفظ
          </SubmitButton>
          <DeleteZone zone={zone} />
        </div>
      </div>
    </ActionForm>
  );
}

function DeleteZone({ zone }: { zone: ZoneDTO }) {
  return (
    <ActionButton
      action={updateZoneAction}
      fields={{ id: zone.id, intent: "delete" }}
      confirm={`حذف ${zone.name}؟ لن تظهر للعملاء في صفحة الدفع.`}
      variant="ghost"
      size="icon"
      className="size-9 text-taupe hover:bg-danger/10 hover:text-danger"
      aria-label={`حذف ${zone.name}`}
    >
      <Trash2 className="size-4" aria-hidden />
    </ActionButton>
  );
}

export function NewZoneForm({ currencySymbol }: { currencySymbol: string }) {
  return (
    <ActionForm action={createZoneAction} resetOnSuccess className="grid gap-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.1fr)_auto] sm:items-start">
      <div>
        <label htmlFor="nz-name" className="mb-1 block text-xs text-taupe">
          المحافظة / المدينة
        </label>
        <input id="nz-name" name="name" required placeholder="مثلاً: المكلا" className={cn(cell, "md:border-line md:bg-paper")} />
        <ActionFieldError name="name" />
      </div>
      <div>
        <label htmlFor="nz-fee" className="mb-1 block text-xs text-taupe">
          رسوم التوصيل ({currencySymbol})
        </label>
        <input id="nz-fee" name="fee" required inputMode="numeric" placeholder="3000" className={cn(cell, "md:border-line md:bg-paper")} dir="ltr" style={{ textAlign: "right" }} />
        <ActionFieldError name="fee" />
      </div>
      <div>
        <label htmlFor="nz-eta" className="mb-1 block text-xs text-taupe">
          مدة التوصيل
        </label>
        <input id="nz-eta" name="eta" placeholder="2–4 أيام" className={cn(cell, "md:border-line md:bg-paper")} />
        <ActionFieldError name="eta" />
      </div>
      <SubmitButton size="sm" className="h-10 sm:mt-5" pendingLabel="جارٍ الإضافة…">
        <Plus className="size-4" aria-hidden />
        إضافة
      </SubmitButton>
    </ActionForm>
  );
}
