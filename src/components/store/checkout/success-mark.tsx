/** Animated copper check (draws the ring, then the tick, with a soft halo). Server-safe, CSS only. */
export function SuccessMark({ className }: { className?: string }) {
  return (
    <div className={`success-mark relative grid size-24 place-items-center ${className ?? ""}`} aria-hidden>
      <style>{`
.success-mark .sm-ring{stroke-dasharray:283;stroke-dashoffset:283;animation:sm-draw 1.1s cubic-bezier(.16,1,.3,1) .15s forwards}
.success-mark .sm-check{stroke-dasharray:64;stroke-dashoffset:64;animation:sm-draw .7s cubic-bezier(.16,1,.3,1) .8s forwards}
.success-mark .sm-halo{opacity:0;animation:sm-halo 1.8s ease-out 1s both}
.success-mark .sm-star{opacity:0;animation:sm-star 1.2s cubic-bezier(.16,1,.3,1) both}
@keyframes sm-draw{to{stroke-dashoffset:0}}
@keyframes sm-halo{0%{transform:scale(.85);opacity:.55}100%{transform:scale(1.7);opacity:0}}
@keyframes sm-star{0%{opacity:0;transform:scale(.4) rotate(-30deg)}60%{opacity:1}100%{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.success-mark .sm-ring,.success-mark .sm-check{animation:none;stroke-dashoffset:0}.success-mark .sm-halo{display:none}.success-mark .sm-star{animation:none;opacity:1}}
`}</style>
      <span className="sm-halo absolute inset-0 rounded-full bg-copper/30" />
      <svg viewBox="0 0 100 100" className="relative size-24">
        <circle cx="50" cy="50" r="46" fill="var(--color-paper)" />
        <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-copper)" strokeWidth="1.6" className="sm-ring" transform="rotate(-90 50 50)" />
        <path d="M32 51.5 44.5 64 69 37.5" fill="none" stroke="var(--color-copper)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className="sm-check" />
      </svg>
      <span className="sm-star absolute -end-3 top-1 text-sm text-gold" style={{ animationDelay: "1.2s" }}>✦</span>
      <span className="sm-star absolute -start-4 top-9 text-[0.65rem] text-gold" style={{ animationDelay: "1.35s" }}>✦</span>
      <span className="sm-star absolute -bottom-1 end-1 text-[0.55rem] text-copper-soft" style={{ animationDelay: "1.5s" }}>✦</span>
    </div>
  );
}
