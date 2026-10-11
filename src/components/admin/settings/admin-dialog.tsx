"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Modal dialog for admin forms, built on the native <dialog> (focus containment, Esc, inert background).
 * Adds a body scroll lock, returns focus to the opener and slides up as a sheet on phones.
 */
export function AdminDialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      opener.current = document.activeElement as HTMLElement | null;
      el.showModal();
      const prev = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.documentElement.style.overflow = prev;
      };
    }
    if (!open && el.open) {
      el.close();
      opener.current?.focus?.();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      aria-modal="true"
      onCancel={(e) => {
        e.preventDefault();
        onCloseRef.current();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current();
      }}
      className={cn(
        "m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-3xl bg-paper p-0 text-espresso shadow-[0_30px_80px_-30px_rgba(28,19,15,0.55)] backdrop:bg-espresso/45 backdrop:backdrop-blur-[2px]",
        "sm:m-auto sm:rounded-2xl",
        size === "sm" ? "sm:max-w-md" : size === "lg" ? "sm:max-w-3xl" : "sm:max-w-xl",
        "open:animate-[dialog-in_0.35s_var(--ease-out-expo)_both] motion-reduce:open:animate-none",
        className,
      )}
    >
      <style>{`@keyframes dialog-in{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}`}</style>
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 pb-4 pt-5 sm:px-6">
            <div className="min-w-0">
              <h2 id={titleId} className="display text-lg text-espresso">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-1 text-[0.8rem] leading-relaxed text-taupe">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onCloseRef.current()}
              className="-me-2 -mt-1 grid size-10 shrink-0 place-items-center rounded-full text-taupe transition-colors hover:bg-bone hover:text-espresso"
              aria-label="إغلاق"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        </div>
      )}
    </dialog>
  );
}
