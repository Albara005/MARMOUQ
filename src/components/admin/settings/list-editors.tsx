"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Generic ordered list editor: renders each item with move up/down/remove controls and an add button. */
export function ListEditor<T>({
  items,
  onChange,
  render,
  create,
  addLabel,
  max,
  emptyLabel,
  itemLabel,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  render: (item: T, update: (patch: T) => void, index: number) => ReactNode;
  create: () => T;
  addLabel: string;
  max: number;
  emptyLabel: string;
  /** accessible label for item i (used by the move/remove buttons) */
  itemLabel: (i: number) => string;
}) {
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const iconBtn = "grid size-9 place-items-center rounded-full text-taupe transition-colors hover:bg-bone hover:text-espresso disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="space-y-2.5">
      {items.length === 0 && <p className="rounded-xl border border-dashed border-sand px-4 py-5 text-center text-sm text-taupe">{emptyLabel}</p>}
      <ol className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="group flex items-start gap-2 rounded-xl border border-line bg-paper p-2.5 ps-3 transition-colors focus-within:border-sand">
            <span className="mt-2.5 w-5 shrink-0 text-center text-xs tabular-nums text-mist" aria-hidden>
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">{render(item, (patch) => onChange(items.map((x, k) => (k === i ? patch : x))), i)}</div>
            <div className="flex shrink-0 flex-col items-center sm:flex-row">
              <button type="button" className={iconBtn} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`نقل ${itemLabel(i)} للأعلى`}>
                <ArrowUp className="size-4" aria-hidden />
              </button>
              <button type="button" className={iconBtn} onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`نقل ${itemLabel(i)} للأسفل`}>
                <ArrowDown className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                className={cn(iconBtn, "hover:bg-danger/10 hover:text-danger")}
                onClick={() => onChange(items.filter((_, k) => k !== i))}
                aria-label={`حذف ${itemLabel(i)}`}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ol>
      {items.length < max && (
        <button
          type="button"
          onClick={() => onChange([...items, create()])}
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-dashed border-sand px-4 text-sm text-umber transition-colors hover:border-copper hover:text-copper-deep"
        >
          <Plus className="size-4" aria-hidden />
          {addLabel}
        </button>
      )}
    </div>
  );
}
