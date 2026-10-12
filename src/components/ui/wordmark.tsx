import { baseDisplay, cn } from "@/lib/utils";

/** The MARMOUQ wordmark: spaced latin capitals with the Arabic name as a quiet subtitle. */
export function Wordmark({
  className,
  tone = "dark",
  showArabic = true,
  size = "md",
}: {
  className?: string;
  tone?: "dark" | "light" | "copper";
  showArabic?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const color = tone === "light" ? "text-paper" : tone === "copper" ? "text-copper" : "text-espresso";
  const latin = size === "lg" ? "text-4xl tracking-[0.42em]" : size === "sm" ? "text-lg tracking-[0.36em]" : "text-2xl tracking-[0.4em]";
  return (
    <span className={cn(baseDisplay("inline-flex flex-col items-center leading-none", className), color, className)} dir="ltr">
      <span className={cn("font-[family-name:var(--font-latin)] font-semibold", latin)} style={{ marginInlineEnd: "-0.4em" }}>
        MARMOUQ
      </span>
      {showArabic && (
        <span dir="rtl" className={cn("mt-1 font-[family-name:var(--font-display)] opacity-70", size === "lg" ? "text-sm" : "text-[0.62rem]")}>
          مــرمــوق
        </span>
      )}
    </span>
  );
}
