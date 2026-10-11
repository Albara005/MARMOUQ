"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Printer } from "lucide-react";
import { cn } from "@/lib/utils";

/** Copies a value to the clipboard with a quiet confirmation. */
export function CopyButton({
  value,
  label = "نسخ",
  copiedLabel = "تم النسخ",
  className,
  iconOnly,
  tone = "dark",
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  iconOnly?: boolean;
  tone?: "dark" | "light";
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback for older WebViews without the async clipboard API
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* ignore */
      }
      ta.remove();
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "no-print inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full text-xs font-medium transition-colors duration-300",
        iconOnly ? "size-11" : "px-3.5",
        tone === "light" ? "text-paper/80 hover:bg-paper/10 hover:text-paper" : "text-umber hover:bg-bone hover:text-espresso",
        className,
      )}
      aria-label={iconOnly ? `${label}: ${value}` : undefined}
    >
      {copied ? <Check className="size-3.5 text-success" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {!iconOnly && <span>{copied ? copiedLabel : label}</span>}
      <span className="sr-only" aria-live="polite">
        {copied ? copiedLabel : ""}
      </span>
    </button>
  );
}

export function PrintButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={cn(
        "no-print inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm text-umber transition-colors hover:bg-bone hover:text-espresso",
        className,
      )}
    >
      <Printer className="size-4" strokeWidth={1.5} aria-hidden />
      طباعة الإيصال
    </button>
  );
}
