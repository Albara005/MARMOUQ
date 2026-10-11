"use client";

import { useTransition, type ComponentProps, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/admin/ui-client";
import type { ActionResult } from "@/components/admin/action-result";

/**
 * Calls a server action imperatively (optionally after a confirm) and toasts the result through the global toaster.
 * Use it for actions that remove the very row they live in (delete), where a form-bound toast would unmount too early.
 */
export function ActionButton({
  action,
  fields,
  confirm,
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick" | "type" | "action"> & {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  fields: Record<string, string | number>;
  confirm?: string;
  children: ReactNode;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      {...props}
      loading={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          const fd = new FormData();
          for (const [k, v] of Object.entries(fields)) fd.set(k, String(v));
          try {
            const r = await action(null, fd);
            if (r?.ok) {
              if (r.message) toast(r.message, "success");
              router.refresh();
            } else if (r?.error) toast(r.error, "error");
          } catch {
            toast("تعذّر تنفيذ العملية، حاول مرة أخرى", "error");
          }
        });
      }}
    >
      {children}
    </Button>
  );
}
