"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Truck } from "lucide-react";
import type { OrderStatus } from "@/db/schema";
import { buildTrackingUrl, type Carrier } from "@/lib/carriers";
import { Input, Label, Select } from "@/components/ui/field";
import { ActionFieldError, ActionForm, ActionFormError, ConfirmSubmit, SubmitButton } from "@/components/admin/ui-client";
import { saveShipmentAction } from "@/app/admin/(panel)/orders/actions";

export type ShipmentValue = { carrierName: string; trackingNumber: string; trackingUrl: string; carrierPhone: string };

/** Courier + tracking number for an order; the customer sees a «تتبّع شحنتك» button once saved. */
export function ShipmentForm({ orderId, status, carriers, current }: { orderId: number; status: OrderStatus; carriers: Carrier[]; current: ShipmentValue }) {
  const options = carriers.filter((c) => c.enabled);
  const hasShipment = !!(current.trackingNumber || current.carrierName);
  const initialId = options.find((c) => c.name === current.carrierName)?.id ?? (current.carrierName ? "other" : (options[0]?.id ?? "other"));
  const [carrierId, setCarrierId] = useState(initialId);
  const [number, setNumber] = useState(current.trackingNumber);
  const [customUrl, setCustomUrl] = useState(initialId === "other" ? current.trackingUrl : "");
  const canShip = ["pending", "confirmed", "processing"].includes(status);

  const carrier = options.find((c) => c.id === carrierId);
  const preview = carrierId === "other" ? buildTrackingUrl(customUrl, number) || customUrl : carrier ? buildTrackingUrl(carrier.trackingUrl, number) : "";

  return (
    <ActionForm action={saveShipmentAction} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />

      {hasShipment && (
        <div className="rounded-xl bg-ivory px-3.5 py-3 text-sm">
          <p className="flex items-center gap-2 font-medium text-espresso">
            <Truck className="size-4 text-copper" aria-hidden />
            {current.carrierName || "شركة الشحن"}
          </p>
          {current.trackingNumber && (
            <p className="mt-1 text-umber">
              رقم التتبع:{" "}
              <span dir="ltr" className="font-mono tabular-nums text-espresso">
                {current.trackingNumber}
              </span>
            </p>
          )}
          {current.trackingUrl && (
            <a href={current.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[0.8rem] font-medium text-copper-deep hover:underline">
              فتح صفحة التتبّع
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="ship-carrier">شركة الشحن</Label>
        <Select id="ship-carrier" name="carrierId" value={carrierId} onChange={(e) => setCarrierId(e.target.value)} className="h-11">
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value="other">شركة أخرى…</option>
        </Select>
        <ActionFieldError name="carrierId" />
        {options.length === 0 && (
          <p className="mt-1.5 text-xs leading-5 text-taupe">
            أضف شركاتك مرة وحدة من{" "}
            <Link href="/admin/settings?tab=shipping" className="text-copper-deep underline-offset-2 hover:underline">
              الإعدادات ← الشحن
            </Link>{" "}
            وتصير روابط التتبع تلقائية.
          </p>
        )}
      </div>

      {carrierId === "other" && (
        <div className="grid gap-3">
          <div>
            <Label htmlFor="ship-custom-name">اسم الشركة</Label>
            <Input id="ship-custom-name" name="customName" className="h-11" defaultValue={initialId === "other" ? current.carrierName : ""} maxLength={40} />
            <ActionFieldError name="customName" />
          </div>
          <div>
            <Label htmlFor="ship-custom-url">
              رابط التتبّع <span className="font-normal text-taupe">(اختياري)</span>
            </Label>
            <Input id="ship-custom-url" name="customUrl" className="h-11 font-mono text-[0.78rem]" dir="ltr" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://…" />
            <ActionFieldError name="customUrl" />
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="ship-number">رقم التتبّع (البوليصة)</Label>
        <Input id="ship-number" name="trackingNumber" className="h-11 font-mono" dir="ltr" style={{ textAlign: "right" }} value={number} onChange={(e) => setNumber(e.target.value)} maxLength={60} autoComplete="off" />
        <ActionFieldError name="trackingNumber" />
        {preview ? (
          <a href={preview} target="_blank" rel="noopener noreferrer" dir="ltr" className="mt-1.5 block truncate text-xs text-copper-deep hover:underline">
            {preview}
          </a>
        ) : (
          carrier &&
          !carrier.trackingUrl && <p className="mt-1.5 text-xs leading-5 text-taupe">هذه الشركة بدون رابط تتبّع — يظهر للعميل رقم الشحنة{carrier.phone ? " ورقم الشركة للتواصل" : ""}.</p>
        )}
      </div>

      {canShip && (
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-umber">
          <input type="checkbox" name="markShipped" defaultChecked className="size-4 accent-[var(--color-copper)]" />
          غيّر حالة الطلب إلى «تم الشحن»
        </label>
      )}

      <ActionFormError />
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="intent" value="save" className="flex-1" pendingLabel="جارٍ الحفظ…">
          {hasShipment ? "تحديث بيانات الشحن" : "حفظ وإظهارها للعميل"}
        </SubmitButton>
        {hasShipment && (
          <ConfirmSubmit name="intent" value="clear" variant="ghost" message="حذف بيانات الشحن من هذا الطلب؟" className="text-danger">
            حذف
          </ConfirmSubmit>
        )}
      </div>
    </ActionForm>
  );
}
