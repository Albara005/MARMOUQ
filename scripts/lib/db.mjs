// Shared PostgreSQL connection helper for Node scripts.
import postgres from "postgres";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Same SSL rule as src/db/index.ts */
function sslOption(url) {
  if (process.env.PGSSL === "true" || /sslmode=require/.test(url)) return "require";
  return false;
}

/** Hides the password when a URL has to be logged. */
export function redact(url) {
  try {
    const u = new URL(url);
    if (u.password) u.password = "****";
    return u.toString();
  } catch {
    return "(invalid DATABASE_URL)";
  }
}

/**
 * Opens a single-connection client and waits for the database to accept queries.
 * Railway's Postgres can still be booting when the app starts, so we retry with backoff.
 * @returns {Promise<import("postgres").Sql>}
 */
export async function connect({ url = process.env.DATABASE_URL, tries = 10, log = console.log } = {}) {
  if (!url) throw new Error("DATABASE_URL is not set. Add it to .env.local (local) or the service variables (Railway).");
  let lastErr;
  for (let attempt = 1; attempt <= tries; attempt++) {
    const sql = postgres(url, {
      max: 1,
      ssl: sslOption(url),
      onnotice: () => {},
      connect_timeout: 15,
      idle_timeout: 0,
    });
    try {
      await sql`select 1`;
      return sql;
    } catch (err) {
      lastErr = err;
      await sql.end({ timeout: 1 }).catch(() => {});
      if (attempt === tries) break;
      const wait = Math.min(1000 * 2 ** (attempt - 1), 15000);
      log(`[db] ${redact(url)} not reachable (${err?.code ?? err?.message ?? err}) — retry ${attempt}/${tries - 1} in ${wait / 1000}s`);
      await sleep(wait);
    }
  }
  throw new Error(`Could not connect to the database after ${tries} attempts: ${lastErr?.message ?? lastErr}`);
}
