"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, CircleAlert, ExternalLink, FilePlus2, House, Lock, MoveHorizontal, PanelBottom, PanelTop, Plus, RotateCcw, Trash2, type LucideIcon } from "lucide-react";
import {
  BLOCK_LIMITS,
  HOME_SECTION_ORDER,
  STORE_PAGES,
  createBlock,
  newBlockId,
  pageSlug,
  resolveHomeLayout,
  type AddableBlockType,
  type Block,
  type BlockPosition,
  type CustomPage,
  type HomeSectionKey,
  type Layouts,
  type PlacedBlock,
  type StorePageKey,
} from "@/lib/blocks";
import { cn } from "@/lib/utils";
import { Input, Switch, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ActionFieldError, toast, useActionFormState } from "@/components/admin/ui-client";
import { AdminDialog } from "./admin-dialog";
import { BlockCard, InsertBetween, cardDomId, cardToggleId } from "./block-card";
import { BlockPicker } from "./block-picker";
import { LINKS_DATALIST_ID, type BlockPatch } from "./block-editors";
import { blockTitle, type SectionsCatalog } from "./block-meta";

type Updater<T> = T | ((prev: T) => T);
type NavLink = { label: string; href: string };
type HomeSwitches = Partial<Record<HomeSectionKey, boolean>>;
type PageRef = { kind: "home" } | { kind: "store"; key: StorePageKey; label: string; href: string; topHint: string; bottomHint: string } | { kind: "custom"; page: CustomPage; index: number };

const NAV_MAX = 8;
const posOf = (b: PlacedBlock): BlockPosition => (b.position === "top" ? "top" : "bottom");

/* ─────────── pure layout helpers ─────────── */

/** Top blocks first, then bottom ones (stable) — the stored order always matches what the editor shows. */
function normalizePlaced(list: PlacedBlock[]): PlacedBlock[] {
  return [...list.filter((b) => posOf(b) === "top"), ...list.filter((b) => posOf(b) === "bottom")];
}

function insertAfter<T extends Block>(list: T[], afterId: string | null, item: T): T[] {
  const at = afterId ? list.findIndex((b) => b.id === afterId) : -1;
  return at < 0 ? [...list, item] : [...list.slice(0, at + 1), item, ...list.slice(at + 1)];
}

/** Puts an original home section back where it naturally belongs (next to its original neighbours). */
export function restoreBuiltin(layout: Block[], key: HomeSectionKey): Block[] {
  if (layout.some((b) => b.type === "builtin" && b.key === key)) return layout;
  const fresh: Block = { id: `builtin-${key}`, type: "builtin", key, enabled: true };
  const at = (k: HomeSectionKey) => layout.findIndex((b) => b.type === "builtin" && b.key === k);
  const idx = HOME_SECTION_ORDER.indexOf(key);
  for (let k = idx - 1; k >= 0; k--) {
    const i = at(HOME_SECTION_ORDER[k]);
    if (i >= 0) return [...layout.slice(0, i + 1), fresh, ...layout.slice(i + 1)];
  }
  for (let k = idx + 1; k < HOME_SECTION_ORDER.length; k++) {
    const i = at(HOME_SECTION_ORDER[k]);
    if (i >= 0) return [...layout.slice(0, i), fresh, ...layout.slice(i)];
  }
  return [fresh, ...layout];
}

/** Shows / hides an original home section in the resolved layout (re-adding it if it was removed). */
export function setBuiltinEnabled(layout: Block[], key: HomeSectionKey, on: boolean): Block[] {
  const has = layout.some((b) => b.type === "builtin" && b.key === key);
  if (!has) return on ? restoreBuiltin(layout, key) : layout;
  return layout.map((b) => (b.type === "builtin" && b.key === key ? { ...b, enabled: on } : b));
}

/** Slug while typing: keeps trailing dashes so "summer-" can become "summer-sale". */
const slugDraft = (v: string) =>
  v
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 60);

const stopEnter = (e: React.KeyboardEvent) => {
  // the whole settings page is one <form>: Enter here must not save it
  if (e.key === "Enter") e.preventDefault();
};

/* ─────────── page templates for new custom pages ─────────── */

const PAGE_TEMPLATES: { id: string; label: string; description: string; blocks: AddableBlockType[] }[] = [
  { id: "blank", label: "صفحة فارغة", description: "ابدأ من الصفر وأضف ما تريد.", blocks: [] },
  { id: "collection", label: "مجموعة", description: "بانر، منتجات، ثم صورة ونص.", blocks: ["banner", "products", "imageText"] },
  { id: "campaign", label: "حملة أو عرض", description: "بانر، عدّاد تنازلي، ومنتجات العرض.", blocks: ["banner", "countdown", "products"] },
  { id: "info", label: "صفحة معلومات", description: "نص، مميزات، وأسئلة شائعة.", blocks: ["text", "features", "faq"] },
];

/* ─────────── small pieces ─────────── */

function PinnedRow({ icon: Icon, title, note, action }: { icon: LucideIcon; title: string; note: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-sand bg-ivory/70 py-2.5 pe-2.5 ps-[3.25rem] sm:ps-[5.5rem]">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-paper text-taupe ring-1 ring-line">
        <Icon className="size-[1.05rem]" strokeWidth={1.6} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-umber">
          {title}
          <Lock className="size-3 text-mist" aria-label="ثابت" />
        </p>
        <p className="text-xs leading-5 text-taupe">{note}</p>
      </div>
      {action && (
        <button type="button" onClick={action.onClick} className="h-9 shrink-0 rounded-full px-3 text-xs font-medium text-copper-deep transition-colors hover:bg-bone">
          {action.label}
        </button>
      )}
    </div>
  );
}

