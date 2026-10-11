/**
 * Server-side helper for forms that use <ImageUploader/> + <MediaIdsInput/>.
 * The hidden input carries a JSON array of media ids in display order.
 *
 *   const imageIds = parseMediaIds(formData.get("images"));   // string[] (validated, de-duplicated)
 *
 * No directive: safe to import from server actions.
 */
const MEDIA_ID = /^[a-f0-9]{8,64}$/;

export function parseMediaIds(raw: FormDataEntryValue | null | undefined, max = 40): string[] {
  if (typeof raw !== "string" || raw.trim() === "") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const seen = new Set<string>();
  for (const v of parsed) {
    if (typeof v === "string" && MEDIA_ID.test(v) && !seen.has(v)) seen.add(v);
    if (seen.size >= max) break;
  }
  return [...seen];
}

export function isMediaId(v: unknown): v is string {
  return typeof v === "string" && MEDIA_ID.test(v);
}
