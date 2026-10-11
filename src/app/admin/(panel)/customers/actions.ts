"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { actionError, actionOk, zodFieldErrors, type ActionResult } from "@/components/admin/action-result";

const notesSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  notes: z.string().trim().max(2000, "الملاحظات أطول من 2000 حرف"),
});

export async function saveCustomerNotesAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = notesSchema.safeParse({ customerId: formData.get("customerId"), notes: formData.get("notes") ?? "" });
  if (!parsed.success) return actionError("لم تُحفظ الملاحظات", zodFieldErrors(parsed.error));
  const [row] = await db.update(customers).set({ notes: parsed.data.notes }).where(eq(customers.id, parsed.data.customerId)).returning({ id: customers.id });
  if (!row) return actionError("العميل غير موجود");
  revalidatePath(`/admin/customers/${row.id}`);
  return actionOk("حُفظت ملاحظات العميل");
}
