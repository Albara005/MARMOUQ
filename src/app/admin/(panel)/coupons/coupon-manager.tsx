"use client";

import { useState } from "react";
import { Check, Copy, Pencil, Plus, Shuffle, TicketPercent, Trash2 } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Switch } from "@/components/ui/field";
import { ActionFieldError, ActionForm, ActionFormError, SubmitButton } from "@/components/admin/ui-client";
import { EmptyState } from "@/components/admin/ui";
import { AdminDialog } from "@/components/admin/settings/admin-dialog";
import { ActionButton } from "@/components/admin/settings/action-button";
import { formatMoney, type Currency } from "@/lib/money";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import { deleteCouponAction, saveCouponAction, toggleCouponAction } from "./actions";

export type CouponDTO = {
  id: number;
  code: string;
  type: "percent" | "fixed";
  value: number;
  minSubtotal: number;
  maxUses: number | null;
  usedCount: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  status: "active" | "scheduled" | "expired" | "exhausted" | "inactive";
  orders: number;
  revenue: number;
  discountGiven: number;
};

const STATUS: Record<CouponDTO["status"], { label: string; tone: Tone }> = {
  active: { label: "فعّال", tone: "success" },
  scheduled: { label: "مجدول", tone: "info" },
  expired: { label: "منتهي", tone: "danger" },
  exhausted: { label: "مستنفد", tone: "warning" },
  inactive: { label: "موقوف", tone: "neutral" },
};

const dateLabel = (d: string) => (d ? formatDate(new Date(`${d}T12:00:00+03:00`)) : "");

export function CouponManager({ coupons, currency }: { coupons: CouponDTO[]; currency: Currency }) {
  const [editing, setEditing] = useState<CouponDTO | "new" | null>(null);
  const money = (n: number) => formatMoney(n, currency);
  const active = coupons.filter((c) => c.status === "active").length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-taupe">
          {coupons.length ? (
            <>
              <span className="font-semibold tabular-nums text-espresso">{formatNumber(active)}</span> فعّال من أصل <span className="tabular-nums">{formatNumber(coupons.length)}</span>
            </>
          ) : (
            "لا كوبونات بعد"
          )}
        </p>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus className="size-4" aria-hidden />
          كوبون جديد
        </Button>
      </div>

      {coupons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sand bg-paper">
          <EmptyState
            icon={<TicketPercent />}
            title="أطلق أول كود خصم"
            description="مثلاً WELCOME10 لمتابعي إنستغرام الجدد، أو كود حصري لعملائك المميزين."
            action={
              <Button size="sm" onClick={() => setEditing("new")}>
                <Plus className="size-4" aria-hidden />
                إنشاء كوبون
              </Button>
            }
          />
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {coupons.map((c) => (
            <li key={c.id}>
              <CouponTicket coupon={c} money={money} currency={currency} onEdit={() => setEditing(c)} />
            </li>
          ))}
        </ul>
      )}

      <AdminDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "كوبون جديد" : editing ? `تعديل ${editing.code}` : ""}
        description="الكود يُكتب بأحرف لاتينية كبيرة، ويُدخله العميل في صفحة إتمام الطلب."
      >
        {editing !== null && <CouponForm key={editing === "new" ? "new" : editing.id} coupon={editing === "new" ? null : editing} currency={currency} onDone={() => setEditing(null)} />}
      </AdminDialog>
    </>
  );
}

