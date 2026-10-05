import { motion } from "framer-motion";
import { Wrench, RefreshCw, Home, Copy, Check, ShieldAlert, ArrowRight, LifeBuoy } from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { looksLikeStaleAsset, reloadOnce } from "@/lib/stale-deploy-guard";
import { fingerprint as computeFingerprint } from "@/lib/error-fingerprint";

type Props = {
  error: unknown;
  onRetry?: () => void;
  source?: string;
};

export function FriendlyErrorScreen({ error, onRetry, source = "route.boundary" }: Props) {
  const err = error instanceof Error ? error : new Error(String(error ?? "Nežinoma klaida"));
  const fp = useMemo(() => computeFingerprint(err.message, err.stack ?? null), [err.message, err.stack]);
  const [copied, setCopied] = useState(false);
  // Sena puslapio versija po atnaujinimo → tyliai perkrauname vieną kartą.
  useEffect(() => {
    const msg = error instanceof Error ? error.message : String(error ?? "");
    if (looksLikeStaleAsset(msg)) reloadOnce();
  }, [error]);
  const router = useRouter();

  const copyIncident = async () => {
    try {
      await navigator.clipboard.writeText(
        `Incidentas #${fp.id}\nPuslapis: ${window.location.href}\nKlaida: ${err.message}`,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050915] px-4 font-sans selection:bg-rose-500/30">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-rose-500/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-white/10 bg-neutral-900/40 p-8 text-center shadow-2xl backdrop-blur-2xl"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 shadow-glow shadow-rose-500/20">
          <Wrench className="h-8 w-8 text-white" />
        </div>

        <h1 className="text-2xl font-black tracking-tight text-white mb-2">
          Kažkas sugedo...
        </h1>
        <p className="text-sm text-neutral-400 leading-relaxed mb-8">
          Mūsų robotukai jau skuba taisyti. Kol kas pabandyk atnaujinti puslapį.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <button
            onClick={() => (onRetry ? onRetry() : window.location.reload())}
            className="flex items-center justify-center gap-2 rounded-2xl bg-white py-3 text-xs font-bold text-black transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Bandyti dar kartą
          </button>
          <Link
            to="/"
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-bold text-white transition hover:bg-white/10"
          >
            <Home className="h-3.5 w-3.5" /> Į pradžią
          </Link>
        </div>

        <div className="rounded-2xl bg-black/40 border border-white/5 p-4 text-left mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Incidento ID</span>
            <button 
              onClick={copyIncident}
              className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition"
            >
              {copied ? "Nukopijuota!" : "Kopijuoti"}
            </button>
          </div>
          <div className="font-mono text-sm text-rose-400 mb-1">#{fp.id}</div>
          <div className="text-[11px] text-neutral-500 truncate">{err.message}</div>
        </div>

        <div className="flex items-center justify-center gap-4 pt-4 border-t border-white/5">
          <a
            href={`mailto:pagalba@socialinesvalandos.dev?subject=Klaida #${fp.id}`}
            className="flex items-center gap-2 text-[11px] font-bold text-neutral-400 hover:text-white transition"
          >
            <LifeBuoy className="h-3.5 w-3.5" /> pagalba@socialinesvalandos.dev
          </a>
          <div className="h-1 w-1 rounded-full bg-neutral-700" />
          <button 
             onClick={() => {
                const btn = document.querySelector('[data-tour="bug"]') as HTMLElement;
                if (btn) btn.click();
             }}
             className="flex items-center gap-2 text-[11px] font-bold text-neutral-400 hover:text-white transition"
          >
             <ShieldAlert className="h-3.5 w-3.5" /> Pranešti bug'ą
          </button>
        </div>
      </motion.div>
    </div>
  );
}