function AddRow({ label, hint, onClick, disabled, compact }: { label: string; hint?: string; onClick: () => void; disabled?: boolean; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-sand px-4 text-sm text-umber transition-colors hover:border-copper hover:bg-paper hover:text-copper-deep disabled:pointer-events-none disabled:opacity-45",
        compact ? "min-h-12 py-2.5" : "min-h-14 py-3",
      )}
    >
      <Plus className="size-4 shrink-0" aria-hidden />
      <span>
        {label}
        {hint && <span className="ms-1.5 text-xs text-taupe">— {hint}</span>}
      </span>
    </button>
  );
}

function ZoneLabel({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-2 px-1 pt-1">
      <Icon className="mt-px size-4 shrink-0 text-copper" strokeWidth={1.6} aria-hidden />
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-[0.8rem] font-semibold text-espresso">{title}</span>
        <span className="text-xs text-taupe">{hint}</span>
      </p>
    </div>
  );
}

function PageChip({ active, onClick, children, count, error, muted }: { active: boolean; onClick: () => void; children: ReactNode; count?: number; error?: boolean; muted?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[0.82rem] transition-colors duration-200",
        active ? "bg-espresso text-paper" : "bg-ivory text-umber ring-1 ring-line hover:bg-bone hover:text-espresso",
        muted && !active && "text-taupe",
      )}
    >
      {children}
      {count ? <span className={cn("rounded-full px-1.5 text-[0.68rem] leading-5 tabular-nums", active ? "bg-paper/15 text-paper" : "bg-paper text-taupe ring-1 ring-line")}>{count}</span> : null}
      {error && <span className="size-2 rounded-full bg-danger" role="img" aria-label="يحتوي على أخطاء" />}
    </button>
  );
}

/* ─────────── custom page settings ─────────── */

function CustomPageSettings({
  page,
  index,
  slugTaken,
  inNav,
  navFull,
  onChange,
  onSlugCommit,
  onAddToNav,
  onDelete,
}: {
  page: CustomPage;
  index: number;
  slugTaken: boolean;
  inNav: boolean;
  navFull: boolean;
  onChange: (patch: Partial<CustomPage>) => void;
  onSlugCommit: (from: string, to: string) => void;
  onAddToNav: () => void;
  onDelete: () => void;
}) {
  const p = `customPages.${index}`;
  const id = `cp-${page.id}`;
  const [slugAtFocus, setSlugAtFocus] = useState<string | null>(null);
  const { state } = useActionFormState();
  const err = (k: string) => (state && !state.ok ? state.fieldErrors?.[`${p}.${k}`] : undefined);
  const label = "mb-1 block text-[0.8rem] font-medium text-umber";

  return (
    <section aria-labelledby={`${id}-h`} className="rounded-2xl border border-line bg-paper p-4 shadow-[0_1px_2px_rgba(28,19,15,0.04)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h4 id={`${id}-h`} className="text-[0.95rem] font-semibold text-espresso">
          إعدادات الصفحة
        </h4>
        <Switch
          checked={page.published}
          onChange={(e) => onChange({ published: e.target.checked })}
          label={
            <span className={cn("text-sm font-medium", page.published ? "text-success" : "text-taupe")}>{page.published ? "منشورة للزوار" : "مسودة — مخفية عن الزوار"}</span>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-title`} className={label}>
            عنوان الصفحة
          </label>
          <Input id={`${id}-title`} className="h-11 text-sm" maxLength={80} value={page.title} aria-invalid={err("title") ? true : undefined} onChange={(e) => onChange({ title: e.target.value })} onKeyDown={stopEnter} />
          <ActionFieldError name={`${p}.title`} />
        </div>
        <div>
          <label htmlFor={`${id}-slug`} className={label}>
            رابط الصفحة
          </label>
          <div
            dir="ltr"
            className={cn(
              "flex h-11 items-center overflow-hidden rounded-xl border bg-paper transition-colors focus-within:border-copper focus-within:ring-2 focus-within:ring-copper/15",
              err("slug") || slugTaken ? "border-danger" : "border-line",
            )}
          >
            <span className="select-none ps-4 text-sm text-mist">/pages/</span>
            <input
              id={`${id}-slug`}
              className="h-full min-w-0 flex-1 bg-transparent pe-4 text-sm text-espresso outline-none"
              value={page.slug}
              maxLength={60}
              spellCheck={false}
              autoCapitalize="off"
              aria-invalid={err("slug") || slugTaken ? true : undefined}
              aria-describedby={`${id}-slug-hint`}
              onFocus={() => setSlugAtFocus(page.slug)}
              onChange={(e) => onChange({ slug: slugDraft(e.target.value) })}
              onBlur={() => {
                const final = pageSlug(page.slug) || pageSlug(page.title) || slugAtFocus || page.slug;
                if (final !== page.slug) onChange({ slug: final });
                if (slugAtFocus && slugAtFocus !== final) onSlugCommit(slugAtFocus, final);
                setSlugAtFocus(null);
              }}
              onKeyDown={stopEnter}
            />
          </div>
          {err("slug") ? (
            <ActionFieldError name={`${p}.slug`} />
          ) : (
            <p id={`${id}-slug-hint`} className={cn("mt-1.5 text-xs leading-5", slugTaken ? "text-danger" : "text-taupe")}>
              {slugTaken ? "هذا الرابط مستخدم لصفحة أخرى — اختر رابطاً مختلفاً." : "أحرف وأرقام وشرطات فقط. تغييره بعد النشر يُبطل الروابط القديمة."}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <Switch checked={page.showHeader} onChange={(e) => onChange({ showHeader: e.target.checked })} label="إظهار ترويسة الصفحة (عنوان صغير + العنوان + مقدمة)" />
        </div>
        {page.showHeader && (
          <>
            <div>
              <label htmlFor={`${id}-eyebrow`} className={label}>
                العنوان الصغير
              </label>
              <Input id={`${id}-eyebrow`} className="h-11 text-sm" maxLength={60} placeholder="The Edit" value={page.eyebrow} onChange={(e) => onChange({ eyebrow: e.target.value })} onKeyDown={stopEnter} />
              <ActionFieldError name={`${p}.eyebrow`} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`${id}-intro`} className={label}>
                المقدمة
              </label>
              <Textarea id={`${id}-intro`} rows={2} className="min-h-0 text-sm" maxLength={600} placeholder="سطران يعرّفان الزائر بالصفحة (اختياري)" value={page.intro} onChange={(e) => onChange({ intro: e.target.value })} />
              <ActionFieldError name={`${p}.intro`} />
            </div>
          </>
        )}
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-desc`} className={label}>
            وصف محركات البحث والمشاركة
          </label>
          <Textarea id={`${id}-desc`} rows={2} className="min-h-0 text-sm" maxLength={300} value={page.description} onChange={(e) => onChange({ description: e.target.value })} />
          {err("description") ? <ActionFieldError name={`${p}.description`} /> : <p className="mt-1.5 text-xs text-taupe">{`${page.description.length}/160 حرفاً مثالياً — يظهر في Google وعند مشاركة الرابط.`}</p>}
        </div>
      </div>

      <div className="-mx-1 mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        {inNav ? (
          <span className="inline-flex h-9 items-center gap-1.5 px-3 text-[0.8rem] text-success">
            <Check className="size-4" aria-hidden />
            ضمن القائمة العلوية
          </span>
        ) : (
          <button
            type="button"
            onClick={onAddToNav}
            disabled={navFull || !page.slug}
            title={navFull ? `القائمة العلوية ممتلئة (${NAV_MAX} روابط)` : undefined}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[0.8rem] text-umber transition-colors hover:bg-bone hover:text-espresso disabled:pointer-events-none disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden />
            أضف للقائمة العلوية
          </button>
        )}
        <button type="button" onClick={onDelete} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[0.8rem] text-danger transition-colors hover:bg-danger/10">
          <Trash2 className="size-3.5" aria-hidden />
          حذف الصفحة
        </button>
      </div>
    </section>
  );
}