function CouponTicket({ coupon: c, money, currency, onEdit }: { coupon: CouponDTO; money: (n: number) => string; currency: Currency; onEdit: () => void }) {
  const [copied, setCopied] = useState(false);
  const muted = c.status !== "active" && c.status !== "scheduled";
  const usage = c.maxUses ? Math.min(100, Math.round((c.usedCount / c.maxUses) * 100)) : null;
  const meta = STATUS[c.status];

  return (
    <article className={cn("group relative flex h-full flex-col rounded-2xl border border-line bg-paper shadow-[0_1px_2px_rgba(28,19,15,0.04)] transition-shadow hover:shadow-[0_14px_34px_-24px_rgba(28,19,15,0.45)]", muted && "bg-paper/70")}>
      <div className="relative flex flex-1">
        {/* stub */}
        <div
          className={cn(
            "grain relative flex w-[6.5rem] shrink-0 flex-col items-center justify-center rounded-s-2xl px-2 py-5 text-center sm:w-28",
            muted ? "bg-bone text-taupe" : "bg-espresso text-paper",
          )}
        >
          <span className="relative z-10 text-[0.65rem] tracking-[0.25em] opacity-70">خصم</span>
          {c.type === "percent" ? (
            <span className="relative z-10 mt-1 font-[family-name:var(--font-latin)] text-[2.4rem] font-semibold leading-none" dir="ltr">
              {c.value}%
            </span>
          ) : (
            <>
              <span className="relative z-10 mt-1 font-[family-name:var(--font-latin)] text-[1.7rem] font-semibold leading-none tabular-nums" dir="ltr">
                {formatNumber(c.value)}
              </span>
              <span className="relative z-10 mt-1 text-[0.7rem] opacity-80">{currency.symbol}</span>
            </>
          )}
        </div>
        {/* perforation */}
        <div className="relative w-0 border-s border-dashed border-sand" aria-hidden>
          <span className="absolute -top-px start-0 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line bg-ivory rtl:translate-x-1/2" />
          <span className="absolute -bottom-px start-0 size-4 -translate-x-1/2 translate-y-1/2 rounded-full border border-line bg-ivory rtl:translate-x-1/2" />
        </div>
        {/* body */}
        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(c.code);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                } catch {}
              }}
              className="group/code inline-flex min-w-0 items-center gap-1.5 rounded-md text-start"
              aria-label={`نسخ الكود ${c.code}`}
            >
              <span className={cn("truncate font-mono text-[0.95rem] font-semibold tracking-[0.12em]", muted ? "text-umber" : "text-espresso")} dir="ltr">
                {c.code}
              </span>
              {copied ? <Check className="size-3.5 shrink-0 text-success" aria-hidden /> : <Copy className="size-3.5 shrink-0 text-mist group-hover/code:text-taupe" aria-hidden />}
            </button>
            <Badge tone={meta.tone} dot className="shrink-0">
              {meta.label}
            </Badge>
          </div>
          <ul className="mt-2.5 space-y-1 text-xs leading-5 text-taupe">
            <li>{c.minSubtotal > 0 ? `للطلبات من ${money(c.minSubtotal)}` : "بدون حد أدنى للطلب"}</li>
            <li>
              {c.startsAt && c.status === "scheduled" ? `يبدأ ${dateLabel(c.startsAt)}` : c.endsAt ? `${c.status === "expired" ? "انتهى" : "حتى"} ${dateLabel(c.endsAt)}` : "بدون تاريخ انتهاء"}
            </li>
          </ul>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[0.7rem] text-taupe">
              <span>الاستخدام</span>
              <span className="tabular-nums text-umber" dir="ltr">
                {formatNumber(c.usedCount)} / {c.maxUses ? formatNumber(c.maxUses) : "∞"}
              </span>
            </div>
            {usage != null && (
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-bone" aria-hidden>
                <div className={cn("h-full rounded-full", usage >= 100 ? "bg-warning" : "bg-copper")} style={{ width: `${usage}%` }} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5">
        <p className="min-w-0 truncate text-[0.72rem] text-taupe">
          {c.orders > 0 ? (
            <>
              <span className="font-semibold tabular-nums text-umber">{formatNumber(c.orders)}</span> {c.orders === 1 ? "طلب" : "طلبات"} ·{" "}
              <span className="tabular-nums text-umber">{money(c.revenue)}</span>
            </>
          ) : (
            "لم يُستخدم في طلبات بعد"
          )}
        </p>
        <div className="flex shrink-0 items-center gap-0.5">
          <ActionForm action={toggleCouponAction}>
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="active" value={c.isActive ? "0" : "1"} />
            <SubmitButton variant="ghost" size="sm" className="h-9 px-3 text-xs text-umber">
              {c.isActive ? "إيقاف" : "تفعيل"}
            </SubmitButton>
          </ActionForm>
          <button type="button" onClick={onEdit} className="grid size-9 place-items-center rounded-full text-taupe transition-colors hover:bg-bone hover:text-espresso" aria-label={`تعديل ${c.code}`}>
            <Pencil className="size-4" aria-hidden />
          </button>
          <ActionButton
            action={deleteCouponAction}
            fields={{ id: c.id }}
            confirm={`حذف الكوبون ${c.code} نهائياً؟ الطلبات السابقة لن تتأثر.`}
            variant="ghost"
            size="icon"
            className="size-9 text-taupe hover:bg-danger/10 hover:text-danger"
            aria-label={`حذف ${c.code}`}
          >
            <Trash2 className="size-4" aria-hidden />
          </ActionButton>
        </div>
      </div>
    </article>
  );
}

function randomCode() {
  const words = ["MARMOUQ", "VIP", "ELITE", "GENT", "NOIR", "BURGUNDY"];
  const w = words[Math.floor(Math.random() * words.length)];
  return `${w}${Math.floor(10 + Math.random() * 90)}`;
}

