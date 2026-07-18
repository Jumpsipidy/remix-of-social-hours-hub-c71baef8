import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, ShieldCheck, Info, Zap } from "lucide-react";
import { LOCKDOWN_CODES, type LockdownCode } from "@/lib/lockdown-codes";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Sistemos būsena ir klaidų kodai — Socialinės Valandos" },
      { name: "description", content: "Visų sistemos klaidų kodų gidas: ką reiškia kiekvienas kodas ir kada tikėtis, kad viskas vėl veiks." },
      { property: "og:title", content: "Sistemos būsena — Socialinės Valandos" },
      { property: "og:description", content: "Klaidų kodų gidas ir sistemos būsena." },
    ],
  }),
  component: StatusPage,
});

const SEV: Record<LockdownCode["severity"], { chip: string; icon: React.ReactNode; label: string; grad: string }> = {
  info: { chip: "border-sky-400/40 bg-sky-500/10 text-sky-200", icon: <Info className="h-4 w-4" />, label: "Informacinis", grad: "from-sky-400 to-blue-500" },
  warn: { chip: "border-amber-400/40 bg-amber-500/10 text-amber-200", icon: <AlertTriangle className="h-4 w-4" />, label: "Įspėjimas", grad: "from-amber-400 to-rose-500" },
  critical: { chip: "border-rose-400/50 bg-rose-500/10 text-rose-200", icon: <Zap className="h-4 w-4" />, label: "Kritinis", grad: "from-rose-500 to-fuchsia-600" },
};

function StatusPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#04030d] text-white">
      {/* Aurora */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-violet-600/25 to-cyan-500/15 blur-3xl"
          animate={{ x: [0, 60, 0], y: [0, 40, 0] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute -right-40 bottom-0 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-sky-500/20 to-fuchsia-600/20 blur-3xl"
          animate={{ x: [0, -60, 0], y: [0, -40, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} />
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
        backgroundSize: "56px 56px",
      }} />

      <div className="relative z-10 mx-auto max-w-5xl px-5 py-14 sm:py-20">
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/50 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Grįžti į pagrindinį
        </Link>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-sky-300">Sistemos būsena</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">Klaidų kodų gidas</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            Jei matėte techninės priežiūros ekraną su kodu (pvz. <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-white">E-1001</code>), čia rasi, ką jis reiškia
            ir apytikslę trukmę, kol viskas atsistatys.
          </p>
        </motion.div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap gap-2">
          {(["info", "warn", "critical"] as const).map((s) => (
            <span key={s} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${SEV[s].chip}`}>
              {SEV[s].icon} {SEV[s].label}
            </span>
          ))}
        </div>

        {/* Codes grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {LOCKDOWN_CODES.map((c, i) => {
            const s = SEV[c.severity];
            return (
              <motion.article
                key={c.code}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04 }}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl hover:border-white/20"
              >
                <div className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${s.grad} opacity-20 blur-2xl transition group-hover:opacity-30`} />
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-bold text-white/50">{c.code}</p>
                    <h2 className="mt-1 font-display text-xl font-bold">{c.title}</h2>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${s.chip}`}>
                    {s.icon} {s.label}
                  </span>
                </div>
                <p className="relative mt-3 text-sm leading-relaxed text-white/70">{c.description}</p>
                <div className="relative mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-white/50">
                  <span>Numatoma trukmė</span>
                  <strong className="text-white/80">{c.eta}</strong>
                </div>
              </motion.article>
            );
          })}
        </div>

        <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/70 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <p><strong className="text-white">Duomenys saugūs.</strong> Techninės priežiūros metu tavo duomenys nedingsta — tiesiog laikinai ribojame prieigą.</p>
          </div>
        </div>

        <p className="mt-10 text-center text-[11px] uppercase tracking-[0.32em] text-white/30">Socialinės Valandos · status.page</p>
      </div>
    </div>
  );
}
