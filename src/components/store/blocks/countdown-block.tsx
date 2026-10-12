import type { CountdownBlock } from "@/lib/blocks";
import { txt } from "./tones";
import { CountdownTimer } from "./countdown-timer";

/** Zone-less date-times are read in the visitor's clock (UTC−12 … UTC+14): 14h after the same wall-clock time in UTC they are over everywhere. */
const MAX_ZONE_OFFSET_MS = 14 * 3_600_000;

/**
 * Countdown (server part): drops invalid dates and settles countdowns that are certainly over,
 * so they never flash in and out after hydration. The ticking itself is client-side.
 */
export function CountdownSection({ block }: { block: CountdownBlock }) {
  const endsAt = txt(block.endsAt);
  if (!endsAt || Number.isNaN(new Date(endsAt).getTime())) return null;

  const zoned = /(?:z|[+-]\d{2}:?\d{2})$/i.test(endsAt);
  const asUtc = Date.parse(zoned || !endsAt.includes("T") ? endsAt : `${endsAt}Z`);
  const certainlyEnded = Number.isFinite(asUtc) && Date.now() > asUtc + (zoned ? 0 : MAX_ZONE_OFFSET_MS);
  if (certainlyEnded && !txt(block.endedText)) return null;

  return <CountdownTimer block={block} ended={certainlyEnded} />;
}
