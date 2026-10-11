import "server-only";
import sharp from "sharp";
import { db } from "@/db";
import { media } from "@/db/schema";
import { randomToken } from "@/lib/utils";

export const MEDIA_SIZES = { sm: 480, md: 960, lg: 1600 } as const;
export type MediaSize = keyof typeof MEDIA_SIZES;
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"];

export type ProcessedImage = {
  width: number;
  height: number;
  blur: string;
  lg: Buffer;
  md: Buffer;
  sm: Buffer;
};

/**
 * "Studio" pipeline applied to every uploaded photo:
 * EXIF-orientation fix, high-quality Lanczos downscale, gentle sharpening
 * and modern WebP encoding at three responsive sizes + a tiny blur placeholder.
 * (Colours are not altered so products stay true to life.)
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const base = sharp(input, { failOn: "error" }).rotate();
  const meta = await base.metadata();
  if (!meta.width || !meta.height) throw new Error("صورة غير صالحة");

  const render = (width: number, quality: number) =>
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

/** Processes and stores an image, returning its media id. */
export async function saveImage(input: Buffer, alt = ""): Promise<{ id: string; width: number; height: number; blur: string }> {
  const img = await processImage(input);
  const id = randomToken(12);
  await db.insert(media).values({
    id,
    alt,
    width: img.width,
    height: img.height,
    blur: img.blur,
    lg: img.lg,
    md: img.md,
    sm: img.sm,
    bytes: img.lg.length + img.md.length + img.sm.length,
  });
  return { id, width: img.width, height: img.height, blur: img.blur };
}

/** Public URL of a stored image at a given size. */
export function mediaUrl(id: string, size: MediaSize = "md"): string {
  return `/media/${id}/${size}`;
}
