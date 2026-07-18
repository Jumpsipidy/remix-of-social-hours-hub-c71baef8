import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, Unlock, AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/lockdown")({
  head: () => ({ meta: [{ title: "Lockdown — Socialinės Valandos" }] }),
  component: LockdownPage,
});

function LockdownPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [health, setHealth] = useState<null | { db: boolean; auth: boolean; realtime: boolean }>(null);

  const load = async () => {
    const { data } = await supabase.from("site_settings").select("lockdown_enabled, lockdown_message").eq("id", true).maybeSingle();
    setEnabled(Boolean(data?.lockdown_enabled));
    setMessage(data?.lockdown_message ?? "");
  };

  useEffect(() => { load(); }, []);

  const toggle = async (next: boolean) => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("site_settings")
      .update({
        lockdown_enabled: next,
        lockdown_message: message || null,
        updated_at: new Date().toISOString(),
        updated_by: u.user?.id ?? null,
      })
      .eq("id", true);
    setSaving(false);
    if (error) return toast.error("Nepavyko: " + error.message);
    setEnabled(next);
    toast.success(next ? "🔒 Lockdown ĮJUNGTAS" : "🔓 Lockdown išjungtas");
  };

  const saveMessage = async () => {
    setSaving(true);
    const { error } = await supabase.from("site_settings").update({ lockdown_message: message || null }).eq("id", true);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Žinutė išsaugota");
  };

  const runHealthCheck = async () => {
    setChecking(true);
    setHealth(null);
    const results = { db: false, auth: false, realtime: false };
    try {
      const { error } = await supabase.from("site_settings").select("id").limit(1);
      results.db = !error;
    } catch {}
    try {
      const { data } = await supabase.auth.getSession();
      results.auth = !!data.session;
    } catch {}
    try {
      const ch = supabase.channel("healthcheck_" + Date.now());
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => resolve(), 2500);
        ch.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            results.realtime = true;
            clearTimeout(timer);
            resolve();
          }
        });
      });
      supabase.removeChannel(ch);
    } catch {}
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
            className="mt-4 grid gap-2 sm:grid-cols-3"
          >
            {[
              { label: "Duomenų bazė", ok: health.db },
              { label: "Autentifikacija", ok: health.auth },
              { label: "Realtime", ok: health.realtime },
            ].map((r) => (
              <div
                key={r.label}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
                  r.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-rose-500/40 bg-rose-500/10 text-rose-200"
                }`}
              >
                <span className="font-medium">{r.label}</span>
                <span className="text-xs font-bold uppercase">{r.ok ? "OK" : "FAIL"}</span>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
