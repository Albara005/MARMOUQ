import { Check, RotateCcw, X } from "lucide-react";
import type { OrderStatus } from "@/db/schema";
import { CUSTOMER_TIMELINE, ORDER_STATUS_META } from "@/lib/order-status";
import { cn, formatDateTime } from "@/lib/utils";

export type TimelineEvent = { status: string; at: string | Date };

const STEP_COPY: Partial<Record<OrderStatus, string>> = {
  pending: "استلمنا طلبك وسنتواصل معك للتأكيد",
  confirmed: "أكدنا تفاصيل الطلب معك",
  processing: "نجهّز قطعك ونغلّفها بعناية",
  shipped: "طلبك مع المندوب في الطريق إليك",
  delivered: "وصل الطلب — نتمنى أن ينال إعجابك",
};

/**
 * Customer-facing status timeline. Happy path: pending → delivered.
 * Cancelled / returned orders end with a distinct terminal step.
 * Server & client safe (no hooks).
 */
export function OrderTimeline({ status, events, className }: { status: OrderStatus; events: TimelineEvent[]; className?: string }) {
  const atOf = (s: string) => {
    let found: string | Date | null = null;
    for (const e of events) if (e.status === s) found = e.at;
    return found;
  };
  const terminal = status === "cancelled" || status === "returned";
  let reached = CUSTOMER_TIMELINE.indexOf(status);
  if (terminal) {
    reached = CUSTOMER_TIMELINE.reduce((max, s, i) => (atOf(s) ? i : max), 0);
  }
  const steps = terminal ? CUSTOMER_TIMELINE.slice(0, reached + 1) : CUSTOMER_TIMELINE;
  const delivered = status === "delivered";

  return (
    <ol className={cn("relative", className)}>
      {steps.map((s, i) => {
        const done = i < reached || (i === reached && (terminal || delivered));
        const current = i === reached && !terminal && !delivered;
        const at = atOf(s);
        const isLast = i === steps.length - 1 && !terminal;
        return (
          <li key={s} className="relative flex gap-4 pb-7 last:pb-0" aria-current={current ? "step" : undefined}>
            {!isLast && <span className={cn("absolute start-[11px] top-7 h-[calc(100%-1.75rem)] w-px", i < reached ? "bg-copper/60" : "bg-line")} aria-hidden />}
            <span
              className={cn(
                "relative z-[1] mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
                done && (delivered && i === reached ? "bg-success text-paper" : "bg-copper text-paper"),
                current && "bg-espresso text-paper ring-4 ring-copper/20",
                !done && !current && "border border-line bg-paper",
              )}
              aria-hidden
            >
              {done ? <Check className="size-3.5" strokeWidth={2.4} /> : current ? <span className="size-2 animate-pulse rounded-full bg-copper-soft" /> : null}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className={cn("text-[0.92rem]", done || current ? "font-medium text-espresso" : "text-taupe")}>
                  {ORDER_STATUS_META[s].label}
                  {current && <span className="sr-only"> (المرحلة الحالية)</span>}
                </p>
                {at && <time dateTime={new Date(at).toISOString()} className="text-[0.72rem] tabular-nums text-taupe">{formatDateTime(at)}</time>}
              </div>
              {(done || current) && <p className="mt-0.5 text-xs leading-6 text-taupe">{STEP_COPY[s] ?? ORDER_STATUS_META[s].hint}</p>}
            </div>
          </li>
        );
      })}
      {terminal && (
        <li className="relative flex gap-4" aria-current="step">
          <span className="relative z-[1] mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-danger text-paper" aria-hidden>
            {status === "cancelled" ? <X className="size-3.5" strokeWidth={2.4} /> : <RotateCcw className="size-3" strokeWidth={2.4} />}
          </span>
          <div className="min-w-0 flex-1 rounded-xl bg-danger/[0.06] px-3.5 py-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-[0.92rem] font-medium text-danger">{ORDER_STATUS_META[status].label}</p>
              {atOf(status) && <time className="text-[0.72rem] tabular-nums text-taupe">{formatDateTime(atOf(status)!)}</time>}
            </div>
            <p className="mt-0.5 text-xs leading-6 text-umber">
              {status === "cancelled" ? "تم إلغاء هذا الطلب. لو عندك أي استفسار، تواصل معنا وبنخدمك." : "تم استلام المرتجع. يسعدنا مساعدتك في أي استبدال."}
            </p>
          </div>
        </li>
      )}
    </ol>
  );
}
