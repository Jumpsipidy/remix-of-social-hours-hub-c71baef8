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
  return (
    <div className="relative z-40 border-b border-primary/30 bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-sm">
        <PartyPopper className="h-4 w-4 shrink-0" />
        <p className="min-w-0 flex-1 truncate">
          <b>V2.5 jau čia</b> <span className="hidden sm:inline">— didžiausias atnaujinimas: pokalbiai, žemėlapis, draugai, QR pažymėjimai.</span>
        </p>
        <Link to="/versijos" className="shrink-0 rounded-md bg-primary-foreground/15 px-2.5 py-1 text-xs font-semibold hover:bg-primary-foreground/25">Kas naujo</Link>
        <button type="button" aria-label="Uždaryti" onClick={() => { setShow(false); try { localStorage.setItem(KEY, "1"); } catch {} }} className="grid h-7 w-7 shrink-0 place-items-center rounded-md hover:bg-primary-foreground/15">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
