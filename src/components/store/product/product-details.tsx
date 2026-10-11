import Link from "next/link";
import { Plus } from "lucide-react";
import type { ProductDetail } from "@/lib/catalog";

function Item({ title, children, defaultOpen }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group border-b border-line" open={defaultOpen}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[0.95rem] font-medium text-espresso marker:hidden [&::-webkit-details-marker]:hidden">
        {title}
        <Plus className="size-4 shrink-0 text-taupe transition-transform duration-500 ease-[var(--ease-out-expo)] group-open:rotate-45" strokeWidth={1.6} aria-hidden />
      </summary>
      <div className="animate-fade-in pb-6 text-[0.92rem] leading-8 text-umber">{children}</div>
    </details>
  );
}

/** Native <details> accordions — accessible, zero JS, crawlable. */
export function ProductDetails({ product, policies }: { product: ProductDetail; policies: { shipping: string; returns: string } }) {
  const hasSpecs = product.details.length > 0 || product.material || product.origin;
  return (
    <div className="border-t border-line">
      {product.description && (
        <Item title="الوصف" defaultOpen>
          <p className="whitespace-pre-line text-pretty">{product.description}</p>
        </Item>
      )}
      {hasSpecs && (
        <Item title="التفاصيل والخامة">
          {product.details.length > 0 && (
            <ul className="space-y-1.5">
              {product.details.map((d) => (
                <li key={d} className="flex gap-3">
                  <span className="mt-[0.95rem] h-px w-3 shrink-0 bg-copper" aria-hidden />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          )}
          {(product.material || product.origin) && (
            <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-xl bg-bone/60 px-4 py-3 text-sm">
              {product.material && (
                <>
                  <dt className="text-taupe">الخامة</dt>
                  <dd className="text-espresso">{product.material}</dd>
                </>
              )}
              {product.origin && (
                <>
                  <dt className="text-taupe">بلد الصنع</dt>
                  <dd className="text-espresso">{product.origin}</dd>
                </>
              )}
            </dl>
          )}
        </Item>
      )}
      {product.care && (
        <Item title="العناية">
          <p className="whitespace-pre-line">{product.care}</p>
        </Item>
      )}
      <Item title="الشحن والاستبدال">
        <p>{policies.shipping}</p>
        <p className="mt-3">{policies.returns}</p>
        <p className="mt-4 flex flex-wrap gap-x-5 text-sm">
          <Link href="/policies/shipping" className="link-luxe text-espresso">
            سياسة الشحن
          </Link>
          <Link href="/policies/returns" className="link-luxe text-espresso">
            سياسة الاستبدال
          </Link>
        </p>
      </Item>
    </div>
  );
}
