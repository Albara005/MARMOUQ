"use client";

import {
  createContext,
  startTransition,
  useActionState,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
} from "react";
import { createPortal, useFormStatus } from "react-dom";
import Link from "next/link";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { initialActionState, type ActionResult } from "./action-result";

/* ═══════════════════════════ Toasts ═══════════════════════════ */

export type ToastType = "success" | "error" | "info" | "warning";
export type ToastOptions = { href?: string; actionLabel?: string; duration?: number; description?: string };
type ToastItem = { id: number; message: string; type: ToastType } & ToastOptions;

let toastQueue: ToastItem[] = [];
let toastSeq = 0;
const toastListeners = new Set<() => void>();
const EMPTY: ToastItem[] = [];

function emitToasts() {
  for (const l of toastListeners) l();
}

/** Show a toast from any client component: `toast("تم الحفظ")`, `toast("تعذّر الحفظ", "error")`. */
export function toast(message: string, type: ToastType = "success", options: ToastOptions = {}): number {
  const id = ++toastSeq;
  toastQueue = [...toastQueue.slice(-3), { id, message, type, ...options }];
  emitToasts();
  return id;
}

export function dismissToast(id: number) {
  toastQueue = toastQueue.filter((t) => t.id !== id);
  emitToasts();
}

const TOAST_META: Record<ToastType, { icon: typeof CircleCheck; tone: string; bar: string }> = {
  success: { icon: CircleCheck, tone: "text-success", bar: "bg-success" },
  error: { icon: CircleAlert, tone: "text-danger", bar: "bg-danger" },
  warning: { icon: TriangleAlert, tone: "text-warning", bar: "bg-warning" },
  info: { icon: Info, tone: "text-copper", bar: "bg-copper" },
};

function ToastCard({ item }: { item: ToastItem }) {
  const [paused, setPaused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const meta = TOAST_META[item.type];
  const Icon = meta.icon;
  const duration = item.duration ?? (item.type === "error" ? 7000 : 4500);

  useEffect(() => {
    if (paused) return;
    const t = window.setTimeout(() => setLeaving(true), duration);
    return () => window.clearTimeout(t);
  }, [paused, duration]);

  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(() => dismissToast(item.id), 220);
    return () => window.clearTimeout(t);
  }, [leaving, item.id]);

  return (
    <div
      role={item.type === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl bg-paper py-3.5 ps-4 pe-3 shadow-[0_18px_40px_-18px_rgba(28,19,15,0.45)] ring-1 ring-line transition-all duration-200",
        leaving ? "translate-y-2 opacity-0" : "animate-[toast-in_0.35s_var(--ease-out-expo)_both]",
      )}
    >
      <span className={cn("absolute inset-y-0 start-0 w-[3px]", meta.bar)} aria-hidden />
      <Icon className={cn("mt-0.5 size-[1.15rem] shrink-0", meta.tone)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-6 text-espresso">{item.message}</p>
        {item.description && <p className="mt-0.5 text-xs leading-5 text-taupe">{item.description}</p>}
        {item.href && (
          <Link href={item.href} onClick={() => setLeaving(true)} className="mt-1 inline-block text-xs font-semibold text-copper-deep underline-offset-4 hover:underline">
            {item.actionLabel ?? "عرض"}
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={() => setLeaving(true)}
        className="-me-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-full text-taupe transition-colors hover:bg-bone hover:text-espresso"
        aria-label="إغلاق التنبيه"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** Mount once (the admin layout already does). */
export function Toaster() {
  const items = useSyncExternalStore(
    (cb) => {
      toastListeners.add(cb);
      return () => toastListeners.delete(cb);
    },
    () => toastQueue,
    () => EMPTY,
  );
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-3 z-[80] flex flex-col gap-2 sm:inset-x-auto sm:bottom-6 sm:end-6 sm:w-[380px]"
    >
      <style>{`@keyframes toast-in{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}`}</style>
      {items.map((t) => (
        <ToastCard key={t.id} item={t} />
      ))}
    </div>
  );
}

/** Fire a toast once on mount — handy after a redirect (`?saved=1`). */
export function ToastOnMount({ message, type = "success", options }: { message: string; type?: ToastType; options?: ToastOptions }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    toast(message, type, options);
  }, [message, type, options]);
  return null;
}

/* ═══════════════════════════ Server-action forms ═══════════════════════════ */

