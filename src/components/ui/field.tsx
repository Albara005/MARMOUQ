import { cn } from "@/lib/utils";

const control =
  "w-full rounded-xl border border-line bg-paper px-4 text-[0.95rem] text-espresso placeholder:text-mist transition-colors duration-200 outline-none focus:border-copper focus:ring-2 focus:ring-copper/15 disabled:opacity-60 aria-[invalid=true]:border-danger";

export function Label({ className, ...rest }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-umber", className)} {...rest} />;
}

export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, "h-12", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-24 py-3 leading-relaxed", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        control,
        "h-12 appearance-none bg-[url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237d6b5f' stroke-width='2'><path d='m6 9 6 6 6-6'/></svg>\")] bg-[length:14px] bg-[position:left_1rem_center] bg-no-repeat ps-10",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export function FieldError({ children, className }: { children?: React.ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className={cn("mt-1.5 text-xs text-danger", className)}>
      {children}
    </p>
  );
}

export function FieldHint({ children, className }: { children?: React.ReactNode; className?: string }) {
  if (!children) return null;
  return <p className={cn("mt-1.5 text-xs text-taupe", className)}>{children}</p>;
}

/** Label + control + hint/error in one block. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  error?: string | null;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {error ? <FieldError>{error}</FieldError> : <FieldHint>{hint}</FieldHint>}
    </div>
  );
}

/** Accessible on/off switch backed by a real checkbox (works in plain <form> posts). */
export function Switch({ label, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label?: React.ReactNode }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-3 text-sm text-umber", className)}>
      <input type="checkbox" className="peer sr-only" {...rest} />
      <span className="relative h-6 w-11 rounded-full bg-sand transition-colors duration-300 peer-checked:bg-copper peer-focus-visible:ring-2 peer-focus-visible:ring-copper/40 after:absolute after:top-0.5 after:start-0.5 after:size-5 after:rounded-full after:bg-paper after:shadow after:transition-transform after:duration-300 peer-checked:after:-translate-x-5" />
      {label}
    </label>
  );
}
