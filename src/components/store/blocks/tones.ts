import type { BlockTone } from "@/lib/blocks";
import type { ButtonVariant } from "@/components/ui/button";

/** Everything a block needs to sit on one of the merchant-selectable surfaces. */
export type ToneStyle = {
  /** section background + default text colour */
  surface: string;
  /** light text on a dark/coloured surface */
  dark: boolean;
  title: string;
  body: string;
  muted: string;
  /** eyebrow colours (latin run / arabic run) and the small rule beside it */
  eyebrowLatin: string;
  eyebrowArabic: string;
  rule: string;
  border: string;
  /** primary call to action on this surface */
  button: ButtonVariant;
};

const LIGHT = {
  dark: false,
  title: "text-espresso",
  body: "text-umber",
  muted: "text-taupe",
  eyebrowLatin: "text-copper",
  eyebrowArabic: "text-copper",
  rule: "bg-gold/70",
  border: "border-line",
  button: "primary",
} as const;

export const TONES: Record<BlockTone, ToneStyle> = {
  paper: { ...LIGHT, surface: "bg-paper text-espresso" },
  ivory: { ...LIGHT, surface: "bg-ivory text-espresso" },
  bone: { ...LIGHT, surface: "bg-bone text-espresso", border: "border-sand" },
  dark: {
    surface: "bg-espresso text-paper",
    dark: true,
    title: "text-paper",
    body: "text-paper/72",
    muted: "text-paper/55",
    eyebrowLatin: "text-copper-soft",
    eyebrowArabic: "text-copper-soft",
    rule: "bg-copper-soft/60",
    border: "border-paper/12",
    button: "light",
  },
  accent: {
    surface: "bg-copper text-paper",
    dark: true,
    title: "text-paper",
    body: "text-paper/85",
    muted: "text-paper/70",
    eyebrowLatin: "text-paper/80",
    eyebrowArabic: "text-paper/90",
    rule: "bg-paper/45",
    border: "border-paper/25",
    button: "light",
  },
};

/** Tone styles, tolerant of unknown values coming from older saved settings. */
export function toneStyle(tone: BlockTone | undefined, fallback: BlockTone = "paper"): ToneStyle {
  return (tone && TONES[tone]) || TONES[fallback];
}

/** Stable DOM id for a block's heading (aria-labelledby). */
export function blockDomId(id: string, part = "title"): string {
  return `blk-${String(id).replace(/[^A-Za-z0-9_-]/g, "") || "x"}-${part}`;
}

/** Trimmed text or "" (blocks may come from older saves with missing fields). */
export function txt(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
