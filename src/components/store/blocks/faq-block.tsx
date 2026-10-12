import type { FaqBlock } from "@/lib/blocks";
import { cn } from "@/lib/utils";
import { BlockHeading } from "./block-heading";
import { TONES, blockDomId, txt } from "./tones";

/**
 * Questions & answers as native <details> (keyboard and screen-reader friendly, works without JS).
 * With a heading it becomes an editorial two-column layout on desktop.
 */
export function FaqSection({ block }: { block: FaqBlock }) {
  const items = (Array.isArray(block.items) ? block.items : []).map((it) => ({ q: txt(it?.q), a: txt(it?.a) })).filter((it) => it.q);
  if (items.length === 0) return null;

  const title = txt(block.title);
  const titleId = blockDomId(block.id);
  const heading = !!(title || txt(block.eyebrow));

  return (
    <section aria-labelledby={title ? titleId : undefined} aria-label={title ? undefined : "أسئلة شائعة"} className="bg-ivory py-20 md:py-28">
      <div className={cn("container-luxe", heading && "grid gap-10 lg:grid-cols-12 lg:gap-16")}>
        {heading && (
          <div className="lg:col-span-4" data-reveal>
            <div className="lg:sticky lg:top-28">
              <BlockHeading id={titleId} eyebrow={block.eyebrow} title={title} tone={TONES.ivory} />
            </div>
          </div>
        )}

        <ul className={cn("border-t border-line", heading ? "lg:col-span-8 lg:col-start-5 xl:col-span-7 xl:col-start-6" : "mx-auto max-w-3xl")} data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
          {items.map((it, i) => (
            <li key={`${i}-${it.q}`} className="border-b border-line">
              <details className="group">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-5 text-start text-espresso transition-colors duration-300 hover:text-copper-deep md:gap-6 focus-visible:outline-offset-4 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-baseline gap-4">
                    <span className="latin-italic w-6 shrink-0 text-sm text-taupe" dir="ltr" aria-hidden>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="display text-[1.08rem] leading-8 md:text-xl">{it.q}</span>
                  </span>
                  {/* plus → minus */}
                  <span className="relative grid size-9 shrink-0 place-items-center rounded-full border border-line transition-colors duration-300 group-open:border-espresso group-open:bg-espresso" aria-hidden>
                    <span className="absolute h-px w-3.5 bg-espresso transition-colors duration-300 group-open:bg-paper" />
                    <span className="absolute h-3.5 w-px bg-espresso transition-transform duration-500 ease-[var(--ease-out-expo)] group-open:scale-y-0" />
                  </span>
                </summary>
                {it.a && (
                  <div className="pb-7 ps-10 md:pe-12 motion-safe:group-open:animate-fade-in">
                    <p className="max-w-2xl whitespace-pre-line text-[0.95rem] leading-8 text-umber">{it.a}</p>
                  </div>
                )}
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
