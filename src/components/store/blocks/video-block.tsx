import { parseVideoUrl, type VideoBlock } from "@/lib/blocks";
import type { MediaRef } from "@/lib/catalog";
import { BlockHeading } from "./block-heading";
import { TONES, blockDomId, txt } from "./tones";
import { VideoPlayer } from "./video-player";

/** A film on a dark "screening room" surface; nothing renders for unrecognised links. */
export function VideoSection({ block, poster }: { block: VideoBlock; poster: MediaRef | null }) {
  const source = parseVideoUrl(txt(block.url));
  if (!source) return null;

  const title = txt(block.title);
  const titleId = blockDomId(block.id);
  const heading = !!(title || txt(block.eyebrow) || txt(block.text));

  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : "فيديو"}
      className="relative isolate overflow-hidden bg-espresso py-20 text-paper md:py-28"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{ background: "radial-gradient(55% 45% at 50% 0%, rgba(169,100,58,0.22), transparent 70%)" }}
        aria-hidden
      />
      <div className="container-luxe">
        {heading && (
          <div data-reveal>
            <BlockHeading id={titleId} eyebrow={block.eyebrow} title={title} subtitle={block.text} align="center" tone={TONES.dark} />
          </div>
        )}
        <div className={heading ? "mx-auto mt-12 max-w-6xl md:mt-16" : "mx-auto max-w-6xl"} data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
          <div className="relative aspect-video w-full overflow-hidden bg-cocoa ring-1 ring-paper/10">
            <VideoPlayer source={source} poster={poster} title={title.replace(/\n/g, " ")} autoplay={!!block.autoplay} />
          </div>
        </div>
      </div>
    </section>
  );
}
