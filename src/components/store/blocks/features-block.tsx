import { BadgeCheck, Clock, Gem, Gift, Heart, Leaf, Package, Phone, RefreshCw, Ruler, Scissors, ShieldCheck, Sparkles, Star, Truck, Wallet, type LucideIcon } from "lucide-react";
import type { FeatureIcon, FeaturesBlock } from "@/lib/blocks";
import { cn } from "@/lib/utils";
import { BlockHeading } from "./block-heading";
import { blockDomId, toneStyle, txt } from "./tones";

const ICONS: Record<FeatureIcon, LucideIcon> = {
  truck: Truck,
  shield: ShieldCheck,
  sparkles: Sparkles,
  gem: Gem,
  ruler: Ruler,
  refresh: RefreshCw,
  wallet: Wallet,
  star: Star,
  scissors: Scissors,
  leaf: Leaf,
  gift: Gift,
  clock: Clock,
  phone: Phone,
  heart: Heart,
  badge: BadgeCheck,
  package: Package,
};

/** Desktop columns follow the item count (1–4), wrapping to 4 for longer lists. */
const LG_COLS = ["lg:grid-cols-1", "lg:grid-cols-1", "lg:grid-cols-2", "lg:grid-cols-3", "lg:grid-cols-4"];

/** Icon + title + short text (delivery, payment, guarantees…), separated by hairlines. */
export function FeaturesSection({ block }: { block: FeaturesBlock }) {
  const t = toneStyle(block.tone);
  const items = (Array.isArray(block.items) ? block.items : [])
    .map((it) => ({ icon: ICONS[it?.icon as FeatureIcon] ?? Sparkles, title: txt(it?.title), body: txt(it?.body) }))
    .filter((it) => it.title || it.body);
  if (items.length === 0) return null;

  const title = txt(block.title);
  const titleId = blockDomId(block.id);
  const heading = !!(title || txt(block.eyebrow) || txt(block.subtitle));
  const cols = Math.min(items.length, 4);

  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : "مميزات"}
      className={cn("relative isolate overflow-hidden py-20 md:py-28", t.surface, t.dark && "grain")}
    >
      <div className="container-luxe">
        {heading && (
          <div data-reveal>
            <BlockHeading id={titleId} eyebrow={block.eyebrow} title={title} subtitle={block.subtitle} align="center" tone={t} />
          </div>
        )}
        <ul className={cn("grid gap-x-8 gap-y-10 lg:gap-x-10", cols === 1 ? "mx-auto max-w-md" : cn("sm:grid-cols-2", LG_COLS[cols]), heading && "mt-14 md:mt-20")}>
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <li key={`${i}-${it.title}`} data-reveal style={{ "--reveal-delay": `${(i % 4) * 100}ms` } as React.CSSProperties} className={cn("border-t pt-8", t.border)}>
                <span className={cn("grid size-12 place-items-center rounded-full border", t.border, t.eyebrowLatin)} aria-hidden>
                  <Icon className="size-[1.35rem]" strokeWidth={1.4} />
                </span>
                {it.title && <h3 className={cn("display mt-6 text-xl leading-snug md:text-[1.4rem]", t.title)}>{it.title}</h3>}
                {it.body && <p className={cn("max-w-xs whitespace-pre-line text-[0.92rem] leading-7", it.title ? "mt-2.5" : "mt-6", t.body)}>{it.body}</p>}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
