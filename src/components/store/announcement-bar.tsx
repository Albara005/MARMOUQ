"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Slim espresso bar with one message at a time, cross-fading every few seconds.
 * Pauses on hover / focus, never auto-rotates for reduced-motion users.
 */
export type BarTone = "espresso" | "copper" | "burgundy" | "navy" | "ivory";

/** Surface + text colours for each bar tone (shared with the home marquee). */
export const BAR_TONES: Record<BarTone, { bg: string; text: string; muted: string; accent: string }> = {
  espresso: { bg: "bg-espresso", text: "text-paper", muted: "text-paper/55 hover:text-paper", accent: "text-gold" },
  copper: { bg: "bg-copper", text: "text-paper", muted: "text-paper/70 hover:text-paper", accent: "text-paper/80" },
  burgundy: { bg: "bg-burgundy", text: "text-paper", muted: "text-paper/60 hover:text-paper", accent: "text-copper-soft" },
  navy: { bg: "bg-navy", text: "text-paper", muted: "text-paper/60 hover:text-paper", accent: "text-gold" },
  ivory: { bg: "bg-bone border-b border-line", text: "text-espresso", muted: "text-taupe hover:text-espresso", accent: "text-copper" },
};

export function AnnouncementBar({
  messages,
  tone = "espresso",
  href = "",
  interval = 5,
}: {
  messages: string[];
  tone?: BarTone;
  href?: string;
  /** seconds between messages */
  interval?: number;
}) {
  const t = BAR_TONES[tone] ?? BAR_TONES.espresso;
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
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % items.length), Math.max(2, interval) * 1000);
    return () => window.clearInterval(timer);
  }, [items.length, paused, reduced, interval]);

  if (items.length === 0) return null;
  const go = (d: number) => setIndex((i) => (i + d + items.length) % items.length);

  return (
    <div
      role="region"
      aria-label="إعلانات المتجر"
      aria-roledescription="شريط إعلانات"
      className={cn("relative z-50", t.bg, t.text)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="container-luxe flex h-9 items-center justify-between gap-2">
        {items.length > 1 ? (
          <button type="button" onClick={() => go(-1)} className={cn("-ms-2 grid size-9 place-items-center transition-colors", t.muted)} aria-label="الإعلان السابق">
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
                "absolute inset-0 flex items-center justify-center truncate px-2 text-center text-[0.72rem] transition-all duration-700 ease-[var(--ease-out-expo)] sm:text-[0.78rem]",
                i === index ? "translate-y-0 opacity-100" : i === (index - 1 + items.length) % items.length ? "-translate-y-3 opacity-0" : "translate-y-3 opacity-0",
              )}
            >
              <span className={cn("me-2 text-[0.55rem]", t.accent)} aria-hidden>
                ✦
              </span>
              {href && i === index ? (
                href.startsWith("/") ? (
                  <Link href={href} className="underline-offset-4 hover:underline">
                    {m}
                  </Link>
                ) : (
                  <a href={href} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                    {m}
                  </a>
                )
              ) : (
                m
              )}
            </p>
          ))}
        </div>

        {items.length > 1 ? (
          <button type="button" onClick={() => go(1)} className={cn("-me-2 grid size-9 place-items-center transition-colors", t.muted)} aria-label="الإعلان التالي">
            <ChevronLeft className="size-3.5" aria-hidden />
          </button>
        ) : (
          <span className="size-9" aria-hidden />
        )}
      </div>
    </div>
  );
}
