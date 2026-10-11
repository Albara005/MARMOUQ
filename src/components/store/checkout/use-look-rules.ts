"use client";

import { useEffect, useMemo, useState } from "react";
import type { LookRule } from "@/lib/pricing";
import { fetchLookRules } from "@/app/(store)/cart/actions";

const cache = new Map<string, LookRule[]>();

/**
 * Look (bundle) rules for the looks present in the cart, fetched once per set of ids via a server action.
 * Used only for the live estimate — the server re-prices at checkout.
 */
export function useLookRules(lookIds: (number | null | undefined)[]): { rules: LookRule[]; loading: boolean } {
  const key = useMemo(
    () =>
      [...new Set(lookIds.filter((x): x is number => typeof x === "number" && x > 0))]
        .sort((a, b) => a - b)
        .join(","),
    [lookIds],
  );
  const [loaded, setLoaded] = useState<{ key: string; rules: LookRule[] } | null>(null);

  useEffect(() => {
    if (!key || cache.has(key)) return;
    let alive = true;
    fetchLookRules(key.split(",").map(Number))
      .then((rules) => {
        cache.set(key, rules);
        if (alive) setLoaded({ key, rules });
      })
      .catch(() => {
        if (alive) setLoaded({ key, rules: [] });
      });
    return () => {
      alive = false;
    };
  }, [key]);

  if (!key) return { rules: [], loading: false };
  const hit = cache.get(key) ?? (loaded?.key === key ? loaded.rules : undefined);
  return { rules: hit ?? [], loading: hit === undefined };
}
