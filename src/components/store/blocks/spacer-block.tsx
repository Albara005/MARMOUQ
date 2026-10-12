import type { SpacerBlock } from "@/lib/blocks";
import { cn } from "@/lib/utils";

const SIZE: Record<SpacerBlock["size"], string> = {
  sm: "h-8 md:h-12",
  md: "h-14 md:h-20",
  lg: "h-24 md:h-36",
};

/**
 * Vertical breathing room, optionally with a gold hairline.
 * `surface` lets the renderer continue the neighbouring section's background.
 */
export function SpacerSection({ block, surface }: { block: SpacerBlock; surface?: string | null }) {
  return (
    <div className={cn("flex items-center", SIZE[block.size] ?? SIZE.md, surface)} aria-hidden>
      {block.line && (
        <div className="container-luxe">
          <div className="hairline" />
        </div>
      )}
    </div>
  );
}
