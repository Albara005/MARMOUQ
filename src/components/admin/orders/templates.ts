/**
 * WhatsApp message templates for an order, written in the brand voice (Gulf/Yemeni warmth).
 * Pure function — no directive, usable from server components.
 */
import type { OrderStatus } from "@/db/schema";
import type { WhatsAppTemplate } from "./whatsapp-composer";

export type TemplateInput = {
  number: string;
  customerName: string;
  city: string;
  address: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  totalLabel: string;
  trackUrl: string;
  storeName: string;
  instagramHandle: string | null;
  transferAccounts: { bank: string; holder: string; number: string }[];
  eta: string | null;
  /** courier & tracking number, once the parcel is handed over */
  shipment?: { carrierName: string; trackingNumber: string; trackingUrl: string } | null;
};

export function orderTemplates(o: TemplateInput): { templates: WhatsAppTemplate[]; initialId: string } {
  const first = o.customerName.trim().split(/\s+/)[0] || o.customerName;
  const sign = `\n\n— فريق ${o.storeName}`;
  const unpaid = o.paymentStatus !== "paid";
  const accounts = o.transferAccounts.filter((a) => a.number && a.number !== "—").map((a) => `• ${a.bank}: ${a.number}${a.holder ? ` (${a.holder})` : ""}`);

  const templates: WhatsAppTemplate[] = [
    {
      id: "confirm",
      label: "تأكيد الطلب",
      text:
        `أهلاً ${first} 🌿\nمعك ${o.storeName} — استلمنا طلبك رقم ${o.number} بقيمة ${o.totalLabel}.\n\n` +
        `نبغى نأكد معك عنوان التوصيل:\n📍 ${o.city} — ${o.address}\n\n` +
        `إذا كل شي تمام رد علينا بـ «تأكيد» ونبدأ تجهيز طلبك فوراً ✨${sign}`,
    },
    {
      id: "processing",
      label: "قيد التجهيز",
      text: `${first}، طلبك ${o.number} الحين قيد التجهيز 🤍\nنراجع كل قطعة ونغلّفها بعناية، ونبلغك أول ما يخرج للتوصيل.${sign}`,
    },
    {
      id: "shipped",
      label: "تم الشحن",
      text:
        `بشارة يا ${first} 🚚\nطلبك ${o.number} خرج للتوصيل إلى ${o.city}${o.shipment?.carrierName ? ` مع ${o.shipment.carrierName}` : ""}${o.eta ? ` ويوصلك خلال ${o.eta}` : ""}.\n` +
        (o.shipment?.trackingNumber ? `رقم الشحنة: ${o.shipment.trackingNumber}\n` : "") +
        (unpaid && o.paymentMethod === "cod" ? `المبلغ المطلوب عند الاستلام: ${o.totalLabel}\n` : "") +
        (o.shipment?.trackingUrl ? `\nتتبّع شحنتك لدى شركة الشحن:\n${o.shipment.trackingUrl}\n` : "") +
        `\nتابع حالة طلبك من هنا:\n${o.trackUrl}${sign}`,
    },
    {
      id: "delivered",
      label: "بعد التسليم",
      text:
        `وصل طلبك بالسلامة يا ${first} ✨\nنتمنى القطع تنال إعجابك وتلبسها بالعافية.\n` +
        (o.instagramHandle ? `\nيسعدنا نشوف إطلالتك — صوّرها وأشّر علينا ${o.instagramHandle} 📸\n` : "") +
        `\nأي ملاحظة على المقاس أو الاستبدال، احنا هنا.${sign}`,
    },
  ];

  if (o.paymentMethod === "transfer" && unpaid) {
    templates.push({
      id: "payment",
      label: "تذكير بالحوالة",
      text:
        `أهلاً ${first} 🌿\nبانتظار تحويل مبلغ ${o.totalLabel} لطلبك ${o.number}.\n` +
        (accounts.length ? `\nالحسابات المتاحة:\n${accounts.join("\n")}\n` : "") +
        `\nبعد التحويل أرسل لنا صورة الإيصال هنا ونأكد طلبك مباشرة 🤍${sign}`,
    });
  }

  if (o.status === "cancelled") {
    templates.push({
      id: "cancelled",
      label: "إلغاء",
      text: `${first}، تم إلغاء طلبك ${o.number}.\nإذا حاب تعيد الطلب أو تختار قطعة ثانية، يسعدنا نخدمك في أي وقت 🤍${sign}`,
    });
  }

  const byStatus: Record<OrderStatus, string> = {
    pending: o.paymentMethod === "transfer" && unpaid ? "payment" : "confirm",
    confirmed: "processing",
    processing: "processing",
    shipped: "shipped",
    delivered: "delivered",
    cancelled: "cancelled",
    returned: "delivered",
  };
  return { templates, initialId: byStatus[o.status] };
}
