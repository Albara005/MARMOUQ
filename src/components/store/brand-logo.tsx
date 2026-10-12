"use client";

import { Wordmark } from "@/components/ui/wordmark";
import { useStoreConfig } from "@/components/store/store-provider";
import { cn } from "@/lib/utils";

/** The store logo: uploaded image when set in the dashboard, else the MARMOUQ wordmark. */
export function BrandLogo({ tone = "dark", size = "md", className }: { tone?: "dark" | "light"; size?: "sm" | "md"; className?: string }) {
  const { brand, storeName } = useStoreConfig();
  if (brand.logoId) {
    const h = Math.max(20, Math.min(96, brand.logoHeight || 40)) * (size === "sm" ? 0.82 : 1);
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`/media/${brand.logoId}/md`} alt={storeName} style={{ height: h, width: "auto" }} className={cn("block object-contain transition-[filter] duration-500", tone === "light" && "brightness-0 invert", className)} />
    );
  }
  return <Wordmark tone={tone} size={size} className={cn("transition-colors duration-500", className)} />;
}
