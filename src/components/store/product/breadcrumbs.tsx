import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="مسار التنقل">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-taupe">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="inline-flex min-w-0 items-center gap-1.5">
              {c.href && !last ? (
                <Link href={c.href} className="link-luxe py-2 hover:text-espresso">
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className="line-clamp-1 py-2 text-umber">
                  {c.label}
                </span>
              )}
              {!last && <ChevronLeft className="size-3 shrink-0 opacity-60" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
