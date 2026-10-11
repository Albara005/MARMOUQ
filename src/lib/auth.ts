import "server-only";
import { cache } from "react";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { admins } from "@/db/schema";

export const SESSION_COOKIE = "mrq_admin";
const SESSION_DAYS = 7;

export type AdminRole = "owner" | "manager" | "staff";
export type AdminSession = { id: number; name: string; email: string; role: AdminRole };

function secretKey(): Uint8Array {
  const explicit = process.env.AUTH_SECRET;
  if (explicit && explicit.length >= 16) return new TextEncoder().encode(explicit);
  // Zero-config fallback: derive a stable secret from the (already secret) database URL.
  const seed = process.env.DATABASE_URL ?? "marmouq-dev";
  return new TextEncoder().encode(createHash("sha256").update(`marmouq-session:${seed}`).digest("hex"));
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(admin: { id: number; role: AdminRole }): Promise<void> {
  const token = await new SignJWT({ role: admin.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(admin.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Verifies the cookie AND that the admin still exists and is active. Deduplicated per request. */
export const getSession = cache(async (): Promise<AdminSession | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    if (!Number.isFinite(id)) return null;
    const admin = await db.query.admins.findFirst({ where: eq(admins.id, id) });
    if (!admin || !admin.isActive) return null;
    return { id: admin.id, name: admin.name, email: admin.email, role: admin.role };
  } catch {
    return null;
  }
});

const ROLE_RANK: Record<AdminRole, number> = { staff: 1, manager: 2, owner: 3 };

/**
 * Use at the top of EVERY admin page, layout and server action.
 * Redirects to the login page when there is no valid session,
 * and to the dashboard when the role is insufficient.
 */
export async function requireAdmin(minRole: AdminRole = "staff"): Promise<AdminSession> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (ROLE_RANK[session.role] < ROLE_RANK[minRole]) redirect("/admin?denied=1");
  return session;
}

export function hasRole(session: AdminSession, minRole: AdminRole): boolean {
  return ROLE_RANK[session.role] >= ROLE_RANK[minRole];
}

/* ── naive in-memory login throttle (per IP + email) ── */
const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export function isThrottled(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.first > WINDOW_MS) return false;
  return entry.count >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.first > WINDOW_MS) attempts.set(key, { count: 1, first: now });
  else entry.count += 1;
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}
