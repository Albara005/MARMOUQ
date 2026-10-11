import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import type { MediaRef } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type Crumb = { label: string; href?: string };

function Breadcrumbs({ items, light }: { items: Crumb[]; light?: boolean }) {
  return (
    <nav aria-label="مسار التنقل" className="mb-5">
      <ol className={cn("flex flex-wrap items-center gap-1.5 text-xs", light ? "text-paper/70" : "text-taupe")}>
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="inline-flex items-center gap-1.5">
              {c.href && !last ? (
                <Link href={c.href} className={cn("link-luxe py-1", light ? "hover:text-paper" : "hover:text-espresso")}>
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={cn(last && (light ? "text-paper" : "text-umber"))}>
                  {c.label}
                </span>
              )}
              {!last && <ChevronLeft className="size-3 opacity-60" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Inner-page header. Without media: an editorial ivory masthead with a gold hairline.
 * With media: a cinematic banner (dark gradient + grain) with the title set in paper.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  breadcrumbs,
  media,
  className,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  breadcrumbs?: Crumb[];
  media?: MediaRef | null;
  className?: string;
  /** Optional extra content under the subtitle (chips, counts …) */
  children?: React.ReactNode;
}) {
  if (media) {
    return (
      <header className={cn("relative isolate overflow-hidden bg-espresso text-paper grain", className)}>
        <div className="absolute inset-0 -z-10">
          <MediaImage media={media} sizes="100vw" priority className="h-full w-full" imgClassName="animate-slow-zoom object-[50%_35%]" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-espresso via-espresso/55 to-espresso/20" aria-hidden />
        <div className="container-luxe flex min-h-[46svh] flex-col justify-end pb-10 pt-16 md:min-h-[54vh] md:pb-16">
          {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} light /> : null}
          {eyebrow && <p className="eyebrow text-copper-soft">{eyebrow}</p>}
          <h1 className="display mt-3 max-w-3xl text-4xl leading-[1.15] text-balance md:text-6xl">{title}</h1>
          {subtitle && <p className="mt-4 max-w-xl text-[0.98rem] leading-8 text-paper/75 text-pretty">{subtitle}</p>}
          {children && <div className="mt-6">{children}</div>}
        </div>
      </header>
    );
  }

  return (
    <header className={cn("bg-ivory", className)}>
      <div className="container-luxe pb-10 pt-8 md:pb-14 md:pt-12">
        {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
        {eyebrow && (
          <p className="eyebrow inline-flex items-center gap-3">
            <span className="h-px w-8 bg-gold/70" aria-hidden />
            {eyebrow}
          </p>
        )}
        <h1 className="display mt-3 max-w-4xl text-4xl leading-[1.15] text-espresso text-balance md:text-6xl">{title}</h1>
        {subtitle && <p className="mt-4 max-w-2xl text-[0.98rem] leading-8 text-umber text-pretty">{subtitle}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
      <div className="container-luxe">
        <div className="hairline" aria-hidden />
      </div>
    </header>
  );
}
