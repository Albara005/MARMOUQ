"use client";

import { useId, useState } from "react";
import { Check, Copy, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { buttonClasses } from "@/components/ui/button";
import { cn, whatsappLink } from "@/lib/utils";

export type WhatsAppTemplate = { id: string; label: string; text: string };

/**
 * Message templates per order stage → preview (editable) → opens WhatsApp with the text prefilled.
 */
export function WhatsAppComposer({ phone, templates, initialId }: { phone: string; templates: WhatsAppTemplate[]; initialId: string }) {
  const [active, setActive] = useState(templates.some((t) => t.id === initialId) ? initialId : templates[0]?.id);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => Object.fromEntries(templates.map((t) => [t.id, t.text])));
  const [copied, setCopied] = useState(false);
  const textId = useId();
  const text = drafts[active] ?? "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — nothing to do */
    }
  }

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="قوالب الرسائل" className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === active}
            aria-controls={textId}
            onClick={() => setActive(t.id)}
            className={cn(
              "h-8 shrink-0 rounded-full px-3 text-xs transition-colors",
              t.id === active ? "bg-espresso text-paper" : "bg-bone text-umber hover:bg-sand",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="relative">
        <label htmlFor={textId} className="sr-only">
          نص الرسالة
        </label>
        <textarea
          id={textId}
          value={text}
          onChange={(e) => setDrafts((d) => ({ ...d, [active]: e.target.value }))}
          rows={8}
          className="w-full resize-y rounded-xl border border-line bg-[#f3efe6] px-3.5 py-3 text-[0.82rem] leading-6 text-espresso outline-none focus:border-copper focus:ring-2 focus:ring-copper/15"
        />
        <button
          type="button"
          onClick={copy}
          className="absolute bottom-2.5 end-2.5 grid size-8 place-items-center rounded-full bg-paper/90 text-taupe ring-1 ring-line transition-colors hover:text-espresso"
          aria-label={copied ? "تم النسخ" : "نسخ الرسالة"}
        >
          {copied ? <Check className="size-3.5 text-success" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
        </button>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <a href={whatsappLink(phone, text)} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary", "sm", "!bg-[#1f7a55] hover:!bg-[#196447]")}>
          <WhatsAppIcon className="size-4" />
          إرسال عبر واتساب
        </a>
        <a href={`tel:${phone}`} className={buttonClasses("outline", "sm", "border-line px-3.5")} aria-label={`اتصال بالرقم ${phone}`}>
          <Phone className="size-4" aria-hidden />
          اتصال
        </a>
      </div>
    </div>
  );
}
