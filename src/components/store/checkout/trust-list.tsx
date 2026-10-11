import { RefreshCcw, ShieldCheck, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { icon: ShieldCheck, title: "بياناتك في أمان", text: "نستخدمها فقط لتوصيل طلبك" },
  { icon: Truck, title: "توصيل لكل المحافظات", text: "نؤكد معك قبل الشحن" },
  { icon: RefreshCcw, title: "استبدال سهل", text: "خلال 3 أيام من الاستلام" },
] as const;

/** Quiet reassurance row used under summaries. Works in server and client components. */
export function TrustList({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <ul className={cn("grid gap-3", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3", className)}>
      {ITEMS.map(({ icon: Icon, title, text }) => (
        <li key={title} className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-bone text-copper">
            <Icon className="size-4" strokeWidth={1.5} aria-hidden />
          </span>
          <span className="pt-0.5">
            <span className="block text-[0.82rem] font-medium text-espresso">{title}</span>
            <span className="block text-xs leading-6 text-taupe">{text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
