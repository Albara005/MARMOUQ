"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Power, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { ActionFieldError, ActionForm, ActionFormError, ConfirmSubmit, SubmitButton } from "@/components/admin/ui-client";
import { Avatar, ROLE_LABELS } from "@/components/admin/ui";
import { AdminDialog } from "@/components/admin/settings/admin-dialog";
import { changeRoleAction, createAdminAction, resetAdminPasswordAction, setAdminActiveAction } from "@/app/admin/(panel)/team/actions";
import { cn } from "@/lib/utils";

export type TeamMember = { id: number; name: string; email: string; role: "owner" | "manager" | "staff"; isActive: boolean; lastLogin: string | null; createdAt: string };
type Credential = { name: string; email: string; password: string; fresh: boolean };

const ROLE_HINT: Record<string, string> = {
  owner: "كل الصلاحيات بما فيها الفريق",
  manager: "الطلبات والكتالوج والإعدادات",
  staff: "الطلبات والعملاء والكتالوج",
};

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
function suggest(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const c = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `Mrq-${c.slice(0, 4)}-${c.slice(4)}`;
}

export function TeamManager({ members, meId }: { members: TeamMember[]; meId: number }) {
  const [adding, setAdding] = useState(false);
  const [cred, setCred] = useState<Credential | null>(null);
  const activeOwners = members.filter((m) => m.role === "owner" && m.isActive).length;

  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setAdding(true)}>
          <UserPlus className="size-4" aria-hidden />
          إضافة عضو
        </Button>
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper">
        {members.map((m) => {
          const isMe = m.id === meId;
          const lastOwner = m.role === "owner" && m.isActive && activeOwners <= 1;
          return (
            <li key={m.id} className={cn("flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:px-6", !m.isActive && "bg-ivory/70")}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={m.name} className={cn(!m.isActive && "opacity-50")} />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-espresso">
                    <span className="truncate">{m.name}</span>
                    {isMe && <Badge tone="copper">أنت</Badge>}
                    {!m.isActive && <Badge tone="danger">موقوف</Badge>}
                  </p>
                  <p className="truncate text-xs text-taupe" dir="ltr" style={{ textAlign: "right" }}>
                    {m.email}
                  </p>
                  <p className="mt-0.5 text-[0.7rem] text-mist">{m.lastLogin ? `آخر دخول ${m.lastLogin}` : "لم يسجّل الدخول بعد"}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
                <RoleSelect member={m} disabled={isMe || lastOwner} reason={isMe ? "لا يمكنك تغيير دورك" : lastOwner ? "آخر مالك نشط" : undefined} />
                {!isMe && (
                  <ActionForm action={resetAdminPasswordAction} onResult={(r) => r.ok && r.data && setCred({ ...(r.data as Omit<Credential, "fresh">), fresh: false })} toastSuccess={false}>
                    <input type="hidden" name="id" value={m.id} />
                    <ConfirmSubmit message={`إنشاء كلمة مرور مؤقتة جديدة لـ ${m.name}؟ ستتوقف كلمة المرور الحالية فوراً.`} variant="ghost" size="sm" className="h-9 text-umber">
                      <KeyRound className="size-4" aria-hidden />
                      كلمة مرور جديدة
                    </ConfirmSubmit>
                  </ActionForm>
                )}
                {!isMe && !lastOwner && (
                  <ActionForm action={setAdminActiveAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="active" value={m.isActive ? "0" : "1"} />
                    {m.isActive ? (
                      <ConfirmSubmit message={`إيقاف حساب ${m.name}؟ لن يتمكن من الدخول حتى تعيد تفعيله.`} variant="ghost" size="sm" className="h-9 text-danger hover:bg-danger/10">
                        <Power className="size-4" aria-hidden />
                        إيقاف
                      </ConfirmSubmit>
                    ) : (
                      <SubmitButton variant="ghost" size="sm" className="h-9 text-success hover:bg-success/10">
                        <Power className="size-4" aria-hidden />
                        تفعيل
                      </SubmitButton>
                    )}
                  </ActionForm>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <AdminDialog open={adding} onClose={() => setAdding(false)} title="عضو جديد في الفريق" description="شارك البريد وكلمة المرور المؤقتة مع العضو، واطلب منه تغييرها من صفحة «حسابي».">
        {adding && (
          <AddMemberForm
            onDone={(c) => {
              setAdding(false);
              setCred({ ...c, fresh: true });
            }}
            onCancel={() => setAdding(false)}
          />
        )}
      </AdminDialog>

      <AdminDialog open={cred !== null} onClose={() => setCred(null)} title={cred?.fresh ? "تمت الإضافة ✨" : "كلمة مرور مؤقتة"} size="sm">
        {cred && <CredentialCard cred={cred} onClose={() => setCred(null)} />}
      </AdminDialog>
    </>
  );
}

function RoleSelect({ member, disabled, reason }: { member: TeamMember; disabled: boolean; reason?: string }) {
  const [value, setValue] = useState(member.role);
  return (
    <ActionForm action={changeRoleAction} onResult={(r) => !r.ok && setValue(member.role)} className="flex items-center gap-2">
      <input type="hidden" name="id" value={member.id} />
      <label htmlFor={`role-${member.id}`} className="sr-only">
        دور {member.name}
      </label>
      <div className="relative" title={reason}>
        <ShieldCheck className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-copper" aria-hidden />
        <select
          id={`role-${member.id}`}
          name="role"
          value={value}
          disabled={disabled}
          onChange={(e) => {
            setValue(e.target.value as TeamMember["role"]);
            e.currentTarget.form?.requestSubmit();
          }}
          className="h-9 appearance-none rounded-full border border-line bg-paper ps-9 pe-4 text-sm text-espresso outline-none transition-colors focus:border-copper focus:ring-2 focus:ring-copper/15 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {(["owner", "manager", "staff"] as const).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
    </ActionForm>
  );
}

function AddMemberForm({ onDone, onCancel }: { onDone: (c: Omit<Credential, "fresh">) => void; onCancel: () => void }) {
  const [password, setPassword] = useState(suggest);
  const [role, setRole] = useState<"manager" | "staff" | "owner">("staff");
  return (
    <ActionForm action={createAdminAction} onResult={(r) => r.ok && r.data && onDone(r.data as Omit<Credential, "fresh">)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="tm-name">الاسم</Label>
          <Input id="tm-name" name="name" required className="h-11" autoComplete="off" />
          <ActionFieldError name="name" />
        </div>
        <div>
          <Label htmlFor="tm-email">البريد الإلكتروني</Label>
          <Input id="tm-email" name="email" type="email" required className="h-11" dir="ltr" autoComplete="off" style={{ textAlign: "right" }} />
          <ActionFieldError name="email" />
        </div>
      </div>
      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-umber">الدور</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(["staff", "manager", "owner"] as const).map((r) => (
            <label
              key={r}
              className={cn(
                "flex cursor-pointer flex-col rounded-xl border px-3.5 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-copper/30",
                role === r ? "border-espresso bg-espresso/[0.03]" : "border-line hover:border-sand",
              )}
            >
              <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="sr-only" />
              <span className="text-sm font-medium text-espresso">{ROLE_LABELS[r]}</span>
              <span className="text-[0.72rem] leading-5 text-taupe">{ROLE_HINT[r]}</span>
            </label>
          ))}
        </div>
        <ActionFieldError name="role" />
      </fieldset>
      <div>
        <Label htmlFor="tm-pass">كلمة مرور مؤقتة</Label>
        <div className="flex gap-2">
          <Input id="tm-pass" name="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="h-11 font-mono" dir="ltr" autoComplete="off" />
          <Button type="button" variant="outline" size="icon" className="size-11 shrink-0 border-line" onClick={() => setPassword(suggest())} aria-label="توليد كلمة مرور أخرى">
            <RefreshCw className="size-4" aria-hidden />
          </Button>
        </div>
        <ActionFieldError name="password" />
      </div>
      <ActionFormError />
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancel}>
          إلغاء
        </Button>
        <SubmitButton pendingLabel="جارٍ الإضافة…">إضافة العضو</SubmitButton>
      </div>
    </ActionForm>
  );
}

function CredentialCard({ cred, onClose }: { cred: Credential; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = `دخول لوحة تحكم مرموق\nالبريد: ${cred.email}\nكلمة المرور المؤقتة: ${cred.password}`;
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-umber">
        {cred.fresh ? `أصبح ${cred.name} عضواً في الفريق.` : `كلمة المرور الجديدة لـ ${cred.name}.`} انسخ البيانات الآن —{" "}
        <strong className="font-semibold text-espresso">لن تظهر كلمة المرور مرة أخرى.</strong>
      </p>
      <div className="grain relative overflow-hidden rounded-xl bg-espresso p-4 text-paper">
        <dl className="relative z-10 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-paper/60">البريد</dt>
            <dd className="truncate font-mono" dir="ltr">
              {cred.email}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-paper/60">كلمة المرور</dt>
            <dd className="font-mono text-base tracking-wider text-copper-soft" dir="ltr">
              {cred.password}
            </dd>
          </div>
        </dl>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>
          تم
        </Button>
        <Button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
            } catch {}
          }}
        >
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? "تم النسخ" : "نسخ البيانات"}
        </Button>
      </div>
    </div>
  );
}
