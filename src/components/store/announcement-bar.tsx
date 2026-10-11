"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Slim espresso bar with one message at a time, cross-fading every few seconds.
 * Pauses on hover / focus, never auto-rotates for reduced-motion users.
 */
export function AnnouncementBar({ messages }: { messages: string[] }) {
  const items = messages.map((m) => m.trim()).filter(Boolean);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (items.length < 2 || paused || reduced) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % items.length), 4800);
    return () => window.clearInterval(t);
  }, [items.length, paused, reduced]);

  if (items.length === 0) return null;
  const go = (d: number) => setIndex((i) => (i + d + items.length) % items.length);

  return (
    <div
      role="region"
      aria-label="إعلانات المتجر"
      aria-roledescription="شريط إعلانات"
      className="relative z-50 bg-espresso text-paper"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="container-luxe flex h-9 items-center justify-between gap-2">
        {items.length > 1 ? (
          <button type="button" onClick={() => go(-1)} className="-ms-2 grid size-9 place-items-center text-paper/55 transition-colors hover:text-paper" aria-label="الإعلان السابق">
            <ChevronRight className="size-3.5" aria-hidden />
          </button>
        ) : (
          <span className="size-9" aria-hidden />
        )}

        <div className="relative h-full flex-1 overflow-hidden">
          {items.map((m, i) => (
            <p
              key={`${i}-${m}`}
              aria-hidden={i !== index}
              className={cn(
                "absolute inset-0 flex items-center justify-center truncate px-2 text-center text-[0.72rem] tracking-[0.04em] text-paper/90 transition-all duration-700 ease-[var(--ease-out-expo)] sm:text-[0.78rem]",
                i === index ? "translate-y-0 opacity-100" : i === (index - 1 + items.length) % items.length ? "-translate-y-3 opacity-0" : "translate-y-3 opacity-0",
              )}
            >
              <span className="me-2 text-[0.55rem] text-gold" aria-hidden>
                ✦
              </span>
              {m}
            </p>
          ))}
        </div>

        {items.length > 1 ? (
          <button type="button" onClick={() => go(1)} className="-me-2 grid size-9 place-items-center text-paper/55 transition-colors hover:text-paper" aria-label="الإعلان التالي">
            <ChevronLeft className="size-3.5" aria-hidden />
          </button>
        ) : (
          <span className="size-9" aria-hidden />
        )}
      </div>
    </div>
  );
}
