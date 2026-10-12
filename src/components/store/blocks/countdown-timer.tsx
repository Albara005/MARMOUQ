"use client";

import { Fragment, useSyncExternalStore } from "react";
import type { CountdownBlock } from "@/lib/blocks";
import { cn } from "@/lib/utils";
import { BlockEyebrow } from "./block-heading";
import { BlockCta } from "./block-link";
import { blockDomId, toneStyle, txt } from "./tones";

/* One shared 1-second clock for every countdown on the page. The server snapshot is 0,
   so the server (and hydration) render "--" placeholders and ticking starts after mount. */
const clock = { now: 0, timer: 0, listeners: new Set<() => void>() };

function subscribe(listener: () => void) {
  clock.listeners.add(listener);
  if (clock.listeners.size === 1) {
    clock.now = Date.now();
    clock.timer = window.setInterval(() => {
      clock.now = Date.now();
      clock.listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    clock.listeners.delete(listener);
    if (clock.listeners.size === 0) {
      window.clearInterval(clock.timer);
      clock.now = 0;
    }
  };
}
const getSnapshot = () => (clock.now ||= Date.now());
const getServerSnapshot = () => 0;

const UNITS = [
  { label: "يوم", ms: 86_400_000 },
  { label: "ساعة", ms: 3_600_000 },
  { label: "دقيقة", ms: 60_000 },
  { label: "ثانية", ms: 1_000 },
] as const;

function split(ms: number): string[] {
  let rest = Math.floor(ms / 1000) * 1000;
  return UNITS.map((u) => {
    const v = Math.floor(rest / u.ms);
    rest -= v * u.ms;
    return String(v).padStart(2, "0");
  });
}

/**
 * Countdown band. `endsAt` is a store-local ISO date-time ("2026-11-28T21:00"), read in the
 * visitor's clock. After the end it shows `endedText`, or removes itself when that is empty.
 * `ended` lets the server short-circuit dates that are already well in the past.
 */
export function CountdownTimer({ block, ended: endedOnServer = false }: { block: CountdownBlock; ended?: boolean }) {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const end = new Date(txt(block.endsAt)).getTime();
  if (Number.isNaN(end)) return null;

  const left = endedOnServer ? 0 : now > 0 ? Math.max(0, end - now) : null;
  const ended = left === 0;
  const endedText = txt(block.endedText);
  if (ended && !endedText) return null;

  const t = toneStyle(block.tone, "dark");
  const eyebrow = txt(block.eyebrow);
  const title = ended ? endedText : txt(block.title);
  const text = ended ? "" : txt(block.text);
  const values = left == null ? UNITS.map(() => "--") : split(left);
  const titleId = blockDomId(block.id);

  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : "عدّاد تنازلي"}
      className={cn("relative isolate overflow-hidden py-20 md:py-28", t.surface, t.dark && "grain")}
    >
      {block.tone === "dark" && (
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-70"
          style={{ background: "radial-gradient(60% 70% at 50% 100%, rgba(169,100,58,0.24), transparent 70%), radial-gradient(45% 60% at 0% 0%, rgba(92,26,38,0.35), transparent 70%)" }}
          aria-hidden
        />
      )}
      <div className="container-luxe flex flex-col items-center text-center">
        <div className="flex flex-col items-center" data-reveal>
          <BlockEyebrow text={eyebrow} tone={t} center />
          {title && (
            <h2 id={titleId} className={cn("display max-w-3xl whitespace-pre-line text-[2.1rem] leading-[1.18] text-balance md:text-5xl", eyebrow && "mt-5", t.title)}>
              {title}
            </h2>
          )}
          {text && <p className={cn("max-w-xl whitespace-pre-line text-[0.98rem] leading-8 text-pretty", (eyebrow || title) && "mt-4", t.body)}>{text}</p>}
        </div>

        {!ended && (
          <div
            role="timer"
            aria-label="الوقت المتبقي"
            aria-atomic="true"
            className={cn("flex items-start justify-center gap-4 sm:gap-5 md:gap-8", (eyebrow || title || text) && "mt-10 md:mt-14")}
            data-reveal
            style={{ "--reveal-delay": "120ms" } as React.CSSProperties}
          >
            {UNITS.map((u, i) => (
              <Fragment key={u.label}>
                {i > 0 && (
                  <span className={cn("hidden pt-1 font-[family-name:var(--font-latin)] text-4xl leading-none sm:block md:text-6xl", t.dark ? "text-paper/30" : "text-taupe/50")} aria-hidden>
                    :
                  </span>
                )}
                <span className="flex min-w-[4.25rem] flex-col items-center sm:min-w-20 md:min-w-28">
                  <span className={cn("font-[family-name:var(--font-latin)] text-[2.75rem] font-medium leading-none lining-nums tabular-nums sm:text-6xl md:text-7xl lg:text-[5.5rem]", t.title)} dir="ltr">
                    {values[i]}
                  </span>
                  <span className={cn("mt-3 text-[0.72rem] md:mt-4 md:text-sm", t.muted)}>{u.label}</span>
                </span>
              </Fragment>
            ))}
          </div>
        )}

        <BlockCta label={block.ctaLabel} href={block.ctaHref} variant={t.button} className="mt-10 w-full sm:w-auto md:mt-14" />
      </div>
    </section>
  );
}
