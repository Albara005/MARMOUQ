"use server";

import { z } from "zod";
import { getLookRules } from "@/lib/catalog";
import type { LookRule } from "@/lib/pricing";

const lookIdsSchema = z.array(z.number().int().positive()).min(1).max(20);

/**
 * Look (bundle) rules for the client-side estimate on the cart & checkout pages.
 * Display only — the server re-prices every order from the database.
 */
export async function fetchLookRules(lookIds: number[]): Promise<LookRule[]> {
  const parsed = lookIdsSchema.safeParse(lookIds);
  if (!parsed.success) return [];
  try {
    return await getLookRules([...new Set(parsed.data)]);
  } catch (err) {
    console.error("[cart] look rules unavailable", err);
    return [];
  }
}