function CouponForm({ coupon, currency, onDone }: { coupon: CouponDTO | null; currency: Currency; onDone: () => void }) {
  const [code, setCode] = useState(coupon?.code ?? "");
  const [type, setType] = useState<"percent" | "fixed">(coupon?.type ?? "percent");
  const [value, setValue] = useState(coupon ? String(coupon.value) : "");
  const [min, setMin] = useState(coupon?.minSubtotal ? String(coupon.minSubtotal) : "");
  const [ends, setEnds] = useState(coupon?.endsAt ?? "");

  const v = Number(value.replace(/,/g, ""));
  const m = Number(min.replace(/,/g, ""));
  const preview =
    v > 0
      ? `خصم ${type === "percent" ? `${v}%` : formatMoney(v, currency)}${m > 0 ? ` على الطلبات من ${formatMoney(m, currency)}` : " على أي طلب"}${ends ? `، صالح حتى ${dateLabel(ends)}` : ""}.`
      : null;

  return (
    <ActionForm action={saveCouponAction} onResult={(r) => r.ok && onDone()} className="space-y-5">
      <input type="hidden" name="id" value={coupon?.id ?? ""} />
      <div>
        <Label htmlFor="cp-code">الكود</Label>
        <div className="flex gap-2">
          <Input
            id="cp-code"
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
            placeholder="WELCOME10"
            maxLength={24}
            required
            autoComplete="off"
            dir="ltr"
            className="h-11 text-start font-mono tracking-[0.12em]"
          />
          <Button type="button" variant="outline" size="sm" className="h-11 shrink-0 border-line" onClick={() => setCode(randomCode())}>
            <Shuffle className="size-4" aria-hidden />
            توليد
          </Button>
        </div>
        <ActionFieldError name="code" />
      </div>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-umber">نوع الخصم</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["percent", "نسبة مئوية", "مثل 10%"],
              ["fixed", "مبلغ ثابت", `مثل 5,000 ${currency.symbol}`],
            ] as const
          ).map(([t, label, hint]) => (
            <label
              key={t}
              className={cn(
                "flex cursor-pointer flex-col rounded-xl border px-3.5 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-copper/30",
                type === t ? "border-espresso bg-espresso/[0.03]" : "border-line hover:border-sand",
              )}
            >
              <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
              <span className="text-sm font-medium text-espresso">{label}</span>
              <span className="text-xs text-taupe">{hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="cp-value">{type === "percent" ? "النسبة" : "المبلغ"}</Label>
          <div className="relative">
            <Input id="cp-value" name="value" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} required className="h-11 pe-14" dir="ltr" style={{ textAlign: "right" }} />
            <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-sm text-taupe">{type === "percent" ? "%" : currency.symbol}</span>
          </div>
          <ActionFieldError name="value" />
        </div>
        <div>
          <Label htmlFor="cp-min">الحد الأدنى للطلب</Label>
          <div className="relative">
            <Input id="cp-min" name="minSubtotal" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} placeholder="0" className="h-11 pe-14" dir="ltr" style={{ textAlign: "right" }} />
            <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-sm text-taupe">{currency.symbol}</span>
          </div>
          <ActionFieldError name="minSubtotal" />
        </div>
        <div>
          <Label htmlFor="cp-max">عدد الاستخدامات الأقصى</Label>
          <Input id="cp-max" name="maxUses" inputMode="numeric" defaultValue={coupon?.maxUses ?? ""} placeholder="بلا حد" className="h-11" dir="ltr" style={{ textAlign: "right" }} />
          <ActionFieldError name="maxUses" />
        </div>
        <div className="hidden sm:block" aria-hidden />
        <div>
          <Label htmlFor="cp-start">يبدأ في</Label>
          <Input id="cp-start" name="startsAt" type="date" defaultValue={coupon?.startsAt ?? ""} className="h-11" dir="ltr" />
          <ActionFieldError name="startsAt" />
        </div>
        <div>
          <Label htmlFor="cp-end">ينتهي في</Label>
          <Input id="cp-end" name="endsAt" type="date" value={ends} onChange={(e) => setEnds(e.target.value)} className="h-11" dir="ltr" />
          <ActionFieldError name="endsAt" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl bg-ivory px-4 py-3">
        <Switch name="isActive" defaultChecked={coupon?.isActive ?? true} label="الكوبون مفعّل" />
      </div>

      {preview && (
        <p className="rounded-xl border border-copper/20 bg-copper/[0.05] px-4 py-3 text-sm text-copper-deep" aria-live="polite">
          <span className="font-mono font-semibold" dir="ltr">
            {code || "CODE"}
          </span>{" "}
          — {preview}
        </p>
      )}

      <ActionFormError />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onDone}>
          إلغاء
        </Button>
        <SubmitButton pendingLabel="جارٍ الحفظ…">{coupon ? "حفظ التغييرات" : "إنشاء الكوبون"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
