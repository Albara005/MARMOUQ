"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowLeft, CircleAlert, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { Input, Label, FieldError } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, null);
  const [show, setShow] = useState(false);
  // after a failed attempt put the cursor where it's needed
  useEffect(() => {
    if (!state) return;
    const target = document.getElementById(state.fieldErrors?.email ? "email" : "password");
    target?.focus();
  }, [state]);

  const emailErr = state?.fieldErrors?.email;
  const pwErr = state?.fieldErrors?.password;

  return (
    <form action={formAction} noValidate className="space-y-5" aria-describedby={state?.error ? "login-error" : undefined}>
      {next && <input type="hidden" name="next" value={next} />}

      {state?.error && (
        <div id="login-error" role="alert" className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger/[0.06] px-4 py-3 text-sm leading-relaxed text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{state.error}</span>
        </div>
      )}

      <div>
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input
          id="email"
          name="email"
          type="email"
          dir="ltr"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state?.email ?? ""}
          key={`email-${state?.email ?? ""}`}
          placeholder="name@marmouq.store"
          aria-invalid={emailErr ? true : undefined}
          aria-describedby={emailErr ? "email-error" : undefined}
          className="text-start placeholder:text-start"
        />
        <FieldError>{emailErr && <span id="email-error">{emailErr}</span>}</FieldError>
      </div>

      <div>
        <Label htmlFor="password">كلمة المرور</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            dir="ltr"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            aria-invalid={pwErr || state?.error ? true : undefined}
            aria-describedby={pwErr ? "password-error" : undefined}
            className="pe-12 text-start"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute end-1.5 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-taupe transition-colors hover:bg-bone hover:text-espresso"
            aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            aria-pressed={show}
            aria-controls="password"
          >
            {show ? <EyeOff className="size-[1.1rem]" aria-hidden /> : <Eye className="size-[1.1rem]" aria-hidden />}
          </button>
        </div>
        <FieldError>{pwErr && <span id="password-error">{pwErr}</span>}</FieldError>
      </div>

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        className={cn(
          "group relative flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-espresso text-[0.98rem] font-medium text-paper transition-colors duration-300 hover:bg-cocoa disabled:cursor-wait disabled:opacity-80",
        )}
      >
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-l from-transparent via-white/[0.07] to-transparent transition-transform duration-1000 group-hover:translate-x-full" aria-hidden />
        {pending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            جارٍ التحقق…
          </>
        ) : (
          <>
            تسجيل الدخول
            <ArrowLeft className="size-4 transition-transform duration-300 group-hover:-translate-x-1" aria-hidden />
          </>
        )}
      </button>
    </form>
  );
}
