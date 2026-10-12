import { countdownEndMs, type CountdownBlock } from "@/lib/blocks";
import { txt } from "./tones";
import { CountdownTimer } from "./countdown-timer";

/**
 * Countdown (server part): drops invalid dates and settles countdowns that are certainly over,
 * so they never flash in and out after hydration. The ticking itself is client-side.
 */
export function CountdownSection({ block }: { block: CountdownBlock }) {
  const end = countdownEndMs(txt(block.endsAt));
  if (Number.isNaN(end)) return null;
  const certainlyEnded = Date.now() > end;
  if (certainlyEnded && !txt(block.endedText)) return null;

  return <CountdownTimer block={block} ended={certainlyEnded} />;
}
