"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Print trigger; with `auto` it opens the print dialog once the page (and fonts) are ready. */
export function PrintButton({ auto = false }: { auto?: boolean }) {
  useEffect(() => {
    if (!auto) return;
    let cancelled = false;
    const go = () => {
      if (!cancelled) window.print();
    };
    const t = window.setTimeout(() => {
      if (document.fonts?.ready) document.fonts.ready.then(() => window.setTimeout(go, 150));
      else go();
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [auto]);

  return (
    <Button size="sm" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden />
      طباعة / حفظ PDF
    </Button>
  );
}
