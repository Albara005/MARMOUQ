"use server";

import { revalidatePath } from "next/cache";
import { randomInt } from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { actionError, actionOk, zodFieldErrors, type ActionResult } from "@/components/admin/action-result";

type Role = "owner" | "manager" | "staff";
const roleSchema = z.enum(["owner", "manager", "staff"], { message: "اختر الدور" });
const idSchema = z.coerce.number().int().positive();

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
function tempPassword(): string {
  const chunk = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `Mrq-${chunk()}-${chunk()}`;
}

async function otherActiveOwners(excludeId: number): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(admins)
    .where(and(eq(admins.role, "owner"), eq(admins.isActive, true), ne(admins.id, excludeId)));
  return n;
}

const createSchema = z.object({
  name: z.string().trim().min(2, "الاسم مطلوب").max(60, "الاسم طويل"),
  email: z.string().trim().toLowerCase().pipe(z.email("بريد إلكتروني غير صحيح")),
  role: roleSchema,
  password: z.string().min(8, "8 أحرف على الأقل").max(72, "كلمة المرور طويلة"),
});

export async function createAdminAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin("owner");
  const parsed = createSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    role: formData.get("role"),
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) return actionError("راجع بيانات العضو", zodFieldErrors(parsed.error));
  const v = parsed.data;
  const exists = await db.query.admins.findFirst({ where: eq(admins.email, v.email), columns: { id: true } });
  if (exists) return actionError("البريد مستخدم", { email: "يوجد عضو بهذا البريد" });
  await db.insert(admins).values({ name: v.name, email: v.email, role: v.role, passwordHash: await hashPassword(v.password), isActive: true });
  revalidatePath("/admin/team");
  return actionOk(`أُضيف ${v.name} إلى الفريق`, { email: v.email, password: v.password, name: v.name });
}

export async function changeRoleAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin("owner");
  const id = idSchema.safeParse(formData.get("id"));
  const role = roleSchema.safeParse(formData.get("role"));
  if (!id.success || !role.success) return actionError("طلب غير صالح");
  if (id.data === me.id) return actionError("لا يمكنك تغيير دورك بنفسك — اطلب ذلك من مالك آخر");
  const target = await db.query.admins.findFirst({ where: eq(admins.id, id.data), columns: { id: true, role: true, isActive: true, name: true } });
  if (!target) return actionError("العضو غير موجود");
  if (target.role === "owner" && role.data !== "owner" && target.isActive && (await otherActiveOwners(target.id)) === 0) {
    return actionError("لا يمكن تخفيض آخر مالك نشط للمتجر");
  }
  await db.update(admins).set({ role: role.data as Role }).where(eq(admins.id, target.id));
  revalidatePath("/admin/team");
  return actionOk(`تم تحديث دور ${target.name}`);
}

export async function setAdminActiveAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin("owner");
  const id = idSchema.safeParse(formData.get("id"));
  const active = formData.get("active") === "1";
  if (!id.success) return actionError("طلب غير صالح");
  if (id.data === me.id && !active) return actionError("لا يمكنك إيقاف حسابك بنفسك");
  const target = await db.query.admins.findFirst({ where: eq(admins.id, id.data), columns: { id: true, role: true, name: true } });
  if (!target) return actionError("العضو غير موجود");
  if (!active && target.role === "owner" && (await otherActiveOwners(target.id)) === 0) {
    return actionError("لا يمكن إيقاف آخر مالك نشط للمتجر");
  }
  await db.update(admins).set({ isActive: active }).where(eq(admins.id, target.id));
  revalidatePath("/admin/team");
  return actionOk(active ? `أُعيد تفعيل ${target.name}` : `أُوقف حساب ${target.name} — لن يتمكن من الدخول`);
}

export async function resetAdminPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin("owner");
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return actionError("طلب غير صالح");
  if (id.data === me.id) return actionError("غيّر كلمة مرورك من صفحة «حسابي»");
  const target = await db.query.admins.findFirst({ where: eq(admins.id, id.data), columns: { id: true, name: true, email: true } });
  if (!target) return actionError("العضو غير موجود");
  const password = tempPassword();
  await db.update(admins).set({ passwordHash: await hashPassword(password) }).where(eq(admins.id, target.id));
  revalidatePath("/admin/team");
  return actionOk(`أُنشئت كلمة مرور مؤقتة لـ ${target.name}`, { email: target.email, password, name: target.name });
}
