"use client";

import { Play, Plus } from "lucide-react";
import { BLOCK_CATALOG, BLOCK_LIMITS, HOME_SECTION_LABELS, type AddableBlockType, type BlockPosition, type HomeSectionKey } from "@/lib/blocks";
import { cn } from "@/lib/utils";
import { AdminDialog } from "./admin-dialog";
import { BlockTypeIcon, countAr } from "./block-meta";

/* ─────────── tiny schematic previews (pure CSS, follow the theme tokens) ─────────── */

const bar = "h-1 rounded-full bg-sand";

function Sketch({ type }: { type: AddableBlockType }) {
  const frame = "relative flex h-[4.5rem] w-full overflow-hidden rounded-lg bg-ivory ring-1 ring-line";
  switch (type) {
    case "banner":
      return (
        <div className={cn(frame, "items-center justify-center bg-gradient-to-br from-cocoa to-espresso ring-0")}>
          <div className="flex flex-col items-center gap-1.5">
            <span className="h-1 w-10 rounded-full bg-paper/80" />
            <span className="h-1 w-6 rounded-full bg-paper/45" />
            <span className="mt-0.5 h-2.5 w-8 rounded-full bg-paper" />
          </div>
        </div>
      );
    case "products":
      return (
        <div className={cn(frame, "flex-col gap-1.5 p-2.5")}>
          <span className={cn(bar, "w-12")} />
          <div className="grid flex-1 grid-cols-4 gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="rounded-[3px] bg-bone ring-1 ring-sand/60" />
            ))}
          </div>
        </div>
      );
    case "imageText":
      return (
        <div className={cn(frame, "gap-2.5 p-2.5")}>
          <span className="w-2/5 rounded-[3px] bg-sand" />
          <div className="flex flex-1 flex-col justify-center gap-1.5">
            <span className={cn(bar, "w-4/5 bg-espresso/60")} />
            <span className={cn(bar, "w-full")} />
            <span className={cn(bar, "w-3/5")} />
            <span className="mt-0.5 h-2 w-7 rounded-full bg-espresso/70" />
          </div>
        </div>
      );
    case "text":
      return (
        <div className={cn(frame, "flex-col items-center justify-center gap-1.5")}>
          <span className={cn(bar, "w-16 bg-espresso/60")} />
          <span className={cn(bar, "w-24")} />
          <span className={cn(bar, "w-20")} />
        </div>
      );
    case "gallery":
      return (
        <div className={cn(frame, "grid grid-cols-3 gap-1 p-2")}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={cn("rounded-[3px]", i % 2 ? "bg-sand" : "bg-bone ring-1 ring-sand/60")} />
          ))}
        </div>
      );
    case "features":
      return (
        <div className={cn(frame, "items-center justify-around px-2")}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className="size-4 rounded-full border border-copper/60" />
              <span className={cn(bar, "w-8 bg-espresso/50")} />
              <span className={cn(bar, "w-6")} />
            </div>
          ))}
        </div>
      );
    case "video":
      return (
        <div className={cn(frame, "items-center justify-center bg-espresso ring-0")}>
          <span className="grid size-7 place-items-center rounded-full bg-paper/90 text-espresso">
            <Play className="size-3 translate-x-px fill-current" aria-hidden />
          </span>
        </div>
      );
    case "look":
      return (
        <div className={cn(frame, "justify-center bg-bone")}>
          <span className="relative h-full w-2/5 bg-sand">
            <span className="absolute start-[30%] top-[30%] size-2 rounded-full bg-paper ring-2 ring-espresso/60" />
            <span className="absolute end-[25%] top-[62%] size-2 rounded-full bg-paper ring-2 ring-espresso/60" />
          </span>
        </div>
      );
    case "countdown":
      return (
        <div className={cn(frame, "items-center justify-center gap-1.5 bg-espresso ring-0")}>
          {["07", "12", "45", "09"].map((n) => (
            <span key={n} className="grid h-7 w-6 place-items-center rounded bg-paper/10 text-[0.6rem] tabular-nums text-paper/85">
              {n}
            </span>
          ))}
        </div>
      );
    case "marquee":
      return (
        <div className={cn(frame, "items-center")}>
          <div className="flex w-full items-center gap-2 bg-espresso px-2 py-2">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="h-1 w-7 rounded-full bg-paper/60" />
                <span className="size-1 rounded-full bg-copper-soft" />
              </span>
            ))}
          </div>
        </div>
      );
    case "newsletter":
      return (
        <div className={cn(frame, "flex-col items-center justify-center gap-2")}>
          <span className={cn(bar, "w-16 bg-espresso/60")} />
          <span className="flex h-3.5 w-28 items-center justify-end rounded-full bg-paper ring-1 ring-sand">
            <span className="me-0.5 h-2.5 w-7 rounded-full bg-espresso/75" />
          </span>
        </div>
      );
    case "faq":
      return (
        <div className={cn(frame, "flex-col justify-center gap-1.5 px-3")}>
          {[0, 1, 2].map((i) => (
            <span key={i} className="flex items-center justify-between border-b border-sand pb-1 last:border-0">
              <span className={cn(bar, i === 0 ? "w-20 bg-espresso/50" : "w-16")} />
              <Plus className="size-2.5 text-taupe" aria-hidden />
            </span>
          ))}
        </div>
      );
    case "spacer":
      return (
        <div className={cn(frame, "flex-col items-center justify-center gap-1.5")}>
          <span className="h-3 w-px bg-sand" />
          <span className="h-px w-2/3 bg-gradient-to-r from-transparent via-gold to-transparent" />
          <span className="h-3 w-px bg-sand" />
        </div>
      );
  }
}

