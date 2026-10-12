import { ProductCard } from "@/components/store/product-card";
import { SectionHeading } from "@/components/store/section-heading";
import type { ProductCardData } from "@/lib/catalog";

type Entry = { product: ProductCardData; color?: string };

/** One card per photographed colour, interleaved round-robin so the rail never repeats a product back-to-back. */
export function explodeByColour(products: ProductCardData[], max = 8): Entry[] {
  const queues: Entry[][] = products.map((p) => {
    const shot = p.colors.filter((c) => p.images.some((i) => i.color === c.name));
    return shot.length > 1 ? shot.map((c) => ({ product: p, color: c.name })) : [{ product: p, color: shot[0]?.name }];
  });
  const out: Entry[] = [];
  for (let round = 0; out.length < max && queues.some((q) => q.length > round); round++) {
    for (const q of queues) {
      if (q[round]) out.push(q[round]);
      if (out.length >= max) break;
    }
  }
  return out;
}

export function NewArrivals({
  products,
  copy = { eyebrow: "New Arrivals", title: "وصل حديثاً", subtitle: "" },
}: {
  products: ProductCardData[];
  copy?: { eyebrow: string; title: string; subtitle: string };
}) {
  const ordered = [...products].sort((a, b) => Number(b.isNew) - Number(a.isNew));
  const entries = explodeByColour(ordered, 8);
  if (entries.length === 0) return null;

  return (
    <section aria-labelledby="arrivals-title" className="overflow-hidden bg-ivory py-20 md:py-28">
      <div className="container-luxe">
        <div data-reveal>
          <SectionHeading
            id="arrivals-title"
            eyebrow={copy.eyebrow}
            title={copy.title}
            subtitle={copy.subtitle || undefined}
            action={{ label: "عرض الكل", href: "/shop?sort=newest" }}
          />
        </div>

        <ul
          className="no-scrollbar -mx-5 mt-10 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-2 md:-mx-10 md:mt-14 md:scroll-px-10 md:px-10 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-x-6 lg:gap-y-14 lg:overflow-visible lg:px-0"
          aria-label="أحدث القطع"
        >
          {entries.map((e, i) => (
            <li
              key={`${e.product.id}-${e.color ?? "x"}`}
              className="w-[68%] shrink-0 snap-start sm:w-[42%] md:w-[31%] lg:w-auto"
              data-reveal
              style={{ "--reveal-delay": `${(i % 4) * 80}ms` } as React.CSSProperties}
            >
              <ProductCard product={e.product} color={e.color} sizes="(min-width: 1024px) 23vw, (min-width: 640px) 42vw, 68vw" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
