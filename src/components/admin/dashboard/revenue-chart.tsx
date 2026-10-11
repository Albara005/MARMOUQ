"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChartSpline, Table2 } from "lucide-react";
import { formatMoney, type Currency } from "@/lib/money";
import { cn } from "@/lib/utils";

export type ChartPoint = { day: string; prevDay: string; revenue: number; orders: number; prevRevenue: number; prevOrders: number };
type Metric = "revenue" | "orders";

/* Chart tokens — copper is the one series (validated: L/C band + 4.4:1 on paper); the comparison period is de-emphasis grey. */
const C = {
  series: "var(--color-copper)",
  prev: "#b9a99b",
  grid: "var(--color-line)",
  base: "var(--color-sand)",
  surface: "var(--color-paper)",
  cross: "rgba(28,19,15,0.28)",
};

const H = 232; // plot height
const AXIS = 30; // x-axis band (inside the container height so the card never scrolls)
const TOP = 26; // room for the peak label
const PAD_START = 58; // y labels (right side in RTL)
const PAD_END = 10;

const DAY_SHORT = new Intl.DateTimeFormat("ar-YE-u-nu-latn", { day: "numeric", month: "long", timeZone: "UTC" });
const DAY_LONG = new Intl.DateTimeFormat("ar-YE-u-nu-latn", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const COMPACT = new Intl.NumberFormat("ar-YE-u-nu-latn", { notation: "compact", maximumFractionDigits: 1 });
const INT = new Intl.NumberFormat("en-US");

function toDate(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

/** Clean axis maximum + step (1 / 2 / 2.5 / 5 × 10^k). */
function niceScale(max: number, ticks = 4): { max: number; step: number } {
  if (max <= 0) return { max: ticks, step: 1 };
  const raw = max / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const s = Math.max(step, 1);
  return { max: Math.ceil(max / s) * s, step: s };
}

export function RevenueChart({ data, currency, rangeLabel, prevLabel }: { data: ChartPoint[]; currency: Currency; rangeLabel: string; prevLabel: string }) {
  const [metric, setMetric] = useState<Metric>("revenue");
  const [view, setView] = useState<"chart" | "table">("chart");
  const [hover, setHover] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [view]);

  const fmt = (v: number) => (metric === "revenue" ? formatMoney(v, currency) : `${INT.format(v)} ${v === 1 ? "طلب" : v === 2 ? "طلبان" : v >= 3 && v <= 10 ? "طلبات" : "طلباً"}`);

  const n = data.length;
  const cur = useMemo(() => data.map((d) => (metric === "revenue" ? d.revenue : d.orders)), [data, metric]);
  const prev = useMemo(() => data.map((d) => (metric === "revenue" ? d.prevRevenue : d.prevOrders)), [data, metric]);
  const scale = useMemo(() => niceScale(Math.max(...cur, ...prev, 0)), [cur, prev]);
  const total = cur.reduce((a, b) => a + b, 0);

  const plotW = Math.max(0, width - PAD_START - PAD_END);
  const right = width - PAD_START; // oldest day sits here (RTL: time flows right → left)
  const step = n > 1 ? plotW / (n - 1) : 0;
  const x = (i: number) => right - i * step;
  const y = (v: number) => TOP + H - (v / scale.max) * H;

  const linePath = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const curLine = linePath(cur);
  const area = n > 1 ? `${curLine} L${x(n - 1).toFixed(1)},${TOP + H} L${x(0).toFixed(1)},${TOP + H} Z` : "";

  const ticks: number[] = [];
  for (let v = 0; v <= scale.max + 1e-9; v += scale.step) ticks.push(v);

  // x labels: as many as fit (~78px each), always including the newest day
  const maxLabels = Math.max(2, Math.floor(plotW / 78));
  const every = Math.max(1, Math.ceil(n / maxLabels));
  const xLabels: number[] = [];
  for (let i = n - 1; i >= 0; i -= every) xLabels.push(i);

  const peak = cur.reduce((best, v, i) => (v > cur[best] ? i : best), 0);
  const hasData = cur.some((v) => v > 0) || prev.some((v) => v > 0);

  const pickIndex = (clientX: number) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect || n < 1) return;
    const px = clientX - rect.left;
    const i = Math.round((right - px) / (step || 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };

  const h = hover;
  const tipLeft = h !== null ? x(h) : 0;
  const tipOnRight = h !== null && tipLeft < width / 2;

  return (
    <section className="min-w-0 rounded-2xl border border-line bg-paper shadow-[0_1px_2px_rgba(28,19,15,0.04)]" aria-labelledby={titleId}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 md:px-6 md:pt-5">
        <div className="min-w-0">
          <h2 id={titleId} className="text-[0.98rem] font-semibold text-espresso">
            {metric === "revenue" ? "المبيعات اليومية" : "الطلبات اليومية"}
          </h2>
          <p className="mt-0.5 text-[0.8rem] text-taupe">
            {rangeLabel} · الإجمالي <span className="font-medium text-umber">{fmt(total)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div role="radiogroup" aria-label="المؤشر المعروض" className="inline-flex rounded-full bg-bone p-0.5">
            {(
              [
                ["revenue", "المبيعات"],
                ["orders", "الطلبات"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={metric === k}
                onClick={() => setMetric(k)}
                className={cn("h-8 rounded-full px-3 text-[0.78rem] transition-colors", metric === k ? "bg-paper font-medium text-espresso shadow-sm" : "text-taupe hover:text-espresso")}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setView((v) => (v === "chart" ? "table" : "chart"))}
            className="grid size-9 place-items-center rounded-full text-taupe ring-1 ring-line transition-colors hover:bg-bone hover:text-espresso"
            aria-label={view === "chart" ? "عرض البيانات كجدول" : "عرض المخطط"}
            title={view === "chart" ? "عرض كجدول" : "عرض المخطط"}
          >
            {view === "chart" ? <Table2 className="size-4" aria-hidden /> : <ChartSpline className="size-4" aria-hidden />}
          </button>
        </div>
      </div>

      {/* legend — line keys mirror the marks */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 pt-3 text-xs text-umber md:px-6">
        <span className="inline-flex items-center gap-2">
          <span className="h-[2px] w-4 rounded-full" style={{ background: C.series }} aria-hidden />
          {rangeLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-[2px] w-4 rounded-full" style={{ background: C.prev }} aria-hidden />
          {prevLabel}
        </span>
      </div>

      {view === "chart" ? (
        <div className="px-3 pb-4 pt-2 md:px-4">
          <div
            ref={boxRef}
            className="relative select-none outline-none focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-copper/30"
            style={{ height: TOP + H + AXIS, touchAction: "pan-y" }}
            tabIndex={0}
            role="group"
            aria-label={`مخطط ${metric === "revenue" ? "المبيعات" : "الطلبات"} اليومية — استخدم الأسهم للتنقل بين الأيام`}
            onPointerMove={(e) => pickIndex(e.clientX)}
            onPointerDown={(e) => pickIndex(e.clientX)}
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse") setHover(null);
            }}
            onFocus={() => setHover((v) => v ?? n - 1)}
            onBlur={() => setHover(null)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setHover((v) => Math.min(n - 1, (v ?? n - 1) + 1));
              else if (e.key === "ArrowRight") setHover((v) => Math.max(0, (v ?? n - 1) - 1));
              else if (e.key === "Home") setHover(0);
              else if (e.key === "End") setHover(n - 1);
              else if (e.key === "Escape") setHover(null);
              else return;
              e.preventDefault();
            }}
          >
            {width > 0 && (
              <>
                <svg width={width} height={TOP + H + AXIS} className="absolute inset-0 overflow-visible" aria-hidden>
                  <defs>
                    <linearGradient id={`${titleId}-wash`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-copper)" stopOpacity={0.16} />
                      <stop offset="100%" stopColor="var(--color-copper)" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  {ticks.map((t) => (
                    <line key={t} x1={PAD_END} x2={right} y1={y(t)} y2={y(t)} stroke={t === 0 ? C.base : C.grid} strokeWidth={1} shapeRendering="crispEdges" />
                  ))}
                  {hasData && (
                    <>
                      <path d={area} fill={`url(#${titleId}-wash)`} />
                      <path d={linePath(prev)} fill="none" stroke={C.prev} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
                      <path d={curLine} fill="none" stroke={C.series} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                      {h === null && cur[peak] > 0 && <circle cx={x(peak)} cy={y(cur[peak])} r={4} fill={C.series} stroke={C.surface} strokeWidth={2} />}
                      <circle cx={x(n - 1)} cy={y(cur[n - 1])} r={4} fill={C.series} stroke={C.surface} strokeWidth={2} />
                    </>
                  )}
                  {h !== null && (
                    <g>
                      <line x1={x(h)} x2={x(h)} y1={TOP - 6} y2={TOP + H} stroke={C.cross} strokeWidth={1} shapeRendering="crispEdges" />
                      <circle cx={x(h)} cy={y(prev[h])} r={4} fill={C.prev} stroke={C.surface} strokeWidth={2} />
                      <circle cx={x(h)} cy={y(cur[h])} r={5} fill={C.series} stroke={C.surface} strokeWidth={2} />
                    </g>
                  )}
                </svg>

                {/* y tick labels (HTML for correct Arabic shaping) */}
                {ticks.map((t) => (
                  <span
                    key={`y-${t}`}
                    className="pointer-events-none absolute -translate-y-1/2 text-[0.68rem] tabular-nums text-taupe"
                    style={{ top: y(t), insetInlineStart: 0, width: PAD_START - 10, textAlign: "start" }}
                    aria-hidden
                  >
                    {t === 0 ? "0" : COMPACT.format(t)}
                  </span>
                ))}

                {/* x labels */}
                {xLabels.map((i) => (
                  <span
                    key={`x-${i}`}
                    className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-[0.68rem] text-taupe"
                    style={{ left: Math.min(Math.max(x(i), 34), width - PAD_START + 20), top: TOP + H + 9 }}
                    aria-hidden
                  >
                    {DAY_SHORT.format(toDate(data[i].day))}
                  </span>
                ))}

                {/* selective direct label: the peak day */}
                {hasData && h === null && cur[peak] > 0 && (
                  <span
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-paper/90 px-1.5 text-[0.7rem] font-medium text-espresso"
                    style={{ left: Math.min(Math.max(x(peak), 60), width - 70), top: y(cur[peak]) - 8 }}
                    aria-hidden
                  >
                    الأعلى · {metric === "revenue" ? COMPACT.format(cur[peak]) : INT.format(cur[peak])}
                  </span>
                )}

                {!hasData && (
                  <div className="absolute inset-x-0 grid place-items-center text-center" style={{ top: TOP, height: H }}>
                    <div>
                      <p className="text-sm font-medium text-umber">لا توجد مبيعات في هذه الفترة بعد</p>
                      <p className="mt-1 text-xs text-taupe">ستظهر الحركة هنا فور وصول أول طلب.</p>
                    </div>
                  </div>
                )}

                {/* tooltip — value leads, label follows */}
                {h !== null && (
                  <div
                    role="status"
                    className="pointer-events-none absolute z-10 w-max min-w-[11rem] rounded-xl bg-espresso px-3.5 py-3 text-paper shadow-[0_16px_40px_-16px_rgba(28,19,15,0.6)]"
                    style={{
                      top: 4,
                      left: tipOnRight ? tipLeft + 14 : undefined,
                      right: tipOnRight ? undefined : width - tipLeft + 14,
                    }}
                  >
                    <p className="text-[0.7rem] text-paper/60">{DAY_LONG.format(toDate(data[h].day))}</p>
                    <div className="mt-1.5 flex items-center gap-2.5">
                      <span className="h-[2px] w-3 shrink-0 rounded-full bg-copper-soft" aria-hidden />
                      <span className="text-[0.95rem] font-semibold">{fmt(cur[h])}</span>
                    </div>
                    {metric === "revenue" && (
                      <p className="ms-[1.375rem] text-[0.7rem] text-paper/55">{`${INT.format(data[h].orders)} ${data[h].orders === 1 ? "طلب" : "طلبات"}`}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2.5 border-t border-white/10 pt-2">
                      <span className="h-[2px] w-3 shrink-0 rounded-full" style={{ background: C.prev }} aria-hidden />
                      <span className="text-[0.8rem] text-paper/85">{fmt(prev[h])}</span>
                      <span className="text-[0.68rem] text-paper/45">{data[h].prevDay ? DAY_SHORT.format(toDate(data[h].prevDay)) : ""}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="px-3 pb-4 pt-3 md:px-4">
          <div className="max-h-[288px] overflow-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <caption className="sr-only">{`بيانات ${metric === "revenue" ? "المبيعات" : "الطلبات"} اليومية`}</caption>
              <thead className="sticky top-0 bg-bone text-[0.75rem] text-taupe">
                <tr>
                  <th scope="col" className="px-4 py-2 text-start font-medium">اليوم</th>
                  <th scope="col" className="px-4 py-2 text-end font-medium">المبيعات</th>
                  <th scope="col" className="px-4 py-2 text-end font-medium">الطلبات</th>
                  <th scope="col" className="hidden px-4 py-2 text-end font-medium sm:table-cell">الفترة السابقة</th>
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map((d) => (
                  <tr key={d.day} className="border-t border-line/70">
                    <td className="px-4 py-2 text-umber">{DAY_LONG.format(toDate(d.day))}</td>
                    <td className="px-4 py-2 text-end tabular-nums text-espresso">{formatMoney(d.revenue, currency)}</td>
                    <td className="px-4 py-2 text-end tabular-nums text-espresso">{d.orders}</td>
                    <td className="hidden px-4 py-2 text-end tabular-nums text-taupe sm:table-cell">
                      {metric === "revenue" ? formatMoney(d.prevRevenue, currency) : d.prevOrders}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
