#!/usr/bin/env node
/**
 * Regenerates the static brand images that Next.js serves from src/app:
 *   src/app/apple-icon.png          180×180 home-screen icon (from the monogram in src/app/icon.svg)
 *   src/app/opengraph-image.jpg     1200×630 social preview (from seed/images/hero-atelier.jpg)
 *   src/app/opengraph-image.alt.txt alt text for the preview
 *
 * Run after replacing the hero photo:  npm run brand:assets
 * Text is Latin only (SVG text is rendered by librsvg, which has no Arabic shaping fonts here).
 * "Cormorant Garamond" is used when installed, otherwise a classic serif fallback.
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(ROOT, "src", "app");
const SERIF = "'Cormorant Garamond', 'Liberation Serif', 'DejaVu Serif', serif";

const C = {
  espresso: "#1c130f",
  cocoa: "#35261f",
  ivory: "#f7f3ee",
  copper: "#a9643a",
  copperSoft: "#d9a57e",
  gold: "#c6a36b",
};

/** The monogram glyph paths from src/app/icon.svg (64×64 grid). */
async function monogramPaths() {
  const svg = await readFile(path.join(APP, "icon.svg"), "utf8");
  const group = svg.match(/<g fill="url\(#cu\)">([\s\S]*?)<\/g>/);
  if (!group) throw new Error("Could not find the monogram group in src/app/icon.svg");
  return group[1];
}

const copperGradient = `
  <linearGradient id="cu" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e0ad84"/>
    <stop offset="0.55" stop-color="#b8703f"/>
    <stop offset="1" stop-color="#8a4a26"/>
  </linearGradient>`;

async function appleIcon(paths) {
  // Full-bleed square: iOS applies its own rounded mask.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="180" height="180">
    <defs>${copperGradient}
      <radialGradient id="glow" cx="0.5" cy="0.38" r="0.7">
        <stop offset="0" stop-color="${C.cocoa}"/>
        <stop offset="1" stop-color="${C.espresso}"/>
      </radialGradient>
    </defs>
    <rect width="64" height="64" fill="url(#glow)"/>
    <rect x="6" y="6" width="52" height="52" rx="3" fill="none" stroke="${C.gold}" stroke-opacity="0.4" stroke-width="0.6"/>
    <g fill="url(#cu)" transform="translate(32 32) scale(0.92) translate(-32 -32)">${paths}</g>
  </svg>`;
  const out = path.join(APP, "apple-icon.png");
  await sharp(Buffer.from(svg), { density: 600 }).resize(180, 180).png({ compressionLevel: 9 }).toFile(out);
  return out;
}

async function openGraph(paths) {
  const W = 1200;
  const H = 630;
  const heroPath = ["jpg", "jpeg", "png", "webp"].map((e) => path.join(ROOT, "seed", "images", `hero-atelier.${e}`)).find(existsSync);

  // Photo occupies the right side; the left side is a deep espresso panel for the wordmark.
  let base = sharp({ create: { width: W, height: H, channels: 3, background: C.espresso } });
  const layers = [];
  if (heroPath) {
    const photoW = 760;
    const photo = await sharp(await readFile(heroPath))
      .rotate()
      .resize(photoW, H, { fit: "cover", position: "attention" })
      .modulate({ brightness: 0.92, saturation: 0.95 })
      .toBuffer();
    layers.push({ input: photo, left: W - photoW, top: 0 });
  } else {
    console.warn("[brand] seed/images/hero-atelier.jpg not found — preview rendered without a photo.");
  }

  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      ${copperGradient}
      <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${C.espresso}" stop-opacity="1"/>
        <stop offset="0.36" stop-color="${C.espresso}" stop-opacity="1"/>
        <stop offset="0.58" stop-color="${C.espresso}" stop-opacity="0.72"/>
        <stop offset="0.8" stop-color="${C.espresso}" stop-opacity="0.18"/>
        <stop offset="1" stop-color="${C.espresso}" stop-opacity="0.05"/>
      </linearGradient>
      <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.55" stop-color="${C.espresso}" stop-opacity="0"/>
        <stop offset="1" stop-color="${C.espresso}" stop-opacity="0.55"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#fade)"/>
    <rect width="${W}" height="${H}" fill="url(#floor)"/>
    <rect x="28" y="28" width="${W - 56}" height="${H - 56}" fill="none" stroke="${C.gold}" stroke-opacity="0.35" stroke-width="1"/>

    <g transform="translate(92 118) scale(1.05)">
      <g fill="url(#cu)" transform="translate(-14 -18)">${paths}</g>
    </g>

    <text x="96" y="236" font-family="${SERIF}" font-size="20" font-weight="500" letter-spacing="7" fill="${C.copperSoft}">MENSWEAR  ·  YEMEN</text>
    <text x="90" y="338" font-family="${SERIF}" font-size="104" font-weight="600" letter-spacing="22" fill="${C.ivory}">MARMOUQ</text>
    <rect x="96" y="376" width="132" height="1.4" fill="${C.gold}" fill-opacity="0.85"/>
    <text x="96" y="432" font-family="${SERIF}" font-size="34" font-style="italic" font-weight="500" fill="${C.ivory}" fill-opacity="0.86">The art of being distinguished</text>
    <text x="96" y="548" font-family="${SERIF}" font-size="19" font-weight="500" letter-spacing="5" fill="${C.ivory}" fill-opacity="0.6">ITALIAN COTTON KNITWEAR  ·  TAILORING  ·  LOAFERS</text>
  </svg>`;
  layers.push({ input: Buffer.from(overlay), left: 0, top: 0 });

  const out = path.join(APP, "opengraph-image.jpg");
  await base.composite(layers).jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: "4:4:4" }).toFile(out);
  await writeFile(
    path.join(APP, "opengraph-image.alt.txt"),
    "مرموق MARMOUQ — ملابس رجالية راقية: تريكو قطني إيطالي بسحّاب نصفي فوق قميص أبيض وربطة بيزلي",
  );
  return out;
}

const paths = await monogramPaths();
const files = [await appleIcon(paths), await openGraph(paths)];
for (const f of files) console.log(`[brand] wrote ${path.relative(ROOT, f)}`);
