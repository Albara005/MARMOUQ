import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import type { MediaRef } from "@/lib/catalog";

export type AtelierSlot = { label: string; media: MediaRef | null };

/** Closing band teasing the outfit builder: five slots adding up to one look. */
export function AtelierBand({
  slots,
  copy = { eyebrow: "The Atelier", title: "نسّق إطلالتك بنفسك، قطعة بقطعة", text: "", ctaLabel: "ابدأ التنسيق الآن" },
}: {
  slots: AtelierSlot[];
  copy?: { eyebrow: string; title: string; text: string; ctaLabel: string };
}) {
  const list = slots.slice(0, 5);
  return (
    <section aria-labelledby="atelier-title" className="relative isolate overflow-hidden bg-espresso py-20 text-paper grain md:py-28">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{ background: "radial-gradient(60% 70% at 50% 0%, rgba(169,100,58,0.28), transparent 70%), radial-gradient(50% 60% at 100% 100%, rgba(92,26,38,0.45), transparent 70%)" }}
        aria-hidden
      />
      <div className="container-luxe flex flex-col items-center text-center">
        <div data-reveal className="flex flex-col items-center">
          <p className="eyebrow inline-flex items-center gap-3 text-copper-soft">
            <span className="h-px w-6 bg-copper-soft/60" aria-hidden />
            {copy.eyebrow}
            <span className="h-px w-6 bg-copper-soft/60" aria-hidden />
          </p>
          <h2 id="atelier-title" className="display mt-5 max-w-3xl text-[2.4rem] leading-[1.12] text-balance md:text-6xl">
            {copy.title}
          </h2>
          {copy.text && <p className="mt-5 max-w-xl text-[0.98rem] leading-8 text-paper/70">{copy.text}</p>}
        </div>

        {list.length > 0 && (
          <ol className="mt-12 flex w-full max-w-3xl items-center justify-center md:mt-16" aria-label="خطوات التنسيق">
            {list.map((s, i) => (
              <li key={s.label} className="flex min-w-0 flex-1 items-center" data-reveal style={{ "--reveal-delay": `${120 + i * 90}ms` } as React.CSSProperties}>
                <div className="flex w-full min-w-0 flex-col items-center">
                  <div className="studio-frame aspect-[4/5] w-full max-w-28 overflow-hidden rounded-md ring-1 ring-paper/10">
                    <MediaImage media={s.media} sizes="120px" className="h-full w-full" alt="" />
                  </div>
                  <span className="mt-3 truncate text-[0.7rem] text-paper/70 md:text-sm">{s.label}</span>
                </div>
                {i < list.length - 1 && <Plus className="mx-0.5 mb-7 size-3 shrink-0 text-copper-soft md:mx-3 md:size-4" aria-hidden />}
              </li>
            ))}
          </ol>
        )}

        <Link
          href="/atelier"
          className="group mt-12 inline-flex h-14 items-center gap-3 rounded-full bg-copper px-9 text-[0.95rem] font-medium text-paper transition-colors duration-300 hover:bg-copper-deep md:mt-14"
          data-reveal
        >
          {copy.ctaLabel}
          <ArrowLeft className="size-4 transition-transform duration-500 group-hover:-translate-x-1" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
