import "server-only";
import { unstable_rethrow } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

/**
 * Live exchange rates (units of each currency per 1 USD).
 *
 * Fetched from free public feeds, kept in memory for a few hours and saved in the
 * settings table so a cold start or a feed outage still has the last good rates.
 * Requests never wait on the network once a table exists (stale-while-revalidate).
 */
export type FxTable = { rates: Record<string, number>; updatedAt: string; fetchedAt: string; source: string };

const FX_KEY = "fx";
const TTL_MS = 6 * 60 * 60 * 1000;
const TIMEOUT_MS = 5000;

let memory: FxTable | null = null;
let inflight: Promise<FxTable | null> | null = null;

async function fetchJson(url: string, fresh: boolean): Promise<unknown> {
  // normally cached by Next for a few hours (also keeps static pages static); the dashboard button fetches fresh
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    ...(fresh ? { cache: "no-store" as const } : { next: { revalidate: TTL_MS / 1000 } }),
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

function clean(rates: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(rates)) {
    const n = Number(v);
    if (/^[A-Za-z]{3}$/.test(k) && Number.isFinite(n) && n > 0) out[k.toUpperCase()] = n;
  }
  return out;
}

async function fetchRemote(fresh = false): Promise<FxTable | null> {
  const now = new Date().toISOString();
  try {
    const d = (await fetchJson("https://open.er-api.com/v6/latest/USD", fresh)) as { result?: string; rates?: Record<string, unknown>; time_last_update_unix?: number };
    if (d.result === "success" && d.rates) {
      const rates = clean(d.rates);
      if (rates.EUR && rates.SAR) return { rates, updatedAt: d.time_last_update_unix ? new Date(d.time_last_update_unix * 1000).toISOString() : now, fetchedAt: now, source: "open.er-api.com" };
    }
  } catch (err) {
    unstable_rethrow(err);
    console.warn("[fx] primary feed failed:", (err as Error).message);
  }
  try {
    const d = (await fetchJson("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json", fresh)) as { date?: string; usd?: Record<string, unknown> };
    if (d.usd) {
      const rates = clean(d.usd);
      rates.USD = 1;
      if (rates.EUR && rates.SAR) return { rates, updatedAt: d.date ? new Date(d.date).toISOString() : now, fetchedAt: now, source: "currency-api" };
    }
  } catch (err) {
    unstable_rethrow(err);
    console.warn("[fx] fallback feed failed:", (err as Error).message);
  }
  return null;
}

async function readStored(): Promise<FxTable | null> {
  try {
    const row = await db.query.settings.findFirst({ where: eq(settings.key, FX_KEY) });
    const v = row?.value as FxTable | undefined;
    return v && v.rates && typeof v.rates === "object" ? v : null;
  } catch {
    return null;
  }
}

let lastFailureAt = 0;
const RETRY_AFTER_MS = 5 * 60 * 1000;

async function refresh(fresh = false): Promise<FxTable | null> {
  if (!fresh && Date.now() - lastFailureAt < RETRY_AFTER_MS) return memory;
  inflight ??= (async () => {
    try {
      const table = await fetchRemote(fresh);
      if (!table) lastFailureAt = Date.now();
      if (table) {
        memory = table;
        await db
          .insert(settings)
          .values({ key: FX_KEY, value: table, updatedAt: new Date() })
          .onConflictDoUpdate({ target: settings.key, set: { value: table, updatedAt: new Date() } })
          .catch((err) => console.error("[fx] could not store rates:", err));
      }
      return table ?? memory;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

const isStale = (t: FxTable) => Date.now() - Date.parse(t.fetchedAt) > TTL_MS;

/** Current rates (never throws; null only when no rate was ever obtained). */
export async function getFxTable(): Promise<FxTable | null> {
  if (!memory) memory = await readStored();
  // never make a customer wait on the network: fetch in the background, use what we have
  if (!memory || isStale(memory)) void refresh().catch(() => null);
  return memory;
}

/** Forces a fresh fetch (dashboard «تحديث الأسعار الآن»). */
export async function refreshFxNow(): Promise<FxTable | null> {
  return refresh(true);
}
