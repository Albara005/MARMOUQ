import { cn } from "@/lib/utils";

/**
 * Endless ticker band (pure CSS). Moves left → right, the natural reading drift for RTL.
 * Content is duplicated for a seamless loop; the copy is hidden from assistive tech.
 */
export function Marquee({
  items,
  tone = "light",
  className,
  speed = 38,
}: {
  items: string[];
  tone?: "light" | "dark" | "copper";
  className?: string;
  /** seconds per loop */
  speed?: number;
}) {
  const list = items.filter(Boolean);
  if (list.length === 0) return null;

  const Row = ({ hidden }: { hidden?: boolean }) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {[...list, ...list].map((t, i) => (
        <li key={`${t}-${i}`} className="flex shrink-0 items-center">
          <span className="whitespace-nowrap px-6 md:px-9">{t}</span>
          <span className={cn("text-[0.6rem]", tone === "light" ? "text-gold" : "text-copper-soft")} aria-hidden>
            ✦
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className={cn(
        "relative overflow-hidden border-y py-4 md:py-5",
        tone === "light" && "border-line bg-paper text-umber",
        tone === "dark" && "border-cocoa bg-espresso text-paper/85",
        tone === "copper" && "border-copper-deep bg-copper text-paper",
        className,
      )}
    >
      <p className="sr-only">{list.join(" · ")}</p>
      <div className="flex w-max animate-marquee motion-reduce:animate-none" style={{ animationDuration: `${speed}s` }} aria-hidden>
        <Row />
        <Row hidden />
      </div>
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 start-0 w-16 bg-gradient-to-l to-transparent md:w-32",
          tone === "light" ? "from-paper" : tone === "dark" ? "from-espresso" : "from-copper",
        )}
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-y-0 end-0 w-16 bg-gradient-to-r to-transparent md:w-32",
          tone === "light" ? "from-paper" : tone === "dark" ? "from-espresso" : "from-copper",
        )}
        aria-hidden
      />
    </div>
  );
}
