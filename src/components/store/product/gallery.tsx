"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, Heart, X } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { Portal, useModal, usePresence } from "@/components/store/overlay";
import type { ProductImage } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/** Index of the slide closest to the scroll position (works with RTL negative scrollLeft). */
function slideIndex(track: HTMLElement): number {
  const w = track.clientWidth || 1;
  return Math.round(Math.abs(track.scrollLeft) / w);
}

function scrollToSlide(track: HTMLElement | null, i: number, smooth = true) {
  if (!track) return;
  // Spec-compliant RTL scrolling: 0 at the start edge, negative towards the left.
  const rtl = getComputedStyle(track).direction === "rtl";
  const left = i * track.clientWidth * (rtl ? -1 : 1);
  track.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
}

/**
 * Product gallery.
 * Desktop: vertical thumbnail rail + large 4:5 image with hover zoom/pan.
 * Phones: full-bleed scroll-snap carousel with progress bars. Tap/click opens the lightbox.
 */
export function ProductGallery({
  images,
  productName,
  saved,
  onToggleSave,
}: {
  images: ProductImage[];
  productName: string;
  saved: boolean;
  onToggleSave: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const idsKey = images.map((i) => i.id).join(",");

  // New colourway → back to the first photo.
  useEffect(() => {
    setIndex(0);
    const t = trackRef.current;
    if (t) t.scrollTo({ left: 0, behavior: "auto" });
  }, [idsKey]);

  const onScroll = useCallback(() => {
    const t = trackRef.current;
    if (t) setIndex(Math.min(images.length - 1, slideIndex(t)));
  }, [images.length]);

  const current = images[index] ?? images[0] ?? null;
  const many = images.length > 1;
  const go = (i: number) => setIndex((i + images.length) % images.length);

  return (
    <div className="lg:flex lg:items-start lg:justify-center lg:gap-4">
      {/* Thumbnail rail (desktop) */}
      {many && (
        <ul className="no-scrollbar hidden max-h-[calc(100svh-9rem)] w-[4.5rem] shrink-0 flex-col gap-3 overflow-y-auto lg:flex" aria-label="صور المنتج">
          {images.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                onMouseEnter={() => setIndex(i)}
                aria-label={`عرض الصورة ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "studio-frame block aspect-[4/5] w-full transition-[opacity,box-shadow] duration-300",
                  i === index ? "opacity-100 shadow-[0_0_0_1px_var(--color-espresso)]" : "opacity-55 hover:opacity-90",
                )}
              >
                <MediaImage media={img} sizes="80px" className="h-full w-full" alt="" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Main image (desktop) */}
      <div className="relative hidden min-w-0 flex-1 lg:block lg:max-w-[max(30rem,calc((100svh-10rem)*0.8))]">
        <div
          className="studio-frame group/zoom relative aspect-[4/5] w-full cursor-zoom-in"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
          onMouseLeave={() => setZoom(null)}
          onClick={() => setLightbox(index)}
        >
          {images.map((img, i) => (
            <div
              key={img.id}
              className={cn("absolute inset-0 transition-opacity duration-700 ease-[var(--ease-luxe)]", i === index ? "opacity-100" : "opacity-0")}
              aria-hidden={i !== index}
            >
              <MediaImage media={img} sizes="(min-width: 1024px) 48vw, 100vw" priority={i === 0} className="h-full w-full" alt={img.alt || productName} />
            </div>
          ))}
          {!current && <MediaImage media={null} className="absolute inset-0" />}
          {current && zoom && (
            <div
              className="pointer-events-none absolute inset-0 animate-fade-in bg-no-repeat"
              style={{
                backgroundImage: `url(/media/${current.id}/lg)`,
                backgroundSize: "220%",
                backgroundPosition: `${zoom.x}% ${zoom.y}%`,
              }}
              aria-hidden
            />
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(index);
            }}
            className="absolute bottom-4 end-4 grid size-11 place-items-center rounded-full bg-paper/85 text-espresso opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-300 group-hover/zoom:opacity-100 focus-visible:opacity-100"
            aria-label="عرض الصورة بالحجم الكامل"
          >
            <Expand className="size-4" strokeWidth={1.6} aria-hidden />
          </button>
        </div>
        {many && (
          <div className="mt-4 flex items-center justify-between text-xs text-taupe">
            <span className="tabular-nums" dir="ltr">
              {String(index + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
            </span>
            <div className="flex gap-1">
              <button type="button" onClick={() => go(index - 1)} className="grid size-10 place-items-center rounded-full hover:bg-bone hover:text-espresso" aria-label="الصورة السابقة">
                <ChevronRight className="size-4" aria-hidden />
              </button>
              <button type="button" onClick={() => go(index + 1)} className="grid size-10 place-items-center rounded-full hover:bg-bone hover:text-espresso" aria-label="الصورة التالية">
                <ChevronLeft className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Phone carousel */}
      <div className="relative lg:hidden">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
          aria-roledescription="carousel"
          aria-label="صور المنتج"
        >
          {(images.length ? images : [null]).map((img, i) => (
            <button
              key={img?.id ?? "empty"}
              type="button"
              onClick={() => img && setLightbox(i)}
              className="studio-frame relative aspect-[4/5] w-full shrink-0 snap-center snap-always"
              aria-label={img ? `الصورة ${i + 1} من ${images.length} — اضغط للتكبير` : productName}
            >
              <MediaImage media={img} sizes="100vw" priority={i === 0} className="h-full w-full" alt={img?.alt || productName} />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onToggleSave}
          aria-pressed={saved}
          aria-label={saved ? "إزالة من المفضلة" : "حفظ في المفضلة"}
          className={cn("absolute end-3 top-3 grid size-11 place-items-center rounded-full bg-paper/85 backdrop-blur-sm transition-colors", saved ? "text-copper" : "text-espresso")}
        >
          <Heart className={cn("size-5", saved && "fill-current")} strokeWidth={1.5} aria-hidden />
        </button>
        {many && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1.5" aria-hidden>
            {images.map((img, i) => (
              <span key={img.id} className="h-[3px] w-7 overflow-hidden rounded-full bg-espresso/15">
                <span className={cn("block h-full rounded-full bg-espresso transition-all duration-500 ease-[var(--ease-out-expo)]", i === index ? "w-full" : "w-0")} />
              </span>
            ))}
          </div>
        )}
        {many && (
          <span className="pointer-events-none absolute start-3 top-4 rounded-full bg-paper/85 px-2.5 py-1 text-[0.7rem] tabular-nums text-espresso backdrop-blur-sm" dir="ltr">
            {index + 1} / {images.length}
          </span>
        )}
      </div>

      <Lightbox images={images} start={lightbox} onClose={() => setLightbox(null)} productName={productName} onIndex={(i) => {
        setIndex(i);
        scrollToSlide(trackRef.current, i, false);
      }} />
    </div>
  );
}

/* ───────────── Fullscreen lightbox ───────────── */

function Lightbox({
  images,
  start,
  onClose,
  onIndex,
  productName,
}: {
  images: ProductImage[];
  start: number | null;
  onClose: () => void;
  onIndex: (i: number) => void;
  productName: string;
}) {
  const open = start !== null;
  const { mounted, visible } = usePresence(open, 400);
  const panelRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(start ?? 0);
  useModal({ open, onClose, containerRef: panelRef });

  // Jump to the opening slide once mounted.
  useEffect(() => {
    if (start === null) return;
    setIndex(start);
    let tries = 0;
    const tick = () => {
      const t = trackRef.current;
      if (!t) {
        if (tries++ < 10) requestAnimationFrame(tick);
        return;
      }
      scrollToSlide(t, start, false);
    };
    requestAnimationFrame(tick);
  }, [start]);

  const go = useCallback(
    (i: number) => {
      const n = (i + images.length) % images.length;
      setIndex(n);
      scrollToSlide(trackRef.current, n);
      onIndex(n);
    },
    [images.length, onIndex],
  );

  useEffect(() => {
    if (!open || images.length < 2) return;
    const onKey = (e: KeyboardEvent) => {
      // RTL: left arrow moves forward.
      if (e.key === "ArrowLeft") go(index + 1);
      if (e.key === "ArrowRight") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go, index, images.length]);

  if (!mounted) return null;
  return (
    <Portal>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`صور ${productName}`}
        tabIndex={-1}
        className={cn("fixed inset-0 z-[80] flex flex-col bg-espresso text-paper outline-none transition-opacity duration-400", visible ? "opacity-100" : "opacity-0")}
      >
        <div className="flex items-center justify-between px-4 py-3 md:px-8 md:py-5">
          <span className="text-sm tabular-nums text-paper/70" aria-live="polite" dir="ltr">
            {index + 1} / {images.length}
          </span>
          <p className="hidden text-sm text-paper/70 md:block">{productName}</p>
          <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full text-paper hover:bg-paper/10" aria-label="إغلاق">
            <X className="size-6" strokeWidth={1.4} aria-hidden />
          </button>
        </div>
        <div className="relative min-h-0 flex-1">
          <div
            ref={trackRef}
            onScroll={(e) => {
              const n = Math.min(images.length - 1, slideIndex(e.currentTarget));
              if (n !== index) {
                setIndex(n);
                onIndex(n);
              }
            }}
            className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overscroll-contain"
          >
            {images.map((img) => (
              <div key={img.id} className="relative h-full w-full shrink-0 snap-center snap-always px-2 md:px-24">
                <MediaImage media={img} sizes="100vw" fit="contain" className="h-full w-full !bg-none" imgClassName="object-contain" alt={img.alt || productName} />
              </div>
            ))}
          </div>
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(index - 1)}
                className="absolute start-4 top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full border border-paper/20 text-paper transition-colors hover:bg-paper/10 md:grid"
                aria-label="الصورة السابقة"
              >
                <ChevronRight className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                className="absolute end-4 top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full border border-paper/20 text-paper transition-colors hover:bg-paper/10 md:grid"
                aria-label="الصورة التالية"
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
            </>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex justify-center gap-2 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`الصورة ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className={cn("studio-frame aspect-[4/5] w-11 overflow-hidden transition-opacity", i === index ? "opacity-100 ring-1 ring-paper" : "opacity-45 hover:opacity-80")}
              >
                <MediaImage media={img} sizes="60px" className="h-full w-full" alt="" />
              </button>
            ))}
          </div>
        )}
      </div>
    </Portal>
  );
}
