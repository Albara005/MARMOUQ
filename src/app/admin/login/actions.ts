"use server";

import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { clearAttempts, clientIp, createSession, hashPassword, isThrottled, recordFailedAttempt, verifyPassword } from "@/lib/auth";

export type LoginState = {
  error?: string;
  fieldErrors?: { email?: string; password?: string };
  email?: string;
} | null;

const schema = z.object({
  email: z
    .string({ error: "أدخل بريدك الإلكتروني" })
    .trim()
    .toLowerCase()
    .min(1, "أدخل بريدك الإلكتروني")
    .max(200, "البريد الإلكتروني طويل جداً")
    .pipe(z.email({ error: "صيغة البريد الإلكتروني غير صحيحة" })),
  password: z.string({ error: "أدخل كلمة المرور" }).min(1, "أدخل كلمة المرور").max(200, "كلمة المرور طويلة جداً"),
  next: z.string().max(300).optional(),
});

/** Only same-site admin paths are accepted as a post-login destination. */
function safeNext(next: string | undefined): string {
  if (!next || !next.startsWith("/admin") || next.startsWith("//") || next.startsWith("/admin/login")) return "/admin";
  return next;
}

// Compared against when the email is unknown so response time doesn't reveal which accounts exist.
let dummyHash: Promise<string> | null = null;

const GENERIC = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
    next: (formData.get("next") as string | null) ?? undefined,
  });
  const typedEmail = String(formData.get("email") ?? "").slice(0, 200);

  if (!parsed.success) {
    const fieldErrors: NonNullable<LoginState>["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0];
      if ((k === "email" || k === "password") && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { fieldErrors, email: typedEmail };
  }

  const { email, password, next } = parsed.data;
  const key = `${await clientIp()}|${email}`;

  if (isThrottled(key)) {
    return { error: "محاولات كثيرة خلال وقت قصير. لحماية الحساب، حاول مجدداً بعد 15 دقيقة.", email };
  }

  let adminId: number | null = null;
  let role: "owner" | "manager" | "staff" = "staff";
  try {
    const admin = await db.query.admins.findFirst({ where: eq(sql`lower(${admins.email})`, email) });
    if (!admin) {
      dummyHash ??= hashPassword("marmouq-timing-guard");
      await verifyPassword(password, await dummyHash);
    } else {
      const ok = await verifyPassword(password, admin.passwordHash);
      if (ok && admin.isActive) {
        adminId = admin.id;
        role = admin.role;
      }
    }
  } catch (err) {
    console.error("[admin login]", err);
    return { error: "تعذّر الاتصال بالخادم الآن. حاول مرة أخرى بعد لحظات.", email };
  }

  if (!adminId) {
    recordFailedAttempt(key);
    return { error: GENERIC, email };
  }

  clearAttempts(key);
  await createSession({ id: adminId, role });
  await db.update(admins).set({ lastLoginAt: new Date() }).where(eq(admins.id, adminId));
  redirect(safeNext(next));
}
