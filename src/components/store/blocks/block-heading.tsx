import { MixedEyebrow } from "@/components/store/home/mixed-eyebrow";
import { cn } from "@/lib/utils";
import { QuietLink } from "./block-link";
import { TONES, txt, type ToneStyle } from "./tones";

/**
 * Eyebrow with the store's gold rule. Unlike the plain `.eyebrow` class it is script-aware:
 * merchants often type Arabic here, which must not get latin letter-spacing.
 */
export function BlockEyebrow({ text, tone = TONES.paper, center, className }: { text: unknown; tone?: ToneStyle; center?: boolean; className?: string }) {
  const value = txt(text);
  if (!value) return null;
  return (
    <div className={cn("inline-flex max-w-full items-center gap-3", className)}>
      <span className={cn("h-px shrink-0", center ? "w-6" : "w-8", tone.rule)} aria-hidden />
      <MixedEyebrow text={value} className="min-w-0" latinClassName={tone.eyebrowLatin} arabicClassName={tone.eyebrowArabic} />
      {center && <span className={cn("h-px w-6 shrink-0", tone.rule)} aria-hidden />}
    </div>
  );
}

/**
 * Section heading for blocks — the same editorial rhythm as `SectionHeading`
 * (eyebrow, display title, subtitle, quiet action), but tone-aware, script-aware
 * and with external-link support for the action. Renders nothing when empty.
 */
export function BlockHeading({
  id,
  eyebrow,
  title,
  subtitle,
  align = "start",
  tone = TONES.paper,
  action,
  aside,
  className,
}: {
  id?: string;
  eyebrow?: unknown;
  title?: unknown;
  subtitle?: unknown;
  align?: "start" | "center";
  tone?: ToneStyle;
  action?: { label: unknown; href: unknown };
  /** extra controls next to the action (e.g. carousel arrows) */
  aside?: React.ReactNode;
  className?: string;
}) {
  const e = txt(eyebrow);
  const t = txt(title);
  const s = txt(subtitle);
  const link = action ? <QuietLink label={action.label} href={action.href} light={tone.dark} /> : null;
  if (!e && !t && !s && !link && !aside) return null;

  const copy = (
    <>
      <BlockEyebrow text={e} tone={tone} center={align === "center"} />
      {t && (
        <h2 id={id} className={cn("display text-[2rem] leading-[1.2] text-balance whitespace-pre-line md:text-5xl", e && "mt-4", tone.title)}>
          {t}
        </h2>
      )}
      {s && <p className={cn("max-w-xl text-[0.98rem] leading-8 text-pretty whitespace-pre-line", (e || t) && "mt-4", tone.body)}>{s}</p>}
    </>
  );

  if (align === "center") {
    return (
      <div className={cn("mx-auto flex max-w-2xl flex-col items-center text-center", className)}>
        {copy}
        {(link || aside) && (
          <div className={cn("flex items-center gap-4", (e || t || s) && "mt-6")}>
            {link}
            {aside}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-10", className)}>
      {(e || t || s) && <div className="max-w-2xl min-w-0">{copy}</div>}
      {(link || aside) && (
        <div className="flex shrink-0 items-center gap-6">
          {link}
          {aside}
        </div>
      )}
    </div>
  );
}
