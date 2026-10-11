"use client";

import Link from "next/link";
import { Sparkles, Truck } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { useMoney, useStoreConfig } from "@/components/store/store-provider";
import type { CartLine } from "@/components/store/cart/cart-provider";
import { cn } from "@/lib/utils";

export function lineHref(l: Pick<CartLine, "slug" | "color">) {
  return l.color ? `/product/${l.slug}?color=${encodeURIComponent(l.color)}` : `/product/${l.slug}`;
}

/** "إطلالة البورغندي" — avoids doubling the word when the stored title already has it. */
export function lookLabel(title?: string | null) {
  const t = (title ?? "").trim();
  if (!t) return "ضمن إطلالة";
  return t.startsWith("إطلالة") ? t : `إطلالة ${t}`;
}

export function piecesLabel(n: number) {
  if (n === 1) return "قطعة واحدة";
  if (n === 2) return "قطعتان";
  if (n >= 3 && n <= 10) return `${n} قطع`;
  return `${n} قطعة`;
}

/** One label/value row of an order summary. */
export function SummaryRow({
  label,
  value,
  tone = "default",
  hint,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: "default" | "saving" | "muted";
  hint?: React.ReactNode;
}) {
  return (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between gap-4 text-[0.92rem]">
        <dt className="text-umber">{label}</dt>
        <dd className={cn("tabular-nums", tone === "saving" ? "font-medium text-copper-deep" : tone === "muted" ? "text-xs text-taupe" : "text-espresso")}>{value}</dd>
      </div>
      {hint && <p className="mt-0.5 text-xs leading-6 text-taupe">{hint}</p>}
    </div>
  );
}

/** Progress towards free delivery (hidden when the store has no threshold). */
export function FreeShippingMeter({ amount, className }: { amount: number; className?: string }) {
  const { freeShippingThreshold: threshold } = useStoreConfig();
  const money = useMoney();
  if (!threshold || threshold <= 0) return null;
  const remaining = Math.max(0, threshold - amount);
  const progress = Math.min(100, Math.round((amount / threshold) * 100));
  return (
    <div className={className}>
      <p className="flex items-center gap-2 text-[0.82rem] text-umber">
        <Truck className="size-4 shrink-0 text-copper" strokeWidth={1.5} aria-hidden />
        {remaining > 0 ? (
          <span>
            باقي لك <strong className="font-semibold tabular-nums text-espresso">{money(remaining)}</strong> وتوصيلك علينا مجاناً
          </span>
        ) : (
          <span className="text-success">طلبك مؤهل للتوصيل المجاني ✦</span>
        )}
      </p>
      <div
        className="mt-2.5 h-[3px] overflow-hidden rounded-full bg-sand"
        role="progressbar"
        aria-label="التقدّم نحو التوصيل المجاني"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out-expo)]", remaining > 0 ? "bg-copper" : "bg-success")}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/** Compact list of cart lines (checkout summary). */
export function SummaryItems({ lines, lineDiscounts, className }: { lines: CartLine[]; lineDiscounts: Record<string, number>; className?: string }) {
  const money = useMoney();
  return (
    <ul className={cn("divide-y divide-line", className)}>
      {lines.map((l) => {
        const gross = l.unitPrice * l.quantity;
        const off = lineDiscounts[l.key] ?? 0;
        return (
          <li key={l.key} className="flex gap-4 py-4 first:pt-2">
            <div className="relative shrink-0">
              <Link href={lineHref(l)} tabIndex={-1} aria-hidden className="studio-frame block aspect-[4/5] w-16 overflow-hidden rounded-lg">
                <MediaImage media={l.imageId ? { id: l.imageId, blur: l.imageBlur } : null} sizes="72px" className="h-full w-full" alt="" />
              </Link>
              <span className="absolute -end-2 -top-2 grid size-6 place-items-center rounded-full bg-espresso text-[0.7rem] font-medium tabular-nums text-paper ring-2 ring-paper">
                {l.quantity}
                <span className="sr-only"> × </span>
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[0.88rem] font-medium leading-6 text-espresso">{l.name}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-taupe">
                {l.color && (
                  <span className="inline-flex items-center gap-1.5">
                    {l.colorHex && <span className="size-2.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: l.colorHex }} aria-hidden />}
                    {l.color}
                  </span>
                )}
                {l.color && l.size && <span aria-hidden>·</span>}
                {l.size && <span>المقاس {l.size}</span>}
              </p>
              {l.lookId ? (
                <p className="mt-1 inline-flex items-center gap-1 text-[0.7rem] text-copper-deep">
                  <Sparkles className="size-3" aria-hidden />
                  {lookLabel(l.lookTitle)}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 text-end text-[0.88rem] tabular-nums">
              {off > 0 ? (
                <>
                  <span className="block text-espresso">{money(gross - off)}</span>
                  <s className="block text-xs text-mist">{money(gross)}</s>
                </>
              ) : (
                <span className="text-espresso">{money(gross)}</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
