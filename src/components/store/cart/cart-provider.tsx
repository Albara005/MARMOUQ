"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { lineKey } from "@/lib/pricing";

/**
 * A cart line snapshot. Prices here are for DISPLAY ONLY —
 * the server re-prices everything from the database at checkout.
 */
export type CartLine = {
  key: string; // `${variantId}:${lookId ?? 0}`
  variantId: number;
  productId: number;
  slug: string;
  name: string;
  color: string;
  colorHex?: string;
  size: string;
  unitPrice: number;
  compareAtPrice?: number | null;
  imageId: string | null;
  imageBlur?: string;
  quantity: number;
  maxQuantity: number; // stock at time of adding (soft limit)
  lookId: number | null;
  lookTitle?: string;
  lookDiscountPercent?: number;
};

export type NewCartLine = Omit<CartLine, "key" | "quantity"> & { quantity?: number };

type CartContextValue = {
  lines: CartLine[];
  hydrated: boolean;
  count: number;
  subtotal: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** Adds (or increments) a line and opens the drawer unless `silent` */
  add: (line: NewCartLine, opts?: { silent?: boolean }) => void;
  /** Adds several lines at once (e.g. a complete look) */
  addMany: (lines: NewCartLine[], opts?: { silent?: boolean }) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  /** Most recent addition (for a toast / highlight) */
  lastAdded: { name: string; at: number } | null;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "marmouq.cart.v1";
const MAX_QTY = 20;

function mergeLine(lines: CartLine[], incoming: NewCartLine): CartLine[] {
  const key = lineKey(incoming.variantId, incoming.lookId);
  const qty = Math.max(1, incoming.quantity ?? 1);
  const cap = Math.max(1, Math.min(MAX_QTY, incoming.maxQuantity || MAX_QTY));
  const idx = lines.findIndex((l) => l.key === key);
  if (idx === -1) return [...lines, { ...incoming, key, quantity: Math.min(cap, qty), maxQuantity: cap }];
  const next = [...lines];
  next[idx] = { ...next[idx], ...incoming, key, maxQuantity: cap, quantity: Math.min(cap, next[idx].quantity + qty) };
  return next;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<CartContextValue["lastAdded"]>(null);
  const skipWrite = useRef(true);

  // Load once on mount + keep tabs in sync
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartLine[];
        if (Array.isArray(parsed)) setLines(parsed.filter((l) => l && typeof l.variantId === "number" && l.quantity > 0));
      }
    } catch {
      /* ignore corrupted storage */
    }
    setHydrated(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      try {
        skipWrite.current = true;
        setLines(e.newValue ? (JSON.parse(e.newValue) as CartLine[]) : []);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipWrite.current) {
      skipWrite.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* storage full / private mode */
    }
  }, [lines, hydrated]);

  const add = useCallback<CartContextValue["add"]>((line, opts) => {
    skipWrite.current = false;
    setLines((prev) => mergeLine(prev, line));
    setLastAdded({ name: line.name, at: Date.now() });
    if (!opts?.silent) setIsOpen(true);
  }, []);

  const addMany = useCallback<CartContextValue["addMany"]>((incoming, opts) => {
    skipWrite.current = false;
    setLines((prev) => incoming.reduce((acc, l) => mergeLine(acc, l), prev));
    if (incoming[0]) setLastAdded({ name: incoming.length > 1 ? `${incoming.length} قطع` : incoming[0].name, at: Date.now() });
    if (!opts?.silent) setIsOpen(true);
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    skipWrite.current = false;
    setLines((prev) =>
      quantity <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(l.maxQuantity || MAX_QTY, MAX_QTY, quantity) } : l)),
    );
  }, []);

  const remove = useCallback((key: string) => {
    skipWrite.current = false;
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clear = useCallback(() => {
    skipWrite.current = false;
    setLines([]);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      hydrated,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      subtotal: lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      add,
      addMany,
      setQuantity,
      remove,
      clear,
      lastAdded,
    }),
    [lines, hydrated, isOpen, add, addMany, setQuantity, remove, clear, lastAdded],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

/* ───────────── Wishlist (local, per device) ───────────── */

const WISH_KEY = "marmouq.wishlist.v1";
type WishlistValue = { ids: number[]; has: (id: number) => boolean; toggle: (id: number) => void; hydrated: boolean };
const WishlistContext = createContext<WishlistValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<number[]>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(WISH_KEY);
      if (raw) setIds((JSON.parse(raw) as number[]).filter((n) => typeof n === "number"));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);
  const toggle = useCallback((id: number) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev].slice(0, 100);
      try {
        localStorage.setItem(WISH_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);
  const value = useMemo(() => ({ ids, has: (id: number) => ids.includes(id), toggle, hydrated }), [ids, toggle, hydrated]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}
