/**
 * The contract between admin server actions and admin forms.
 *
 * Server action (in a "use server" file):
 *
 *   export async function saveThing(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
 *     await requireAdmin("manager");
 *     const parsed = schema.safeParse(Object.fromEntries(formData));
 *     if (!parsed.success) return actionError("راجع الحقول المظلّلة", zodFieldErrors(parsed.error));
 *     …
 *     revalidatePath("/admin/things");
 *     return actionOk("تم حفظ التغييرات");
 *   }
 *
 * Client form:
 *
 *   <ActionForm action={saveThing}>
 *     <Input name="title" /> <ActionFieldError name="title" />
 *     <SubmitButton>حفظ</SubmitButton>
 *   </ActionForm>
 *
 * …or wire it manually: `const [state, formAction, pending] = useActionState(saveThing, initialActionState); useActionToast(state);`
 *
 * This module has no directive on purpose: it is importable from server actions AND client components.
 */

export type ActionResult = {
  ok: boolean;
  /** Human message shown as an error toast / inline banner when ok=false */
  error?: string;
  /** Human message shown as a success toast when ok=true */
  message?: string;
  /** Per-field inline errors keyed by input name */
  fieldErrors?: Record<string, string>;
  /** Optional payload (e.g. the id of a created record) */
  data?: Record<string, unknown>;
} | null;

export const initialActionState: ActionResult = null;

export function actionOk(message?: string, data?: Record<string, unknown>): NonNullable<ActionResult> {
  return { ok: true, message, data };
}

export function actionError(error: string, fieldErrors?: Record<string, string>): NonNullable<ActionResult> {
  return { ok: false, error, fieldErrors };
}

/** Flattens a zod error into `{ fieldName: firstMessage }` (nested paths are joined with "."). */
export function zodFieldErrors(error: { issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }> }): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
