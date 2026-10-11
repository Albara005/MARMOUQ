// Image pipeline for Node scripts (seed / migrate).
// Mirrors src/lib/media.ts exactly so seeded photos look identical to admin uploads:
// EXIF rotate → Lanczos downscale (1600 / 960 / 480, "inside", never enlarged)
// → gentle sharpen → WebP (q84 / 82 / 80, effort 5) + a 24px blur placeholder.
import sharp from "sharp";
import { randomBytes } from "node:crypto";

export const MEDIA_SIZES = { sm: 480, md: 960, lg: 1600 };

/** @param {Buffer} input */
export async function processImage(input) {
  const base = sharp(input, { failOn: "error" }).rotate();
  const meta = await base.metadata();
  if (!meta.width || !meta.height) throw new Error("Invalid image");

  const render = (width, quality) =>
    base
      .clone()
      .resize({ width, height: width, fit: "inside", withoutEnlargement: true, kernel: "lanczos3" })
      .sharpen({ sigma: 0.6, m1: 0.5, m2: 1.2 })
      .webp({ quality, effort: 5, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });

  const [lg, md, sm, tiny] = await Promise.all([
    render(MEDIA_SIZES.lg, 84),
    render(MEDIA_SIZES.md, 82),
    render(MEDIA_SIZES.sm, 80),
    base.clone().resize({ width: 24, height: 24, fit: "inside" }).webp({ quality: 40 }).toBuffer(),
  ]);

  return {
    width: lg.info.width,
    height: lg.info.height,
    blur: `data:image/webp;base64,${tiny.toString("base64")}`,
    lg: lg.data,
    md: md.data,
    sm: sm.data,
  };
}

/** Same id format as randomToken(12) in src/lib/utils.ts (24 hex chars). */
export function mediaId() {
  return randomBytes(12).toString("hex");
}

/**
 * Processes a photo and stores it in the `media` table.
 * @param {import("postgres").Sql} sql  postgres-js client or transaction
 * @param {Buffer} buffer
 * @param {string} alt
 * @returns {Promise<string>} media id
 */
export async function insertImage(sql, buffer, alt = "") {
  const img = await processImage(buffer);
  const id = mediaId();
  await sql`
    insert into media (id, alt, width, height, blur, lg, md, sm, bytes)
    values (${id}, ${alt}, ${img.width}, ${img.height}, ${img.blur}, ${img.lg}, ${img.md}, ${img.sm},
            ${img.lg.length + img.md.length + img.sm.length})
  `;
  return id;
}
