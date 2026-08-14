import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import {
  Fingerprint,
  Search,
  Loader2,
  ShieldAlert,
  Clock,
  MapPin,
  User as UserIcon,
  Monitor,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { lt } from "date-fns/locale";
import { DashHero, GlassCard } from "@/components/dashboard-kit";
import { requireAdmin } from "@/lib/auth-guards";
import { lookupIncident } from "@/lib/incident-lookup.functions";
import { normalizeIncidentCode } from "@/lib/incident-code";

export const Route = createFileRoute("/admin/incident-lookup")({
  beforeLoad: () => requireAdmin(),
  head: () => ({ meta: [{ title: "Incidento paieška — Socialinės Valandos" }] }),
  component: IncidentLookupPage,
});

function IncidentLookupPage() {
  const lookup = useServerFn(lookupIncident);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const normalized = normalizeIncidentCode(code);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!normalized) {
      setError("Formatas turi būti SC-###### (6 skaitmenys).");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await lookup({ data: { code: normalized } });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepavyko rasti incidento");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen space-y-8 bg-background p-4 pb-24 sm:p-8">
      <DashHero
        eyebrow="Palaikymas"
        title="Incidento paieška"
        subtitle="Vartotojas atsiuntė kodą SC-######? Įvesk jį ir pamatysi tikslią klaidą, puslapį, įrenginį ir stack trace."
        icon={Fingerprint}
        accent="#8b5cf6"
      />

      <GlassCard className="p-6">
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/30" />
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SC-123456"
              className="w-full rounded-2xl border border-white/10 bg-black/40 py-4 pl-12 pr-4 font-mono text-lg tracking-[0.25em] text-white outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-sm font-black text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
            Ieškoti
          </button>
        </form>
        <p className="mt-3 text-[11px] text-white/40">
          Kodą vartotojas mato klaidos ekrane. Gali įvesti ir vien skaičius — formatą sutvarkysime.
        </p>
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <ShieldAlert className="h-4 w-4" /> {error}
          </div>
        )}
      </GlassCard>

      <AnimatePresence mode="wait">
        {result && !result.found && (
          <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GlassCard className="flex flex-col items-center py-16 text-center">
              <XCircle className="mb-3 h-10 w-10 text-white/20" />
              <p className="text-sm text-white/60">
                Incidentas <span className="font-mono text-white">{result.code}</span> nerastas.
                Gali būti, kad vartotojas buvo neprisijungęs ir įrašas neišsisaugojo.
              </p>
            </GlassCard>
          </motion.div>
        )}

        {result?.found &&
          result.events.map((ev: any) => (
            <motion.div key={ev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <GlassCard className="space-y-4 p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/15 px-3 py-1 font-mono text-xs font-bold text-primary">
                    {result.code}
                  </span>
                  <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-400">
                    {ev.action}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
                    <Clock className="h-3.5 w-3.5" />
                    {ev.created_at ? format(new Date(ev.created_at), "yyyy-MM-dd HH:mm:ss", { locale: lt }) : "—"}
                  </span>
                </div>

                <h2 className="break-words font-mono text-base font-bold text-white">
                  {ev.meta?.message || "Nežinoma klaida"}
                </h2>

                <div className="grid gap-3 sm:grid-cols-3">
                  <InfoTile icon={MapPin} label="Puslapis" value={ev.meta?.path || "—"} />
                  <InfoTile
                    icon={UserIcon}
                    label="Vartotojas"
                    value={ev.user ? (ev.user.email ?? ev.user.id) : "Neprisijungęs"}
                  />
                  <InfoTile
                    icon={Monitor}
                    label="Įrenginys"
                    value={[ev.meta?.browser, ev.meta?.os, ev.meta?.device].filter(Boolean).join(" · ") || "—"}
                  />
                </div>

                {ev.meta?.stack && (
                  <details open>
                    <summary className="cursor-pointer text-xs font-semibold text-white/50 hover:text-white/80">
                      Stack trace
                    </summary>
                    <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-black/50 p-4 font-mono text-[10px] leading-relaxed text-rose-200/70">
                      {ev.meta.stack}
                    </pre>
                  </details>
                )}

                {ev.meta?.screenshot && (
                  <details>
                    <summary className="cursor-pointer text-xs font-semibold text-white/50 hover:text-white/80">
                      Ekrano nuotrauka
                    </summary>
                    <img src={ev.meta.screenshot} alt="Klaidos momentas" className="mt-2 rounded-xl border border-white/10" />
                  </details>
                )}
              </GlassCard>
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/40">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className="mt-1 break-words text-sm text-white/85">{value}</p>
    </div>
  );
}