function NewPageDialog({ open, onClose, taken, onCreate }: { open: boolean; onClose: () => void; taken: (slug: string) => boolean; onCreate: (page: { title: string; slug: string; blocks: Block[] }) => void }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [template, setTemplate] = useState("blank");
  const [tried, setTried] = useState(false);
  const finalSlug = pageSlug(slugEdited ? slug : title);
  const titleErr = !title.trim() ? "اكتب عنواناً للصفحة" : null;
  const slugErr = !finalSlug ? "اكتب رابطاً بأحرف أو أرقام" : taken(finalSlug) ? "هذا الرابط مستخدم لصفحة أخرى" : null;
  const reset = () => {
    setTitle("");
    setSlug("");
    setSlugEdited(false);
    setTemplate("blank");
    setTried(false);
  };
  const submit = () => {
    setTried(true);
    if (titleErr || slugErr) return;
    const tpl = PAGE_TEMPLATES.find((t) => t.id === template) ?? PAGE_TEMPLATES[0];
    onCreate({ title: title.trim(), slug: finalSlug, blocks: tpl.blocks.map((t) => createBlock(t)) });
    reset();
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };
  const label = "mb-1 block text-[0.8rem] font-medium text-umber";

  return (
    <AdminDialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="صفحة جديدة"
      description="صفحة كاملة تبنيها من الأقسام — دليل المقاسات، مجموعة موسمية، قصة حملة…"
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="np-title" className={label}>
            عنوان الصفحة
          </label>
          <Input id="np-title" className="h-11 text-sm" maxLength={80} placeholder="مثلاً: دليل المقاسات" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={onKey} aria-invalid={tried && titleErr ? true : undefined} autoFocus />
          {tried && titleErr && <p className="mt-1.5 text-xs text-danger">{titleErr}</p>}
        </div>
        <div>
          <label htmlFor="np-slug" className={label}>
            الرابط
          </label>
          <div dir="ltr" className="flex h-11 items-center overflow-hidden rounded-xl border border-line bg-paper focus-within:border-copper focus-within:ring-2 focus-within:ring-copper/15">
            <span className="select-none ps-4 text-sm text-mist">/pages/</span>
            <input
              id="np-slug"
              className="h-full min-w-0 flex-1 bg-transparent pe-4 text-sm text-espresso outline-none placeholder:text-mist"
              value={slugEdited ? slug : finalSlug}
              placeholder="size-guide"
              maxLength={60}
              spellCheck={false}
              autoCapitalize="off"
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(slugDraft(e.target.value));
              }}
              onKeyDown={onKey}
            />
          </div>
          <p className={cn("mt-1.5 text-xs leading-5", tried && slugErr ? "text-danger" : "text-taupe")}>{tried && slugErr ? slugErr : "يُقترح تلقائياً من العنوان — يمكنك كتابته بالإنجليزية ليكون أقصر."}</p>
        </div>
        <fieldset>
          <legend className={label}>ابدأ من</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {PAGE_TEMPLATES.map((t) => (
              <label key={t.id} className="relative block">
                <input type="radio" name="np-template" className="peer sr-only" checked={template === t.id} onChange={() => setTemplate(t.id)} />
                <span className="block h-full cursor-pointer rounded-xl border border-line px-3.5 py-3 transition-colors hover:border-sand peer-checked:border-espresso peer-checked:bg-ivory peer-focus-visible:ring-2 peer-focus-visible:ring-copper/40">
                  <span className="block text-sm font-medium text-espresso">{t.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-taupe">{t.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            إلغاء
          </Button>
          <Button size="sm" onClick={submit}>
            <FilePlus2 className="size-4" aria-hidden />
            إنشاء الصفحة
          </Button>
        </div>
      </div>
    </AdminDialog>
  );
}

/* ─────────── the editor ─────────── */

/**
 * Settings tab «الأقسام والصفحات»: the ordered home layout, extra sections on the store pages
 * and merchant-built pages. Controlled — every change goes through the two change callbacks
 * (functional updates, so async image uploads never overwrite newer edits).
 */
export function SectionsEditor({
  layouts,
  customPages,
  onLayoutsChange,
  onCustomPagesChange,
  catalog,
  homeSections,
  nav,
  onAddToNav,
  onNavChange,
  onNavigate,
  marqueeOn = false,
}: {
  layouts: Layouts;
  customPages: CustomPage[];
  onLayoutsChange: (next: Updater<Layouts>) => void;
  onCustomPagesChange: (next: Updater<CustomPage[]>) => void;
  catalog: SectionsCatalog;
  /** legacy home switches — the home layout until it is customised (see resolveHomeLayout) */
  homeSections: HomeSwitches;
  /** the header links as the storefront shows them */
  nav: NavLink[];
  onAddToNav: (link: NavLink) => void;
  onNavChange?: (fn: (nav: NavLink[]) => NavLink[]) => void;
  /** jump to another settings tab (the hero / built-in content lives in "home", the band in "bars") */
  onNavigate?: (tab: "home" | "bars", anchor?: string) => void;
  /** whether the moving band shows under the hero */
  marqueeOn?: boolean;
}) {
  const { state } = useActionFormState();
  const errKeys = state && !state.ok ? Object.keys(state.fieldErrors ?? {}) : [];
  const hasErr = (prefix: string) => errKeys.some((k) => k === prefix || k.startsWith(`${prefix}.`));

  const [sel, setSel] = useState<string>("home");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [picker, setPicker] = useState<{ afterId: string | null; position: BlockPosition } | null>(null);
  const [newPageOpen, setNewPageOpen] = useState(false);
  const [focus, setFocus] = useState<{ id: string; scroll: boolean } | null>(null);
  const [announce, setAnnounce] = useState("");

  // After a failed save: open the page and the sections that hold the errors.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    const keys = errKeys.filter((k) => k.startsWith("layouts.") || k.startsWith("customPages."));
    if (keys.length) {
      const ids: string[] = [];
      for (const k of keys) {
        const [root, a, b, c] = k.split(".");
        const blk =
          root === "layouts"
            ? (a === "home" ? resolveHomeLayout(layouts, homeSections) : (layouts[a as StorePageKey] ?? []))[Number(b)]
            : b === "blocks"
              ? customPages[Number(a)]?.blocks[Number(c)]
              : undefined;
        if (blk) ids.push(blk.id);
      }
      const [root, a] = keys[0].split(".");
      const target = root === "layouts" ? (a === "home" || STORE_PAGES.some((pg) => pg.key === a) ? a : null) : customPages[Number(a)] ? `custom:${customPages[Number(a)].id}` : null;
      if (target) setSel(target);
      if (ids.length) setExpanded((e) => [...new Set([...e, ...ids])]);
    }
  }

  // move keyboard focus to a card after it was added / its neighbour deleted
  useEffect(() => {
    if (!focus) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (focus.scroll) document.getElementById(cardDomId(focus.id))?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    document.getElementById(cardToggleId(focus.id))?.focus({ preventScroll: focus.scroll });
  }, [focus]);

  /* resolve the selected page */
  const store = STORE_PAGES.find((pg) => pg.key === sel);
  const ci = sel.startsWith("custom:") ? customPages.findIndex((pg) => `custom:${pg.id}` === sel) : -1;
  const ref: PageRef = store ? { kind: "store", ...store } : ci >= 0 ? { kind: "custom", page: customPages[ci], index: ci } : { kind: "home" };

  const homeBlocks = resolveHomeLayout(layouts, homeSections);
  const blocks: Block[] = ref.kind === "home" ? homeBlocks : ref.kind === "store" ? (layouts[ref.key] ?? []) : ref.page.blocks;
  const basePath = ref.kind === "home" ? "layouts.home" : ref.kind === "store" ? `layouts.${ref.key}` : `customPages.${ref.index}.blocks`;
  const pageLabel = ref.kind === "home" ? "الصفحة الرئيسية" : ref.kind === "store" ? ref.label : ref.page.title || "صفحة بلا عنوان";
  const viewHref = ref.kind === "home" ? "/" : ref.kind === "store" ? ref.href : `/pages/${ref.page.slug}`;
  const canAdd = blocks.length < BLOCK_LIMITS.perLayout;
  const missingBuiltins = HOME_SECTION_ORDER.filter((k) => !homeBlocks.some((b) => b.type === "builtin" && b.key === k));

  /* every block mutation goes through here (functional, against the latest state) */
  const mutate = (fn: (prev: Block[]) => Block[]) => {
    if (ref.kind === "home") onLayoutsChange((prev) => ({ ...prev, home: fn(resolveHomeLayout(prev, homeSections)) }));
    else if (ref.kind === "store") {
      const key = ref.key;
      onLayoutsChange((prev) => ({ ...prev, [key]: normalizePlaced(fn(prev[key] ?? []) as PlacedBlock[]) }));
    } else {
      const pid = ref.page.id;
      onCustomPagesChange((prev) => prev.map((pg) => (pg.id === pid ? { ...pg, blocks: fn(pg.blocks) } : pg)));
    }
  };

  const expand = (id: string) => setExpanded((e) => (e.includes(id) ? e : [...e, id]));
  const toggle = (id: string) => setExpanded((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));
  const patch = (id: string, p: BlockPatch) => mutate((list) => list.map((b) => (b.id === id ? ({ ...b, ...p } as Block) : b)));

  const openPicker = (afterId: string | null, position: BlockPosition = "bottom") => setPicker({ afterId, position });

  const add = (block: Block, afterId: string | null) => {
    mutate((list) => insertAfter(list, afterId, block));
    expand(block.id);
    setFocus({ id: block.id, scroll: true });
    setAnnounce(`أُضيف قسم «${blockTitle(block)}»`);
  };

  const pick = (type: AddableBlockType) => {
    if (!picker) return;
    const fresh = createBlock(type);
    if (ref.kind === "store") {
      const anchor = (blocks as PlacedBlock[]).find((b) => b.id === picker.afterId);
      // an anchor in the other zone no longer applies — append to the chosen zone instead
      add({ ...fresh, position: picker.position } as PlacedBlock, anchor && posOf(anchor) === picker.position ? anchor.id : null);
    } else add(fresh, picker.afterId);
    setPicker(null);
  };

  const restoreOne = (key: HomeSectionKey) => {
    onLayoutsChange((prev) => ({ ...prev, home: restoreBuiltin(resolveHomeLayout(prev, homeSections), key) }));
    setPicker(null);
    setFocus({ id: `builtin-${key}`, scroll: true });
    setAnnounce("استُعيد القسم الأصلي");
  };

  const restoreAll = () => {
    onLayoutsChange((prev) => ({ ...prev, home: missingBuiltins.reduce((l, k) => restoreBuiltin(l, k), resolveHomeLayout(prev, homeSections)) }));
    setAnnounce("استُعيدت الأقسام الأصلية");
  };

  const duplicate = (b: Block) => {
    const copy = { ...structuredClone(b), id: newBlockId() } as Block;
    add(copy, b.id);
  };

  const remove = (b: Block) => {
    const name = blockTitle(b);
    const msg = b.type === "builtin" ? `إزالة «${name}» من الصفحة الرئيسية؟ يمكنك استعادته لاحقاً.` : `حذف قسم «${name}»؟`;
    if (!window.confirm(msg)) return;
    const i = blocks.findIndex((x) => x.id === b.id);
    const neighbour = blocks[i + 1] ?? blocks[i - 1];
    mutate((list) => list.filter((x) => x.id !== b.id));
    setExpanded((e) => e.filter((x) => x !== b.id));
    if (neighbour) setFocus({ id: neighbour.id, scroll: false });
    setAnnounce(`حُذف قسم «${name}»`);
  };

  const move = (b: Block, d: -1 | 1) => {
    if (ref.kind === "store") {
      mutate((raw) => {
        const list = normalizePlaced(raw as PlacedBlock[]);
        const i = list.findIndex((x) => x.id === b.id);
        if (i < 0) return list;
        const pos = posOf(list[i]);
        const j = i + d;
        // crossing the page's own content switches the zone (normalisation puts it at the boundary)
        if (d === -1 && pos === "bottom" && (j < 0 || posOf(list[j]) === "top")) return list.map((x, k) => (k === i ? { ...x, position: "top" as const } : x));
        if (d === 1 && pos === "top" && (j >= list.length || posOf(list[j]) === "bottom")) return list.map((x, k) => (k === i ? { ...x, position: "bottom" as const } : x));
        if (j < 0 || j >= list.length) return list;
        const next = list.slice();
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      });
    } else {
      mutate((list) => {
        const i = list.findIndex((x) => x.id === b.id);
        const j = i + d;
        if (i < 0 || j < 0 || j >= list.length) return list;
        const next = list.slice();
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      });
    }
    setAnnounce(`نُقل «${blockTitle(b)}» ${d < 0 ? "للأعلى" : "للأسفل"}`);
  };

  const setPosition = (b: Block, position: BlockPosition) => {
    mutate((list) => list.map((x) => (x.id === b.id ? ({ ...x, position } as PlacedBlock) : x)));
    setFocus({ id: b.id, scroll: true });
  };

  /* custom pages */
  const patchPage = (id: string, p: Partial<CustomPage>) => onCustomPagesChange((prev) => prev.map((pg) => (pg.id === id ? { ...pg, ...p } : pg)));
  const slugTaken = (slug: string, exceptId?: string) => customPages.some((pg) => pg.id !== exceptId && pg.slug === slug);
  const navHrefs = new Set(nav.map((l) => l.href));

  const createPage = ({ title, slug, blocks: initial }: { title: string; slug: string; blocks: Block[] }) => {
    const page: CustomPage = { id: newBlockId(), slug, title, description: "", showHeader: true, eyebrow: "", intro: "", published: true, blocks: initial };
    onCustomPagesChange((prev) => [...prev, page]);
    setSel(`custom:${page.id}`);
    setNewPageOpen(false);
    setAnnounce(`أُنشئت صفحة «${title}»`);
  };

  const deletePage = (page: CustomPage) => {
    const href = `/pages/${page.slug}`;
    const linked = navHrefs.has(href);
    if (!window.confirm(`حذف صفحة «${page.title || page.slug}» وكل أقسامها؟${linked ? " سيُحذف رابطها من القائمة العلوية أيضاً." : ""}`)) return;
    onCustomPagesChange((prev) => prev.filter((pg) => pg.id !== page.id));
    if (linked) onNavChange?.((n) => n.filter((l) => l.href !== href));
    setSel("home");
    setAnnounce("حُذفت الصفحة");
  };

  /* rendering */
  const renderCard = (b: Block, storedIndex: number, opts: { canUp: boolean; canDown: boolean; last: boolean; extra?: ReactNode }) => (
    <li key={b.id} className="group/item relative">
      <BlockCard
        block={b}
        path={`${basePath}.${storedIndex}`}
        catalog={catalog}
        expanded={expanded.includes(b.id)}
        hasError={hasErr(`${basePath}.${storedIndex}`)}
        canMoveUp={opts.canUp}
        canMoveDown={opts.canDown}
        canAdd={canAdd}
        onToggle={() => toggle(b.id)}
        onChange={(p) => patch(b.id, p)}
        onMove={(d) => move(b, d)}
        onDuplicate={b.type === "builtin" ? undefined : () => duplicate(b)}
        onDelete={() => remove(b)}
        onInsertAfter={() => openPicker(b.id, ref.kind === "store" ? posOf(b as PlacedBlock) : "bottom")}
        onEditBuiltin={onNavigate ? (key) => onNavigate("home", `home-section-${key}`) : undefined}
        extra={opts.extra}
      />
      {!opts.last && canAdd && <InsertBetween label={`إضافة قسم بعد «${blockTitle(b)}»`} onClick={() => openPicker(b.id, ref.kind === "store" ? posOf(b as PlacedBlock) : "bottom")} />}
    </li>
  );

  const positionSelect = (b: PlacedBlock, hints: { topHint: string; bottomHint: string }) => (
    <fieldset className="mb-5 rounded-xl bg-ivory/80 p-3 ring-1 ring-line">
      <legend className="sr-only">مكان القسم في الصفحة</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {(["top", "bottom"] as const).map((p) => (
          <label key={p} className="relative block">
            <input type="radio" name={`pos-${b.id}`} className="peer sr-only" checked={posOf(b) === p} onChange={() => setPosition(b, p)} />
            <span className="flex h-full cursor-pointer items-start gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-paper peer-checked:bg-paper peer-checked:shadow-sm peer-checked:ring-1 peer-checked:ring-sand peer-focus-visible:ring-2 peer-focus-visible:ring-copper/40">
              {p === "top" ? <PanelTop className="mt-0.5 size-4 shrink-0 text-copper" aria-hidden /> : <PanelBottom className="mt-0.5 size-4 shrink-0 text-copper" aria-hidden />}
              <span>
                <span className="block text-[0.8rem] font-medium text-espresso">{p === "top" ? "أعلى الصفحة" : "أسفل الصفحة"}</span>
                <span className="block text-xs leading-5 text-taupe">{p === "top" ? hints.topHint : hints.bottomHint}</span>
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );

  let body: ReactNode;
  if (ref.kind === "home") {
    body = (
      <div className="space-y-3">
        <PinnedRow icon={House} title="الواجهة (الهيرو)" note="ثابتة في الأعلى — عدّلها من تبويب الواجهة الرئيسية" action={onNavigate ? { label: "تعديل", onClick: () => onNavigate("home") } : undefined} />
        {marqueeOn && <PinnedRow icon={MoveHorizontal} title="الشريط المتحرك" note="يظهر تحت الواجهة مباشرة — من تبويب الأشرطة الإعلانية" action={onNavigate ? { label: "تعديل", onClick: () => onNavigate("bars") } : undefined} />}
        {blocks.length > 0 ? (
          <ol className="space-y-3" aria-label="أقسام الصفحة الرئيسية بالترتيب">
            {blocks.map((b, i) => renderCard(b, i, { canUp: i > 0, canDown: i < blocks.length - 1, last: i === blocks.length - 1 }))}
          </ol>
        ) : (
          <p className="rounded-2xl border border-dashed border-sand px-4 py-8 text-center text-sm text-taupe">لا أقسام تحت الواجهة — أضف قسماً أو استعد الأقسام الأصلية.</p>
        )}
        <AddRow label="إضافة قسم" onClick={() => openPicker(null)} disabled={!canAdd} />
        {missingBuiltins.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-bone/60 px-4 py-3">
            <p className="text-xs leading-5 text-umber">{`أزلت ${missingBuiltins.length === 1 ? "قسماً أصلياً واحداً" : `${missingBuiltins.length} من الأقسام الأصلية`} من الصفحة.`}</p>
            <button type="button" onClick={restoreAll} disabled={blocks.length + missingBuiltins.length > BLOCK_LIMITS.perLayout} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-paper px-3.5 text-[0.8rem] text-espresso ring-1 ring-line transition-colors hover:bg-espresso hover:text-paper disabled:opacity-40">
              <RotateCcw className="size-3.5" aria-hidden />
              استعادة الأقسام الأصلية
            </button>
          </div>
        )}
      </div>
    );
  } else if (ref.kind === "store") {
    const placed = (blocks as PlacedBlock[]).map((b, i) => ({ b, i }));
    const top = placed.filter((x) => posOf(x.b) === "top");
    const bottom = placed.filter((x) => posOf(x.b) === "bottom");
    const zone = (items: typeof placed, pos: BlockPosition) => {
      const first = pos === "top" ? 0 : top.length;
      return items.length ? (
        <ol className="space-y-3" aria-label={pos === "top" ? "أقسام أعلى الصفحة" : "أقسام أسفل الصفحة"}>
          {items.map(({ b, i }, k) =>
            renderCard(b, i, {
              // the first bottom block can always climb above the page content (and vice versa)
              canUp: first + k > 0 || pos === "bottom",
              canDown: first + k < placed.length - 1 || pos === "top",
              last: k === items.length - 1,
              extra: positionSelect(b, ref),
            }),
          )}
        </ol>
      ) : null;
    };
    body = (
      <div className="space-y-3">
        <ZoneLabel icon={PanelTop} title="أعلى الصفحة" hint={ref.topHint} />
        {zone(top, "top")}
        <AddRow label={top.length ? "إضافة قسم هنا" : "إضافة قسم أعلى الصفحة"} onClick={() => openPicker(null, "top")} disabled={!canAdd} compact />
        <PinnedRow icon={Lock} title={`محتوى «${ref.label}»`} note="محتوى الصفحة الأساسي — يبقى كما هو بين القسمين." />
        <ZoneLabel icon={PanelBottom} title="أسفل الصفحة" hint={ref.bottomHint} />
        {zone(bottom, "bottom")}
        <AddRow label={bottom.length ? "إضافة قسم هنا" : "إضافة قسم أسفل الصفحة"} onClick={() => openPicker(null, "bottom")} disabled={!canAdd} compact />
      </div>
    );
  } else {
    const page = ref.page;
    const href = `/pages/${page.slug}`;
    body = (
      <div className="space-y-4">
        <CustomPageSettings
          key={page.id}
          page={page}
          index={ref.index}
          slugTaken={!!page.slug && slugTaken(page.slug, page.id)}
          inNav={navHrefs.has(href)}
          navFull={nav.length >= NAV_MAX}
          onChange={(p) => patchPage(page.id, p)}
          onSlugCommit={(from, to) => {
            const old = `/pages/${from}`;
            if (navHrefs.has(old)) onNavChange?.((n) => n.map((l) => (l.href === old ? { ...l, href: `/pages/${to}` } : l)));
          }}
          onAddToNav={() => {
            onAddToNav({ label: (page.title.trim() || page.slug).slice(0, 30), href });
            toast("أُضيفت الصفحة للقائمة العلوية", "success", { description: page.published ? "احفظ الإعدادات لتظهر في المتجر." : "الصفحة مسودة — انشرها ليراها الزوار." });
          }}
          onDelete={() => deletePage(page)}
        />
        <div className="flex items-center justify-between gap-3 px-1 pt-2">
          <h4 className="text-[0.95rem] font-semibold text-espresso">أقسام الصفحة</h4>
          <span className="text-xs tabular-nums text-taupe">{`${blocks.length}/${BLOCK_LIMITS.perLayout}`}</span>
        </div>
        {blocks.length > 0 ? (
          <ol className="space-y-3" aria-label={`أقسام صفحة ${pageLabel}`}>
            {blocks.map((b, i) => renderCard(b, i, { canUp: i > 0, canDown: i < blocks.length - 1, last: i === blocks.length - 1 }))}
          </ol>
        ) : (
          <div className="rounded-2xl border border-dashed border-sand bg-paper/50 px-6 py-10 text-center">
            <p className="display text-lg text-espresso">صفحة بيضاء</p>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-taupe">ابدأ بقسم — بانر بصورة، نص، منتجات مختارة أو أسئلة شائعة — ثم رتّبها كما تحب.</p>
          </div>
        )}
        <AddRow label="إضافة قسم" onClick={() => openPicker(null)} disabled={!canAdd} />
        <ActionFieldError name={`customPages.${ref.index}.blocks`} />
      </div>
    );
  }

  const description =
    ref.kind === "home"
      ? "رتّب أقسام الصفحة الرئيسية كما تشاء: أخفِ، انقل، احذف، أو أضف أقساماً جديدة بين أقسام مرموق الأصلية."
      : ref.kind === "store"
        ? "أضف أقساماً فوق محتوى الصفحة أو تحته — بانر عرض، منتجات مختارة، أسئلة شائعة…"
        : "صفحة كاملة تبنيها من الأقسام وتشاركها برابطها.";

  return (
    <div className="space-y-5">
      {/* Page picker */}
      <nav aria-label="اختر الصفحة" className="rounded-2xl border border-line bg-paper p-4 shadow-[0_1px_2px_rgba(28,19,15,0.04)] md:p-5">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold text-mist">صفحات المتجر</p>
            <div className="no-scrollbar -mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
              <ul className="flex min-w-max gap-1.5 md:min-w-0 md:flex-wrap">
                <li>
                  <PageChip active={ref.kind === "home"} onClick={() => setSel("home")} error={hasErr("layouts.home")}>
                    <House className="size-3.5" aria-hidden />
                    الرئيسية
                  </PageChip>
                </li>
                {STORE_PAGES.map((pg) => (
                  <li key={pg.key}>
                    <PageChip active={sel === pg.key} onClick={() => setSel(pg.key)} count={layouts[pg.key]?.length} error={hasErr(`layouts.${pg.key}`)}>
                      {pg.label}
                    </PageChip>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-mist">
              صفحاتك الخاصة
              <span className="font-normal tabular-nums">{`${customPages.length}/${BLOCK_LIMITS.customPages}`}</span>
            </p>
            <div className="no-scrollbar -mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
              <ul className="flex min-w-max gap-1.5 md:min-w-0 md:flex-wrap">
                {customPages.map((pg, i) => (
                  <li key={pg.id}>
                    <PageChip active={ci === i} onClick={() => setSel(`custom:${pg.id}`)} count={pg.blocks.length} error={hasErr(`customPages.${i}`)} muted={!pg.published}>
                      {!pg.published && <span className="size-1.5 rounded-full bg-mist" aria-hidden />}
                      {pg.title || pg.slug || "صفحة بلا عنوان"}
                      {!pg.published && <span className="sr-only">(مسودة)</span>}
                    </PageChip>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => setNewPageOpen(true)}
                    disabled={customPages.length >= BLOCK_LIMITS.customPages}
                    className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-sand px-3.5 text-[0.82rem] text-umber transition-colors hover:border-copper hover:text-copper-deep disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Plus className="size-3.5" aria-hidden />
                    صفحة جديدة
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      {/* Selected page */}
      <section aria-labelledby="sections-page-title" className="space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 px-1">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[0.68rem] font-semibold text-copper">
              <span className="tracking-[0.2em]" dir="ltr">
                {ref.kind === "home" ? "HOME PAGE" : ref.kind === "store" ? "STORE PAGE" : "CUSTOM PAGE"}
              </span>
              {ref.kind === "custom" && (
                <span className={cn("rounded-full px-2 py-px text-[0.68rem] font-medium", ref.page.published ? "bg-success/10 text-success" : "bg-bone text-taupe")}>{ref.page.published ? "منشورة" : "مسودة"}</span>
              )}
            </p>
            <h3 id="sections-page-title" className="display mt-1 text-[1.4rem] leading-tight text-espresso">
              {pageLabel}
            </h3>
            <p className="mt-1 max-w-xl text-[0.8rem] leading-relaxed text-taupe">{description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <a
              href={viewHref}
              target="_blank"
              rel="noreferrer"
              title="يعرض آخر نسخة محفوظة"
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-taupe transition-colors hover:bg-bone hover:text-espresso"
            >
              عرض الصفحة
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
            {ref.kind !== "store" && (
              <Button size="sm" onClick={() => openPicker(null)} disabled={!canAdd}>
                <Plus className="size-4" aria-hidden />
                إضافة قسم
              </Button>
            )}
          </div>
        </header>

        <ActionFieldError name={ref.kind === "home" ? "layouts.home" : ref.kind === "store" ? `layouts.${ref.key}` : `customPages.${ref.index}`} className="px-1" />
        {!canAdd && (
          <p className="flex items-center gap-2 rounded-xl border border-warning/25 bg-warning/[0.07] px-4 py-2.5 text-xs text-warning">
            <CircleAlert className="size-4 shrink-0" aria-hidden />
            {`وصلت الصفحة للحد الأقصى (${BLOCK_LIMITS.perLayout} قسماً).`}
          </p>
        )}

        {body}
      </section>

      <BlockPicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        onPick={pick}
        pageLabel={pageLabel}
        count={blocks.length}
        position={ref.kind === "store" ? picker?.position : undefined}
        onPositionChange={ref.kind === "store" ? (position) => setPicker((p) => (p ? { ...p, position } : p)) : undefined}
        positionHints={ref.kind === "store" ? { top: ref.topHint, bottom: ref.bottomHint } : undefined}
        missingBuiltins={ref.kind === "home" && picker?.afterId === null ? missingBuiltins : []}
        onRestoreBuiltin={ref.kind === "home" ? restoreOne : undefined}
      />
      <NewPageDialog open={newPageOpen} onClose={() => setNewPageOpen(false)} taken={(slug) => slugTaken(slug)} onCreate={createPage} />

      <datalist id={LINKS_DATALIST_ID}>
        <option value="/">الرئيسية</option>
        <option value="/shop">المتجر</option>
        <option value="/looks">الإطلالات</option>
        <option value="/atelier">منسّق الإطلالة</option>
        <option value="/about">قصتنا</option>
        <option value="/contact">تواصل معنا</option>
        {catalog.categories.map((c) => (
          <option key={`c-${c.slug}`} value={`/shop/${c.slug}`}>
            {c.name}
          </option>
        ))}
        {catalog.looks.map((l) => (
          <option key={`l-${l.slug}`} value={`/looks/${l.slug}`}>
            {l.title}
          </option>
        ))}
        {customPages
          .filter((pg) => pg.slug)
          .map((pg) => (
            <option key={`p-${pg.id}`} value={`/pages/${pg.slug}`}>
              {pg.title}
            </option>
          ))}
      </datalist>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
