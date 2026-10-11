"use client";

import { usePathname } from "next/navigation";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { useStoreConfig } from "@/components/store/store-provider";
import { useCart } from "@/components/store/cart/cart-provider";
import { cn, whatsappLink } from "@/lib/utils";

/**
 * Floating "talk to us" button (bottom-end = bottom-left in RTL).
 * WhatsApp when configured, otherwise Instagram DM. Hidden on checkout & cart,
 * lifted on pages that carry a sticky mobile CTA.
 */
export function WhatsAppFab() {
  const pathname = usePathname();
  const config = useStoreConfig();
  const cart = useCart();

  if (pathname.startsWith("/checkout") || pathname.startsWith("/cart") || pathname.startsWith("/admin")) return null;
  const lifted = pathname.startsWith("/product/") || pathname.startsWith("/atelier") || pathname.startsWith("/looks/");

  const wa = config.whatsapp;
  const href = wa ? whatsappLink(wa, "مرحباً مرموق 👋 عندي استفسار") : config.instagram;
  if (!href) return null;
  const label = wa ? "تحدث معنا على واتساب" : "راسلنا على إنستغرام";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={cn(
        "group fixed end-4 z-30 flex h-14 items-center gap-0 overflow-hidden rounded-full bg-espresso ps-4 pe-4 text-paper shadow-[0_14px_34px_-12px_rgba(28,19,15,0.6)] ring-1 ring-paper/10 transition-all duration-500 ease-[var(--ease-out-expo)] hover:gap-2.5 hover:bg-cocoa md:end-6",
        lifted ? "bottom-24 md:bottom-6" : "bottom-5 md:bottom-6",
        cart.isOpen && "pointer-events-none opacity-0",
      )}
    >
      {wa ? <WhatsAppIcon size={22} className="shrink-0 text-[#5fd389]" /> : <InstagramIcon size={22} className="shrink-0" />}
      <span className="max-w-0 whitespace-nowrap text-sm font-medium opacity-0 transition-all duration-500 ease-[var(--ease-out-expo)] group-hover:max-w-40 group-hover:opacity-100">
        {wa ? "تحدث معنا" : "راسلنا"}
      </span>
    </a>
  );
}
