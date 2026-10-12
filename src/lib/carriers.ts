/**
 * Shipping companies the store works with, and how a tracking number becomes a tracking link.
 * The merchant manages the list in Settings → «الشحن والتتبع»; each order stores a snapshot
 * (carrier name, number, resolved link) so later edits never break old orders.
 *
 * Plain module — safe in server and client components.
 */

export type Carrier = {
  id: string;
  name: string;
  /** Tracking page with a {tracking} placeholder, e.g. https://www.aramex.com/…?ShipmentNumber={tracking} ("" = no online tracking) */
  trackingUrl: string;
  /** Courier phone / WhatsApp — shown to the customer when there is no tracking page */
  phone: string;
  enabled: boolean;
};

export const TRACKING_PLACEHOLDER = "{tracking}";

/** Well-known couriers with public tracking pages (international + Gulf). */
export const CARRIER_PRESETS: { name: string; trackingUrl: string }[] = [
  { name: "أرامكس Aramex", trackingUrl: "https://www.aramex.com/us/en/track/results?ShipmentNumber={tracking}" },
  { name: "سمسا SMSA", trackingUrl: "https://www.smsaexpress.com/trackingdetails?tracknumbers={tracking}" },
  { name: "DHL Express", trackingUrl: "https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id={tracking}" },
  { name: "FedEx", trackingUrl: "https://www.fedex.com/fedextrack/?trknbr={tracking}" },
  { name: "UPS", trackingUrl: "https://www.ups.com/track?loc=en_US&tracknum={tracking}" },
  { name: "شركة محلية (بدون موقع تتبّع)", trackingUrl: "" },
];

/** Builds the courier's tracking link for a number ("" when the template is empty/invalid or the number is empty). */
export function buildTrackingUrl(template: string, trackingNumber: string): string {
  const t = template.trim();
  const n = trackingNumber.trim();
  if (!t || !n || !/^https:\/\//i.test(t)) return "";
  const encoded = encodeURIComponent(n);
  return t.includes(TRACKING_PLACEHOLDER) ? t.split(TRACKING_PLACEHOLDER).join(encoded) : t;
}

export function newCarrierId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID().replace(/-/g, "").slice(0, 10);
  return Math.random().toString(36).slice(2, 12).padEnd(10, "0");
}
