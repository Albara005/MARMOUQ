"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "./ui-client";
import { playChime, useAdminLive } from "./admin-live";

type Pulse = { pending: number; latestOrderId: number | null; latestNumber: string | null; newCount?: number };

const POLL_MS = 30_000;
const PREFIX = /^\(\d+\)\s+/;

/**
 * Polls /api/admin/pulse every 30s while the tab is visible.
 * New order → toast with a link, optional soft chime, live badge update, and a "(n)" prefix on the tab title.
 */
export function NewOrderWatcher({ initialLatestId }: { initialLatestId: number | null }) {
  const { pending, setPending, chime } = useAdminLive();
  const router = useRouter();
  const pathname = usePathname();
  const lastSeen = useRef<number>(initialLatestId ?? 0);
  const chimeRef = useRef(chime);
  const pathRef = useRef(pathname);

  useEffect(() => {
    chimeRef.current = chime;
  }, [chime]);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;

    async function tick() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/admin/pulse?since=${lastSeen.current}`, { cache: "no-store", headers: { accept: "application/json" } });
        if (res.status === 401) {
          stopped = true;
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as Pulse;
        setPending(data.pending);
        if (data.latestOrderId && data.latestOrderId > lastSeen.current) {
          const count = Math.max(1, data.newCount ?? 1);
          lastSeen.current = data.latestOrderId;
          toast(count > 1 ? `${count} طلبات جديدة · آخرها ${data.latestNumber ?? ""}` : `طلب جديد ${data.latestNumber ?? ""}`, "info", {
            href: count > 1 ? "/admin/orders?status=pending" : `/admin/orders/${data.latestOrderId}`,
            actionLabel: count > 1 ? "عرض الطلبات" : "فتح الطلب",
            description: "بانتظار التأكيد مع العميل",
            duration: 12_000,
          });
          if (chimeRef.current) playChime();
          // refresh live lists only where it can't disturb an edit in progress
          const p = pathRef.current;
          if (p === "/admin" || p === "/admin/orders") router.refresh();
        }
      } catch {
        /* offline — try again next tick */
      }
    }

    function schedule() {
      window.clearInterval(timer);
      timer = window.setInterval(() => {
        if (!stopped) void tick();
      }, POLL_MS);
    }

    const onVisible = () => {
      if (document.visibilityState === "visible" && !stopped) void tick();
    };

    schedule();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, setPending]);

  // Keep "(n) " in front of the tab title while orders are waiting, across navigations.
  useEffect(() => {
    const apply = () => {
      const base = document.title.replace(PREFIX, "");
      const next = pending > 0 ? `(${pending}) ${base}` : base;
      if (document.title !== next) document.title = next;
    };
    apply();
    const titleEl = document.querySelector("title");
    const observer = new MutationObserver(apply);
    if (titleEl) observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
    observer.observe(document.head, { childList: true });
    return () => observer.disconnect();
  }, [pending, pathname]);

  return null;
}
