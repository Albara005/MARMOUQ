"use client";

import { useState, useTransition } from "react";
import { Check, Globe2, LoaderCircle, Plus, RefreshCw, TriangleAlert } from "lucide-react";
import type { MarketCurrency, StoreSettings } from "@/lib/settings";
import { formatMoney, type Currency } from "@/lib/money";
import { CURRENCY_CATALOG, PARALLEL_RATE_CURRENCIES, autoBasePerUnit, catalogCurrency, isManualRate, usdInBase } from "@/lib/currency-catalog";
import { Input, Select, Switch } from "@/components/ui/field";
import { ActionFieldError } from "@/components/admin/ui-client";
import { refreshRatesAction } from "@/app/admin/(panel)/settings/actions";
import { cn } from "@/lib/utils";

export type FxInfo = { rates: Record<string, number>; updatedAt: string; source: string } | null;
type Markets = StoreSettings["markets"];

const SAMPLE = 25000;
const fmtRate = (n: number) => (n >= 100 ? n.toLocaleString("en-US", { maximumFractionDigits: 0 }) : n.toLocaleString("en-US", { maximumFractionDigits: 3 }));

function fromCatalog(code: string): MarketCurrency {
  const c = catalogCurrency(code)!;
  // parallel-rate currencies (YER…) have no reliable market feed — the merchant types their rate
  return { code: c.code, symbol: c.symbol, label: c.label, position: c.position, decimals: c.decimals, roundTo: c.roundTo, basePerUnit: 0, markup: 0, enabled: true, rateMode: PARALLEL_RATE_CURRENCIES.has(c.code) ? "manual" : "auto" };
}

