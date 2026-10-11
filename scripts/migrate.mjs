#!/usr/bin/env node
/**
 * MARMOUQ — boot-time database setup (runs before `next start`, and via `npm run db:migrate`).
 *
 *  1. waits for PostgreSQL (Railway's database can boot after the app)
 *  2. applies Drizzle migrations from ./drizzle
 *  3. makes sure an owner account exists for the admin dashboard
 *  4. seeds the catalogue the very first time (unless AUTO_SEED=false)
 *
 * Safe to run on every deploy: every step is idempotent, and an advisory lock
 * keeps two replicas from migrating at the same time.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { connect } from "./lib/db.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCK_KEY = 72620261; // arbitrary, unique to this app
const DEFAULT_OWNER_EMAIL = "owner@marmouq.store";

const log = (msg) => console.log(`[migrate] ${msg}`);

function banner(lines) {
  const width = Math.max(...lines.map((l) => l.length)) + 4;
  const bar = "█".repeat(width + 2);
  console.log(`\n${bar}\n${bar}`);
  for (const l of lines) console.log(`██ ${l.padEnd(width - 2)}██`);
  console.log(`${bar}\n${bar}\n`);
}

function strongPassword() {
  // 18 chars from an unambiguous alphabet + guaranteed symbol/digit/case mix
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(18);
  const core = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `Mq-${core.slice(0, 6)}-${core.slice(6, 12)}-${core.slice(12)}9`;
}

async function ensureOwner(sql) {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = (process.env.ADMIN_NAME ?? "").trim() || "مالك المتجر";

  if (email && password) {
    if (password.length < 8) log("WARNING: ADMIN_PASSWORD is shorter than 8 characters — please choose a stronger one.");
    const [existing] = await sql`select id, role from admins where lower(email) = ${email}`;
    if (!existing) {
      const hash = await bcrypt.hash(password, 12);
      await sql`insert into admins (name, email, password_hash, role, is_active) values (${name}, ${email}, ${hash}, 'owner', true)`;
      log(`owner account created: ${email}`);
    } else if (process.env.ADMIN_RESET_PASSWORD === "true") {
      const hash = await bcrypt.hash(password, 12);
      await sql`update admins set password_hash = ${hash}, role = 'owner', is_active = true where id = ${existing.id}`;
      log(`ADMIN_RESET_PASSWORD=true → password for ${email} reset from ADMIN_PASSWORD (remove the variable afterwards).`);
    } else {
      log(`owner account present: ${email}`);
    }
    return;
  }

  const [owner] = await sql`select email from admins where role = 'owner' and is_active limit 1`;
  if (owner) {
    log(`owner account present: ${owner.email}`);
    return;
  }

  // No credentials configured and nobody can log in yet → create one and shout the password.
  const generated = strongPassword();
  const hash = await bcrypt.hash(generated, 12);
  const [taken] = await sql`select id from admins where lower(email) = ${DEFAULT_OWNER_EMAIL}`;
  if (taken) {
    await sql`update admins set password_hash = ${hash}, role = 'owner', is_active = true where id = ${taken.id}`;
  } else {
    await sql`insert into admins (name, email, password_hash, role, is_active) values (${name}, ${DEFAULT_OWNER_EMAIL}, ${hash}, 'owner', true)`;
  }
  banner([
    "MARMOUQ ADMIN ACCOUNT CREATED  —  حساب مالك لوحة التحكم",
    "",
    `  URL:       /admin/login`,
    `  Email:     ${DEFAULT_OWNER_EMAIL}`,
    `  Password:  ${generated}`,
    "",
    "Save this password now and change it from Settings → Team,",
    "or set ADMIN_EMAIL / ADMIN_PASSWORD variables and redeploy.",
  ]);
}

async function main() {
  const started = Date.now();
  const sql = await connect({ log });
  let locked = false;
  try {
    await sql`select pg_advisory_lock(${LOCK_KEY})`;
    locked = true;

    log("applying migrations…");
    await migrate(drizzle(sql), { migrationsFolder: path.join(ROOT, "drizzle") });
    log("schema up to date.");

    await ensureOwner(sql);

    if (process.env.AUTO_SEED === "false") {
      log("AUTO_SEED=false — skipping seed.");
    } else {
      const [{ count }] = await sql`select count(*)::int as count from products`;
      if (count === 0) {
        const { seed } = await import("./seed.mjs");
        const demo = process.env.SEED_DEMO_ORDERS === "1" || process.env.SEED_DEMO_ORDERS === "true";
        await seed(sql, { force: false, demo, log: (m) => console.log(m) });
      } else {
        log(`catalogue present (${count} products) — seed not needed.`);
      }
    }
    log(`ready in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
  } finally {
    if (locked) await sql`select pg_advisory_unlock(${LOCK_KEY})`.catch(() => {});
    await sql.end({ timeout: 5 }).catch(() => {});
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("[migrate] FAILED:", err);
    process.exit(1);
  },
);