type ActionFn = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
type ActionCtx = { state: ActionResult; pending: boolean };
const ActionStateContext = createContext<ActionCtx | null>(null);

/** Shows success/error toasts whenever a useActionState result changes. */
export function useActionToast(state: ActionResult, { success = true, error = true }: { success?: boolean; error?: boolean } = {}) {
  useEffect(() => {
    if (!state) return;
    if (state.ok && state.message && success) toast(state.message, "success");
    if (!state.ok && state.error && error) toast(state.error, "error");
  }, [state, success, error]);
}

/** Access the surrounding <ActionForm> state (result + pending). */
export function useActionFormState(): ActionCtx {
  return useContext(ActionStateContext) ?? { state: null, pending: false };
}

/**
 * <form> bound to a server action with useActionState.
 * - toasts the result, exposes it to <ActionFieldError/>, <ActionFormError/> and <SubmitButton/>
 * - keeps what the user typed when validation fails (React would otherwise reset the form)
 * - progressive enhancement: works before hydration via the native action attribute
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  onResult,
  toastSuccess = true,
  toastError = true,
  ...rest
}: Omit<ComponentProps<"form">, "action" | "onSubmit"> & {
  action: ActionFn;
  children: ReactNode;
  resetOnSuccess?: boolean;
  onResult?: (result: NonNullable<ActionResult>) => void;
  toastSuccess?: boolean;
  toastError?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  });
  useActionToast(state, { success: toastSuccess, error: toastError });

  useEffect(() => {
    if (!state) return;
    if (state.ok && resetOnSuccess) formRef.current?.reset();
    onResultRef.current?.(state);
  }, [state, resetOnSuccess]);

  return (
    <ActionStateContext.Provider value={{ state, pending }}>
      <form
        ref={formRef}
        action={formAction}
        onSubmit={(e) => {
          e.preventDefault();
          const submitter = (e.nativeEvent as SubmitEvent).submitter;
          const validSubmitter = submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement ? submitter : null;
          const fd = new FormData(e.currentTarget, validSubmitter);
          startTransition(() => formAction(fd));
        }}
        className={className}
        {...rest}
      >
        {children}
      </form>
    </ActionStateContext.Provider>
  );
}

/** Inline error for one field of the surrounding <ActionForm>. */
export function ActionFieldError({ name, className }: { name: string; className?: string }) {
  const { state } = useActionFormState();
  const msg = state && !state.ok ? state.fieldErrors?.[name] : undefined;
  return <FieldError className={className}>{msg}</FieldError>;
}

/** Inline banner with the form-level error of the surrounding <ActionForm>. */
export function ActionFormError({ className }: { className?: string }) {
  const { state } = useActionFormState();
  if (!state || state.ok || !state.error) return null;
  return (
    <div role="alert" className={cn("flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger/[0.06] px-4 py-3 text-sm text-danger", className)}>
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{state.error}</span>
    </div>
  );
}

type BtnProps = ComponentProps<typeof Button>;

/** Submit button with a pending state (works in plain forms and in <ActionForm>). */
export function SubmitButton({ children, pendingLabel, disabled, ...props }: BtnProps & { pendingLabel?: ReactNode }) {
  const { pending: formPending } = useFormStatus();
  const { pending: ctxPending } = useActionFormState();
  const pending = formPending || ctxPending;
  return (
    <Button type="submit" loading={pending} disabled={disabled} {...props}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}

/** Submit button that asks for confirmation first (destructive actions). */
export function ConfirmSubmit({ message, children, onClick, pendingLabel, ...props }: BtnProps & { message: string; pendingLabel?: ReactNode }) {
  const { pending: formPending } = useFormStatus();
  const { pending: ctxPending } = useActionFormState();
  const pending = formPending || ctxPending;
  return (
    <Button
      type="submit"
      variant="danger"
      loading={pending}
      onClick={(e) => {
        if (!window.confirm(message)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...props}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}

/* ═══════════════════════════ Topbar context slot ═══════════════════════════ */

export const TOPBAR_SLOT_ID = "admin-topbar-slot";

/**
 * Renders its children inside the admin topbar (next to the section title),
 * e.g. `<TopbarContext><StatusBadge status="pending" /></TopbarContext>`.
 */
export function TopbarContext({ children }: { children: ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setEl(document.getElementById(TOPBAR_SLOT_ID));
  }, []);
  return el ? createPortal(children, el) : null;
}