/** Currencies & markets: pick currencies, rates come from the live feed; visitors see their own currency. */
export function MarketsEditor({ markets, base, fx: initialFx, onChange }: { markets: Markets; base: Currency; fx: FxInfo; onChange: (next: Markets) => void }) {
  const [fx, setFx] = useState<FxInfo>(initialFx);
  const [refreshing, startRefresh] = useTransition();
  const set = (patch: Partial<Markets>) => onChange({ ...markets, ...patch });
  const setCurrency = (i: number, next: MarketCurrency) => set({ currencies: markets.currencies.map((c, k) => (k === i ? next : c)) });
  const baseCode = base.code.toUpperCase();
  const usd = usdInBase(baseCode, markets.usdRate, fx?.rates);
  const parallel = PARALLEL_RATE_CURRENCIES.has(baseCode);
  const feedUsd = fx?.rates[baseCode];
  const selected = new Set(markets.currencies.map((c) => c.code));

  const toggle = (code: string) => {
    if (selected.has(code)) {
      if (!window.confirm(`إزالة ${catalogCurrency(code)?.label ?? code} من المتجر؟`)) return;
      set({ currencies: markets.currencies.filter((c) => c.code !== code), defaultCode: markets.defaultCode === code ? "" : markets.defaultCode });
    } else if (markets.currencies.length < 12) {
      set({ currencies: [...markets.currencies, fromCatalog(code)] });
    }
  };

  return (
    <div className="space-y-5">
      {/* Behaviour */}
      <section className="rounded-2xl border border-line bg-paper p-5 shadow-[0_1px_2px_rgba(28,19,15,0.04)] md:p-6">
        <h3 className="flex items-center gap-2 text-[0.98rem] font-semibold text-espresso">
          <Globe2 className="size-4.5 text-copper" aria-hidden />
          البيع الدولي
        </h3>
        <p className="mt-1 text-sm leading-6 text-taupe">
          أسعارك تُدخل بالعملة الأساسية ({baseCode}). اختر العملات اللي تبيها فقط — أسعار الصرف تتحدّث تلقائياً من السوق العالمي، وكل زائر يشوف الأسعار بعملة بلده.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-ivory/50 p-3.5">
            <Switch
              checked={markets.autoDetect}
              onChange={(e) => set({ autoDetect: e.target.checked })}
              label={
                <span>
                  <span className="block text-sm font-medium text-espresso">عملة الزائر حسب بلده</span>
                  <span className="block text-xs leading-5 text-taupe">زائر من السعودية يشوف بالريال السعودي تلقائياً — ويقدر يغيّرها بنفسه.</span>
                </span>
              }
            />
          </div>
          <div className="rounded-xl border border-line bg-ivory/50 p-3.5">
            <Switch
              checked={markets.switcher}
              onChange={(e) => set({ switcher: e.target.checked })}
              label={
                <span>
                  <span className="block text-sm font-medium text-espresso">إظهار مبدّل العملة</span>
                  <span className="block text-xs leading-5 text-taupe">قائمة صغيرة أعلى الموقع وفي قائمة الجوال.</span>
                </span>
              }
            />
          </div>
        </div>
        <div className="mt-4 sm:w-1/2">
          <label htmlFor="s-markets.defaultCode" className="mb-1 block text-[0.8rem] font-medium text-umber">
            زوار الدول الأخرى يشوفون الأسعار بـ
          </label>
          <Select id="s-markets.defaultCode" className="h-11" value={markets.defaultCode} onChange={(e) => set({ defaultCode: e.target.value })}>
            <option value="">{`العملة الأساسية (${baseCode})`}</option>
            {markets.currencies
              .filter((c) => c.enabled)
              .map((c) => (
                <option key={c.code} value={c.code}>{`${c.label || c.code} (${c.code})`}</option>
              ))}
          </Select>
          <ActionFieldError name="markets.defaultCode" />
          <p className="mt-1.5 text-xs leading-5 text-taupe">للزائر اللي عملة بلده غير مضافة. الدولار خيار مناسب للجميع.</p>
        </div>
      </section>

      {/* USD market price of the base currency */}
      <section className={cn("rounded-2xl border p-5 md:p-6", parallel && !(markets.usdRate > 0) ? "border-warning/40 bg-warning/[0.06]" : "border-line bg-paper")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-[0.98rem] font-semibold text-espresso">سعر الدولار بعملتك ({baseCode})</h3>
            <p className="mt-1 text-sm leading-6 text-taupe">
              {parallel
                ? "الريال اليمني له أكثر من سعر في السوق، والسعر الرسمي العالمي لا يناسب أسعارك. اكتب سعر الدولار اللي تسعّر على أساسه — ومنه تتحسب كل العملات الأخرى تلقائياً."
                : "يُؤخذ تلقائياً من السوق. اكتب سعراً هنا فقط إذا كنت تحسب بسعر مختلف."}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              startRefresh(async () => {
                const r = await refreshRatesAction();
                if (r) setFx(r);
              })
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs text-taupe hover:bg-bone hover:text-espresso"
          >
            {refreshing ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <RefreshCw className="size-3.5" aria-hidden />}
            تحديث الأسعار الآن
          </button>
        </div>
        <div className="mt-4 grid items-end gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="s-markets.usdRate" className="mb-1 block text-[0.8rem] font-medium text-umber">
              1 دولار = كم {base.symbol}
            </label>
            <div className="relative">
              <Input
                id="s-markets.usdRate"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                className="h-11 pe-14 tabular-nums"
                value={markets.usdRate || ""}
                placeholder={parallel ? "مثلاً سعر السوق اليوم" : feedUsd ? `تلقائي: ${fmtRate(feedUsd)}` : ""}
                onChange={(e) => set({ usdRate: Number(e.target.value) || 0 })}
              />
              <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-sm text-taupe">{base.symbol}</span>
            </div>
            <ActionFieldError name="markets.usdRate" />
          </div>
          <p className="text-xs leading-6 text-taupe">
            {parallel && !(markets.usdRate > 0) ? (
              <span className="inline-flex items-start gap-1.5 text-warning">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                العملات الأخرى لن تظهر للعملاء حتى تكتب هذا السعر (السعر الرسمي{feedUsd ? ` ${fmtRate(feedUsd)}` : ""} غير معتمد).
              </span>
            ) : markets.usdRate > 0 ? (
              <>سعرك اليدوي مستخدم{feedUsd ? ` (السعر الرسمي العالمي ${fmtRate(feedUsd)})` : ""}. امسحه للرجوع للتلقائي.</>
            ) : (
              <>تلقائي من السوق{feedUsd ? `: ${fmtRate(feedUsd)} ${base.symbol}` : ""}.</>
            )}
            {fx && <span className="block text-mist">آخر تحديث: {new Date(fx.updatedAt).toLocaleString("ar-YE-u-nu-latn", { dateStyle: "medium", timeStyle: "short" })}</span>}
            {!fx && <span className="block text-warning">تعذّر جلب أسعار السوق الآن — سيُعاد المحاولة تلقائياً.</span>}
          </p>
        </div>
      </section>

      {/* Currency picker */}
      <section className="rounded-2xl border border-line bg-paper p-5 shadow-[0_1px_2px_rgba(28,19,15,0.04)] md:p-6">
        <h3 className="text-[0.98rem] font-semibold text-espresso">اختر العملات</h3>
        <p className="mt-1 text-sm text-taupe">اضغط على العملة لإضافتها أو إزالتها — بدون كتابة أي سعر.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {CURRENCY_CATALOG.filter((c) => c.code !== baseCode).map((c) => {
            const on = selected.has(c.code);
            return (
              <button
                key={c.code}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(c.code)}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[0.8rem] transition-colors",
                  on ? "border-espresso bg-espresso text-paper" : "border-line bg-paper text-umber hover:border-espresso hover:text-espresso",
                )}
              >
                {on ? <Check className="size-3.5" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
                {c.label}
                <span className={cn("text-[0.68rem] tabular-nums", on ? "text-paper/60" : "text-mist")}>{c.code}</span>
              </button>
            );
          })}
        </div>

        {markets.currencies.length > 0 && (
          <ul className="mt-6 divide-y divide-line rounded-xl border border-line">
            {markets.currencies.map((c, i) => (
              <CurrencyLine key={c.code || i} c={c} i={i} base={base} usd={usd} fx={fx} onChange={(next) => setCurrency(i, next)} />
            ))}
          </ul>
        )}
        <ActionFieldError name="markets.currencies" />
      </section>
    </div>
  );
}

