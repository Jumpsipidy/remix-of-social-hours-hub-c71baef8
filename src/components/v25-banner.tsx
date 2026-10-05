import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { X, PartyPopper } from "lucide-react";

const KEY = "sv_v25_banner_closed";
const BITS = ["🎉", "✨", "🎊", "⭐", "🥳", "💙", "🎈", "✨"];

/** Šventinė V2.5 kortelė su konfeti — uždaroma, rodoma vieną kartą įrenginyje. */
export function V25Banner() {
  const [show, setShow] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    try { setShow(localStorage.getItem(KEY) !== "1"); } catch { setShow(true); }
  }, []);
  if (!show || path === "/versijos" || path.startsWith("/admin") || path === "/login" || path === "/register") return null;
  const close = () => { setShow(false); try { localStorage.setItem(KEY, "1"); } catch {} };
  return (
    <div className="sv-v25-in fixed inset-x-3 bottom-3 z-40 sm:left-4 sm:right-auto sm:w-[400px]" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
      <div className="pointer-events-none absolute inset-x-0 -top-2 h-0" aria-hidden>
        {BITS.map((b, i) => (
          <span key={i} className="sv-v25-pop absolute text-base" style={{ left: `${8 + i * 11}%`, animationDelay: `${i * 0.22}s` }}>{b}</span>
        ))}
      </div>
      <div className="relative flex items-stretch overflow-hidden rounded-2xl border border-primary/40 bg-popover shadow-lg">
        <div className="relative flex w-20 shrink-0 flex-col items-center justify-center overflow-hidden bg-primary text-primary-foreground">
          <span className="sv-v25-shine absolute inset-0" aria-hidden />
          <span className="relative text-[10px] font-semibold opacity-80">versija</span>
          <span className="relative font-display text-2xl font-black leading-none">2.5</span>
          <span className="relative mt-1 text-lg">🎉</span>
        </div>
        <div className="min-w-0 flex-1 px-3.5 py-3">
          <p className="text-sm font-black">V2.5 jau čia — švenčiame! 🥳</p>
          <p className="text-xs text-muted-foreground">3 mėnesių darbas: pokalbiai, žemėlapis, draugai, QR, SOCI GUARD ir dar daugiau.</p>
          <Link to="/versijos" onClick={close} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-bold text-primary-foreground active:scale-95">
            <PartyPopper className="h-3.5 w-3.5" /> Žiūrėti, kas naujo
          </Link>
        </div>
        <button type="button" aria-label="Uždaryti" onClick={close} className="grid w-10 shrink-0 place-items-center text-muted-foreground hover:bg-accent hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
