"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* ───────────── Presence: keep an overlay mounted while it animates out ───────────── */

/**
 * `mounted` stays true until the exit transition has finished;
 * `visible` flips one frame after mount so CSS transitions can run on enter.
 */
export function usePresence(open: boolean, exitMs = 500): { mounted: boolean; visible: boolean } {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), exitMs);
    return () => window.clearTimeout(t);
  }, [open, exitMs]);

  return { mounted, visible };
}

/* ───────────── Body scroll lock (ref-counted, no layout shift) ───────────── */

let lockCount = 0;

function lockScroll() {
  lockCount += 1;
  if (lockCount !== 1) return;
  const html = document.documentElement;
  const scrollable = html.scrollHeight > html.clientHeight;
  html.style.overflow = "hidden";
  if (scrollable) html.style.scrollbarGutter = "stable";
}

function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount !== 0) return;
  const html = document.documentElement;
  html.style.overflow = "";
  html.style.scrollbarGutter = "";
}

/* ───────────── Focus management ───────────── */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const stack: symbol[] = [];

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.hasAttribute("inert") && el.getClientRects().length > 0);
}

/**
 * Modal behaviour for drawers, sheets and dialogs:
 * scroll lock · focus trap · Esc to close (top-most overlay only) · focus restore.
 */
export function useModal({
  open,
  onClose,
  containerRef,
  initialFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  containerRef: React.RefObject<HTMLElement | null>;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const id = Symbol("overlay");
    stack.push(id);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    lockScroll();

    // The panel may mount a frame or two after `open` flips (presence + portal), so retry briefly.
    let tries = 0;
    let focusTimer = 0;
    const focusInitial = () => {
      const root = containerRef.current;
      if (!root) {
        if (tries++ < 12) focusTimer = window.setTimeout(focusInitial, 40);
        return;
      }
      const target = initialFocusRef?.current ?? focusables(root)[0] ?? root;
      target.focus({ preventScroll: true });
    };
    focusTimer = window.setTimeout(focusInitial, 50);

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const root = containerRef.current;
      if (!root) return;
      const items = focusables(root);
      if (items.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !root.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      const i = stack.indexOf(id);
      if (i !== -1) stack.splice(i, 1);
      unlockScroll();
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open, containerRef, initialFocusRef]);
}

/** Renders into <body> so fixed overlays escape transformed / blurred ancestors. */
export function Portal({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready ? createPortal(children, document.body) : null;
}
