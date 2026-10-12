/** Builds CSS custom-property overrides for the storefront palette from up to three brand colours. */

const HEX = /^#[0-9a-fA-F]{6}$/;

function mix(hex: string, target: number, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(c + (target - c) * amount));
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
const darken = (hex: string, a: number) => mix(hex, 0, a);
const lighten = (hex: string, a: number) => mix(hex, 255, a);

export function themeCss(theme: { accent: string; dark: string; background: string }): string {
  const vars: string[] = [];
  if (HEX.test(theme.accent)) {
    vars.push(`--color-copper:${theme.accent}`, `--color-copper-deep:${darken(theme.accent, 0.25)}`, `--color-copper-soft:${lighten(theme.accent, 0.35)}`);
  }
  if (HEX.test(theme.dark)) {
    vars.push(`--color-espresso:${theme.dark}`, `--color-cocoa:${lighten(theme.dark, 0.1)}`, `--color-umber:${lighten(theme.dark, 0.2)}`);
  }
  if (HEX.test(theme.background)) {
    vars.push(`--color-ivory:${theme.background}`, `--color-paper:${lighten(theme.background, 0.4)}`, `--color-bone:${darken(theme.background, 0.035)}`, `--color-line:${darken(theme.background, 0.07)}`);
  }
  return vars.length ? `:root{${vars.join(";")}}` : "";
}
