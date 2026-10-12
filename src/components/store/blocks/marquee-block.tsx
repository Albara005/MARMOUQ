import { Marquee } from "@/components/store/marquee";
import type { MarqueeBlock } from "@/lib/blocks";
import { txt } from "./tones";

/** Same palette mapping as the home band (settings.bars.marquee). */
const MARQUEE_TONE = { ivory: "light", espresso: "dark", copper: "copper", burgundy: "burgundy", navy: "navy" } as const;

/** Moving band of short phrases (reuses the store marquee). */
export function MarqueeSection({ block }: { block: MarqueeBlock }) {
  const items = (Array.isArray(block.items) ? block.items : []).map(txt).filter(Boolean);
  if (items.length === 0) return null;
  const speed = Math.min(120, Math.max(10, Number(block.speed) || 38));
  return <Marquee items={items} tone={MARQUEE_TONE[block.tone] ?? "dark"} speed={speed} />;
}
