"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpLeft, Bell, BellOff, CornerDownLeft, LogOut, Menu, Plus, Search, Store, X, type LucideIcon } from "lucide-react";
import { Wordmark } from "@/components/ui/wordmark";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/admin/actions";
import { activeNavItem, navForRole, type AdminNavGroup, type AdminRole } from "./nav";
import { AdminLiveProvider, playChime, useAdminLive } from "./admin-live";
import { NewOrderWatcher } from "./new-order-watcher";
import { Toaster, TOPBAR_SLOT_ID } from "./ui-client";

export type ShellAdmin = { name: string; email: string; role: AdminRole };

const ROLE_LABEL: Record<AdminRole, string> = { owner: "المالك", manager: "مدير", staff: "موظف" };

function initialsOf(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "م";
  return p.length === 1 ? p[0].slice(0, 2) : `${p[0][0]}${p[1][0]}`;
}

/** Locks page scroll while an overlay is open. */
function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    return () => {
      el.style.overflow = prev;
    };
  }, [locked]);
}

/** Keeps Tab focus inside a container. */
function trapTab(e: React.KeyboardEvent, container: HTMLElement | null) {
  if (e.key !== "Tab" || !container) return;
  const nodes = container.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
  if (!nodes.length) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

/* ═══════════════════════════ Sidebar content ═══════════════════════════ */

function SidebarNav({ groups, onNavigate }: { groups: AdminNavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = activeNavItem(pathname);
  const { pending } = useAdminLive();
  return (
    <nav aria-label="أقسام لوحة التحكم" className="flex-1 overflow-y-auto px-3 pb-6 pt-2 [scrollbar-color:rgba(255,255,255,0.12)_transparent] [scrollbar-width:thin]">
      {groups.map((g) => (
        <div key={g.label} className="mt-5 first:mt-2">
          <p className="mb-1.5 px-3 text-[0.68rem] font-medium tracking-wide text-paper/35">{g.label}</p>
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const isActive = active?.href === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-[0.9rem] transition-colors duration-200",
                      "focus-visible:outline-copper-soft",
                      isActive ? "bg-white/[0.07] text-paper" : "text-paper/65 hover:bg-white/[0.04] hover:text-paper",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-y-2 -start-3 w-[3px] rounded-e-full bg-copper transition-opacity duration-300",
                        isActive ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <Icon className={cn("size-[1.05rem] shrink-0 transition-colors", isActive ? "text-copper-soft" : "text-paper/45 group-hover:text-paper/75")} strokeWidth={1.75} aria-hidden />
                    <span className="truncate">{item.label}</span>
                    {item.badge === "pending" && pending > 0 && (
                      <span className="ms-auto min-w-5 rounded-full bg-copper px-1.5 py-px text-center text-[0.68rem] font-semibold tabular-nums text-paper" aria-label={`${pending} طلب بانتظار المراجعة`}>
                        {pending > 99 ? "99+" : pending}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ admin, onNavigate }: { admin: ShellAdmin; onNavigate?: () => void }) {
  return (
    <div className="border-t border-white/[0.07] p-3">
      <a
        href="/"
        target="_blank"
        rel="noopener"
        onClick={onNavigate}
        className="mb-2 flex h-10 items-center gap-3 rounded-lg px-3 text-[0.88rem] text-paper/65 transition-colors hover:bg-white/[0.04] hover:text-paper"
      >
        <Store className="size-[1.05rem] text-paper/45" strokeWidth={1.75} aria-hidden />
        <span>عرض المتجر</span>
        <ArrowUpLeft className="ms-auto size-3.5 text-paper/35" aria-hidden />
        <span className="sr-only">(يفتح في نافذة جديدة)</span>
      </a>
      <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-2.5 ring-1 ring-white/[0.06]">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-copper/25 text-[0.8rem] font-semibold text-copper-soft ring-1 ring-copper/30">
          {initialsOf(admin.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.85rem] font-medium text-paper">{admin.name}</p>
          <p className="truncate text-[0.72rem] text-paper/45">{ROLE_LABEL[admin.role]}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="grid size-9 place-items-center rounded-full text-paper/55 transition-colors hover:bg-white/[0.08] hover:text-paper focus-visible:outline-copper-soft"
            aria-label="تسجيل الخروج"
            title="تسجيل الخروج"
          >
            <LogOut className="size-4 rtl:-scale-x-100" aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );
}

function SidebarBrand() {
  return (
    <div className="relative px-6 pb-5 pt-6">
      <Link href="/admin" className="inline-flex flex-col items-start gap-2 rounded focus-visible:outline-copper-soft" aria-label="مرموق — لوحة القيادة">
        <Wordmark tone="light" size="sm" />
      </Link>
      <p className="mt-2 font-[family-name:var(--font-latin)] text-[0.68rem] uppercase tracking-[0.34em] text-copper-soft/80">Atelier · Back office</p>
      <div className="hairline absolute inset-x-6 bottom-0 opacity-40" />
    </div>
  );
}

/* ═══════════════════════════ Mobile drawer ═══════════════════════════ */

function MobileDrawer({ open, onClose, admin, groups, returnFocusRef }: { open: boolean; onClose: () => void; admin: ShellAdmin; groups: AdminNavGroup[]; returnFocusRef: React.RefObject<HTMLButtonElement | null> }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useScrollLock(open);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => closeRef.current?.focus(), 30);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const close = useCallback(() => {
    onClose();
    returnFocusRef.current?.focus();
  }, [onClose, returnFocusRef]);

  return (
    <div className={cn("fixed inset-0 z-50 lg:hidden", open ? "visible" : "invisible")} inert={!open} aria-hidden={!open}>
      <div
        className={cn("absolute inset-0 bg-espresso/45 backdrop-blur-[2px] transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
        onClick={close}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="قائمة لوحة التحكم"
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
          trapTab(e, panelRef.current);
        }}
        className={cn(
          "grain absolute inset-y-0 start-0 flex w-[86%] max-w-[300px] flex-col bg-espresso text-paper shadow-2xl transition-transform duration-500 ease-[var(--ease-out-expo)]",
          open ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full",
        )}
      >
        <div className="relative z-10 flex h-full flex-col">
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            className="absolute end-3 top-4 z-10 grid size-10 place-items-center rounded-full text-paper/60 hover:bg-white/[0.06] hover:text-paper focus-visible:outline-copper-soft"
            aria-label="إغلاق القائمة"
          >
            <X className="size-5" aria-hidden />
          </button>
          <SidebarBrand />
          <SidebarNav groups={groups} onNavigate={onClose} />
          <SidebarFooter admin={admin} onNavigate={onClose} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════ Command palette (⌘K) ═══════════════════════════ */

type Command = { id: string; label: string; hint?: string; href: string; icon: LucideIcon; group: string; keywords?: string; external?: boolean };

function normalizeAr(s: string) {
  return s
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();
}

function CommandPalette({ open, onClose, groups }: { open: boolean; onClose: () => void; groups: AdminNavGroup[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  useScrollLock(open);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const base: Command[] = useMemo(() => {
    const nav = groups.flatMap((g) => g.items.map<Command>((i) => ({ id: i.href, label: i.label, href: i.href, icon: i.icon, group: "انتقال إلى", keywords: i.keywords })));
    const actions: Command[] = [
      { id: "new-product", label: "إضافة منتج جديد", href: "/admin/products/new", icon: Plus, group: "إجراءات سريعة", keywords: "new product منتج" },
      { id: "pending", label: "الطلبات بانتظار التأكيد", href: "/admin/orders?status=pending", icon: Bell, group: "إجراءات سريعة", keywords: "pending مراجعة" },
      { id: "store", label: "فتح المتجر", href: "/", icon: Store, group: "إجراءات سريعة", keywords: "store موقع", external: true },
    ];
    return [...actions, ...nav];
  }, [groups]);

  const results: Command[] = useMemo(() => {
    const q = normalizeAr(query);
    if (!q) return base;
    const matched = base.filter((c) => normalizeAr(`${c.label} ${c.keywords ?? ""}`).includes(q));
    const raw = query.trim();
    const searches: Command[] = [];
    if (/^(mrq-?)?\d{2,}$/i.test(raw)) {
      searches.push({ id: "order", label: `البحث عن الطلب ${raw.toUpperCase()}`, href: `/admin/orders?q=${encodeURIComponent(raw)}`, icon: Search, group: "بحث" });
    }
    searches.push(
      { id: "s-orders", label: `البحث في الطلبات عن «${raw}»`, href: `/admin/orders?q=${encodeURIComponent(raw)}`, icon: Search, group: "بحث" },
      { id: "s-products", label: `البحث في المنتجات عن «${raw}»`, href: `/admin/products?q=${encodeURIComponent(raw)}`, icon: Search, group: "بحث" },
      { id: "s-customers", label: `البحث في العملاء عن «${raw}»`, href: `/admin/customers?q=${encodeURIComponent(raw)}`, icon: Search, group: "بحث" },
    );
    return [...matched, ...searches.filter((s, i, arr) => arr.findIndex((x) => x.href === s.href) === i)];
  }, [base, query]);

  useEffect(() => setActiveIdx(0), [query]);

  const run = useCallback(
    (c: Command | undefined) => {
      if (!c) return;
      onClose();
      if (c.external) window.open(c.href, "_blank", "noopener");
      else router.push(c.href);
    },
    [onClose, router],
  );

  useEffect(() => {
    const el = document.getElementById(`${listId}-${activeIdx}`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, listId]);

  if (!open) return null;

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-3 pt-[10vh] sm:pt-[14vh]">
      <div className="absolute inset-0 animate-fade-in bg-espresso/40 backdrop-blur-[3px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="البحث والتنقل السريع"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIdx((i) => Math.min(results.length - 1, i + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIdx((i) => Math.max(0, i - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            run(results[activeIdx]);
          }
          trapTab(e, panelRef.current);
        }}
        className="relative w-full max-w-xl animate-[palette-in_0.28s_var(--ease-out-expo)_both] overflow-hidden rounded-2xl bg-paper shadow-[0_30px_80px_-30px_rgba(28,19,15,0.6)] ring-1 ring-line"
      >
        <style>{`@keyframes palette-in{from{opacity:0;transform:translateY(-8px) scale(.985)}to{opacity:1;transform:none}}`}</style>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-[1.1rem] shrink-0 text-taupe" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن قسم، طلب، منتج أو عميل…"
            className="h-14 w-full bg-transparent text-[0.95rem] text-espresso outline-none placeholder:text-mist"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results.length ? `${listId}-${activeIdx}` : undefined}
            aria-autocomplete="list"
            aria-label="البحث السريع"
          />
          <kbd className="hidden shrink-0 rounded-md border border-line bg-bone px-1.5 py-0.5 font-sans text-[0.68rem] text-taupe sm:inline">Esc</kbd>
        </div>
        <ul id={listId} role="listbox" aria-label="النتائج" className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
          {results.map((c, i) => {
            const header = c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            const Icon = c.icon;
            return (
              <li key={c.id} role="presentation">
                {header && <p className="px-3 pb-1.5 pt-3 text-[0.7rem] font-medium text-taupe first:pt-1">{header}</p>}
                <div
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === activeIdx}
                  onMouseMove={() => setActiveIdx(i)}
                  onClick={() => run(c)}
                  className={cn(
                    "flex h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                    i === activeIdx ? "bg-bone text-espresso" : "text-umber",
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", i === activeIdx ? "text-copper-deep" : "text-taupe")} aria-hidden />
                  <span className="truncate">{c.label}</span>
                  {i === activeIdx && <CornerDownLeft className="ms-auto size-3.5 text-taupe" aria-hidden />}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-4 border-t border-line bg-ivory/60 px-4 py-2.5 text-[0.7rem] text-taupe">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-line bg-paper px-1 font-sans">↑</kbd>
            <kbd className="rounded border border-line bg-paper px-1 font-sans">↓</kbd>
            للتنقل
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-line bg-paper px-1 font-sans">Enter</kbd>
            للفتح
          </span>
          <span className="ms-auto hidden sm:inline">
            اختصار الفتح <kbd className="rounded border border-line bg-paper px-1 font-sans" dir="ltr">Ctrl K</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════ Topbar ═══════════════════════════ */

function Topbar({ onMenu, onSearch, menuRef }: { onMenu: () => void; onSearch: () => void; menuRef: React.RefObject<HTMLButtonElement | null> }) {
  const pathname = usePathname();
  const section = activeNavItem(pathname);
  const { chime, setChime } = useAdminLive();
  const [isMac, setIsMac] = useState(false);
  useEffect(() => setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)), []);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ivory/85 backdrop-blur-md supports-[backdrop-filter]:bg-ivory/75">
      <div className="mx-auto flex h-16 w-full max-w-[1320px] items-center gap-2 px-3 sm:px-6 lg:px-10">
        <button
          ref={menuRef}
          type="button"
          onClick={onMenu}
          className="grid size-11 shrink-0 place-items-center rounded-full text-espresso hover:bg-bone lg:hidden"
          aria-label="فتح القائمة"
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <p className="truncate text-[0.95rem] font-semibold text-espresso">{section?.label ?? "لوحة التحكم"}</p>
          <div id={TOPBAR_SLOT_ID} className="flex min-w-0 items-center gap-2 empty:hidden" />
        </div>

        <button
          type="button"
          onClick={onSearch}
          className="hidden h-10 w-64 items-center gap-2.5 rounded-full border border-line bg-paper ps-4 pe-2 text-sm text-mist transition-colors hover:border-sand hover:text-taupe md:flex"
          aria-label="البحث والتنقل السريع"
        >
          <Search className="size-4 text-taupe" aria-hidden />
          <span className="flex-1 truncate text-start">ابحث أو انتقل…</span>
          <kbd dir="ltr" className="rounded-md border border-line bg-bone px-1.5 py-0.5 font-sans text-[0.68rem] text-taupe">
            {isMac ? "⌘K" : "Ctrl K"}
          </kbd>
        </button>
        <button type="button" onClick={onSearch} className="grid size-11 place-items-center rounded-full text-espresso hover:bg-bone md:hidden" aria-label="البحث والتنقل السريع">
          <Search className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => {
            const next = !chime;
            setChime(next);
            if (next) playChime();
          }}
          aria-pressed={chime}
          className="grid size-11 place-items-center rounded-full text-espresso hover:bg-bone sm:size-10"
          aria-label={chime ? "إيقاف تنبيه الطلبات الصوتي" : "تشغيل تنبيه الطلبات الصوتي"}
          title={chime ? "التنبيه الصوتي مفعّل" : "التنبيه الصوتي متوقف"}
        >
          {chime ? <Bell className="size-[1.1rem]" aria-hidden /> : <BellOff className="size-[1.1rem] text-taupe" aria-hidden />}
        </button>
        <Link href="/admin/products/new" className={buttonClasses("primary", "sm", "hidden h-10 gap-1.5 ps-3.5 sm:inline-flex")}>
          <Plus className="size-4" aria-hidden />
          منتج جديد
        </Link>
        <Link href="/admin/products/new" className="grid size-11 place-items-center rounded-full bg-espresso text-paper sm:hidden" aria-label="منتج جديد">
          <Plus className="size-5" aria-hidden />
        </Link>
      </div>
    </header>
  );
}

/* ═══════════════════════════ Shell ═══════════════════════════ */

export function AdminShell({
  admin,
  initialPending,
  initialLatestId,
  children,
}: {
  admin: ShellAdmin;
  initialPending: number;
  initialLatestId: number | null;
  children: ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const groups = useMemo(() => navForRole(admin.role), [admin.role]);

  // close overlays on navigation
  useEffect(() => {
    setDrawer(false);
    setPalette(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const closePalette = useCallback(() => setPalette(false), []);
  const closeDrawer = useCallback(() => setDrawer(false), []);

  return (
    <AdminLiveProvider initialPending={initialPending}>
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[90] focus:rounded-full focus:bg-espresso focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
      >
        تخطَّ إلى المحتوى
      </a>

      <aside className="grain fixed inset-y-0 start-0 z-40 hidden w-[264px] flex-col bg-espresso text-paper lg:flex">
        <div className="relative z-10 flex h-full flex-col">
          <SidebarBrand />
          <SidebarNav groups={groups} />
          <SidebarFooter admin={admin} />
        </div>
      </aside>

      <MobileDrawer open={drawer} onClose={closeDrawer} admin={admin} groups={groups} returnFocusRef={menuRef} />

      <div className="flex min-h-dvh flex-col lg:ps-[264px]">
        <Topbar onMenu={() => setDrawer(true)} onSearch={() => setPalette(true)} menuRef={menuRef} />
        <main id="admin-main" tabIndex={-1} className="mx-auto w-full max-w-[1320px] flex-1 px-4 pb-20 pt-6 outline-none sm:px-6 lg:px-10 lg:pt-8">
          {children}
        </main>
      </div>

      <CommandPalette open={palette} onClose={closePalette} groups={groups} />
      <NewOrderWatcher initialLatestId={initialLatestId} />
      <Toaster />
    </AdminLiveProvider>
  );
}
