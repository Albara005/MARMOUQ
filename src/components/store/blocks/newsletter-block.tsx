import { NewsletterForm } from "@/components/store/newsletter-form";
import type { NewsletterBlock } from "@/lib/blocks";
import { cn } from "@/lib/utils";
import { BlockEyebrow } from "./block-heading";
import { blockDomId, toneStyle, txt } from "./tones";

/** Private-list sign-up band (reuses the footer's form). */
export function NewsletterSection({ block }: { block: NewsletterBlock }) {
  const t = toneStyle(block.tone, "dark");
  const eyebrow = txt(block.eyebrow);
  const title = txt(block.title);
  const text = txt(block.text);
  const titleId = blockDomId(block.id);

  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : "الاشتراك في القائمة"}
      className={cn("relative isolate overflow-hidden py-20 md:py-28", t.surface, t.dark && "grain")}
    >
      {block.tone === "dark" && (
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-70"
          style={{ background: "radial-gradient(55% 70% at 50% 0%, rgba(169,100,58,0.24), transparent 70%)" }}
          aria-hidden
        />
      )}
      <div className="container-luxe flex flex-col items-center text-center">
        <div className="flex flex-col items-center" data-reveal>
          <BlockEyebrow text={eyebrow} tone={t} center />
          {title && (
            <h2 id={titleId} className={cn("display max-w-2xl whitespace-pre-line text-[2.1rem] leading-[1.18] text-balance md:text-5xl", eyebrow && "mt-5", t.title)}>
              {title}
            </h2>
          )}
          {text && <p className={cn("max-w-xl whitespace-pre-line text-[0.98rem] leading-8 text-pretty", (eyebrow || title) && "mt-4", t.body)}>{text}</p>}
        </div>
        <div className={cn("w-full max-w-lg text-start", (eyebrow || title || text) && "mt-10")} data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>
          {/* The form's helper / status line is styled for light surfaces; keep it legible on dark ones. */}
          <NewsletterForm className={t.dark ? "[&_p.text-taupe]:text-paper/65 [&_p.text-danger]:text-paper [&_p.text-success]:text-paper" : undefined} />
        </div>
      </div>
    </section>
  );
}
