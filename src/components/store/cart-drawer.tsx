"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef } from "react";
import { ArrowLeft, ShoppingBag, Sparkles, Truck, X } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { ButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { useMoney, useStoreConfig } from "@/components/store/store-provider";
import { useCart, type CartLine } from "@/components/store/cart/cart-provider";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import { Portal, useModal, usePresence } from "@/components/store/overlay";
import { cn, whatsappLink } from "@/lib/utils";

function lineHref(l: CartLine) {
  return l.color ? `/product/${l.slug}?color=${encodeURIComponent(l.color)}` : `/product/${l.slug}`;
}

/** Cart drawer — slides in from the end (left) edge in RTL. */
export function CartDrawer() {
  const cart = useCart();
  const config = useStoreConfig();
  const money = useMoney();
  const pathname = usePathname();
  const { mounted, visible } = usePresence(cart.isOpen, 550);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useModal({ open: cart.isOpen, onClose: cart.close, containerRef: panelRef });

  // Close when navigating (e.g. "view bag" / product links)
  const close = cart.close;
  useEffect(() => {
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!mounted) return null;

  const threshold = config.freeShippingThreshold;
  const remaining = Math.max(0, threshold - cart.subtotal);
  const progress = threshold > 0 ? Math.min(100, Math.round((cart.subtotal / threshold) * 100)) : 0;
  const hasLook = cart.lines.some((l) => l.lookId);

  const waText = [
    "مرحباً مرموق 👋 حاب أطلب:",
    ...cart.lines.map((l) => `• ${l.name}${l.color ? ` — ${l.color}` : ""}${l.size ? ` / ${l.size}` : ""} × ${l.quantity}`),
    `الإجمالي التقريبي: ${money(cart.subtotal)}`,
  ].join("\n");

  return (
    <Portal>
      <div className="fixed inset-0 z-[60]">
        <div className={cn("absolute inset-0 bg-espresso/45 backdrop-blur-[2px] transition-opacity duration-500", visible ? "opacity-100" : "opacity-0")} onClick={cart.close} aria-hidden />
        <aside
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={cn(
            "absolute inset-y-0 end-0 flex w-full max-w-[440px] flex-col bg-ivory shadow-[0_0_60px_-10px_rgba(28,19,15,0.4)] outline-none transition-transform duration-500 ease-[var(--ease-out-expo)] sm:w-[92%]",
            visible ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {/* Header */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5 md:h-20 md:px-7">
            <h2 id={titleId} className="flex items-baseline gap-2.5">
              <span className="display text-2xl text-espresso">سلّتك</span>
              {cart.count > 0 && <span className="text-sm tabular-nums text-taupe">({cart.count} {cart.count === 1 ? "قطعة" : cart.count === 2 ? "قطعتان" : "قطع"})</span>}
            </h2>
            <button type="button" onClick={cart.close} className="-me-2.5 grid size-11 place-items-center rounded-full text-espresso transition-colors hover:bg-bone" aria-label="إغلاق السلة">
              <X className="size-5" strokeWidth={1.5} aria-hidden />
            </button>
          </div>

          {cart.lines.length === 0 ? (
            /* Empty state */
            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <div className="relative grid size-24 place-items-center rounded-full bg-bone">
                <ShoppingBag className="size-9 text-copper" strokeWidth={1.2} aria-hidden />
                <span className="absolute -end-1 top-2 text-gold" aria-hidden>
                  ✦
                </span>
              </div>
              <p className="display mt-7 text-2xl text-espresso">سلّتك بانتظار أول قطعة</p>
              <p className="mt-3 max-w-xs text-sm leading-7 text-taupe">ابدأ بقطعة تعبّر عنك — سويتر إيطالي، قميص بياقة حادّة، أو إطلالة كاملة جاهزة.</p>
              <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
                <ButtonLink href="/shop" size="lg" className="w-full">
                  تسوّق المجموعة
                </ButtonLink>
                <ButtonLink href="/looks" variant="outline" size="lg" className="w-full">
                  اكتشف الإطلالات الجاهزة
                </ButtonLink>
              </div>
            </div>
          ) : (
            <>
              {/* Free-shipping incentive */}
              {threshold > 0 && (
                <div className="shrink-0 border-b border-line bg-paper px-5 py-4 md:px-7">
                  <p className="flex items-center gap-2 text-[0.82rem] text-umber">
                    <Truck className="size-4 shrink-0 text-copper" strokeWidth={1.5} aria-hidden />
                    {remaining > 0 ? (
                      <span>
                        باقي لك <strong className="font-semibold tabular-nums text-espresso">{money(remaining)}</strong> وتوصيلك علينا مجاناً
                      </span>
                    ) : (
                      <span className="text-success">مبروك! طلبك مؤهل للتوصيل المجاني ✦</span>
                    )}
                  </p>
                  <div
                    className="mt-3 h-[3px] overflow-hidden rounded-full bg-sand"
                    role="progressbar"
                    aria-label="التقدّم نحو التوصيل المجاني"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                  >
                    <div
                      className={cn("h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out-expo)]", remaining > 0 ? "bg-copper" : "bg-success")}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Lines */}
              <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto overscroll-contain px-5 md:px-7">
                {cart.lines.map((l) => (
                  <li key={l.key} className="flex gap-4 py-5">
                    <Link href={lineHref(l)} className="studio-frame block aspect-[4/5] w-[84px] shrink-0 overflow-hidden rounded-lg" tabIndex={-1} aria-hidden>
                      <MediaImage media={l.imageId ? { id: l.imageId, blur: l.imageBlur } : null} sizes="90px" className="h-full w-full" alt="" />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <Link href={lineHref(l)} className="line-clamp-2 text-[0.92rem] font-medium leading-6 text-espresso hover:underline hover:decoration-copper/60 hover:underline-offset-4">
                          {l.name}
                        </Link>
                        <span className="shrink-0 text-[0.9rem] tabular-nums text-espresso">{money(l.unitPrice * l.quantity)}</span>
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-taupe">
                        {l.color && (
                          <span className="inline-flex items-center gap-1.5">
                            {l.colorHex && <span className="size-2.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: l.colorHex }} aria-hidden />}
                            {l.color}
                          </span>
                        )}
                        {l.color && l.size && <span aria-hidden>·</span>}
                        {l.size && <span>المقاس {l.size}</span>}
                      </p>
                      {l.lookId && (
                        <p className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-copper/10 px-2.5 py-1 text-[0.68rem] font-medium text-copper-deep">
                          <Sparkles className="size-3" aria-hidden />
                          {l.lookTitle ? `ضمن إطلالة ${l.lookTitle}` : "ضمن إطلالة"}
                          {l.lookDiscountPercent ? ` · -${l.lookDiscountPercent}%` : ""}
                        </p>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <QuantityStepper size="sm" value={l.quantity} max={Math.max(1, Math.min(20, l.maxQuantity || 20))} onChange={(n) => cart.setQuantity(l.key, n)} />
                        <button
                          type="button"
                          onClick={() => cart.remove(l.key)}
                          className="min-h-11 px-1 text-xs text-taupe underline-offset-4 transition-colors hover:text-danger hover:underline"
                          aria-label={`إزالة ${l.name} من السلة`}
                        >
                          إزالة
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Summary */}
              <div className="shrink-0 border-t border-line bg-paper px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 md:px-7">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-umber">المجموع الفرعي</span>
                  <span className="display text-xl tabular-nums text-espresso">{money(cart.subtotal)}</span>
                </div>
                <p className="mt-1.5 text-xs leading-6 text-taupe">
                  {hasLook ? "خصم الإطلالات الكاملة والشحن يُحتسبان في الخطوة التالية." : "الشحن والخصومات تُحتسب في الخطوة التالية."} الدفع عند الاستلام متاح.
                </p>
                <div className="mt-4 grid gap-2.5">
                  <ButtonLink href="/checkout" size="lg" className="w-full">
                    إتمام الطلب
                    <ArrowLeft className="size-4" aria-hidden />
                  </ButtonLink>
                  <ButtonLink href="/cart" variant="outline" size="md" className="w-full">
                    عرض السلة
                  </ButtonLink>
                </div>
                {config.whatsapp && (
                  <a
                    href={whatsappLink(config.whatsapp, waText)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex min-h-11 items-center justify-center gap-2 text-[0.82rem] text-umber transition-colors hover:text-espresso"
                  >
                    <WhatsAppIcon size={16} className="text-success" />
                    <span className="link-luxe">تفضّل الطلب عبر واتساب؟</span>
                  </a>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </Portal>
  );
}
