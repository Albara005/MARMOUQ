import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "copper" | "outline" | "ghost" | "light" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base =
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,color,border-color,box-shadow,transform] duration-300 ease-[var(--ease-luxe)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.985] select-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-espresso text-paper hover:bg-cocoa shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]",
  copper: "bg-copper text-paper hover:bg-copper-deep",
  outline: "border border-espresso/80 text-espresso hover:bg-espresso hover:text-paper",
  ghost: "text-espresso hover:bg-bone",
  light: "bg-paper text-espresso hover:bg-bone",
  danger: "bg-danger text-paper hover:brightness-110",
  link: "text-espresso underline-offset-4 hover:underline px-0 h-auto",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm rounded-full",
  md: "h-11 px-6 text-[0.95rem] rounded-full",
  lg: "h-14 px-8 text-base rounded-full tracking-wide",
  icon: "h-10 w-10 rounded-full",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(base, variants[variant], variant === "link" ? "" : sizes[size], className);
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

type ButtonLinkProps = React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize };

export function ButtonLink({ variant = "primary", size = "md", className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...rest} />;
}
