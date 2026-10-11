"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, Label } from "@/components/ui/field";
import { ActionFieldError, ActionForm, SubmitButton } from "@/components/admin/ui-client";
import { cn } from "@/lib/utils";
import { changePasswordAction, updateProfileAction } from "./actions";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  return (
    <ActionForm action={updateProfileAction} className="space-y-4">
      <div>
        <Label htmlFor="ac-name">الاسم</Label>
        <Input id="ac-name" name="name" defaultValue={name} required className="h-11" autoComplete="name" />
        <ActionFieldError name="name" />
      </div>
      <div>
        <Label htmlFor="ac-email">البريد الإلكتروني</Label>
        <Input id="ac-email" name="email" type="email" defaultValue={email} required className="h-11" dir="ltr" autoComplete="email" style={{ textAlign: "right" }} />
        <ActionFieldError name="email" />
      </div>
      <div className="flex justify-end">
        <SubmitButton size="sm" pendingLabel="جارٍ الحفظ…">
          حفظ البيانات
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

function strength(p: string): { score: number; label: string } {
  let s = 0;
  if (p.length >= 10) s++;
  if (p.length >= 14) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  const score = Math.min(4, s);
  return { score, label: ["ضعيفة جداً", "ضعيفة", "مقبولة", "جيدة", "قوية"][score] };
}

export function PasswordForm() {
  const [show, setShow] = useState(false);
  const [next, setNext] = useState("");
  const st = strength(next);
  const type = show ? "text" : "password";
  return (
    <ActionForm action={changePasswordAction} resetOnSuccess onResult={(r) => r.ok && setNext("")} className="space-y-4">
      <div>
        <Label htmlFor="pw-current">كلمة المرور الحالية</Label>
        <div className="relative">
          <Input id="pw-current" name="current" type={type} required className="h-11 pe-12" dir="ltr" autoComplete="current-password" />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute end-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-taupe hover:bg-bone hover:text-espresso"
            aria-label={show ? "إخفاء كلمات المرور" : "إظهار كلمات المرور"}
            aria-pressed={show}
          >
            {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </div>
        <ActionFieldError name="current" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="pw-next">كلمة المرور الجديدة</Label>
          <Input id="pw-next" name="next" type={type} required minLength={10} value={next} onChange={(e) => setNext(e.target.value)} className="h-11" dir="ltr" autoComplete="new-password" />
          <ActionFieldError name="next" />
          {next && (
            <div className="mt-2" aria-live="polite">
              <div className="flex gap-1" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={cn("h-1 flex-1 rounded-full", i < st.score ? (st.score >= 3 ? "bg-success" : st.score === 2 ? "bg-warning" : "bg-danger") : "bg-bone")} />
                ))}
              </div>
              <p className="mt-1 text-[0.72rem] text-taupe">القوة: {st.label}</p>
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="pw-confirm">تأكيد كلمة المرور</Label>
          <Input id="pw-confirm" name="confirm" type={type} required className="h-11" dir="ltr" autoComplete="new-password" />
          <ActionFieldError name="confirm" />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-taupe">10 أحرف على الأقل، حروف وأرقام.</p>
        <SubmitButton size="sm" pendingLabel="جارٍ التغيير…">
          تغيير كلمة المرور
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
