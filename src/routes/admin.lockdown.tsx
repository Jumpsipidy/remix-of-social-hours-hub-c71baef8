import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Lock, Unlock, AlertTriangle, ShieldCheck, Info, RefreshCw } from "lucide-react";
import { LOCKDOWN_CODES } from "@/lib/lockdown-codes";
import {
  adminGetLockdownSettings,
  adminRunLockdownHealth,
  adminUpdateLockdownSettings,
} from "@/lib/lockdown.functions";

const LOCKDOWN_SQL = `ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS lockdown_code TEXT;
NOTIFY pgrst, 'reload schema';`;

export const Route = createFileRoute("/admin/lockdown")({
  head: () => ({ meta: [{ title: "Lockdown — Socialinės Valandos" }] }),
  component: LockdownPage,
});

const SEVERITY_CHIP = {
  info: "border-sky-400/40 bg-sky-500/10 text-sky-200",
  warn: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  critical: "border-rose-400/50 bg-rose-500/10 text-rose-200",
} as const;

function LockdownPage() {
  const getLockdownSettings = useServerFn(adminGetLockdownSettings);
  const updateLockdownSettings = useServerFn(adminUpdateLockdownSettings);
  const runLockdownHealth = useServerFn(adminRunLockdownHealth);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [selectedCode, setSelectedCode] = useState<string>("E-1001");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [healthSummary, setHealthSummary] = useState<{ critical: number; warnings: number } | null>(null);
  const [setupProblem, setSetupProblem] = useState<string | null>(null);

  const load = async () => {
    try {
      const { settings } = await getLockdownSettings();
      setSetupProblem(null);
      setEnabled(Boolean(settings.lockdown_enabled));
      setMessage(settings.lockdown_message ?? "");
      if (settings.lockdown_code) setSelectedCode(settings.lockdown_code);
      setUpdatedAt(settings.updated_at ?? null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Nepavyko užkrauti";
      setSetupProblem(msg);
      setEnabled(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (next: boolean) => {
    setSaving(true);
    try {
      const { settings } = await updateLockdownSettings({
        data: { lockdown_enabled: next, lockdown_message: message || null, lockdown_code: next ? selectedCode : null },
      });
      setEnabled(settings.lockdown_enabled);
      setUpdatedAt(settings.updated_at ?? null);
      toast.success(next ? `🔒 Lockdown ĮJUNGTAS · ${selectedCode}` : "🔓 Lockdown išjungtas");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Klaida");
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { settings } = await updateLockdownSettings({ data: { lockdown_message: message || null, lockdown_code: selectedCode } });
      setUpdatedAt(settings.updated_at ?? null);
      toast.success("Išsaugota");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Klaida");
    } finally {
      setSaving(false);
    }
  };

  const runHealthCheck = async () => {
    setChecking(true);
    try {
      const res = await runLockdownHealth();
      const critical = res.checks.filter((c: { ok: boolean; critical?: boolean }) => !c.ok && c.critical).length;
      const warnings = res.checks.filter((c: { ok: boolean; critical?: boolean }) => !c.ok && !c.critical).length;
      setHealthSummary({ critical, warnings });
      if (critical === 0 && warnings === 0) toast.success("Visos patikros OK");
      else toast.message(`${critical} kritinių · ${warnings} įspėjimų`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nepavyko");
    } finally {
      setChecking(false);
    }
  };

  const activeCode = LOCKDOWN_CODES.find((c) => c.code === selectedCode) ?? LOCKDOWN_CODES[0];
  const statusColor = enabled ? "rose" : "emerald";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Avarinis režimas</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">Lockdown</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Įjungus, kiekvienas lankytojas mato techninės priežiūros ekraną. Bypass:{" "}
          <code className="rounded bg-accent px-1 text-foreground">jumpsipidy</code>.
        </p>
      </div>

      {setupProblem && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] p-4">
          <p className="text-sm font-semibold text-amber-100">Reikia atnaujinti lentelę</p>
          <p className="mt-1 text-xs text-amber-100/70">{setupProblem}</p>
          <button onClick={async () => { await navigator.clipboard.writeText(LOCKDOWN_SQL); toast.success("SQL nukopijuotas"); }}
            className="mt-3 rounded-full bg-amber-300 px-3 py-1.5 text-xs font-bold text-black hover:bg-amber-200">
            Kopijuoti SQL
          </button>
        </div>
      )}

      {/* Big status card */}
      <motion.div layout
        className={`relative overflow-hidden rounded-2xl border p-6 ${
          enabled
            ? "border-rose-500/40 bg-rose-500/[0.06]"
            : "border-emerald-500/30 bg-emerald-500/[0.04]"
        }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <motion.div
              animate={enabled ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 1.6, repeat: Infinity }}
              className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${
                enabled ? "from-rose-400 to-amber-500" : "from-emerald-400 to-teal-500"
              } text-black shadow-lg`}>
              {enabled ? <AlertTriangle className="h-7 w-7" /> : <ShieldCheck className="h-7 w-7" />}
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex h-2 w-2 rounded-full bg-${statusColor}-400 ${enabled ? "animate-pulse" : ""}`} />
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Būsena</p>
              </div>
              <p className="mt-0.5 text-xl font-black">
                {enabled === null ? "Kraunama…" : enabled ? "AKTYVUS" : "Sistema veikia"}
              </p>
              {enabled && (
                <p className="mt-0.5 font-mono text-xs text-rose-200/80">{selectedCode} · {activeCode.title}</p>
              )}
              {updatedAt && (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Atnaujinta: {new Date(updatedAt).toLocaleString("lt-LT")}
                </p>
              )}
            </div>
          </div>
          <button
            disabled={saving || enabled === null}
            onClick={() => toggle(!enabled)}
            className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold shadow-lg transition disabled:opacity-60 ${
              enabled
                ? "bg-emerald-500 text-black hover:bg-emerald-400"
                : "bg-gradient-to-r from-rose-500 to-amber-500 text-black hover:opacity-90"
            }`}>
            {enabled ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {enabled ? "Išjungti" : "Įjungti"}
          </button>
        </div>
      </motion.div>

      {/* Code picker — collapsed simple */}
      <details className="group rounded-2xl border border-border bg-card/60 backdrop-blur">
        <summary className="flex cursor-pointer items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="text-sm font-bold">Klaidos kodas</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Rodomas maintenance ekrane</p>
          </div>
          <span className={`rounded-full border px-3 py-1 font-mono text-xs font-bold ${SEVERITY_CHIP[activeCode.severity]}`}>
            {activeCode.code}
          </span>
        </summary>
        <div className="border-t border-border/60 p-5 pt-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {LOCKDOWN_CODES.map((c) => {
              const active = c.code === selectedCode;
              return (
                <button key={c.code} type="button" onClick={() => setSelectedCode(c.code)}
                  className={`rounded-xl border p-3 text-left transition ${
                    active
                      ? `${SEVERITY_CHIP[c.severity]} ring-2 ring-primary/30`
                      : "border-border bg-background/40 hover:border-primary/40"
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold">{c.code}</span>
                    <span className="text-[9px] font-bold uppercase opacity-70">{c.severity}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold">{c.title}</p>
                </button>
              );
            })}
          </div>

          <label className="mt-5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Papildoma žinutė (nebūtina)
          </label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} maxLength={400}
            placeholder="Palik tuščią — bus rodomas tik kodas"
            className="mt-2 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary" />
          <button onClick={saveSettings} disabled={saving}
            className="mt-3 rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
            Išsaugoti
          </button>
        </div>
      </details>

      {/* Quick actions row */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button onClick={runHealthCheck} disabled={checking}
          className="flex items-center justify-between rounded-2xl border border-border bg-card/60 p-4 text-left transition hover:border-primary/40 hover:bg-accent/40 disabled:opacity-60">
          <div>
            <p className="text-sm font-bold">Sistemos patikra</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {healthSummary
                ? `${healthSummary.critical} kritinių · ${healthSummary.warnings} įspėjimų`
                : "Paleisk deep health scan"}
            </p>
          </div>
          <motion.span animate={checking ? { rotate: 360 } : {}} transition={checking ? { duration: 0.9, repeat: Infinity, ease: "linear" } : {}}>
            <RefreshCw className="h-5 w-5 text-primary" />
          </motion.span>
        </button>
        <Link to="/status"
          className="flex items-center justify-between rounded-2xl border border-border bg-card/60 p-4 transition hover:border-primary/40 hover:bg-accent/40">
          <div>
            <p className="text-sm font-bold">Kodų gidas</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Peržiūrėk viešą /status puslapį</p>
          </div>
          <Info className="h-5 w-5 text-primary" />
        </Link>
      </div>
    </div>
  );
}
