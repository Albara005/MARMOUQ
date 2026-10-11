"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/field";
import { ActionFieldError, ActionForm, SubmitButton } from "@/components/admin/ui-client";
import { saveCustomerNotesAction } from "../actions";

export function CustomerNotesForm({ customerId, notes }: { customerId: number; notes: string }) {
  const [value, setValue] = useState(notes);
  const [saved, setSaved] = useState(notes);
  const dirty = value !== saved;
  return (
    <ActionForm action={saveCustomerNotesAction} className="space-y-3" onResult={(r) => r.ok && setSaved(value)}>
      <input type="hidden" name="customerId" value={customerId} />
      <label htmlFor="customer-notes" className="sr-only">
        ملاحظات عن العميل
      </label>
      <Textarea
        id="customer-notes"
        name="notes"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={2000}
        rows={5}
        placeholder="مقاساته المفضلة، ألوانه، طريقة التواصل الأنسب، مناسبات قادمة…"
        className="text-sm"
      />
      <ActionFieldError name="notes" />
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.72rem] text-taupe">{dirty ? "تغييرات غير محفوظة" : "ملاحظات داخلية لا يراها العميل."}</p>
        <SubmitButton size="sm" variant={dirty ? "primary" : "outline"} className={dirty ? undefined : "border-line"} disabled={!dirty} pendingLabel="جارٍ الحفظ…">
          حفظ الملاحظات
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
