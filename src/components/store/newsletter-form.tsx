"use client";

import { useActionState, useId } from "react";
import { ArrowLeft, Check, LoaderCircle } from "lucide-react";
import { subscribeToVip, type SubscribeState } from "@/app/(store)/actions";
import { cn } from "@/lib/utils";

const initial: SubscribeState = { status: "idle", message: "" };

/** VIP list sign-up (phone or email) — server action with inline Arabic feedback. */
export function NewsletterForm({ className }: { className?: string }) {
  const [state, action, pending] = useActionState(subscribeToVip, initial);
  const id = useId();
  const success = state.status === "success";

  return (
    <form action={action} className={cn("w-full", className)} noValidate>
      <label htmlFor={`${id}-contact`} className="sr-only">
        رقم الجوال أو البريد الإلكتروني
      </label>
      {/* Honeypot */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div
        className={cn(
          "flex h-14 items-center gap-2 rounded-full border bg-paper ps-5 pe-1.5 transition-colors duration-300 focus-within:border-copper",
          state.status === "error" ? "border-danger/60" : "border-line",
        )}
      >
        <input
          id={`${id}-contact`}
          name="contact"
          type="text"
          inputMode="email"
          autoComplete="email"
          required
          disabled={success}
          placeholder="رقم الجوال أو البريد الإلكتروني"
          aria-invalid={state.status === "error" || undefined}
          aria-describedby={`${id}-msg`}
          className="h-full min-w-0 flex-1 bg-transparent text-[0.95rem] text-espresso outline-none placeholder:text-mist disabled:opacity-60"
          dir="auto"
        />
        <button
          type="submit"
          disabled={pending || success}
          className={cn(
            "inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-medium transition-colors duration-300",
            success ? "bg-success text-paper" : "bg-espresso text-paper hover:bg-copper-deep",
          )}
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : success ? (
            <Check className="size-4" aria-hidden />
          ) : null}
          {success ? "تم" : "انضم"}
          {!pending && !success && <ArrowLeft className="size-4" aria-hidden />}
        </button>
      </div>
      <p id={`${id}-msg`} role={state.status === "error" ? "alert" : "status"} className={cn("mt-3 min-h-5 text-xs leading-6", state.status === "error" ? "text-danger" : state.status === "success" ? "text-success" : "text-taupe")}>
        {state.message || "نرسل لك فقط ما يستحق: مجموعات جديدة، قطع محدودة، وعروض خاصة بالأعضاء."}
      </p>
    </form>
  );
}
