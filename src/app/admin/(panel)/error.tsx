"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";

export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-8 text-center shadow-[0_1px_2px_rgba(28,19,15,0.04)]">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-danger/10 text-danger ring-1 ring-danger/15 ring-offset-4 ring-offset-paper">
          <TriangleAlert className="size-6" aria-hidden />
        </span>
        <h1 className="display mt-5 text-xl text-espresso">تعذّر تحميل هذه الصفحة</h1>
        <p className="mt-2 text-sm leading-relaxed text-taupe">حدث خلل مؤقت أثناء جلب البيانات. بياناتك بأمان — أعد المحاولة، وإن تكرر الأمر تواصل مع الدعم الفني.</p>
        {error.digest && (
          <p className="mt-3 text-xs text-mist">
            رمز الخطأ: <span dir="ltr" className="font-mono">{error.digest}</span>
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={() => retry()} size="sm">
            <RotateCcw className="size-4" aria-hidden />
            إعادة المحاولة
          </Button>
          <Link href="/admin" className={buttonClasses("ghost", "sm")}>
            العودة إلى لوحة القيادة
          </Link>
        </div>
      </div>
    </div>
  );
}
