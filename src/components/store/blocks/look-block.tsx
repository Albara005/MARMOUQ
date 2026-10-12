import { LookOfSeason } from "@/components/store/home/look-of-season";
import type { LookBlock } from "@/lib/blocks";
import type { LookData } from "@/lib/catalog";
import { txt } from "./tones";

/** One shoppable look with hotspots (reuses the home "look of the season" section). */
export function LookSection({ block, look }: { block: LookBlock; look: LookData | null }) {
  if (!look || look.items.length === 0) return null;
  return <LookOfSeason look={look} eyebrow={txt(block.eyebrow) || undefined} titleId={`look-title-${block.id}`} />;
}
