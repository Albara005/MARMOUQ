import { cn } from "@/lib/utils";

export type MediaLike = { id: string; blur?: string; width?: number; height?: number; alt?: string };

/**
 * Responsive image served from the database (/media/{id}/{sm|md|lg}, WebP, immutable cache).
 * Renders a blurred placeholder underneath until the real image paints.
 * Works in server and client components (no hooks).
 */
export function MediaImage({
  media,
  alt,
  sizes = "(min-width: 1024px) 33vw, 50vw",
  className,
  imgClassName,
  priority,
  fit = "cover",
}: {
  media: MediaLike | null | undefined;
  alt?: string;
  sizes?: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  fit?: "cover" | "contain";
}) {
  if (!media) {
    return <MediaPlaceholder className={className} />;
  }
  const src = (s: string) => `/media/${media.id}/${s}`;
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={media.blur ? { backgroundImage: `url(${media.blur})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src("md")}
        srcSet={`${src("sm")} 480w, ${src("md")} 960w, ${src("lg")} 1600w`}
        sizes={sizes}
        alt={alt ?? media.alt ?? ""}
        width={media.width}
        height={media.height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className={cn("absolute inset-0 h-full w-full", fit === "cover" ? "object-cover" : "object-contain", imgClassName)}
      />
    </div>
  );
}

/** Branded placeholder for products without photos yet. */
export function MediaPlaceholder({ className, label = "MARMOUQ" }: { className?: string; label?: string }) {
  return (
    <div className={cn("studio-frame relative flex items-center justify-center", className)} aria-hidden>
      <div className="flex flex-col items-center gap-2 text-taupe/70">
        <span className="font-[family-name:var(--font-latin)] text-4xl italic">M</span>
        <span className="text-[0.6rem] tracking-[0.4em]">{label}</span>
      </div>
    </div>
  );
}
