"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Pill-shaped − n + control. In RTL "increase" sits on the left (forward), "decrease" on the right.
 * Buttons keep a ≥44px hit area even at the compact size.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  size = "md",
  className,
  label = "الكمية",
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
  label?: string;
}) {
  const sm = size === "sm";
  const btn = cn(
    "relative grid place-items-center rounded-full text-espresso transition-colors duration-200 hover:bg-bone disabled:cursor-not-allowed disabled:text-mist disabled:hover:bg-transparent",
    "after:absolute after:-inset-1.5 after:content-['']",
    sm ? "size-8" : "size-10",
  );
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex items-center rounded-full border border-line bg-paper", sm ? "h-10 gap-0.5 px-1" : "h-12 gap-1 px-1", className)}
    >
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="إنقاص الكمية">
        <Minus className={sm ? "size-3.5" : "size-4"} aria-hidden />
      </button>
      <output aria-live="polite" className={cn("min-w-7 text-center font-medium tabular-nums text-espresso", sm ? "text-sm" : "text-base")}>
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="زيادة الكمية">
        <Plus className={sm ? "size-3.5" : "size-4"} aria-hidden />
      </button>
    </div>
  );
}
