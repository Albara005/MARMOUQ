"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Phone, Truck } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { buttonClasses } from "@/components/ui/button";
import { cn, whatsappLink } from "@/lib/utils";

export type Shipment = { carrierName: string; trackingNumber: string; trackingUrl: string; carrierPhone: string };

/** Courier, tracking number and a direct link to the courier's tracking page. */
export function ShipmentCard({ shipment, orderNumber, className }: { shipment: Shipment; orderNumber: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shipment.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — the number stays selectable */
    }
  };
  const carrier = shipment.carrierName || "شركة الشحن";

  return (
    <section aria-label="تتبّع الشحنة" className={cn("rounded-2xl border border-copper/25 bg-copper/[0.06] p-5 md:p-6", className)}>
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-espresso text-copper-soft" aria-hidden>
          <Truck className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-[0.62rem] leading-none text-copper-deep">SHIPMENT</p>
          <h3 className="display mt-1.5 text-xl text-espresso md:text-2xl">شحنتك مع {carrier}</h3>
          {shipment.trackingNumber && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-umber">
              <span>رقم الشحنة:</span>
              <span dir="ltr" className="select-all rounded-md bg-paper px-2.5 py-1 font-mono text-[0.9rem] tracking-wide text-espresso ring-1 ring-line">
                {shipment.trackingNumber}
              </span>
              <button type="button" onClick={copy} className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs text-taupe transition-colors hover:bg-paper hover:text-espresso" aria-live="polite">
                {copied ? <Check className="size-3.5 text-success" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                {copied ? "نُسخ" : "نسخ"}
              </button>
            </div>
          )}
        </div>
      </div>

      {(shipment.trackingUrl || shipment.carrierPhone) && (
        <div className="mt-5 flex flex-wrap gap-2.5">
          {shipment.trackingUrl && (
            <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary", "md", "flex-1 sm:flex-none")}>
              تتبّع الشحنة لدى {carrier}
              <ExternalLink className="size-4" aria-hidden />
            </a>
          )}
          {!shipment.trackingUrl && shipment.carrierPhone && (
            <>
              <a
                href={whatsappLink(shipment.carrierPhone, `مرحباً، أستفسر عن شحنة رقم ${shipment.trackingNumber || orderNumber}`)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses("primary", "md", "flex-1 sm:flex-none")}
              >
                <WhatsAppIcon className="size-4" />
                راسل {carrier}
              </a>
              <a href={`tel:${shipment.carrierPhone}`} className={buttonClasses("outline", "md", "flex-1 sm:flex-none")}>
                <Phone className="size-4" aria-hidden />
                اتصال
              </a>
            </>
          )}
        </div>
      )}
    </section>
  );
}
