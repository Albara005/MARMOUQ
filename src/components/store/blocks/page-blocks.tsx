import { getSettings } from "@/lib/settings";
import { pageBlocks, type Block, type BlockPosition, type StorePageKey } from "@/lib/blocks";
import { BlocksRenderer } from "./blocks-renderer";

/** Extra sections the merchant placed above ("top") or below ("bottom") a storefront page's own content. */
export async function PageBlocks({ page, position }: { page: StorePageKey; position: BlockPosition }) {
  const settings = await getSettings(); // never throws (falls back to defaults)
  let blocks: Block[] = [];
  try {
    blocks = pageBlocks(settings.layouts, page, position);
  } catch (err) {
    console.error(`[blocks] unreadable layout for "${page}":`, err);
  }
  if (blocks.length === 0) return null;
  return <BlocksRenderer blocks={blocks} />;
}
