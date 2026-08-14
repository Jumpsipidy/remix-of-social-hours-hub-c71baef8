import { Link } from "@tanstack/react-router";
import { Compass, Home, LifeBuoy, Search } from "lucide-react";

/** Custom, on-brand 404 screen used by the root route and the router default. */
export function NotFoundScreen({ path }: { path?: string }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{
        background:
          "radial-gradient(1100px 600px at 50% -10%, rgba(59,130,246,0.16), transparent 60%), radial-gradient(900px 500px at 50% 110%, rgba(16,185,129,0.12), transparent 60%), oklch(0.13 0.015 250)",
      }}
    >
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl backdrop-blur-2xl">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-sky-500/25 to-emerald-500/25 ring-1 ring-white/15">
          <Compass className="h-8 w-8 animate-pulse text-sky-200" />
        </div>
        <p className="text-[11px] uppercase tracking-[0.32em] text-white/40">Klaida 404</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
          Tokio puslapio nėra
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-white/70">
          Nuoroda pasenusi arba puslapis buvo perkeltas. Nieko nesugadinai — tavo duomenys saugūs.
        </p>

        {path && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-3 text-left">
            <div className="text-[10px] uppercase tracking-widest text-white/40">Ieškotas adresas</div>
            <div className="mt-1 break-all font-mono text-xs text-white/80">{path}</div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:scale-[1.03]"
          >
            <Home className="h-4 w-4" /> Į pradžią
          </Link>
          <Link
            to="/tasks"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <Search className="h-4 w-4" /> Ieškoti veiklų
          </Link>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-white/45">
          <LifeBuoy className="h-3.5 w-3.5" /> Reikia pagalbos? pagalba@socialinesvalandos.dev
        </div>
      </div>
    </div>
  );
}
