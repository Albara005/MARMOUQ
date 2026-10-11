"use client";

import { useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { cn } from "@/lib/utils";
import { SLOT_META, type AtelierOption, type SlotKey } from "./model";

/**
 * Flat-lay layout, as if the pieces were laid on a tailor's table.
 * Percentages of the stage box; mobile stage is 4:5, desktop 6:5. Cards keep a 4:5 photo ratio.
 * Physical left/top on purpose: this is a composed picture, not reading-order UI.
 */
const LAYOUT: Record<SlotKey, { m: [number, number, number]; d: [number, number, number]; rot: number; z: number }> = {
  //            mobile [left, top, width]   desktop [left, top, width]
  shirt: { m: [4, 3, 40], d: [7, 4, 27], rot: -5, z: 1 },
  knit: { m: [29, 11, 49], d: [32, 9, 34], rot: 2, z: 3 },
  tie: { m: [71, 4, 25], d: [70.5, 6, 18.5], rot: 7, z: 4 },
  trousers: { m: [6, 50, 37], d: [12, 50.5, 25], rot: -3, z: 2 },
  shoes: { m: [55, 55, 39], d: [60, 50, 26], rot: 4, z: 4 },
};

export type StagePiece = { slot: SlotKey; index: number; option: AtelierOption | null };

export function CompositionStage({
  pieces,
  activeSlot,
  onPick,
  cascadeAt,
  className,
}: {
  pieces: StagePiece[];
  activeSlot: SlotKey;
  onPick: (slot: SlotKey) => void;
  /** timestamp of the last "inspire me" — swaps within a short window animate as a cascade */
  cascadeAt: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative isolate aspect-[4/5] w-full overflow-hidden rounded-2xl lg:aspect-[6/5]",
        "bg-[radial-gradient(120%_95%_at_50%_30%,#f6efe6_0%,#ece2d5_55%,#dccdbb_100%)]",
        className,
      )}
    >
      {/* linen weave + vignette */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] mix-blend-multiply"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(74,56,46,0.05) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgba(74,56,46,0.04) 0 1px, transparent 1px 4px)",
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 -z-10 shadow-[inset_0_0_120px_rgba(60,40,28,0.18)]" aria-hidden />
      {/* tailor's chalk mark */}
      <span dir="ltr" className="latin-italic pointer-events-none absolute bottom-3 left-4 -z-10 text-[0.8rem] tracking-wide text-umber/35 select-none" aria-hidden>
        Marmouq Atelier — N° {String(pieces.filter((p) => p.option).length).padStart(2, "0")}
      </span>

      {pieces.map((p) => (
        <Piece key={p.slot} piece={p} active={activeSlot === p.slot} onPick={onPick} cascadeAt={cascadeAt} />
      ))}
    </div>
  );
}

function Piece({ piece, active, onPick, cascadeAt }: { piece: StagePiece; active: boolean; onPick: (s: SlotKey) => void; cascadeAt: number }) {
  const { slot, option, index } = piece;
  const meta = SLOT_META[slot];
  const L = LAYOUT[slot];
  const innerRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const contentKey = option?.key ?? "none";

  // Swap animation (Web Animations API): the new piece is "laid down" on the table.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const el = innerRef.current;
    if (!el || typeof el.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cascade = Date.now() - cascadeAt < 400;
    el.animate(
      [
        { opacity: 0, transform: `translateY(22px) scale(0.92) rotate(${L.rot > 0 ? -4 : 4}deg)`, filter: "blur(2px)" },
        { opacity: 1, transform: "none", filter: "blur(0)" },
      ],
      { duration: 720, delay: cascade ? index * 90 : 0, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" },
    );
  }, [contentKey, cascadeAt, index, L.rot]);

  const style = {
    "--ml": `${L.m[0]}%`,
    "--mt": `${L.m[1]}%`,
    "--mw": `${L.m[2]}%`,
    "--dl": `${L.d[0]}%`,
    "--dt": `${L.d[1]}%`,
    "--dw": `${L.d[2]}%`,
    zIndex: active ? 10 : L.z,
    transform: `rotate(${L.rot}deg)`,
  } as React.CSSProperties;

  const label = option
    ? `${meta.label}: ${option.name}${option.color ? ` — ${option.color}` : ""}. اضغط للتغيير`
    : `${meta.skipped}. اضغط لإضافة ${meta.label}`;

  return (
    <div
      className="absolute left-(--ml) top-(--mt) w-(--mw) transition-[z-index] lg:left-(--dl) lg:top-(--dt) lg:w-(--dw)"
      style={style}
    >
      <button
        type="button"
        onClick={() => onPick(slot)}
        aria-label={label}
        aria-pressed={active}
        className={cn(
          "group/piece block w-full rounded-[3px] text-start outline-none transition-transform duration-500 ease-[var(--ease-out-expo)]",
          "focus-visible:ring-2 focus-visible:ring-copper focus-visible:ring-offset-2 focus-visible:ring-offset-bone",
          active ? "-translate-y-1.5" : "hover:-translate-y-1",
        )}
      >
        <div ref={innerRef}>
          {option ? (
            <div
              className={cn(
                "bg-paper p-[3.5%] pb-[4%] transition-shadow duration-500",
                active
                  ? "shadow-[0_34px_60px_-26px_rgba(28,19,15,0.75),0_0_0_1.5px_var(--color-copper)]"
                  : "shadow-[0_26px_44px_-24px_rgba(28,19,15,0.6),0_2px_6px_-2px_rgba(28,19,15,0.18)] group-hover/piece:shadow-[0_34px_56px_-24px_rgba(28,19,15,0.68)]",
              )}
            >
              <div className="studio-frame aspect-[4/5] w-full">
                <MediaImage media={option.image} sizes="(min-width: 1024px) 22vw, 45vw" className="h-full w-full" alt="" />
              </div>
              <div className="mt-[4%] flex items-center justify-between gap-1 px-[2%]">
                <span className="truncate text-[0.6rem] font-medium leading-none text-espresso sm:text-[0.68rem] lg:text-[0.72rem]">{meta.label}</span>
                {option.colorHex && (
                  <span className="size-2 shrink-0 rounded-full ring-1 ring-black/15 lg:size-2.5" style={{ backgroundColor: option.colorHex }} aria-hidden />
                )}
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "grid aspect-[4/5] w-full place-items-center rounded-[3px] border-[1.5px] border-dashed bg-paper/25 text-center transition-colors duration-300",
                active ? "border-copper text-copper-deep" : "border-umber/30 text-taupe group-hover/piece:border-umber/60",
              )}
            >
              <span className="flex flex-col items-center gap-1.5 px-2">
                <span className="grid size-7 place-items-center rounded-full bg-paper/80 lg:size-9">
                  <Plus className="size-3.5 lg:size-4" aria-hidden />
                </span>
                <span className="text-[0.62rem] leading-tight lg:text-xs">{meta.skipped}</span>
              </span>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
