"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { baseDisplay, cn } from "@/lib/utils";

/**
 * Previous / next arrows for a server-rendered scroll-snap rail (found by id).
 * RTL-aware: "next" follows the reading direction. Hidden (but space-keeping)
 * when the rail does not overflow, so the heading never shifts.
 */
export function CarouselControls({ targetId, light, className }: { targetId: string; light?: boolean; className?: string }) {
  const [edges, setEdges] = useState({ prev: false, next: false });

  const measure = useCallback(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pos = Math.abs(el.scrollLeft); // RTL scrollLeft runs 0 → negative
    setEdges((s) => {
      const next = { prev: pos > 4, next: pos < max - 4 };
      return s.prev === next.prev && s.next === next.next ? s : next;
    });
  }, [targetId]);

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const frame = requestAnimationFrame(measure);
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [targetId, measure]);

  const go = (step: 1 | -1) => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: step * (rtl ? -1 : 1) * el.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
  };

  const idle = !edges.prev && !edges.next;
  const btn = cn(
    "grid size-11 place-items-center rounded-full border transition-colors duration-300 disabled:pointer-events-none disabled:opacity-35",
    light ? "border-paper/30 text-paper hover:border-paper hover:bg-paper hover:text-espresso" : "border-espresso/25 text-espresso hover:border-espresso hover:bg-espresso hover:text-paper",
  );

  return (
    <div className={cn(baseDisplay("flex items-center gap-2", className), idle && "invisible", className)} aria-hidden={idle || undefined}>
      <button type="button" onClick={() => go(-1)} disabled={!edges.prev} className={btn} aria-label="القطع السابقة" aria-controls={targetId}>
        <ChevronRight className="size-4" aria-hidden />
      </button>
      <button type="button" onClick={() => go(1)} disabled={!edges.next} className={btn} aria-label="القطع التالية" aria-controls={targetId}>
        <ChevronLeft className="size-4" aria-hidden />
      </button>
    </div>
  );
}
