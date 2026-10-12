import type { Metadata } from "next";
import { copyOf, getSettings } from "@/lib/settings";
import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { StoreShell } from "@/components/store/store-shell";

export const metadata: Metadata = {
  title: "الصفحة غير موجودة",
};

export default async function NotFound() {
  const c = copyOf(await getSettings());
  // Render per request so the chrome reflects live settings (and the DB is never touched at build time).
  await headers();
  return (
    <StoreShell>
      <section className="relative isolate overflow-hidden">
        <p
          aria-hidden
          dir="ltr"
          className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 -translate-y-1/2 select-none text-center font-[family-name:var(--font-latin)] text-[42vw] font-semibold italic leading-none text-bone md:text-[30vw]"
        >
          404
        </p>
        <div className="container-luxe flex min-h-[70svh] flex-col items-center justify-center py-24 text-center">
          <p className="eyebrow">Page not found</p>
          <h1 className="display mt-5 max-w-2xl text-4xl leading-tight text-espresso text-balance md:text-6xl">{c["notFound.title"]}</h1>
          <p className="mt-5 max-w-md text-[0.95rem] leading-8 text-umber">{c["notFound.text"]}</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/shop" className={buttonClasses("primary", "lg")}>
              تسوّق المجموعة
              <ArrowLeft className="size-4" aria-hidden />
            </Link>
            <Link href="/looks" className={buttonClasses("outline", "lg")}>
              الإطلالات الجاهزة
            </Link>
          </div>
          <Link href="/" className="link-luxe mt-8 text-sm text-taupe hover:text-espresso">
            العودة للصفحة الرئيسية
          </Link>
        </div>
      </section>
    </StoreShell>
  );
}
