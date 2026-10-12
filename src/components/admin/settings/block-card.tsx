"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Copy, Plus, Trash2 } from "lucide-react";
import type { Block, HomeSectionKey } from "@/lib/blocks";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/field";
import { BlockFields, type BlockPatch } from "./block-editors";
import { BlockTypeIcon, blockIssue, blockSummary, blockTitle, type SectionsCatalog } from "./block-meta";

const iconBtn =
  "grid size-8 place-items-center rounded-full text-taupe transition-colors hover:bg-bone hover:text-espresso aria-disabled:pointer-events-none aria-disabled:opacity-25";
const textBtn = "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[0.8rem] text-umber transition-colors hover:bg-bone hover:text-espresso disabled:pointer-events-none disabled:opacity-40";

/** DOM ids shared with the sections editor (focus management after add / delete). */
export const cardDomId = (blockId: string) => `blk-card-${blockId}`;
export const cardToggleId = (blockId: string) => `blk-toggle-${blockId}`;

/**
 * One section in a page layout: a calm one-line header (reorder, name, summary, visibility)
 * that expands into the section's fields.
 */
export function BlockCard({
  block,
  path,
  catalog,
  expanded,
  hasError,
  canMoveUp,
  canMoveDown,
  canAdd,
  onToggle,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
  onInsertAfter,
  onEditBuiltin,
  extra,
}: {
  block: Block;
  /** zod error path prefix of this block, e.g. "layouts.home.3" */
  path: string;
  catalog: SectionsCatalog;
  expanded: boolean;
  hasError: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** false when the page reached BLOCK_LIMITS.perLayout */
  canAdd: boolean;
  onToggle: () => void;
  onChange: (patch: BlockPatch) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate?: () => void;
  onDelete: () => void;
  onInsertAfter?: () => void;
  onEditBuiltin?: (key: HomeSectionKey) => void;
  /** rendered above the fields (e.g. the position select on regular pages) */
  extra?: ReactNode;
}) {
  const title = blockTitle(block);
  const summary = blockSummary(block, catalog);
  const issue = block.enabled ? blockIssue(block) : null;
  const panelId = `blk-panel-${block.id}`;
  const builtin = block.type === "builtin";

  return (
    <article
      id={cardDomId(block.id)}
      className={cn(
        "scroll-mt-28 rounded-2xl border bg-paper transition-[border-color,box-shadow] duration-200",
        hasError ? "border-danger/45" : expanded ? "border-sand shadow-[0_10px_30px_-18px_rgba(28,19,15,0.35)]" : "border-line shadow-[0_1px_2px_rgba(28,19,15,0.04)]",
      )}
    >
      <div className="flex items-center gap-1.5 p-2 sm:gap-2 sm:p-2.5">
        <div className="flex shrink-0 flex-col sm:flex-row">
          <button type="button" className={iconBtn} aria-disabled={!canMoveUp || undefined} onClick={() => canMoveUp && onMove(-1)} aria-label={`نقل «${title}» للأعلى`}>
            <ArrowUp className="size-4" aria-hidden />
          </button>
          <button type="button" className={iconBtn} aria-disabled={!canMoveDown || undefined} onClick={() => canMoveDown && onMove(1)} aria-label={`نقل «${title}» للأسفل`}>
            <ArrowDown className="size-4" aria-hidden />
          </button>
        </div>

        <button
          type="button"
          id={cardToggleId(block.id)}
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1.5 py-1.5 text-start outline-none transition-colors hover:bg-ivory/70 focus-visible:ring-2 focus-visible:ring-copper/40"
        >
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl transition-opacity",
              builtin ? "bg-espresso text-copper-soft" : "bg-bone text-copper-deep",
              !block.enabled && "opacity-45",
            )}
          >
            <BlockTypeIcon type={block} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className={cn("truncate text-sm font-medium", block.enabled ? "text-espresso" : "text-taupe")}>{title}</span>
              {!block.enabled && <span className="shrink-0 rounded-full bg-bone px-2 py-px text-[0.65rem] text-taupe">مخفي</span>}
            </span>
            <span className="mt-0.5 block truncate text-xs leading-5 text-taupe">
              {issue && <span className="text-warning">{issue}</span>}
              {issue && summary ? " · " : ""}
              {summary || (issue ? "" : "—")}
            </span>
          </span>
          {hasError && <span className="size-2 shrink-0 rounded-full bg-danger" role="img" aria-label="يحتوي على أخطاء" />}
          <ChevronDown className={cn("size-4 shrink-0 text-mist transition-transform duration-300 group-hover:text-taupe", expanded && "rotate-180")} aria-hidden />
        </button>

        <Switch
          checked={block.enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
          aria-label={`إظهار «${title}» في المتجر`}
          label={<span className="hidden w-9 text-xs text-taupe sm:inline">{block.enabled ? "ظاهر" : "مخفي"}</span>}
          className="shrink-0 pe-1 ps-1"
        />
      </div>

      {expanded && (
        <div id={panelId} role="region" aria-labelledby={cardToggleId(block.id)} className="border-t border-line px-4 pb-4 pt-5 sm:px-5">
          {extra}
          <div className="space-y-5">
            <BlockFields block={block} onChange={onChange} path={path} catalog={catalog} onEditBuiltin={onEditBuiltin} />
          </div>
          <div className="-mx-1 mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <div className="flex flex-wrap items-center gap-1">
              {onInsertAfter && (
                <button type="button" className={textBtn} onClick={onInsertAfter} disabled={!canAdd} aria-label={`إضافة قسم بعد «${title}»`}>
                  <Plus className="size-4" aria-hidden />
                  إضافة بعده
                </button>
              )}
              {onDuplicate && (
                <button type="button" className={textBtn} onClick={onDuplicate} disabled={!canAdd} aria-label={`تكرار «${title}»`}>
                  <Copy className="size-3.5" aria-hidden />
                  تكرار
                </button>
              )}
            </div>
            <button type="button" className={cn(textBtn, "text-danger hover:bg-danger/10 hover:text-danger")} onClick={onDelete} aria-label={`${builtin ? "إزالة" : "حذف"} «${title}»`}>
              <Trash2 className="size-3.5" aria-hidden />
              {builtin ? "إزالة" : "حذف"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

/** Small floating "+" between two cards (pointer devices; keyboard users reach it by Tab). */
export function InsertBetween({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 -bottom-[1.15rem] z-10 hidden h-6 items-center justify-center md:flex">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={label}
        className="pointer-events-auto grid size-6 place-items-center rounded-full bg-espresso text-paper opacity-0 shadow-md transition-[opacity,transform] duration-200 hover:scale-110 focus-visible:opacity-100 group-hover/item:opacity-100"
      >
        <Plus className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
