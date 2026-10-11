import { cn } from "@/lib/utils";

export type Tone = "neutral" | "info" | "warning" | "success" | "danger" | "copper" | "dark";

const tones: Record<Tone, string> = {
  neutral: "bg-bone text-umber ring-line",
  info: "bg-info/10 text-info ring-info/20",
  warning: "bg-warning/10 text-warning ring-warning/25",
  success: "bg-success/10 text-success ring-success/20",
  danger: "bg-danger/10 text-danger ring-danger/20",
  copper: "bg-copper/10 text-copper-deep ring-copper/25",
  dark: "bg-espresso text-paper ring-espresso",
};

export function Badge({ tone = "neutral", dot, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
