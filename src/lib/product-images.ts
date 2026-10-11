import type { ProductImage } from "@/lib/catalog";

/** Images for a colour: colour-tagged ones first, else untagged, else everything. Safe on server and client. */
export function imagesForColor(images: ProductImage[], color?: string | null): ProductImage[] {
  if (!color) return images;
  const tagged = images.filter((i) => i.color === color);
  if (tagged.length) return tagged;
  const untagged = images.filter((i) => !i.color);
  return untagged.length ? untagged : images;
}
