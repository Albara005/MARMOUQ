"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, Heart, Menu, Search, ShoppingBag } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { useCart, useWishlist } from "@/components/store/cart/cart-provider";
import { MobileMenu } from "@/components/store/mobile-menu";
import { SearchOverlay } from "@/components/store/search-overlay";
import { CurrencySwitcher } from "@/components/store/currency-switcher";
import { BrandLogo } from "@/components/store/brand-logo";
import { useStoreConfig } from "@/components/store/store-provider";
import { categoryHref } from "@/components/store/nav";
import type { MediaRef } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export type NavCategory = {
  slug: string;
  name: string;
  nameEn: string;
  image: MediaRef | null;
  productCount: number;
};

/** True while the current page renders an element with [data-header-overlay] (the home hero). */
function useHeroOverlay(pathname: string) {
  const [overlay, setOverlay] = useState(pathname === "/");
  useEffect(() => {
    const check = () => !!document.querySelector("[data-header-overlay]");
    if (check()) {
      setOverlay(true);
      return;
    }
    setOverlay(false);
    // Content may stream in after navigation (loading.tsx) — watch until it appears.
    const mo = new MutationObserver(() => {
      if (check()) {
        setOverlay(true);
        mo.disconnect();
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    const stop = window.setTimeout(() => mo.disconnect(), 8000);
    return () => {
      mo.disconnect();
      window.clearTimeout(stop);
    };
  }, [pathname]);
  return overlay;
}

function CountBadge({ count, light }: { count: number; light: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "absolute end-1 top-1 grid h-[1.05rem] min-w-[1.05rem] place-items-center rounded-full px-1 text-[0.62rem] font-semibold leading-none tabular-nums transition-colors duration-500",
        light ? "bg-paper text-espresso" : "bg-copper text-paper",
      )}
      aria-hidden
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function Header({ categories }: { categories: NavCategory[] }) {
  const { nav: navLinks } = useStoreConfig();
  const pathname = usePathname();
  const cart = useCart();
  const wishlist = useWishlist();
  const heroOverlay = useHeroOverlay(pathname);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const megaTimer = useRef<number | null>(null);
  const megaId = useId();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close every layer on navigation
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setMegaOpen(false);
  }, [pathname]);

  // "/" or Ctrl/⌘+K opens search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setMegaOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const openMega = useCallback(() => {
    if (megaTimer.current) window.clearTimeout(megaTimer.current);
    megaTimer.current = window.setTimeout(() => setMegaOpen(true), 90);
  }, []);
  const closeMega = useCallback(() => {
    if (megaTimer.current) window.clearTimeout(megaTimer.current);
    megaTimer.current = window.setTimeout(() => setMegaOpen(false), 160);
  }, []);

  const transparent = heroOverlay && !scrolled && !megaOpen;
  const light = transparent;
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const shopActive = isActive("/shop") || isActive("/product");

  const iconBtn = cn(
    "relative grid size-11 place-items-center rounded-full transition-colors duration-300",
    light ? "hover:bg-paper/10" : "hover:bg-bone",
  );
  const navLink = (active: boolean) =>
    cn(
      "relative inline-flex h-11 items-center px-3 text-[0.9rem] tracking-wide transition-colors duration-300",
      "after:absolute after:inset-x-3 after:bottom-2 after:h-px after:origin-center after:scale-x-0 after:bg-current after:transition-transform after:duration-500 after:ease-[var(--ease-out-expo)] hover:after:scale-x-100",
      active && "after:scale-x-100",
      light ? "text-paper/90 hover:text-paper" : "text-espresso/85 hover:text-espresso",
    );

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 border-b transition-[background-color,border-color,color,backdrop-filter] duration-500 ease-[var(--ease-luxe)]",
          transparent ? "border-transparent bg-transparent text-paper" : "border-line/80 bg-ivory/88 text-espresso backdrop-blur-xl backdrop-saturate-150",
        )}
        onMouseLeave={closeMega}
      >
        <div className="container-luxe grid h-16 grid-cols-[1fr_auto_1fr] items-center lg:h-20">
          {/* Start: menu (mobile) / primary nav (desktop) */}
          <div className="flex items-center gap-0.5">
            <button type="button" className={cn(iconBtn, "-ms-2.5 lg:hidden")} onClick={() => setMenuOpen(true)} aria-label="فتح القائمة" aria-haspopup="dialog">
              <Menu className="size-[1.3rem]" strokeWidth={1.5} aria-hidden />
            </button>
            <button type="button" className={cn(iconBtn, "lg:hidden")} onClick={() => setSearchOpen(true)} aria-label="بحث" aria-haspopup="dialog">
              <Search className="size-[1.2rem]" strokeWidth={1.5} aria-hidden />
            </button>

            <nav aria-label="القائمة الرئيسية" className="-ms-3 hidden lg:block">
              <ul className="flex items-center">
                <li className="flex items-center" onMouseEnter={openMega}>
                  <Link href="/shop" className={navLink(shopActive)}>
                    المتجر
                  </Link>
                  <button
                    type="button"
                    className={cn("-ms-2 grid size-8 place-items-center rounded-full transition-colors", light ? "text-paper/70 hover:text-paper" : "text-taupe hover:text-espresso")}
                    aria-expanded={megaOpen}
                    aria-controls={megaId}
                    aria-label="أقسام المتجر"
                    onClick={() => setMegaOpen((o) => !o)}
                  >
                    <ChevronDown className={cn("size-3.5 transition-transform duration-300", megaOpen && "rotate-180")} aria-hidden />
                  </button>
                </li>
                {navLinks.map((l) => (
                  <li key={l.href} onMouseEnter={closeMega}>
                    <Link href={l.href} className={navLink(isActive(l.href))} aria-current={isActive(l.href) ? "page" : undefined}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Centre: wordmark */}
          <Link href="/" className="justify-self-center rounded-sm px-2 py-1" aria-label="مرموق — الصفحة الرئيسية">
            <span className="block lg:hidden">
              <BrandLogo tone={light ? "light" : "dark"} size="sm" />
            </span>
            <span className="hidden lg:block">
              <BrandLogo tone={light ? "light" : "dark"} size="md" />
            </span>
          </Link>

          {/* End: utilities */}
          <div className="flex items-center justify-end gap-0.5">
            <CurrencySwitcher tone={light ? "light" : "dark"} className="hidden lg:inline-flex" />
            <button type="button" className={cn(iconBtn, "hidden lg:grid")} onClick={() => setSearchOpen(true)} aria-label="بحث (اختصار /)" aria-haspopup="dialog">
              <Search className="size-[1.2rem]" strokeWidth={1.5} aria-hidden />
            </button>
            <Link
              href="/wishlist"
              className={iconBtn}
              aria-label={wishlist.hydrated && wishlist.ids.length ? `المفضلة (${wishlist.ids.length})` : "المفضلة"}
            >
              <Heart className="size-[1.2rem]" strokeWidth={1.5} aria-hidden />
              <CountBadge count={wishlist.hydrated ? wishlist.ids.length : 0} light={light} />
            </Link>
            <button
              type="button"
              className={cn(iconBtn, "-me-2.5")}
              onClick={cart.open}
              aria-label={cart.hydrated && cart.count ? `سلة التسوق (${cart.count})` : "سلة التسوق"}
              aria-haspopup="dialog"
            >
              <ShoppingBag className="size-[1.2rem]" strokeWidth={1.5} aria-hidden />
              <CountBadge count={cart.hydrated ? cart.count : 0} light={light} />
            </button>
          </div>
        </div>

        {/* Mega menu (desktop) */}
        <div
          id={megaId}
          className={cn(
            "absolute inset-x-0 top-full hidden border-b border-line bg-ivory/97 backdrop-blur-xl transition-all duration-500 ease-[var(--ease-out-expo)] lg:block",
            megaOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0",
          )}
          onMouseEnter={openMega}
          onMouseLeave={closeMega}
        >
          <div className="container-luxe grid grid-cols-12 gap-10 py-10">
            <div className="col-span-3 flex flex-col">
              <p className="eyebrow">The Wardrobe</p>
              <ul className="mt-5 space-y-1">
                <li>
                  <Link href="/shop" className="group flex items-center justify-between py-1.5 text-espresso" tabIndex={megaOpen ? 0 : -1}>
                    <span className="display text-xl">كل القطع</span>
                    <ArrowLeft className="size-4 opacity-0 transition-all duration-500 group-hover:-translate-x-1 group-hover:opacity-100" aria-hidden />
                  </Link>
                </li>
                {categories.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={categoryHref(c.slug)}
                      className="group flex items-baseline justify-between py-1.5 text-umber transition-colors hover:text-espresso"
                      tabIndex={megaOpen ? 0 : -1}
                    >
                      <span className="text-[1.02rem]">{c.name}</span>
                      <span className="text-xs tabular-nums text-taupe">{c.productCount}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-8">
                <Link href="/shop?sort=newest" className="link-luxe text-sm text-copper-deep" tabIndex={megaOpen ? 0 : -1}>
                  وصل حديثاً
                </Link>
              </div>
            </div>
            <div className="col-span-9 grid grid-cols-5 gap-4">
              {categories.slice(0, 5).map((c, i) => (
                <Link
                  key={c.slug}
                  href={categoryHref(c.slug)}
                  className="group block"
                  tabIndex={-1}
                  style={{ transitionDelay: megaOpen ? `${60 + i * 50}ms` : "0ms" }}
                >
                  <div className="studio-frame aspect-[4/5] overflow-hidden">
                    <MediaImage
                      media={c.image}
                      sizes="200px"
                      className="h-full w-full transition-transform duration-[1400ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.05]"
                      alt=""
                    />
                  </div>
                  <p className="mt-3 text-sm font-medium text-espresso">{c.name}</p>
                  {c.nameEn && <p className="latin-italic text-sm text-taupe">{c.nameEn}</p>}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </header>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        categories={categories}
        onSearch={() => {
          setMenuOpen(false);
          window.setTimeout(() => setSearchOpen(true), 180);
        }}
      />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} categories={categories} />
    </>
  );
}
