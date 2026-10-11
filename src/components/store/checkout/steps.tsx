import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "السلة", href: "/cart" },
  { label: "بيانات الطلب", href: "/checkout" },
  { label: "التأكيد", href: null },
] as const;

/** Three-step progress (السلة · بيانات الطلب · التأكيد). `current` is 0-based; steps before it are done. */
export function CheckoutSteps({ current, className }: { current: 0 | 1 | 2 | 3; className?: string }) {
  return (
    <nav aria-label="خطوات الطلب" className={cn("no-print", className)}>
      <ol className="flex items-center gap-2 text-xs sm:gap-3">
        {STEPS.map((s, i) => {
          const done = i < current;
          const active = i === current;
          const body = (
            <>
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full text-[0.68rem] tabular-nums transition-colors",
                  done ? "bg-copper text-paper" : active ? "bg-espresso text-paper" : "border border-line bg-paper text-taupe",
                )}
                aria-hidden
              >
                {done ? <Check className="size-3.5" strokeWidth={2.2} /> : i + 1}
              </span>
              <span className={cn(active ? "font-medium text-espresso" : done ? "text-umber" : "text-taupe")}>{s.label}</span>
            </>
          );
          return (
            <li key={s.label} className="flex items-center gap-2 sm:gap-3" aria-current={active ? "step" : undefined}>
              {done && s.href && current < 3 ? (
                <Link href={s.href} className="inline-flex min-h-11 items-center gap-2 hover:text-espresso">
                  {body}
                </Link>
              ) : (
                <span className="inline-flex min-h-11 items-center gap-2">{body}</span>
              )}
              {i < STEPS.length - 1 && <span className={cn("h-px w-5 sm:w-10", done ? "bg-copper/60" : "bg-line")} aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