function CurrencyLine({ c, i, base, usd, fx, onChange }: { c: MarketCurrency; i: number; base: Currency; usd: number | null; fx: FxInfo; onChange: (next: MarketCurrency) => void }) {
  const manual = isManualRate(c);
  const parallel = PARALLEL_RATE_CURRENCIES.has(c.code);
  const rate = manual ? c.basePerUnit : autoBasePerUnit(c.code, usd, fx?.rates);
  const preview: Currency = { code: c.code, symbol: c.symbol || c.code, position: c.position, basePerUnit: rate, markup: c.markup, decimals: c.decimals, roundTo: c.roundTo };
  const p = `markets.currencies.${i}`;
  return (
    <li className={cn("space-y-3 p-4", !c.enabled && "opacity-60")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-espresso">
            {c.label || c.code} <span className="text-xs tabular-nums text-taupe">{c.code}</span>
          </p>
          <p className="mt-0.5 text-xs tabular-nums text-taupe">
            {rate > 0 ? (
              <>
                1 {c.symbol || c.code} = {fmtRate(rate)} {base.symbol} · {manual ? "سعر يدوي" : "تلقائي"}
              </>
            ) : (
              <span className="text-warning">{manual ? (parallel ? "سعر السوق لهذه العملة يختلف عن الرسمي — اكتب سعر الصرف" : "اكتب سعر الصرف") : parallel ? "هذه العملة تحتاج سعراً يدوياً" : "بانتظار سعر الدولار أعلاه"}</span>
            )}
          </p>
        </div>
        <Switch checked={c.enabled} onChange={(e) => onChange({ ...c, enabled: e.target.checked })} label="ظاهرة" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <label htmlFor={`s-${p}.markup`} className="mb-1 block text-xs text-taupe">
            زيادة للسوق %
          </label>
          <Input id={`s-${p}.markup`} type="number" step="any" className="h-10 text-sm" value={c.markup} onChange={(e) => onChange({ ...c, markup: Number(e.target.value) || 0 })} />
          <ActionFieldError name={`${p}.markup`} />
        </div>
        <div>
          <label htmlFor={`s-${p}.round`} className="mb-1 block text-xs text-taupe">
            التقريب
          </label>
          <Select
            id={`s-${p}.round`}
            className="h-10 text-sm"
            value={`${c.decimals}:${c.roundTo}`}
            onChange={(e) => {
              const [d, r] = e.target.value.split(":").map(Number);
              onChange({ ...c, decimals: d === 2 ? 2 : 0, roundTo: r });
            }}
          >
            <option value="2:0">بالكسور (12.50)</option>
            <option value="0:1">لأقرب 1</option>
            <option value="0:5">لأقرب 5</option>
            <option value="0:10">لأقرب 10</option>
            <option value="0:50">لأقرب 50</option>
            <option value="0:100">لأقرب 100</option>
            <option value="0:250">لأقرب 250</option>
            <option value="0:1000">لأقرب 1000</option>
          </Select>
        </div>
        <div className="col-span-2">
          <label htmlFor={`s-${p}.basePerUnit`} className="mb-1 block text-xs text-taupe">
            سعر الصرف
          </label>
          <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
            <Select
              aria-label="طريقة سعر الصرف"
              className="h-10 text-sm"
              value={manual ? "manual" : "auto"}
              onChange={(e) => onChange({ ...c, rateMode: e.target.value as "auto" | "manual", basePerUnit: e.target.value === "manual" ? Number(rate.toPrecision(6)) || 0 : c.basePerUnit })}
            >
              <option value="auto">تلقائي</option>
              <option value="manual">يدوي</option>
            </Select>
            <Input
              id={`s-${p}.basePerUnit`}
              type="number"
              min={0}
              step="any"
              disabled={!manual}
              className="h-10 text-sm tabular-nums"
              value={manual ? c.basePerUnit || "" : rate ? fmtRate(rate).replace(/,/g, "") : ""}
              onChange={(e) => onChange({ ...c, basePerUnit: Number(e.target.value) || 0 })}
            />
          </div>
          <ActionFieldError name={`${p}.basePerUnit`} />
        </div>
      </div>
      <p className="text-xs text-taupe">
        {rate > 0 ? (
          <>
            منتج بـ {formatMoney(SAMPLE, base)} يظهر للعميل: <span className="font-semibold text-espresso">{formatMoney(SAMPLE, preview)}</span>
          </>
        ) : (
          "تظهر المعاينة بعد توفّر سعر الصرف."
        )}
      </p>
    </li>
  );
}
