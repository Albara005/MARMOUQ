"use client";

import Link from "next/link";
import { useRef } from "react";
import { ChevronLeft, Heart, Search, X } from "lucide-react";
import { Wordmark } from "@/components/ui/wordmark";
import { MediaImage } from "@/components/ui/media-image";
import { InstagramIcon, TikTokIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { useStoreConfig } from "@/components/store/store-provider";
import { Portal, useModal, usePresence } from "@/components/store/overlay";
import { NAV_LINKS, SERVICE_LINKS, categoryHref } from "@/components/store/nav";
import type { NavCategory } from "@/components/store/header";
import { cn, whatsappLink } from "@/lib/utils";

/** Full-height sheet sliding in from the start (right) edge. */
export function MobileMenu({
  open,
  onClose,
  categories,
  onSearch,
}: {
  open: boolean;
  onClose: () => void;
  categories: NavCategory[];
  onSearch: () => void;
}) {
  const { mounted, visible } = usePresence(open, 550);
  const panelRef = useRef<HTMLDivElement>(null);
  const config = useStoreConfig();
  useModal({ open, onClose, containerRef: panelRef });

  if (!mounted) return null;

  const primary = [{ href: "/shop", label: "المتجر", en: "Shop" }, ...NAV_LINKS.map((l) => ({ ...l, en: l.href === "/looks" ? "Looks" : l.href === "/atelier" ? "Atelier" : "Our Story" }))];
  const stagger = (i: number) => ({ transitionDelay: visible ? `${140 + i * 55}ms` : "0ms" });
  const reveal = cn("transition-all duration-700 ease-[var(--ease-out-expo)]", visible ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0");

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] lg:hidden">
        <div className={cn("absolute inset-0 bg-espresso/50 transition-opacity duration-500", visible ? "opacity-100" : "opacity-0")} onClick={onClose} aria-hidden />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="القائمة"
          tabIndex={-1}
          className={cn(
            "absolute inset-y-0 start-0 flex w-[90%] max-w-[400px] flex-col bg-ivory shadow-2xl outline-none transition-transform duration-500 ease-[var(--ease-out-expo)]",
            visible ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
            <Wordmark size="sm" />
            <button type="button" onClick={onClose} className="-me-2.5 grid size-11 place-items-center rounded-full hover:bg-bone" aria-label="إغلاق القائمة">
              <X className="size-5" strokeWidth={1.5} aria-hidden />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8">
            <button
              type="button"
              onClick={onSearch}
              className="mt-5 flex h-12 w-full items-center gap-3 rounded-full border border-line bg-paper px-4 text-start text-sm text-mist"
            >
              <Search className="size-4 text-taupe" aria-hidden />
              ابحث عن سويتر، ربطة، شوز…
            </button>

            <nav aria-label="روابط رئيسية" className="mt-6">
              <ul className="divide-y divide-line border-y border-line">
                {primary.map((l, i) => (
                  <li key={l.href} className={reveal} style={stagger(i)}>
                    <Link href={l.href} className="group flex min-h-16 items-center justify-between py-3">
                      <span className="flex items-baseline gap-3">
                        <span className="display text-[1.7rem] leading-none text-espresso">{l.label}</span>
                        <span className="latin-italic text-sm text-taupe">{l.en}</span>
                      </span>
                      <ChevronLeft className="size-5 text-taupe transition-transform duration-300 group-hover:-translate-x-1" strokeWidth={1.5} aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {categories.length > 0 && (
              <section className={cn("mt-8", reveal)} style={stagger(primary.length)} aria-labelledby="mm-cats">
                <h2 id="mm-cats" className="eyebrow">
                  Shop by category
                </h2>
                <ul className="mt-4 grid grid-cols-2 gap-3">
                  {categories.map((c) => (
                    <li key={c.slug}>
                      <Link href={categoryHref(c.slug)} className="group flex items-center gap-3 rounded-xl border border-line bg-paper p-2 pe-3">
                        <span className="studio-frame block aspect-[4/5] w-11 shrink-0 overflow-hidden rounded-md">
                          <MediaImage media={c.image} sizes="60px" className="h-full w-full" alt="" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-espresso">{c.name}</span>
                          <span className="block text-[0.7rem] tabular-nums text-taupe">{c.productCount} قطع</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className={cn("mt-8", reveal)} style={stagger(primary.length + 1)} aria-label="خدمة العملاء">
              <ul className="space-y-0.5">
                <li>
                  <Link href="/wishlist" className="flex min-h-11 items-center gap-2.5 text-[0.95rem] text-umber hover:text-espresso">
                    <Heart className="size-4" strokeWidth={1.5} aria-hidden />
                    المفضلة
                  </Link>
                </li>
                {SERVICE_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="flex min-h-11 items-center text-[0.95rem] text-umber hover:text-espresso">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="shrink-0 border-t border-line bg-paper px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
            {config.whatsapp ? (
              <a
                href={whatsappLink(config.whatsapp, "مرحباً مرموق، عندي استفسار 👋")}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-espresso text-sm font-medium text-paper"
              >
                <WhatsAppIcon size={18} />
                تحدث معنا على واتساب
              </a>
            ) : config.instagram ? (
              <a
                href={config.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-espresso text-sm font-medium text-paper"
              >
                <InstagramIcon size={18} />
                راسلنا على إنستغرام
              </a>
            ) : null}
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-taupe">{config.tagline}</p>
              <div className="flex items-center">
                {config.instagram && (
                  <a href={config.instagram} target="_blank" rel="noopener noreferrer" className="grid size-11 place-items-center text-umber hover:text-espresso" aria-label="إنستغرام">
                    <InstagramIcon size={19} />
                  </a>
                )}
                {config.tiktok && (
                  <a href={config.tiktok} target="_blank" rel="noopener noreferrer" className="-me-2.5 grid size-11 place-items-center text-umber hover:text-espresso" aria-label="تيك توك">
                    <TikTokIcon size={18} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
