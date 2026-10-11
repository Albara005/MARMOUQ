"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** Live admin state shared by the shell: pending-orders badge and the "new order" chime preference. */
type AdminLive = {
  pending: number;
  setPending: (n: number) => void;
  chime: boolean;
  setChime: (on: boolean) => void;
};

const AdminLiveContext = createContext<AdminLive | null>(null);
const CHIME_KEY = "mrq-admin-chime";

export function AdminLiveProvider({ initialPending, children }: { initialPending: number; children: ReactNode }) {
  const [pending, setPending] = useState(initialPending);
  const [chime, setChimeState] = useState(true);

  // server re-renders (router.refresh / navigation) bring a fresh count
  useEffect(() => setPending(initialPending), [initialPending]);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(CHIME_KEY);
      if (v === "0") setChimeState(false);
    } catch {
      /* storage unavailable — keep default */
    }
  }, []);

  const setChime = useCallback((on: boolean) => {
    setChimeState(on);
    try {
      window.localStorage.setItem(CHIME_KEY, on ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ pending, setPending, chime, setChime }), [pending, chime, setChime]);
  return <AdminLiveContext.Provider value={value}>{children}</AdminLiveContext.Provider>;
}

export function useAdminLive(): AdminLive {
  const ctx = useContext(AdminLiveContext);
  if (!ctx) return { pending: 0, setPending: () => {}, chime: false, setChime: () => {} };
  return ctx;
}

/* ── Soft two-note chime (WebAudio, no asset) ── */
let audioCtx: AudioContext | null = null;

export function playChime() {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioCtx ??= new Ctor();
    const ctx = audioCtx;
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);
    // a warm fifth: E6 then A5, each with a gentle bell envelope
    [
      { f: 1318.5, t: 0 },
      { f: 880, t: 0.14 },
    ].forEach(({ f, t }) => {
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      overtone.type = "sine";
      osc.frequency.value = f;
      overtone.frequency.value = f * 2.01;
      const og = ctx.createGain();
      og.gain.value = 0.12;
      overtone.connect(og).connect(g);
      osc.connect(g).connect(master);
      g.gain.setValueAtTime(0.0001, now + t);
      g.gain.exponentialRampToValueAtTime(1, now + t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + 1.1);
      osc.start(now + t);
      overtone.start(now + t);
      osc.stop(now + t + 1.2);
      overtone.stop(now + t + 1.2);
    });
  } catch {
    /* audio blocked — silently skip */
  }
}
