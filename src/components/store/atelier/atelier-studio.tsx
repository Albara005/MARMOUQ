"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Link2, Share2, ShoppingBag, Sparkles, X } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { Button } from "@/components/ui/button";
import { Price, useMoney } from "@/components/store/store-provider";
import { cn } from "@/lib/utils";
import { CompositionStage, type StagePiece } from "./composition-stage";
import { SizesSheet } from "./sizes-sheet";
import {
  RECIPES,
  SLOT_META,
  matchLook,
  matchRecipe,
  resolveRecipe,
  selectionToQuery,
  type AtelierOption,
  type AtelierSlot,
  type LookMatch,
  type Selection,
  type SlotKey,
} from "./model";

const pad = (n: number) => String(n).padStart(2, "0");
const piecesLabel = (n: number) => (n === 1 ? "قطعة واحدة" : n === 2 ? "قطعتان" : `${n} قطع`);

export function AtelierStudio({ slots, looks, initial }: { slots: AtelierSlot[]; looks: LookMatch[]; initial: Selection }) {
  const uid = useId();
  const money = useMoney();
  const [selection, setSelection] = useState<Selection>(initial);
  const [activeSlot, setActiveSlot] = useState<SlotKey>(slots[0].key);
  const [cascadeAt, setCascadeAt] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "copied" | "error">("idle");
  const [announce, setAnnounce] = useState("");
  const touched = useRef(false);
  const panelRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Partial<Record<SlotKey, HTMLButtonElement | null>>>({});

  const optionsByKey = useMemo(() => {
    const m = new Map<string, AtelierOption>();
    for (const s of slots) for (const o of s.options) m.set(o.key, o);
    return m;
  }, [slots]);

  const chosen = useMemo(
    () =>
      slots.map((s, index) => ({
        slot: s.key,
        index,
        option: selection[s.key] ? (optionsByKey.get(selection[s.key]!) ?? null) : null,
      })) satisfies StagePiece[],
    [slots, selection, optionsByKey],
  );
  const picked = chosen.filter((c): c is StagePiece & { option: AtelierOption } => !!c.option);
  const total = picked.reduce((s, c) => s + c.option.price, 0);
  const recipe = useMemo(() => matchRecipe(selection, slots), [selection, slots]);
  const look = useMemo(() => matchLook(selection, looks), [selection, looks]);

  // Shareable state: mirror the composition into the URL (without a server round-trip)
  useEffect(() => {
    if (!touched.current) return;
    const q = selectionToQuery(selection, slots);
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?${q}`);
  }, [selection, slots]);

  const choose = useCallback((slot: SlotKey, key: string | null) => {
    touched.current = true;
    setSelection((prev) => (prev[slot] === key ? prev : { ...prev, [slot]: key }));
  }, []);

  const inspire = () => {
    touched.current = true;
    const start = recipe ? RECIPES.findIndex((r) => r.id === recipe.id) : -1;
    for (let step = 1; step <= RECIPES.length; step++) {
      const next = RECIPES[(start + step + RECIPES.length) % RECIPES.length];
      const resolved = resolveRecipe(next, slots);
      if (slots.some((s) => resolved[s.key] !== selection[s.key])) {
        setCascadeAt(Date.now());
        setSelection(resolved);
        setAnnounce(`تنسيق مقترح: ${next.name}`);
        return;
      }
    }
  };

  const focusSlot = (slot: SlotKey, opts?: { scroll?: boolean; focusTab?: boolean }) => {
    setActiveSlot(slot);
    if (opts?.focusTab) tabRefs.current[slot]?.focus();
    if (opts?.scroll && panelRef.current && window.matchMedia("(max-width: 1023px)").matches) {
      const r = panelRef.current.getBoundingClientRect();
      if (r.top > window.innerHeight * 0.55 || r.top < 60) {
        panelRef.current.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      }
    }
  };

  const onTabKey = (e: React.KeyboardEvent, index: number) => {
    // RTL: the next tab sits to the LEFT
    let next = -1;
    if (e.key === "ArrowLeft") next = (index + 1) % slots.length;
    else if (e.key === "ArrowRight") next = (index - 1 + slots.length) % slots.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = slots.length - 1;
    if (next === -1) return;
    e.preventDefault();
    focusSlot(slots[next].key, { focusTab: true });
  };

  const share = async () => {
    const url = `${window.location.origin}/atelier?${selectionToQuery(selection, slots)}`;
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: "تنسيقي من مرموق", text: recipe ? recipe.name : "شوف الطقم اللي نسّقته في أتيليه مرموق", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareState("copied");
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setShareState("error");
    }
    window.setTimeout(() => setShareState("idle"), 2600);
  };

  const activeIndex = Math.max(0, slots.findIndex((s) => s.key === activeSlot));
  const active = slots[activeIndex];
  const prevSlot = slots[activeIndex - 1];
  const nextSlot = slots[activeIndex + 1];
  const canCheckout = picked.length > 0;

  return (
    <div className="container-luxe">
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-12 lg:gap-12 xl:gap-16">
        {/* ───────── Stage ───────── */}
        <div className="min-w-0 lg:col-span-7">
          <div className="lg:sticky lg:top-24">
            <CompositionStage pieces={chosen} activeSlot={activeSlot} onPick={(s) => focusSlot(s, { scroll: true })} cascadeAt={cascadeAt} />

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="min-w-0" aria-live="polite">
                <p className="eyebrow text-[0.62rem] md:text-[0.68rem]">{recipe ? "Curated Composition" : "Your Composition"}</p>
                <p className="display mt-1 truncate text-lg leading-tight text-espresso md:text-xl">{recipe ? recipe.name : "تنسيقك الخاص"}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-taupe md:text-[0.82rem]">
                  {recipe ? recipe.line : picked.length ? "ذوقك يتكلم — كمّل أو خلّنا نقترح عليك." : "ابدأ بقطعة واحدة وخلّ الباقي يتبعها."}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={share}
                  className="relative grid size-11 place-items-center rounded-full border border-line bg-paper text-espresso transition-colors hover:border-espresso/50"
                  aria-label="شارك التنسيق"
                >
                  {shareState === "copied" ? <Check className="size-4 text-success" aria-hidden /> : <Share2 className="size-4" strokeWidth={1.7} aria-hidden />}
                </button>
                <Button variant="copper" size="md" onClick={inspire} className="min-h-11 gap-2 px-5">
                  <Sparkles className="size-4" aria-hidden />
                  ألهمني
                </Button>
              </div>
            </div>
            <p className={cn("mt-2 h-4 text-xs transition-opacity", shareState === "idle" ? "opacity-0" : "opacity-100", shareState === "error" ? "text-danger" : "text-success")} role="status">
              {shareState === "copied" ? (
                <span className="inline-flex items-center gap-1.5">
                  <Link2 className="size-3.5" aria-hidden /> نسخنا رابط تنسيقك — أرسله لمن تحب.
                </span>
              ) : shareState === "error" ? (
                "تعذّر نسخ الرابط، انسخه من شريط العنوان."
              ) : null}
            </p>
          </div>
        </div>

        {/* ───────── Controls ───────── */}
        <div className="min-w-0 lg:col-span-5">
          {/* Slot tabs: a fixed bottom dock on phones, a quiet row on desktop */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_30px_-20px_rgba(28,19,15,0.35)] backdrop-blur-md lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:pb-0 lg:shadow-none lg:backdrop-blur-none">
            <div className="mx-auto flex max-w-xl items-center gap-1.5 px-2 py-1.5 lg:max-w-none lg:p-0">
              <div role="tablist" aria-label="قطع الإطلالة" className="grid flex-1 grid-cols-5 lg:gap-2">
                {slots.map((s, i) => {
                  const opt = chosen[i].option;
                  const isActive = s.key === activeSlot;
                  return (
                    <button
                      key={s.key}
                      ref={(el) => {
                        tabRefs.current[s.key] = el;
                      }}
                      type="button"
                      role="tab"
                      id={`${uid}-tab-${s.key}`}
                      aria-selected={isActive}
                      aria-controls={`${uid}-panel`}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => focusSlot(s.key, { scroll: true })}
                      onKeyDown={(e) => onTabKey(e, i)}
                      className={cn(
                        "group relative flex min-h-[3.4rem] flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1 outline-none transition-colors",
                        "focus-visible:ring-2 focus-visible:ring-copper/50",
                        "lg:min-h-0 lg:gap-2 lg:border lg:px-1.5 lg:pb-2.5 lg:pt-1.5",
                        isActive ? "lg:border-espresso lg:bg-paper" : "lg:border-line lg:hover:border-espresso/40",
                      )}
                    >
                      <span
                        className={cn(
                          "relative block size-8 overflow-hidden rounded-full ring-offset-1 ring-offset-paper transition-all lg:aspect-[4/5] lg:h-auto lg:w-full lg:rounded-md lg:ring-offset-0",
                          opt ? "studio-frame" : "border border-dashed border-umber/35 bg-bone/50",
                          isActive ? "ring-2 ring-copper lg:ring-0" : "ring-0",
                        )}
                        aria-hidden
                      >
                        {opt ? (
                          <MediaImage media={opt.image} sizes="96px" className="h-full w-full" alt="" />
                        ) : (
                          <X className="absolute inset-0 m-auto size-3 text-taupe lg:size-4" aria-hidden />
                        )}
                      </span>
                      <span className={cn("flex items-baseline gap-1 text-[0.66rem] leading-none lg:text-xs", isActive ? "font-medium text-espresso" : "text-taupe")}>
                        <span className="latin-italic hidden text-[0.8rem] text-copper lg:inline">{pad(i + 1)}</span>
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                disabled={!canCheckout}
                className="flex h-[3.25rem] min-w-[7.4rem] shrink-0 flex-col items-center justify-center rounded-full bg-espresso px-4 text-paper shadow-[0_10px_24px_-12px_rgba(28,19,15,0.7)] transition-colors hover:bg-cocoa disabled:opacity-40 lg:hidden"
                aria-haspopup="dialog"
              >
                <span className="text-[0.66rem] tabular-nums text-paper/70">{money(total)}</span>
                <span className="text-[0.8rem] font-medium">اختر المقاسات</span>
              </button>
            </div>
          </div>

          {/* Options for the active slot */}
          <section
            ref={panelRef}
            id={`${uid}-panel`}
            role="tabpanel"
            aria-labelledby={`${uid}-tab-${active.key}`}
            className="scroll-mt-20 lg:mt-8"
          >
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="display text-[1.6rem] leading-tight text-espresso md:text-3xl">{SLOT_META[active.key].choose}</h2>
              <span dir="ltr" className="latin-italic shrink-0 text-lg text-taupe">
                {pad(activeIndex + 1)} <span className="text-mist">/ {pad(slots.length)}</span>
              </span>
            </div>
            {active.description && <p className="mt-2 text-sm leading-7 text-taupe text-pretty">{active.description}</p>}

            <div
              role="radiogroup"
              aria-label={SLOT_META[active.key].choose}
              className="no-scrollbar -mx-4 mt-5 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 md:-mx-10 md:scroll-px-10 md:px-10 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-x-3 lg:gap-y-5 lg:overflow-visible lg:px-0"
            >
              {active.options.map((o) => {
                const checked = selection[active.key] === o.key;
                return (
                  <label key={o.key} className="group relative w-[40%] shrink-0 cursor-pointer snap-start sm:w-[28%] lg:w-auto">
                    <input
                      type="radio"
                      name={`${uid}-${active.key}`}
                      value={o.key}
                      checked={checked}
                      onChange={() => choose(active.key, o.key)}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "studio-frame relative block aspect-[4/5] overflow-hidden rounded-lg ring-offset-2 ring-offset-ivory transition-shadow duration-300",
                        "peer-focus-visible:ring-2 peer-focus-visible:ring-copper",
                        checked ? "ring-[1.5px] ring-espresso" : "group-hover:ring-1 group-hover:ring-espresso/30",
                      )}
                    >
                      <MediaImage
                        media={o.image}
                        sizes="(min-width: 1024px) 12vw, 40vw"
                        className="h-full w-full"
                        imgClassName="transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
                        alt=""
                      />
                      {checked && (
                        <span className="absolute end-2 top-2 grid size-6 place-items-center rounded-full bg-espresso text-paper shadow" aria-hidden>
                          <Check className="size-3.5" strokeWidth={2.2} />
                        </span>
                      )}
                      {!o.inStock && (
                        <span className="absolute inset-x-2 bottom-2 rounded-full bg-paper/90 py-1 text-center text-[0.65rem] text-espresso">نفدت الكمية</span>
                      )}
                    </span>
                    <span className="mt-2.5 block truncate text-[0.82rem] font-medium leading-5 text-espresso">{o.name}</span>
                    <span className="mt-0.5 flex items-center justify-between gap-2 text-xs text-taupe">
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        {o.colorHex && <span className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: o.colorHex }} aria-hidden />}
                        <span className="truncate">{o.color || "لون واحد"}</span>
                      </span>
                      <Price amount={o.price} className="shrink-0 text-umber" />
                    </span>
                  </label>
                );
              })}

              {/* Skip this slot */}
              <label className="group relative w-[40%] shrink-0 cursor-pointer snap-start sm:w-[28%] lg:w-auto">
                <input
                  type="radio"
                  name={`${uid}-${active.key}`}
                  value="none"
                  checked={selection[active.key] === null}
                  onChange={() => choose(active.key, null)}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed px-3 text-center ring-offset-2 ring-offset-ivory transition-colors",
                    "peer-focus-visible:ring-2 peer-focus-visible:ring-copper",
                    selection[active.key] === null ? "border-espresso bg-paper text-espresso" : "border-sand text-taupe group-hover:border-umber/50",
                  )}
                >
                  <X className="size-5" strokeWidth={1.5} aria-hidden />
                  <span className="text-[0.82rem] font-medium">تخطّى هذه القطعة</span>
                </span>
                <span className="mt-2.5 block text-xs text-taupe">{SLOT_META[active.key].skipped}</span>
              </label>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              {prevSlot ? (
                <button
                  type="button"
                  onClick={() => focusSlot(prevSlot.key, { scroll: true })}
                  className="inline-flex min-h-11 items-center gap-2 text-sm text-taupe transition-colors hover:text-espresso"
                >
                  <ArrowRight className="size-4" aria-hidden />
                  {prevSlot.label}
                </button>
              ) : (
                <span />
              )}
              {nextSlot ? (
                <button
                  type="button"
                  onClick={() => focusSlot(nextSlot.key, { scroll: true })}
                  className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-paper px-5 text-sm font-medium text-espresso transition-colors hover:border-espresso/50"
                >
                  التالي: {nextSlot.label}
                  <ArrowLeft className="size-4 transition-transform duration-500 group-hover:-translate-x-1" aria-hidden />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSheetOpen(true)}
                  disabled={!canCheckout}
                  className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-espresso bg-paper px-5 text-sm font-medium text-espresso transition-colors hover:bg-espresso hover:text-paper disabled:opacity-40"
                >
                  الطقم جاهز — المقاسات
                  <ArrowLeft className="size-4 transition-transform duration-500 group-hover:-translate-x-1" aria-hidden />
                </button>
              )}
            </div>
          </section>

          {/* Summary */}
          <section aria-labelledby={`${uid}-summary`} className="mt-9 rounded-2xl border border-line bg-paper p-5 md:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id={`${uid}-summary`} className="display text-xl text-espresso">
                تنسيقك
              </h2>
              <span className="text-xs text-taupe">{picked.length ? piecesLabel(picked.length) : "لا قطع بعد"}</span>
            </div>

            {picked.length ? (
              <ul className="mt-3 divide-y divide-line">
                {picked.map((c) => (
                  <li key={c.slot} className="flex items-center gap-3 py-3">
                    <span className="w-14 shrink-0 text-[0.7rem] text-taupe">{SLOT_META[c.slot].label}</span>
                    <Link
                      href={`/product/${c.option.slug}${c.option.color ? `?color=${encodeURIComponent(c.option.color)}` : ""}`}
                      className="min-w-0 flex-1 text-sm leading-6 text-espresso hover:underline hover:decoration-copper/60 hover:underline-offset-4"
                    >
                      <span className="block truncate">{c.option.name}</span>
                      {c.option.color && <span className="block text-xs text-taupe">{c.option.color}</span>}
                    </Link>
                    <Price amount={c.option.price} className="shrink-0 text-sm text-umber" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-xl bg-bone/60 px-4 py-5 text-center text-sm leading-7 text-taupe">
                الطاولة فاضية — اختر قطعة واحدة على الأقل، أو اضغط «ألهمني» ونرتّبها لك.
              </p>
            )}

            {look && (
              <Link
                href={`/looks/${look.slug}`}
                className="group mt-4 flex items-center gap-3 rounded-xl border border-copper/25 bg-copper/[0.07] px-4 py-3.5 text-sm text-copper-deep transition-colors hover:bg-copper/10"
              >
                <Sparkles className="size-4 shrink-0" aria-hidden />
                <span className="flex-1 leading-6">
                  {look.discountPercent > 0 ? (
                    <>
                      هذه إطلالة جاهزة بخصم {look.discountPercent}% — <strong className="font-medium">«{look.title}»</strong>
                    </>
                  ) : (
                    <>
                      تنسيقك يطابق إطلالتنا <strong className="font-medium">«{look.title}»</strong>
                    </>
                  )}
                </span>
                <ArrowLeft className="size-4 shrink-0 transition-transform duration-500 group-hover:-translate-x-1" aria-hidden />
              </Link>
            )}

            <div className="mt-4 flex items-end justify-between gap-4 border-t border-line pt-4">
              <span className="text-sm text-umber">المجموع</span>
              <span className="display text-2xl tabular-nums text-espresso md:text-[1.7rem]">{money(total)}</span>
            </div>

            <Button size="lg" className="mt-5 hidden w-full lg:inline-flex" onClick={() => setSheetOpen(true)} disabled={!canCheckout} aria-haspopup="dialog">
              <ShoppingBag className="size-[1.1rem]" strokeWidth={1.6} aria-hidden />
              اختر المقاسات
            </Button>
            <p className="mt-4 text-center text-[0.72rem] leading-6 text-taupe">الدفع عند الاستلام · توصيل لكل المحافظات · استبدال خلال 3 أيام</p>
          </section>
        </div>
      </div>

      <SizesSheet open={sheetOpen} onClose={() => setSheetOpen(false)} rows={picked.map((c) => ({ slot: c.slot, option: c.option }))} look={look} />
    </div>
  );
}
