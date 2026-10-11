"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Archive, Copy, ExternalLink, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "@/components/admin/ui-client";
import { deleteProductAction, duplicateProductAction, setProductStatusAction } from "@/app/admin/(panel)/products/actions";
import type { ProductStatus } from "@/components/admin/product-editor/types";
import { cn } from "@/lib/utils";

export function ProductRowActions({ id, slug, status }: { id: number; slug: string; status: ProductStatus }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string; data?: Record<string, unknown> } | null>, after?: (data?: Record<string, unknown>) => void) => {
    setOpen(false);
    start(async () => {
      const res = await fn();
      if (!res) return;
      if (res.ok) {
        toast(res.message ?? "تم", "success");
        after?.(res.data);
        router.refresh();
      } else toast(res.error ?? "تعذّر تنفيذ العملية", "error");
    });
  };

  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm text-umber hover:bg-bone focus-visible:bg-bone";

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="إجراءات المنتج"
        disabled={pending}
        className={cn("grid size-9 place-items-center rounded-full text-taupe transition-colors hover:bg-bone hover:text-espresso", pending && "animate-pulse")}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute end-0 top-10 z-30 w-52 rounded-xl border border-line bg-paper p-1.5 shadow-[0_12px_32px_-12px_rgba(28,19,15,0.25)]">
          <Link role="menuitem" href={`/admin/products/${id}`} className={item}>
            <Pencil className="size-4" aria-hidden /> تعديل
          </Link>
          {status === "active" && (
            <a role="menuitem" href={`/product/${encodeURIComponent(slug)}`} target="_blank" rel="noreferrer" className={item}>
              <ExternalLink className="size-4" aria-hidden /> عرض في المتجر
            </a>
          )}
          <button role="menuitem" type="button" className={item} onClick={() => run(() => duplicateProductAction(id), (d) => d?.id && router.push(`/admin/products/${d.id}`))}>
            <Copy className="size-4" aria-hidden /> نسخ كمسودة
          </button>
          {status === "archived" ? (
            <button role="menuitem" type="button" className={item} onClick={() => run(() => setProductStatusAction(id, "draft"))}>
              <RotateCcw className="size-4" aria-hidden /> استعادة كمسودة
            </button>
          ) : (
            <button role="menuitem" type="button" className={item} onClick={() => run(() => setProductStatusAction(id, "archived"))}>
              <Archive className="size-4" aria-hidden /> أرشفة
            </button>
          )}
          <button
            role="menuitem"
            type="button"
            className={cn(item, "text-danger hover:bg-danger/10")}
            onClick={() => {
              if (window.confirm("حذف هذا المنتج نهائياً؟ إن كان مرتبطاً بطلبات سابقة سيُؤرشف بدلاً من حذفه.")) run(() => deleteProductAction(id));
            }}
          >
            <Trash2 className="size-4" aria-hidden /> حذف
          </button>
        </div>
      )}
    </div>
  );
}