/**
 * "Add a section" chooser: the block catalogue as preview cards.
 * On regular pages it also asks where the section goes (top / bottom of the page).
 */
export function BlockPicker({
  open,
  onClose,
  onPick,
  pageLabel,
  count,
  position,
  onPositionChange,
  positionHints,
  missingBuiltins = [],
  onRestoreBuiltin,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (type: AddableBlockType) => void;
  pageLabel: string;
  /** sections already on the page (for the limit) */
  count: number;
  position?: BlockPosition;
  onPositionChange?: (p: BlockPosition) => void;
  positionHints?: { top: string; bottom: string };
  /** home only: original sections the merchant removed */
  missingBuiltins?: HomeSectionKey[];
  onRestoreBuiltin?: (key: HomeSectionKey) => void;
}) {
  const remaining = BLOCK_LIMITS.perLayout - count;
  const full = remaining <= 0;
  return (
    <AdminDialog open={open} onClose={onClose} size="lg" title="إضافة قسم" description={`اختر نوع القسم الذي تريد إضافته إلى «${pageLabel}» — يمكنك تعديله ونقله بعد ذلك.`}>
      {full ? (
        <p className="rounded-xl border border-warning/25 bg-warning/[0.07] px-4 py-3 text-sm text-warning">{`وصلت الصفحة للحد الأقصى (${BLOCK_LIMITS.perLayout} قسماً). احذف قسماً لإضافة آخر.`}</p>
      ) : (
        <div className="space-y-6">
          {position && onPositionChange && positionHints && (
            <fieldset>
              <legend className="mb-2 text-[0.8rem] font-medium text-umber">أين يظهر القسم؟</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(["top", "bottom"] as const).map((p) => (
                  <label key={p} className="relative block">
                    <input type="radio" name="picker-position" className="peer sr-only" checked={position === p} onChange={() => onPositionChange(p)} />
                    <span className="block h-full cursor-pointer rounded-xl border border-line px-4 py-3 transition-colors hover:border-sand peer-checked:border-espresso peer-checked:bg-ivory peer-focus-visible:ring-2 peer-focus-visible:ring-copper/40">
                      <span className="block text-sm font-medium text-espresso">{p === "top" ? "أعلى الصفحة" : "أسفل الصفحة"}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-taupe">{p === "top" ? positionHints.top : positionHints.bottom}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {missingBuiltins.length > 0 && onRestoreBuiltin && (
            <section aria-labelledby="picker-builtins">
              <h3 id="picker-builtins" className="mb-2 text-xs font-semibold text-mist">
                أقسام مرموق الأصلية المحذوفة
              </h3>
              <ul className="flex flex-wrap gap-2">
                {missingBuiltins.map((k) => (
                  <li key={k}>
                    <button
                      type="button"
                      onClick={() => onRestoreBuiltin(k)}
                      className="inline-flex h-9 items-center gap-2 rounded-full bg-espresso px-4 text-[0.8rem] text-paper transition-colors hover:bg-cocoa"
                    >
                      <Plus className="size-3.5 text-copper-soft" aria-hidden />
                      {HOME_SECTION_LABELS[k]}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="picker-catalog">
            <h3 id="picker-catalog" className={cn("mb-2 text-xs font-semibold text-mist", !(missingBuiltins.length || position) && "sr-only")}>
              أقسام جديدة
            </h3>
            <ul className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {BLOCK_CATALOG.map((c) => (
                <li key={c.type}>
                  <button
                    type="button"
                    onClick={() => onPick(c.type)}
                    className="group flex h-full w-full flex-col gap-3 rounded-2xl border border-line bg-paper p-2.5 text-start transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-sand hover:shadow-[0_14px_30px_-20px_rgba(28,19,15,0.45)] focus-visible:border-copper motion-reduce:hover:translate-y-0"
                  >
                    <span className="hidden sm:block" aria-hidden>
                      <Sketch type={c.type} />
                    </span>
                    <span className="flex items-start gap-3 px-1 pb-1">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-bone text-copper-deep transition-colors group-hover:bg-espresso group-hover:text-copper-soft sm:size-8">
                        <BlockTypeIcon type={c.type} className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-espresso">{c.label}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-taupe">{c.description}</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          {remaining <= 5 && <p className="text-xs text-taupe">{`يمكنك إضافة ${countAr(remaining, ["قسم واحد", "قسمين", "أقسام", "قسماً"])} فقط لهذه الصفحة.`}</p>}
        </div>
      )}
    </AdminDialog>
  );
}
