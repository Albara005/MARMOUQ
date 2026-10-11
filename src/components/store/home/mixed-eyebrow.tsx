import { cn } from "@/lib/utils";

/**
 * Eyebrow that may mix Arabic and Latin (e.g. "مجموعة الخريف · AUTUMN EDIT").
 * Latin runs get the spaced Cormorant treatment; Arabic runs stay unspaced so letters keep joining.
 */
export function MixedEyebrow({ text, className, latinClassName, arabicClassName }: { text: string; className?: string; latinClassName?: string; arabicClassName?: string }) {
  const parts = text.split(/([A-Za-z][A-Za-z0-9\s.&'’—–-]*[A-Za-z0-9.])/g).filter((p) => p.trim().length > 0);
  return (
    <p className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      {parts.map((p, i) =>
        /[A-Za-z]/.test(p) ? (
          <span key={i} className={cn("eyebrow", latinClassName)} dir="ltr">
            {p.trim()}
          </span>
        ) : (
          <span key={i} className={cn("text-[0.82rem] font-medium", arabicClassName)}>
            {p.replace(/^[\s·•|—-]+|[\s·•|—-]+$/g, "")}
          </span>
        ),
      ).flatMap((node, i) => (i === 0 ? [node] : [<span key={`sep-${i}`} className="text-gold" aria-hidden>·</span>, node]))}
    </p>
  );
}
