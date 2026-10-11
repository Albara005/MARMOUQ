"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, LoaderCircle, Search, X } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { Price } from "@/components/store/store-provider";
import { Portal, useModal, usePresence } from "@/components/store/overlay";
import { categoryHref } from "@/components/store/nav";
import type { NavCategory } from "@/components/store/header";
import type { ProductCardData } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const SUGGESTIONS = ["سويتر برغندي", "نص سحاب", "بنطال كوري", "ربطة عنق", "قميص أبيض", "شوز إيطالي"];

const cache = new Map<string, ProductCardData[]>();

export function SearchOverlay({ open, onClose, categories }: { open: boolean; onClose: () => void; categories: NavCategory[] }) {
  const { mounted, visible } = usePresence(open, 450);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ProductCardData[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  useModal({ open, onClose, containerRef: panelRef, initialFocusRef: inputRef });

  const term = q.trim();

  useEffect(() => {
    if (!term) {
      setItems([]);
      setState("idle");
      return;
    }
    const hit = cache.get(term);
    if (hit) {
      setItems(hit);
      setState("idle");
      return;
    }
    setState("loading");
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { items: ProductCardData[] };
        cache.set(term, data.items);
        setItems(data.items);
        setState("idle");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setState("error");
      }
    }, 220);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [term]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term) return;
    onClose();
    router.push(`/shop?q=${encodeURIComponent(term)}`);
  };

  if (!mounted) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[60]">
        <div className={cn("absolute inset-0 bg-espresso/45 backdrop-blur-[3px] transition-opacity duration-500", visible ? "opacity-100" : "opacity-0")} onClick={onClose} aria-hidden />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="البحث في المتجر"
          tabIndex={-1}
          className={cn(
            "absolute inset-x-0 top-0 flex h-dvh flex-col bg-ivory shadow-2xl outline-none transition-all duration-500 ease-[var(--ease-out-expo)] md:h-auto md:max-h-[86vh]",
            visible ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0",
          )}
        >
          <div className="border-b border-line">
            <form role="search" onSubmit={submit} className="container-luxe flex h-20 items-center gap-3 md:h-24">
              <label htmlFor={`${listId}-q`} className="sr-only">
                ابحث في المتجر
              </label>
              <Search className="size-5 shrink-0 text-taupe" strokeWidth={1.5} aria-hidden />
              <input
                ref={inputRef}
                id={`${listId}-q`}
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="عن ماذا تبحث اليوم؟"
                className="display h-full min-w-0 flex-1 bg-transparent text-2xl text-espresso outline-none placeholder:text-mist md:text-4xl [&::-webkit-search-cancel-button]:hidden"
                aria-controls={`${listId}-results`}
              />
              {state === "loading" && <LoaderCircle className="size-5 shrink-0 animate-spin text-taupe" aria-label="جارٍ البحث" />}
              {q && (
                <button type="button" onClick={() => { setQ(""); inputRef.current?.focus(); }} className="hidden h-11 shrink-0 rounded-full px-3 text-sm text-taupe hover:text-espresso sm:block">
                  مسح
                </button>
              )}
              <button type="button" onClick={onClose} className="-me-2.5 grid size-11 shrink-0 place-items-center rounded-full text-espresso hover:bg-bone" aria-label="إغلاق البحث">
                <X className="size-5" strokeWidth={1.5} aria-hidden />
              </button>
            </form>
          </div>

          <div id={`${listId}-results`} className="min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-live="polite">
            <div className="container-luxe py-7 md:py-10">
              {!term ? (
                <div className="grid gap-10 md:grid-cols-12">
                  <div className="md:col-span-5">
                    <p className="eyebrow">Most searched</p>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {SUGGESTIONS.map((s) => (
                        <li key={s}>
                          <button
                            type="button"
                            onClick={() => setQ(s)}
                            className="h-10 rounded-full border border-line bg-paper px-4 text-sm text-umber transition-colors hover:border-espresso hover:text-espresso"
                          >
                            {s}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {categories.length > 0 && (
                    <div className="md:col-span-7">
                      <p className="eyebrow">Browse</p>
                      <ul className="mt-4 grid grid-cols-2 gap-x-6 sm:grid-cols-3">
                        {categories.map((c) => (
                          <li key={c.slug} className="border-b border-line">
                            <Link href={categoryHref(c.slug)} onClick={onClose} className="group flex min-h-12 items-center justify-between gap-2 text-umber hover:text-espresso">
                              <span>{c.name}</span>
                              <ArrowLeft className="size-3.5 opacity-40 transition-all group-hover:-translate-x-1 group-hover:opacity-100" aria-hidden />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : state === "error" ? (
                <p className="py-10 text-center text-sm text-danger">تعذّر البحث الآن، حاول مرة أخرى بعد لحظات.</p>
              ) : state === "loading" && items.length === 0 ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6" aria-hidden>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i}>
                      <div className="skeleton aspect-[4/5]" />
                      <div className="skeleton mt-3 h-3.5 w-3/4 rounded-full" />
                      <div className="skeleton mt-2 h-3 w-1/2 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="display text-2xl text-espresso">ما لقينا شيء باسم «{term}»</p>
                  <p className="mt-2 text-sm text-taupe">جرّب كلمة أبسط، أو تصفّح أحد هذه الاقتراحات:</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.slice(0, 4).map((s) => (
                      <button key={s} type="button" onClick={() => setQ(s)} className="h-10 rounded-full border border-line bg-paper px-4 text-sm text-umber hover:border-espresso">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm text-taupe">
                      نتائج «<span className="text-espresso">{term}</span>»
                    </p>
                    <Link href={`/shop?q=${encodeURIComponent(term)}`} onClick={onClose} className="group inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-espresso">
                      <span className="link-luxe">عرض كل النتائج</span>
                      <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" aria-hidden />
                    </Link>
                  </div>
                  <ul className={cn("mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6", state === "loading" && "opacity-60")}>
                    {items.map((p) => (
                      <li key={p.id}>
                        <Link href={`/product/${p.slug}`} onClick={onClose} className="group block">
                          <div className="studio-frame aspect-[4/5] overflow-hidden">
                            <MediaImage
                              media={p.images[0]}
                              sizes="(min-width: 1024px) 15vw, 45vw"
                              className="h-full w-full transition-transform duration-[1400ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
                              alt=""
                            />
                          </div>
                          <p className="mt-3 line-clamp-1 text-sm font-medium text-espresso">{p.name}</p>
                          <Price amount={p.price} compareAt={p.compareAtPrice} className="mt-0.5 block text-[0.82rem] text-umber" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
