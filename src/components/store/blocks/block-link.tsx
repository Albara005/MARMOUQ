import Link from "next/link";
import { ArrowLeft, ArrowUpLeft } from "lucide-react";
import { buttonClasses, type ButtonVariant } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { txt } from "./tones";

type Target = { href: string; external: boolean; native: boolean };

/**
 * Classifies a merchant-entered link: internal paths go through next/link,
 * http(s) links open in a new tab, mailto:/tel: stay plain anchors.
 * Script-capable schemes are refused (returns null).
 */
export function linkTarget(raw: unknown): Target | null {
  const href = txt(raw);
  if (!href) return null;
  if (/^(https?:)?\/\//i.test(href)) return { href, external: true, native: true };
  // Browsers ignore tabs/newlines inside URLs ("java\tscript:"), so detect the scheme without them.
  const scheme = href.replace(/[\u0000-\u0020]/g, "").match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (scheme) return scheme === "mailto" || scheme === "tel" || scheme === "sms" ? { href, external: false, native: true } : null;
  return { href, external: false, native: false };
}

/** Anchor that picks next/link or a plain (new-tab) anchor from the href. */
export function SmartLink({
  href,
  className,
  children,
  ...rest
}: { href: string; className?: string; children: React.ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className" | "children">) {
  const t = linkTarget(href);
  if (!t) return <span className={className}>{children}</span>;
  if (t.native) {
    return (
      <a href={t.href} className={className} {...(t.external ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={t.href} className={className} {...rest}>
      {children}
    </Link>
  );
}

/** True when a block's call to action should render (both label and a usable href). */
export function hasCta(label: unknown, href: unknown): boolean {
  return !!txt(label) && !!linkTarget(href);
}

/** Pill button call to action. Renders nothing unless both label and href are set. */
export function BlockCta({
  label,
  href,
  variant = "primary",
  size = "lg",
  className,
}: {
  label: unknown;
  href: unknown;
  variant?: ButtonVariant;
  size?: "md" | "lg";
  className?: string;
}) {
  const text = txt(label);
  const t = linkTarget(href);
  if (!text || !t) return null;
  const Icon = t.external ? ArrowUpLeft : ArrowLeft;
  return (
    <SmartLink href={t.href} className={buttonClasses(variant, size, cn("group", className))}>
      {text}
      <Icon
        className={cn(
          "size-4 transition-transform duration-500 ease-[var(--ease-out-expo)]",
          t.external ? "group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" : "group-hover:-translate-x-1",
        )}
        aria-hidden
      />
      {t.external && <span className="sr-only">(يفتح في نافذة جديدة)</span>}
    </SmartLink>
  );
}

/** Quiet underlined "view all" style link (used beside headings). */
export function QuietLink({ label, href, light, className }: { label: unknown; href: unknown; light?: boolean; className?: string }) {
  const text = txt(label);
  const t = linkTarget(href);
  if (!text || !t) return null;
  const Icon = t.external ? ArrowUpLeft : ArrowLeft;
  return (
    <SmartLink
      href={t.href}
      className={cn(
        "group inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-medium tracking-wide",
        light ? "text-paper/90 hover:text-paper" : "text-espresso hover:text-copper-deep",
        className,
      )}
    >
      <span className="link-luxe pb-0.5">{text}</span>
      <Icon className="size-4 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:-translate-x-1" aria-hidden />
      {t.external && <span className="sr-only">(يفتح في نافذة جديدة)</span>}
    </SmartLink>
  );
}
