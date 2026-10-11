"use client";

import { useEffect } from "react";

/**
 * Scroll-reveal root. Mount once (the store layout does).
 * Any element with `data-reveal` fades up when it enters the viewport (`.is-visible` is added).
 * Optional stagger: style={{ "--reveal-delay": "120ms" } as React.CSSProperties}
 *
 * Observation starts once the page is idle after load so server-rendered markup is
 * never touched before React has hydrated it. Elements added later (client navigation,
 * streaming) are picked up by a MutationObserver. If React rewrites a revealed element's
 * className, `.is-visible` is restored.
 */
export function RevealRoot() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealed = new WeakSet<Element>();

    const show = (el: Element) => {
      revealed.add(el);
      if (!el.classList.contains("is-visible")) el.classList.add("is-visible");
    };

    const io =
      !reduce && "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                // Reveal when intersecting, or if it is already above the viewport (restored scroll position)
                if (entry.isIntersecting || entry.boundingClientRect.bottom < 0) {
                  show(entry.target);
                  io?.unobserve(entry.target);
                }
              }
            },
            { rootMargin: "0px 0px -6% 0px", threshold: 0.01 },
          )
        : null;

    const track = (el: Element) => {
      if (revealed.has(el) || el.classList.contains("is-visible")) {
        revealed.add(el);
        return;
      }
      if (io) io.observe(el);
      else show(el);
    };

    const scan = (root: ParentNode) => {
      if (root instanceof Element && root.hasAttribute("data-reveal")) track(root);
      root.querySelectorAll("[data-reveal]").forEach(track);
    };

    const mo = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "childList") {
          r.addedNodes.forEach((n) => {
            if (n.nodeType === 1) scan(n as Element);
          });
        } else if (r.type === "attributes" && revealed.has(r.target as Element)) {
          const el = r.target as Element;
          if (!el.classList.contains("is-visible")) el.classList.add("is-visible");
        }
      }
    });

    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      scan(document);
      mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    };

    const idle = (cb: () => void) => {
      const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
      if (w.requestIdleCallback) w.requestIdleCallback(cb, { timeout: 700 });
      else window.setTimeout(cb, 120);
    };

    const onLoad = () => idle(start);
    if (document.readyState === "complete") idle(start);
    else window.addEventListener("load", onLoad, { once: true });
    // Safety net for very slow networks: never keep content hidden for long.
    const fallback = window.setTimeout(start, 3200);

    return () => {
      window.removeEventListener("load", onLoad);
      window.clearTimeout(fallback);
      io?.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}

/** Alias kept for readability in layouts. */
export const Reveal = RevealRoot;
