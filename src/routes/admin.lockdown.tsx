import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, Unlock, AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { readSiteSettings } from "@/lib/site-settings";
import {
  adminGetLockdownSettings,
  adminRunLockdownHealth,
  adminUpdateLockdownSettings,
} from "@/lib/lockdown.functions";

const LOCKDOWN_SQL = `CREATE TABLE IF NOT EXISTS public.site_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  lockdown_enabled BOOLEAN NOT NULL DEFAULT false,
  lockdown_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.site_settings (id, lockdown_enabled, lockdown_message)
VALUES (true, false, NULL)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "site_settings read all" ON public.site_settings;
CREATE POLICY "site_settings read all"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "site_settings admin update" ON public.site_settings;
CREATE POLICY "site_settings admin update"
ON public.site_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'site_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';`;

export const Route = createFileRoute("/admin/lockdown")({
  head: () => ({ meta: [{ title: "Lockdown — Socialinės Valandos" }] }),
  component: LockdownPage,
});

function LockdownPage() {
  const { user, profile } = useAuth();
  const getLockdownSettings = useServerFn(adminGetLockdownSettings);
  const updateLockdownSettings = useServerFn(adminUpdateLockdownSettings);
  const runLockdownHealth = useServerFn(adminRunLockdownHealth);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
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
        data: { lockdown_enabled: next, lockdown_message: message || null },
      });
      setSetupProblem(null);
      setEnabled(settings.lockdown_enabled);
      setMessage(settings.lockdown_message ?? "");
      toast.success(next ? "🔒 Lockdown ĮJUNGTAS" : "🔓 Lockdown išjungtas");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nepavyko pakeisti Lockdown būsenos");
    } finally {
      setSaving(false);
    }
  };

  const saveMessage = async () => {
    setSaving(true);
    try {
      const { settings } = await updateLockdownSettings({ data: { lockdown_message: message || null } });
      setSetupProblem(null);
      setMessage(settings.lockdown_message ?? "");
      toast.success("Žinutė išsaugota");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nepavyko išsaugoti žinutės");
    } finally {
      setSaving(false);
    }
  };

  const runHealthCheck = async () => {
    setChecking(true);
    setHealth(null);
    const results: Array<{ label: string; ok: boolean; detail: string }> = [];

    results.push({
      label: "Naršyklės sesija",
      ok: Boolean(user),
      detail: user ? user.email ?? user.id : "vartotojas neprisijungęs",
    });
    results.push({
      label: "Admin rolė UI būsenoje",
      ok: profile?.role === "admin",
      detail: profile?.role ? `rolė: ${profile.role}` : "profilis dar neužkrautas",
    });

    try {
      const { error, schemaMissing } = await readSiteSettings();
      results.push({
        label: "Viešas Lockdown API",
        ok: !error,
        detail: error
          ? schemaMissing
            ? "schemos talpykla dar nemato site_settings — pabandyk po kelių sekundžių"
            : error.message
          : "lentelė pasiekiama lankytojams",
      });
    } catch (error) {
      results.push({ label: "Viešas Lockdown API", ok: false, detail: error instanceof Error ? error.message : "nežinoma klaida" });
    }

    try {
      const serverHealth = await runLockdownHealth();
      results.push(...serverHealth.checks);
    } catch (error) {
      results.push({
        label: "Admin serverio patikra",
        ok: false,
        detail: error instanceof Error ? error.message : "nepavyko paleisti serverio patikros",
      });
    }

    try {
      const ch = supabase.channel("healthcheck_" + Date.now());
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => resolve(), 2500);
        ch.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            results.push({ label: "Realtime kanalas", ok: true, detail: "kanalas prisijungė" });
            clearTimeout(timer);
            resolve();
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

    // Simulate a moment for the animation
    await new Promise((r) => setTimeout(r, 900));
    setHealth(results);
    setChecking(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Avarinis režimas</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">Lockdown valdymas</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Įjungus Lockdown, kiekvienas lankytojas mato techninės priežiūros ekraną. Super admin gali laisvai naršyti.
          Bypass frazė: <code className="rounded bg-accent px-1 text-foreground">jumpsipidy</code> + kodas.
        </p>
      </div>

      {setupProblem && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] p-5 shadow-md"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-amber-100">Reikia sukurti Lockdown lentelę</h2>
              <p className="mt-1 max-w-2xl text-sm text-amber-100/75">
                OAuth čia ne prie ko — Google ir Discord gali veikti, bet Lockdown neveiks, kol tavo realioje duomenų bazėje nėra
                <code className="mx-1 rounded bg-black/30 px-1">public.site_settings</code> lentelės.
              </p>
              <p className="mt-2 text-xs text-amber-100/60">{setupProblem}</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(LOCKDOWN_SQL);
                toast.success("SQL nukopijuotas");
              }}
              className="rounded-full bg-amber-300 px-4 py-2 text-xs font-bold text-black shadow-lg shadow-amber-500/20 hover:bg-amber-200"
            >
              Kopijuoti SQL
            </button>
          </div>
          <pre className="mt-4 max-h-72 overflow-auto rounded-xl border border-white/10 bg-black/40 p-4 text-[11px] leading-relaxed text-amber-50/85">
            <code>{LOCKDOWN_SQL}</code>
          </pre>
        </motion.div>
      )}

      {/* Status card */}
      <motion.div
        layout
        className={`relative overflow-hidden rounded-2xl border p-6 shadow-md backdrop-blur ${
          enabled ? "border-amber-500/40 bg-amber-500/[0.06]" : "border-emerald-500/30 bg-emerald-500/[0.04]"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={enabled ? { rotate: [0, -6, 6, 0] } : { rotate: 0 }}
              transition={{ duration: 2, repeat: enabled ? Infinity : 0 }}
              className={`grid h-12 w-12 place-items-center rounded-xl ${
                enabled
                  ? "bg-gradient-to-br from-amber-400 to-rose-500 text-black shadow-lg shadow-amber-500/30"
                  : "bg-gradient-to-br from-emerald-400 to-teal-500 text-black shadow-lg shadow-emerald-500/20"
              }`}
            >
              {enabled ? <AlertTriangle className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
            </motion.div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Būsena</p>
              <p className="text-lg font-bold">
                {enabled === null ? "…" : enabled ? "Lockdown AKTYVUS" : "Sistema veikia normaliai"}
              </p>
            </div>
          </div>
          <button
            disabled={saving || enabled === null}
            onClick={() => toggle(!enabled)}
            className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-lg transition disabled:opacity-60 ${
              enabled
                ? "bg-emerald-500 text-black hover:bg-emerald-400"
                : "bg-gradient-to-r from-amber-500 to-rose-500 text-black hover:opacity-90"
            }`}
          >
            {enabled ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {enabled ? "Išjungti Lockdown" : "Įjungti Lockdown"}
          </button>
        </div>
      </motion.div>

      {/* Message editor */}
      <div className="rounded-2xl border border-border bg-card/70 p-6 shadow-md backdrop-blur">
        <h3 className="font-display text-lg font-bold">Pranešimas lankytojams</h3>
        <p className="mt-1 text-xs text-muted-foreground">Rodomas techninės priežiūros ekrane. Palik tuščią – bus numatytas tekstas.</p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={400}
          placeholder="Šiuo metu tobuliname sistemą…"
          className="mt-3 w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={saveMessage}
          disabled={saving}
          className="mt-3 rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
        >
          Išsaugoti žinutę
        </button>
      </div>

      {/* Health check */}
      <div className="rounded-2xl border border-border bg-card/70 p-6 shadow-md backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold">Sistemos patikra</h3>
            <p className="mt-1 text-xs text-muted-foreground">Duomenų bazė, autentifikacija, realtime kanalai.</p>
          </div>
          <button
            onClick={runHealthCheck}
            disabled={checking}
            className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-accent disabled:opacity-60"
          >
            <motion.span
              animate={checking ? { rotate: 360 } : { rotate: 0 }}
              transition={checking ? { duration: 0.9, repeat: Infinity, ease: "linear" } : { duration: 0.2 }}
              className="inline-flex"
            >
              <RefreshCw className="h-4 w-4" />
            </motion.span>
            {checking ? "Tikrinama…" : "Paleisti patikrą"}
          </button>
        </div>
        {health && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
          >
            {health.map((r) => (
              <div
                key={r.label}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  r.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-rose-500/40 bg-rose-500/10 text-rose-200"
                }`}
              >
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
