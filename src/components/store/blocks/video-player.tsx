"use client";

import { useEffect, useRef, useState } from "react";
import { preconnect } from "react-dom";
import { Play } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import type { MediaRef } from "@/lib/catalog";

export type VideoSource = { kind: "youtube" | "vimeo"; id: string } | { kind: "file"; src: string };

const EMBED_ORIGIN = { youtube: "https://www.youtube-nocookie.com", vimeo: "https://player.vimeo.com" } as const;

function embedUrl(source: { kind: "youtube" | "vimeo"; id: string }): string {
  return source.kind === "youtube"
    ? `${EMBED_ORIGIN.youtube}/embed/${source.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`
    : `${EMBED_ORIGIN.vimeo}/video/${source.id}?autoplay=1&dnt=1&title=0&byline=0&portrait=0`;
}

/**
 * 16:9 player. YouTube / Vimeo load behind a click-to-play facade (no third-party
 * requests until the visitor asks for the film). Direct files use a native <video>;
 * ambient (autoplay) files play muted while on screen and never for reduced-motion users.
 */
export function VideoPlayer({ source, poster, title, autoplay }: { source: VideoSource; poster: MediaRef | null; title: string; autoplay: boolean }) {
  if (source.kind === "file") return <FileVideo src={source.src} poster={poster} title={title} autoplay={autoplay} />;
  return <EmbedFacade source={source} poster={poster} title={title} />;
}

function EmbedFacade({ source, poster, title }: { source: { kind: "youtube" | "vimeo"; id: string }; poster: MediaRef | null; title: string }) {
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const name = title || "فيديو";

  useEffect(() => {
    if (playing) frameRef.current?.focus();
  }, [playing]);

  if (playing) {
    return (
      <iframe
        ref={frameRef}
        src={embedUrl(source)}
        title={name}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 h-full w-full border-0"
      />
    );
  }

  const warm = () => preconnect(EMBED_ORIGIN[source.kind]);

  return (
    <div className="group absolute inset-0 overflow-hidden text-paper">
      {poster ? (
        <MediaImage media={poster} sizes="(min-width: 1280px) 1100px, 100vw" className="absolute inset-0 h-full w-full" alt="" />
      ) : source.kind === "youtube" ? (
        <YouTubeThumb id={source.id} />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(70% 80% at 70% 20%, rgba(169,100,58,0.35), transparent 70%), radial-gradient(60% 70% at 10% 100%, rgba(92,26,38,0.45), transparent 70%), var(--color-cocoa)" }}
          aria-hidden
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-espresso/60 via-espresso/15 to-espresso/10 transition-opacity duration-700 group-hover:opacity-80" aria-hidden />
      <button
        type="button"
        onClick={() => setPlaying(true)}
        onPointerEnter={warm}
        onFocus={warm}
        className="absolute inset-0 grid h-full w-full cursor-pointer place-items-center focus-visible:outline-offset-[-4px]"
        aria-label={`تشغيل الفيديو: ${name}`}
      >
        <span className="grid size-16 place-items-center rounded-full bg-paper/92 text-espresso shadow-[0_18px_40px_-16px_rgba(0,0,0,0.6)] backdrop-blur-sm transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-[1.06] md:size-20" aria-hidden>
          <Play className="size-5 translate-x-[2px] fill-current md:size-6" strokeWidth={1.5} />
        </span>
      </button>
    </div>
  );
}

/** YouTube thumbnail: max-res when it exists, else the always-present hq frame. */
function YouTubeThumb({ id }: { id: string }) {
  const [src, setSrc] = useState(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`);
  const fallback = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const ref = useRef<HTMLImageElement>(null);

  // The frame may have finished loading before hydration (no onLoad then).
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth > 0 && img.naturalWidth <= 120) setSrc(fallback);
  }, [fallback]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      // a missing max-res frame comes back as a 120×90 placeholder
      onLoad={(e) => {
        if (src !== fallback && e.currentTarget.naturalWidth <= 120) setSrc(fallback);
      }}
      onError={() => {
        if (src !== fallback) setSrc(fallback);
      }}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

function FileVideo({ src, poster, title, autoplay }: { src: string; poster: MediaRef | null; title: string; autoplay: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v || !autoplay) return;
    // React does not serialise `muted` into the SSR markup; set it before any play attempt.
    v.muted = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [autoplay]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster ? `/media/${poster.id}/lg` : undefined}
      controls
      playsInline
      muted={autoplay}
      loop={autoplay}
      preload={autoplay ? "auto" : "metadata"}
      aria-label={title || "فيديو"}
      className={autoplay ? "absolute inset-0 h-full w-full bg-espresso object-cover" : "absolute inset-0 h-full w-full bg-espresso object-contain"}
    />
  );
}
