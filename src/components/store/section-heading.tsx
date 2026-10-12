import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScriptSafe } from "@/components/ui/script-safe";

/**
 * Editorial section heading: latin eyebrow with a gold rule, confident Arabic display title,
 * optional subtitle and a quiet "view all" action.
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
  align = "start",
  tone = "dark",
  as: Tag = "h2",
  className,
  id,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: { label: string; href: string };
  align?: "start" | "center";
  /** "light" for use on dark surfaces */
  tone?: "dark" | "light";
  as?: "h1" | "h2" | "h3";
  className?: string;
  /** id for the title (use with aria-labelledby on the section) */
  id?: string;
}) {
  const light = tone === "light";
  const actionLink = action ? (
    <Link
      href={action.href}
      className={cn(
        "group inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-medium tracking-wide",
        light ? "text-paper/90 hover:text-paper" : "text-espresso hover:text-copper-deep",
      )}
    >
      <span className="link-luxe pb-0.5">{action.label}</span>
      <ArrowLeft className="size-4 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:-translate-x-1" aria-hidden />
    </Link>
  ) : null;

  if (align === "center") {
    return (
      <div className={cn("mx-auto flex max-w-2xl flex-col items-center text-center", className)}>
        {eyebrow && (
          <p className={cn("eyebrow inline-flex items-center gap-3", light && "text-copper-soft")}>
            <span className="h-px w-6 bg-gold/70" aria-hidden />
            <ScriptSafe text={eyebrow} />
            <span className="h-px w-6 bg-gold/70" aria-hidden />
          </p>
        )}
        <Tag id={id} className={cn("display mt-4 text-[2rem] leading-[1.2] text-balance md:text-5xl", light ? "text-paper" : "text-espresso")}>
          {title}
        </Tag>
        {subtitle && <p className={cn("mt-4 max-w-xl text-[0.98rem] leading-8 text-pretty", light ? "text-paper/70" : "text-umber")}>{subtitle}</p>}
        {actionLink && <div className="mt-6">{actionLink}</div>}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-10", className)}>
      <div className="max-w-2xl">
        {eyebrow && (
          <p className={cn("eyebrow inline-flex items-center gap-3", light && "text-copper-soft")}>
            <span className="h-px w-8 bg-gold/70" aria-hidden />
            <ScriptSafe text={eyebrow} />
          </p>
        )}
        <Tag id={id} className={cn("display mt-4 text-[2rem] leading-[1.2] text-balance md:text-5xl", light ? "text-paper" : "text-espresso")}>
          {title}
        </Tag>
        {subtitle && <p className={cn("mt-4 max-w-xl text-[0.98rem] leading-8 text-pretty", light ? "text-paper/70" : "text-umber")}>{subtitle}</p>}
      </div>
      {actionLink}
    </div>
  );
}
