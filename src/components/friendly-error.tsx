// Friendly, student-facing error screen.
//
// Shows a calm, reassuring message in Lithuanian instead of a raw stack trace.
// The point: student should NOT rage — they should see „mes jau žinome, taisom".
//
// - Auto-reports the error to /admin/errors on mount (with a stable incident ID)
// - Displays an animated „🛠 Taisoma" status pill so it feels alive
// - Gives the student a short incident code they can quote to admin
// - Shows the stack only in dev
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Home, RefreshCw, Wrench, Copy, Check, WifiOff, LifeBuoy, ShieldAlert, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { logClientError } from "@/lib/error-log";
import { fingerprint as computeFingerprint } from "@/lib/error-fingerprint";

type Props = {
  error: unknown;
  onRetry?: () => void;
  source?: string;
};

export function FriendlyErrorScreen({ error, onRetry, source = "route.boundary" }: Props) {
  const err = error instanceof Error ? error : new Error(String(error ?? "Nežinoma klaida"));
  const fp = useMemo(() => computeFingerprint(err.message, err.stack ?? null), [err.message, err.stack]);
  const reported = useRef(false);
  const [dots, setDots] = useState(1);
  const [copied, setCopied] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const copyIncident = async () => {
    try {
      await navigator.clipboard.writeText(
        `Incidentas #${fp.id}\nPuslapis: ${window.location.href}\nKlaida: ${err.message}`,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  };

  useEffect(() => {
    if (reported.current) return;
    reported.current = true;
    void logClientError(err, { source, extra: { boundary: true, incident_id: fp.id } });
  }, [err, fp.id, source]);

  useEffect(() => {
    const t = window.setInterval(() => setDots((d) => (d % 3) + 1), 500);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 selection:bg-rose-500/30"
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -10%, rgba(244,63,94,0.18), transparent 60%), radial-gradient(900px 500px at 50% 110%, rgba(139,92,246,0.15), transparent 60%), oklch(0.13 0.015 250)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl backdrop-blur-2xl"
        style={{ boxShadow: "0 30px 80px rgba(244,63,94,0.15)" }}
      >
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-rose-500/30 to-fuchsia-500/30 ring-1 ring-white/15">
          <motion.div
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Wrench className="h-8 w-8 text-rose-200" />
          </motion.div>
        </div>

        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Kažkas nutiko... bet mes jau taisome!</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-white/70">
          Nenusimink — mūsų sistema jau <strong>automatiškai pranešė administracijai</strong>. 
          Mes jau skubame viską sutvarkyti. Kol kas gali grįžti į pradžią arba bandyti dar kartą.
        </p>
        
        {/* Rapid access for super admin debugging if applicable */}
        <div className="mt-6 p-4 rounded-2xl bg-primary/5 border border-primary/10 text-left">
          <div className="flex items-center gap-3 text-primary mb-2">
            <ShieldAlert className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Saugumo modulis</span>
          </div>
          <p className="text-[11px] text-white/60 mb-3">
            Jei esi sistemos kūrėjas, naudok incidento kodą auditui.
          </p>
          <Link 
            to="/admin/incidents" 
            className="inline-flex items-center gap-2 text-[10px] font-bold text-primary hover:underline"
          >
            Atidaryti incidentų žurnalą <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="mt-6 inline-flex items-center gap-2.5 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 px-4 py-2 text-[13px] font-bold text-emerald-400 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
          </span>
          <span>Sistemos atkūrimas vyksta{".".repeat(dots)}</span>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-3 text-left">
          <div className="text-[10px] uppercase tracking-widest text-white/40">Incidento ID</div>
          <div className="mt-1 font-mono text-sm text-white/90">#{fp.id}</div>
          <div className="mt-2 text-[11px] text-white/50 line-clamp-2 break-words">{err.message || "—"}</div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => (onRetry ? onRetry() : window.location.reload())}
            className="inline-flex items-center gap-2 rounded-full bg-white text-slate-900 px-5 py-2 text-sm font-semibold shadow hover:scale-[1.03] transition"
          >
            <RefreshCw className="h-4 w-4" /> Bandyti dar
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
          >
            <Home className="h-4 w-4" /> Į pradžią
          </a>
        </div>

        {offline && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100">
            <WifiOff className="h-3.5 w-3.5" /> Atrodo, kad dingo internetas. Patikrink ryšį ir bandyk dar kartą.
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left text-[11px] text-white/60">
          <div className="mb-1 font-semibold text-white/80">Ką daryti dabar?</div>
          <ol className="list-decimal space-y-0.5 pl-4">
            <li>Paspausk „Bandyti dar" — dažniausiai to užtenka.</li>
            <li>Jei nepavyko, grįžk į pradžią ir pakartok veiksmą.</li>
            <li>Vis dar neveikia? Nukopijuok incidento kodą ir parašyk mums.</li>
          </ol>
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <button
            onClick={copyIncident}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Nukopijuota" : "Kopijuoti incidentą"}
          </button>
          <a
            href={`mailto:pagalba@socialinesvalandos.dev?subject=${encodeURIComponent(`Klaida #${fp.id}`)}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            <LifeBuoy className="h-3.5 w-3.5" /> pagalba@socialinesvalandos.dev
          </a>
        </div>

        <p className="mt-5 text-[11px] text-white/40">
          <AlertTriangle className="mr-1 inline h-3 w-3" />
          Jei matai šitą pranešimą daug kartų — nusiųsk #{fp.id} adminui per „Pranešti bug'ą" mygtuką.
        </p>

        {import.meta.env.DEV && err.stack && (
          <pre className="mt-4 max-h-56 overflow-auto rounded-xl bg-black/50 p-3 text-left text-[10px] text-rose-200/80">
            {err.stack}
          </pre>
        )}
      </motion.div>
    </div>
  );
}
