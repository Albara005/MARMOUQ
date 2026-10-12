/** Arabic letters (incl. presentation forms), allowing spaces/tatweel between words of one run. */
const ARABIC_RUN = /([؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿](?:[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿\s]*[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿])?)/;

/**
 * Text for letter-spaced styles (.eyebrow, tracking-*): Arabic runs get letter-spacing reset,
 * because Safari/iOS spaces Arabic glyphs apart and breaks their joins otherwise.
 */
export function ScriptSafe({ text }: { text: string }) {
  if (!ARABIC_RUN.test(text)) return text;
  return text.split(ARABIC_RUN).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="tracking-normal">
        {part}
      </span>
    ) : (
      part
    ),
  );
}
