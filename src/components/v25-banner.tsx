import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { X, PartyPopper } from "lucide-react";

const KEY = "sv_v25_banner_closed";

/** Plona, uždaroma V2.5 šventinė juosta visuose puslapiuose. */
export function V25Banner() {
  const [show, setShow] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    try { setShow(localStorage.getItem(KEY) !== "1"); } catch { setShow(true); }
  }, []);
  if (!show || path === "/versijos" || path.startsWith("/admin") || path === "/login" || path === "/register") return null;
  const close = () => { setShow(false); try { localStorage.setItem(KEY, "1"); } catch {} };
  return (
    <div className="sv-v25-in fixed inset-x-3 bottom-3 z-40 sm:left-4 sm:right-auto sm:w-[380px]" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex items-stretch overflow-hidden rounded-2xl border border-border bg-popover shadow-lg">
        <div className="flex w-16 shrink-0 flex-col items-center justify-center bg-primary text-primary-foreground">
          <span className="text-[10px] font-semibold opacity-80">versija</span>
          <span className="font-display text-xl font-black leading-none">2.5</span>
        </div>
        <div className="min-w-0 flex-1 px-3.5 py-3">
          <p className="text-sm font-bold">Didžiausias atnaujinimas</p>
          <p className="truncate text-xs text-muted-foreground">Pokalbiai, žemėlapis, draugai, QR pažymėjimai</p>
          <Link to="/versijos" onClick={close} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary">
            <PartyPopper className="h-3.5 w-3.5" /> Žiūrėti, kas naujo →
          </Link>
        </div>
        <button type="button" aria-label="Uždaryti" onClick={close} className="grid w-10 shrink-0 place-items-center text-muted-foreground hover:bg-accent hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
