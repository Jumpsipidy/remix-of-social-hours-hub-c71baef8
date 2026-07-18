import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, Unlock, AlertTriangle, RefreshCw, ShieldCheck, Radio, Info } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { readSiteSettings } from "@/lib/site-settings";
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
  const { user, profile } = useAuth();
  const getLockdownSettings = useServerFn(adminGetLockdownSettings);
  const updateLockdownSettings = useServerFn(adminUpdateLockdownSettings);
  const runLockdownHealth = useServerFn(adminRunLockdownHealth);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [selectedCode, setSelectedCode] = useState<string>("E-1001");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [health, setHealth] = useState<null | Array<{ label: string; ok: boolean; detail: string }>>(null);
  const [setupProblem, setSetupProblem] = useState<string | null>(null);

  const load = async () => {
    try {
      const { settings } = await getLockdownSettings();
      setSetupProblem(null);
      setEnabled(Boolean(settings.lockdown_enabled));
      setMessage(settings.lockdown_message ?? "");
      if (settings.lockdown_code) setSelectedCode(settings.lockdown_code);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Nepavyko užkrauti Lockdown nustatymų";
      setSetupProblem(msg);
      setEnabled(false);
      toast.error(msg);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (next: boolean) => {
    setSaving(true);
    try {
      const { settings } = await updateLockdownSettings({
        data: { lockdown_enabled: next, lockdown_message: message || null, lockdown_code: next ? selectedCode : null },
      });
      setSetupProblem(null);
      setEnabled(settings.lockdown_enabled);
      setMessage(settings.lockdown_message ?? "");
      if (settings.lockdown_code) setSelectedCode(settings.lockdown_code);
      toast.success(next ? `🔒 Lockdown ĮJUNGTAS · ${selectedCode}` : "🔓 Lockdown išjungtas");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nepavyko pakeisti Lockdown būsenos");
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { settings } = await updateLockdownSettings({ data: { lockdown_message: message || null, lockdown_code: selectedCode } });
      setSetupProblem(null);
      setMessage(settings.lockdown_message ?? "");
      if (settings.lockdown_code) setSelectedCode(settings.lockdown_code);
      toast.success("Nustatymai išsaugoti");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nepavyko išsaugoti");
    } finally {
      setSaving(false);
    }
  };

  const runHealthCheck = async () => {
    setChecking(true);
    setHealth(null);
    const results: Array<{ label: string; ok: boolean; detail: string }> = [];
    results.push({ label: "Naršyklės sesija", ok: Boolean(user), detail: user ? user.email ?? user.id : "vartotojas neprisijungęs" });
    results.push({ label: "Admin rolė UI būsenoje", ok: profile?.role === "admin", detail: profile?.role ? `rolė: ${profile.role}` : "profilis dar neužkrautas" });
    try {
      const { error, schemaMissing } = await readSiteSettings();
      results.push({
        label: "Viešas Lockdown API", ok: !error,
        detail: error ? (schemaMissing ? "schemos talpykla dar nemato site_settings" : error.message) : "lentelė pasiekiama lankytojams",
      });
    } catch (error) {
      results.push({ label: "Viešas Lockdown API", ok: false, detail: error instanceof Error ? error.message : "nežinoma klaida" });
    }
    try {
      const serverHealth = await runLockdownHealth();
      results.push(...serverHealth.checks);
    } catch (error) {
      results.push({ label: "Admin serverio patikra", ok: false, detail: error instanceof Error ? error.message : "nepavyko" });
    }
    try {
      const ch = supabase.channel("healthcheck_" + Date.now());
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => resolve(), 2500);
        ch.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            results.push({ label: "Realtime kanalas", ok: true, detail: "kanalas prisijungė" });
            clearTimeout(timer); resolve();
          }
        });
      });
      supabase.removeChannel(ch);
      if (!results.some((r) => r.label === "Realtime kanalas")) {
        results.push({ label: "Realtime kanalas", ok: false, detail: "kanalas neprisijungė per 2.5 s" });
      }
    } catch (error) {
      results.push({ label: "Realtime kanalas", ok: false, detail: error instanceof Error ? error.message : "nežinoma klaida" });
    }
    await new Promise((r) => setTimeout(r, 900));
    setHealth(results);
    setChecking(false);
  };

  const activeCode = LOCKDOWN_CODES.find((c) => c.code === selectedCode) ?? LOCKDOWN_CODES[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Avarinis režimas</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">Lockdown valdymas</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Įjungus Lockdown, <strong>kiekvienas</strong> lankytojas (net super admin) mato techninės priežiūros ekraną.
            Bypass: įrašyk <code className="rounded bg-accent px-1 text-foreground">jumpsipidy</code> ir įvesk kodą.
          </p>
        </div>
        <Link to="/status" className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-xs font-semibold hover:bg-accent">
          <Info className="h-3.5 w-3.5" /> Peržiūrėti kodų gidą
        </Link>
      </div>

      {setupProblem && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] p-5 shadow-md">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-amber-100">Reikia atnaujinti Lockdown lentelę</h2>
              <p className="mt-2 text-xs text-amber-100/60">{setupProblem}</p>
            </div>
            <button type="button" onClick={async () => { await navigator.clipboard.writeText(LOCKDOWN_SQL); toast.success("SQL nukopijuotas"); }} className="rounded-full bg-amber-300 px-4 py-2 text-xs font-bold text-black hover:bg-amber-200">Kopijuoti SQL</button>
          </div>
          <pre className="mt-4 overflow-auto rounded-xl border border-white/10 bg-black/40 p-4 text-[11px] text-amber-50/85"><code>{LOCKDOWN_SQL}</code></pre>
        </motion.div>
      )}

      {/* Status card */}
      <motion.div layout className={`relative overflow-hidden rounded-2xl border p-6 shadow-md backdrop-blur ${enabled ? "border-amber-500/40 bg-amber-500/[0.06]" : "border-emerald-500/30 bg-emerald-500/[0.04]"}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <motion.div animate={enabled ? { rotate: [0, -6, 6, 0] } : { rotate: 0 }} transition={{ duration: 2, repeat: enabled ? Infinity : 0 }}
              className={`grid h-12 w-12 place-items-center rounded-xl ${enabled ? "bg-gradient-to-br from-amber-400 to-rose-500 text-black shadow-lg shadow-amber-500/30" : "bg-gradient-to-br from-emerald-400 to-teal-500 text-black shadow-lg shadow-emerald-500/20"}`}>
              {enabled ? <AlertTriangle className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
            </motion.div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Būsena</p>
              <p className="text-lg font-bold">
                {enabled === null ? "…" : enabled ? `Lockdown AKTYVUS · ${selectedCode}` : "Sistema veikia normaliai"}
              </p>
            </div>
          </div>
          <button disabled={saving || enabled === null} onClick={() => toggle(!enabled)}
            className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-lg transition disabled:opacity-60 ${enabled ? "bg-emerald-500 text-black hover:bg-emerald-400" : "bg-gradient-to-r from-amber-500 to-rose-500 text-black hover:opacity-90"}`}>
            {enabled ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {enabled ? "Išjungti Lockdown" : "Įjungti Lockdown"}
          </button>
        </div>
      </motion.div>

      {/* Code picker */}
      <div className="rounded-2xl border border-border bg-card/70 p-6 shadow-md backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold">Pasirink klaidos kodą</h3>
            <p className="mt-1 text-xs text-muted-foreground">Kodas rodomas maintenance ekrane. Lankytojai gali jį pasitikrinti <Link to="/status" className="underline">/status</Link> puslapyje.</p>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs font-bold ${SEVERITY_CHIP[activeCode.severity]}`}>
            <Radio className="h-3 w-3" /> {activeCode.code}
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {LOCKDOWN_CODES.map((c) => {
            const active = c.code === selectedCode;
            return (
              <button key={c.code} type="button" onClick={() => setSelectedCode(c.code)}
                className={`group relative text-left rounded-xl border p-4 transition ${active ? `${SEVERITY_CHIP[c.severity]} ring-2 ring-primary/30` : "border-border bg-background/40 hover:border-primary/40 hover:bg-accent/40"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold">{c.code}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${SEVERITY_CHIP[c.severity]}`}>{c.severity}</span>
                </div>
                <p className="mt-2 text-sm font-semibold">{c.title}</p>
                <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{c.short}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Papildoma žinutė (nebūtina)</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={400} placeholder={activeCode.description}
            className="mt-2 w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary" />
          <button onClick={saveSettings} disabled={saving} className="mt-3 rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
            Išsaugoti nustatymus
          </button>
        </div>
      </div>

      {/* Health check */}
      <div className="rounded-2xl border border-border bg-card/70 p-6 shadow-md backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold">Sistemos patikra</h3>
            <p className="mt-1 text-xs text-muted-foreground">Duomenų bazė, autentifikacija, realtime kanalai.</p>
          </div>
          <button onClick={runHealthCheck} disabled={checking} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-accent disabled:opacity-60">
            <motion.span animate={checking ? { rotate: 360 } : { rotate: 0 }} transition={checking ? { duration: 0.9, repeat: Infinity, ease: "linear" } : { duration: 0.2 }} className="inline-flex">
              <RefreshCw className="h-4 w-4" />
            </motion.span>
            {checking ? "Tikrinama…" : "Paleisti patikrą"}
          </button>
        </div>
        {health && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {health.map((r) => (
              <div key={r.label} className={`rounded-xl border px-4 py-3 text-sm ${r.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-rose-500/40 bg-rose-500/10 text-rose-200"}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{r.label}</span>
                  <span className="shrink-0 text-xs font-bold uppercase">{r.ok ? "OK" : "FAIL"}</span>
                </div>
                <p className="mt-1 break-words text-[11px] opacity-80">{r.detail}</p>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
