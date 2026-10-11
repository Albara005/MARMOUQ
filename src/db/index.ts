import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __marmouqDb?: DB; __marmouqSql?: postgres.Sql };

function sslOption(url: string): "require" | false {
  if (process.env.PGSSL === "true" || /sslmode=require/.test(url)) return "require";
  return false;
}

/** Lazily creates a single pooled connection (safe during `next build`, where no DB exists). */
export function getDb(): DB {
  if (globalForDb.__marmouqDb) return globalForDb.__marmouqDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = postgres(url, { max: Number(process.env.DB_POOL_MAX ?? 10), idle_timeout: 30, ssl: sslOption(url) });
  const db = drizzle(sql, { schema });
  globalForDb.__marmouqSql = sql;
  globalForDb.__marmouqDb = db;
  return db;
}

/** Proxy so modules can `import { db }` without opening a connection at import time. */
export const db: DB = new Proxy({} as DB, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real as object, prop);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export * as tables from "./schema";
