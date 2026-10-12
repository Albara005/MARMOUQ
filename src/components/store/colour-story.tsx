"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { Price } from "@/components/store/store-provider";
import { imagesForColor, sortSizes } from "@/components/store/product-card";
import type { ProductDetail } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { ScriptSafe } from "@/components/ui/script-safe";

/* ───────────── Colour maths (muted section tint) ───────────── */

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB | null {
  const m = hex.trim().replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] * (1 - t) + b[i] * t)) as RGB;
const css = (c: RGB) => `rgb(${c[0]} ${c[1]} ${c[2]})`;

function luminance([r, g, b]: RGB) {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

const ESPRESSO: RGB = [28, 19, 15];
const WARM_GREY: RGB = [58, 48, 42];
const IVORY: RGB = [247, 243, 238];

function themeFor(hex: string) {
  const c = hexToRgb(hex) ?? [92, 26, 38];
  if (luminance(c) < 0.18) {
    // Deep colours: keep the hue, soften saturation with a warm grey, lift very dark tones slightly.
    const base = mix(c, WARM_GREY, 0.22);
    const lifted = luminance(base) < 0.012 ? mix(base, [70, 60, 54], 0.25) : base;
    return { dark: true, bg: css(lifted), glow: css(mix(lifted, IVORY, 0.12)), edge: css(mix(lifted, ESPRESSO, 0.35)) };
  }
  const soft = mix(c, IVORY, 0.72);
  return { dark: false, bg: css(soft), glow: css(mix(soft, IVORY, 0.5)), edge: css(mix(soft, c, 0.2)) };
}

const COUNT_WORDS: Record<number, string> = { 2: "لونان", 3: "ثلاثة ألوان", 4: "أربعة ألوان", 5: "خمسة ألوان", 6: "ستة ألوان" };

/* ───────────── Editorial lines per signature colour ───────────── */

const LINES: Record<string, string> = {
  "برغندي": "اويلي البورغندي… لون يتكلّم عنك قبل ما تتكلّم.",
  "أسود": "الأسود ما يحتاج شرح — حضور هادئ وحاسم.",
  "بني قهوة": "دفء القهوة بلمسة إيطالية، لأيام الشتاء الطويلة.",
  "كحلي": "الكحلي… ثقة الرجل اللي يعرف وش يلبس.",
};

/**
 * "The Colour Story": colour chips cross-fade the hero shot and tint the whole section
 * to a muted version of the chosen colour.
 */
export function ColourStory({ product, eyebrow = "The Colour Story", title = "قصة الألوان" }: { product: ProductDetail; eyebrow?: string; title?: string }) {
  const colors = product.colors;
  const [active, setActive] = useState(0);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = colors[active] ?? colors[0];

  const theme = useMemo(() => themeFor(current?.hex ?? "#5C1A26"), [current?.hex]);

  const perColor = useMemo(
    () =>
      colors.map((c) => {
        const variants = sortSizes(product.variants.filter((v) => v.color === c.name));
        const stock = variants.reduce((s, v) => s + v.stock, 0);
        return { color: c, image: imagesForColor(product.images, c.name)[0] ?? null, variants, stock };
      }),
    [colors, product.variants, product.images],
  );

  if (!current) return null;
  const info = perColor[active];
  const lowStock = info.stock > 0 && info.stock <= 5;
  const href = `/product/${product.slug}?color=${encodeURIComponent(current.name)}`;
  const total = String(colors.length).padStart(2, "0");

  const onKeyDown = (e: React.KeyboardEvent) => {
    // RTL: Left = next, Right = previous
    let next = active;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = (active + 1) % colors.length;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = (active - 1 + colors.length) % colors.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = colors.length - 1;
    else return;
    e.preventDefault();
    setActive(next);
    chipRefs.current[next]?.focus();
  };

  return (
    <section
      aria-labelledby="colour-story-title"
      className={cn("relative isolate overflow-hidden transition-colors duration-[1200ms] ease-[var(--ease-luxe)]", theme.dark ? "text-paper" : "text-espresso")}
      style={{ backgroundColor: theme.bg }}
    >
      {/* soft light + vignette that follow the tint */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 transition-[background] duration-[1200ms]"
        style={{ background: `radial-gradient(70% 60% at 70% 35%, ${theme.glow} 0%, transparent 70%), linear-gradient(to top, ${theme.edge}, transparent 45%)` }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 -z-10 grain" aria-hidden />

      <div className="container-luxe grid items-center gap-10 py-20 md:py-28 lg:grid-cols-12 lg:gap-16">
        {/* Copy */}
        <div className="lg:col-span-5" data-reveal>
          <p className={cn("eyebrow inline-flex items-center gap-3", theme.dark && "text-copper-soft")}>
            <span className="h-px w-8 bg-current opacity-60" aria-hidden />
            <ScriptSafe text={eyebrow} />
          </p>
          <h2 id="colour-story-title" className="display mt-5 text-[2.4rem] leading-[1.1] md:text-6xl">
            {title}
          </h2>
          <p className={cn("mt-4 max-w-md text-[0.98rem] leading-8", theme.dark ? "text-paper/75" : "text-umber")}>
            {product.name}
            {product.subtitle ? ` — ${product.subtitle}` : ""}. {COUNT_WORDS[colors.length] ?? `${colors.length} ألوان`}، قطعة وحدة، وكل لون له شخصيته.
          </p>

          <div className="mt-10 flex items-baseline gap-4" aria-live="polite">
            <span className="latin-italic text-lg tabular-nums opacity-60" dir="ltr">
              {String(active + 1).padStart(2, "0")} / {total}
            </span>
            <span key={current.name} className="display animate-fade-up text-4xl md:text-5xl">
              {current.name}
            </span>
          </div>
          <p key={`line-${current.name}`} className={cn("mt-3 min-h-14 max-w-sm animate-fade-up text-[0.95rem] leading-7", theme.dark ? "text-paper/70" : "text-umber")}>
            {LINES[current.name] ?? "لون مختار بعناية ليكمل حضورك في كل مناسبة."}
          </p>

          {/* Chips */}
          <div role="radiogroup" aria-label="اختر اللون" className="mt-8 flex flex-wrap gap-3" onKeyDown={onKeyDown}>
            {colors.map((c, i) => {
              const on = i === active;
              return (
                <button
                  key={c.name}
                  ref={(el) => {
                    chipRefs.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={c.name}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setActive(i)}
                  className="group flex flex-col items-center gap-2"
                >
                  <span
                    className={cn(
                      "grid size-14 place-items-center rounded-full transition-all duration-500",
                      on ? (theme.dark ? "ring-1 ring-paper/80" : "ring-1 ring-espresso/80") : "ring-1 ring-transparent group-hover:ring-current/30",
                    )}
                  >
                    <span
                      className={cn("block size-10 rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_6px_16px_-6px_rgba(0,0,0,0.5)] transition-transform duration-500", on && "scale-[0.92]")}
                      style={{ backgroundColor: c.hex }}
                    />
                  </span>
                  <span className={cn("text-xs transition-opacity duration-300", on ? "opacity-100" : "opacity-55 group-hover:opacity-90")}>{c.name}</span>
                </button>
              );
            })}
          </div>

          {/* Price + availability */}
          <div className={cn("mt-10 border-t pt-6", theme.dark ? "border-paper/15" : "border-espresso/15")}>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <Price amount={product.price} compareAt={product.compareAtPrice} className="display text-2xl" />
              <span className={cn("inline-flex items-center gap-2 text-xs", theme.dark ? "text-paper/75" : "text-umber")}>
                <span className={cn("size-1.5 rounded-full", info.stock === 0 ? "bg-danger" : lowStock ? "bg-warning" : "bg-success")} aria-hidden />
                {info.stock === 0 ? "نفد هذا اللون حالياً" : lowStock ? `كمية محدودة — بقي ${info.stock} قطع` : "متوفر الآن"}
              </span>
            </div>
            {info.variants.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="المقاسات المتوفرة">
                {info.variants.map((v) => (
                  <li
                    key={v.id}
                    className={cn(
                      "grid h-8 min-w-11 place-items-center rounded-full border px-2.5 text-xs tabular-nums",
                      theme.dark ? "border-paper/20" : "border-espresso/20",
                      v.stock <= 0 && "line-through opacity-40",
                    )}
                  >
                    {v.size}
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={href}
              className={cn(
                "group mt-8 inline-flex h-14 items-center gap-3 rounded-full px-8 text-[0.95rem] font-medium transition-colors duration-300",
                theme.dark ? "bg-paper text-espresso hover:bg-bone" : "bg-espresso text-paper hover:bg-cocoa",
              )}
            >
              اكتشفه باللون {current.name}
              <ArrowLeft className="size-4 transition-transform duration-500 group-hover:-translate-x-1" aria-hidden />
            </Link>
          </div>
        </div>

        {/* Image stack (cross-fade) */}
        <div className="lg:col-span-7" data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
          <div className="relative mx-auto max-w-[620px]">
            <span
              className="latin-italic pointer-events-none absolute -top-10 end-0 z-10 hidden select-none text-[7rem] leading-none opacity-[0.12] lg:block"
              dir="ltr"
              aria-hidden
            >
              {String(active + 1).padStart(2, "0")}
            </span>
            <div className="studio-frame relative aspect-[4/5] overflow-hidden rounded-sm shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)]">
              {perColor.map((p, i) => (
                <div
                  key={p.color.name}
                  className={cn(
                    "absolute inset-0 transition-[opacity,transform] duration-[1100ms] ease-[var(--ease-out-expo)]",
                    i === active ? "scale-100 opacity-100" : "scale-[1.04] opacity-0",
                  )}
                  aria-hidden={i !== active}
                >
                  <MediaImage media={p.image} sizes="(min-width: 1024px) 45vw, 92vw" className="h-full w-full" alt={`${product.name} — ${p.color.name}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
