"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";

export default function StoreError({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="container-luxe flex min-h-[64svh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">A small interruption</p>
      <h1 className="display mt-5 max-w-xl text-4xl leading-tight text-espresso text-balance md:text-5xl">صار خلل بسيط، وأناقتك ما تستاهل الانتظار</h1>
      <p className="mt-4 max-w-md text-[0.95rem] leading-8 text-umber">تعذّر تحميل هذه الصفحة الآن. جرّب مرة ثانية، ولو تكرر الأمر تواصل معنا ونخدمك مباشرة.</p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" onClick={() => (retry ?? reset)?.()}>
          <RotateCcw className="size-4" aria-hidden />
          إعادة المحاولة
        </Button>
        <Link href="/" className={buttonClasses("outline", "lg")}>
          العودة للرئيسية
        </Link>
      </div>
      {error.digest && <p className="mt-8 font-mono text-[0.7rem] text-mist" dir="ltr">ref: {error.digest}</p>}
    </section>
  );
}
