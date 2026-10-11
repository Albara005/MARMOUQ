"use server";

import { redirect } from "next/navigation";
import { destroySession, requireAdmin } from "@/lib/auth";

/** Ends the admin session and returns to the login screen. */
export async function logoutAction(): Promise<void> {
  await requireAdmin();
  await destroySession();
  redirect("/admin/login?out=1");
}
