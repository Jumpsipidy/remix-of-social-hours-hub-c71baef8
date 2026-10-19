import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
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
  head: () => ({ meta: [{ title: "Prieigos užrakinimas — Socialinės Valandos" }, { name: "description", content: "Incidento būsenos ir lankytojų pranešimo valdymas." }, { property: "og:title", content: "Prieigos užrakinimas — Socialinės Valandos" }, { property: "og:description", content: "Incidento ir saugios prieigos valdymas." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: LockdownPage,
});

const SEVERITY_CHIP = {
  info: "border-primary/40 bg-primary/10 text-primary",
  warn: "border-warning/40 bg-warning/10 text-warning",
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
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
      setEnabled(null);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = async (next: boolean) => {
    setSaving(true);
    try {
      const { settings } = await updateLockdownSettings({
        data: { lockdown_enabled: next, lockdown_message: message || null, lockdown_code: selectedCode },
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
  const [severityFilter, setSeverityFilter] = useState("all");
  const [codeSearch, setCodeSearch] = useState("");
  const choices = LOCKDOWN_CODES.filter((item) => (severityFilter === "all" || severityFilter === item.severity) && `${item.code} ${item.title}`.toLocaleLowerCase("lt").includes(codeSearch.toLocaleLowerCase("lt")));

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
          <Button onClick={async () => { await navigator.clipboard.writeText(LOCKDOWN_SQL); toast.success("SQL nukopijuotas"); }}
            className="mt-3 rounded-full bg-amber-300 px-3 py-1.5 text-xs font-bold text-black hover:bg-amber-200">
            Kopijuoti SQL
          </Button>
        </div>
      )}

      {/* Big status card */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-6 ${
          enabled
            ? "border-destructive/40 bg-destructive/5"
            : "border-success/30 bg-success/5"
        }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`grid h-14 w-14 place-items-center rounded-lg ${enabled ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}>
              {enabled ? <AlertTriangle className="h-7 w-7" /> : <ShieldCheck className="h-7 w-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex h-2 w-2 rounded-full ${enabled ? "bg-destructive" : "bg-success"}`} />
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Būsena</p>
              </div>
              <p className="mt-0.5 text-xl font-black">
                {enabled === null ? "Kraunama…" : enabled ? "AKTYVUS" : "Sistema veikia"}
              </p>
              {enabled && (
                <p className="mt-0.5 font-mono text-xs text-destructive">{selectedCode} · {activeCode.title}</p>
              )}
              {updatedAt && (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Atnaujinta: {new Date(updatedAt).toLocaleString("lt-LT")}
                </p>
              )}
            </div>
          </div>
          <Button
            disabled={saving || enabled === null}
            onClick={() => toggle(!enabled)}
            className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold shadow-lg transition disabled:opacity-60 ${
              enabled
                ? "bg-success text-success-foreground hover:bg-success/90"
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            }`}>
            {enabled ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {enabled ? "Išjungti" : "Įjungti"}
          </Button>
        </div>
      </div>

      {/* Code picker — collapsed simple */}
      <details open className="group rounded-2xl border border-border bg-card/60 backdrop-blur">
        <summary className="flex cursor-pointer items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="text-sm font-bold">Klaidos kodas</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Rodomas lankytojams</p>
          </div>
          <span className={`rounded-full border px-3 py-1 font-mono text-xs font-bold ${SEVERITY_CHIP[activeCode.severity]}`}>
            {activeCode.code}
          </span>
        </summary>
        <div className="border-t border-border/60 p-5 pt-4">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <input aria-label="Ieškoti incidento kodo" value={codeSearch} onChange={(event) => setCodeSearch(event.target.value)} placeholder="Ieškoti kodo ar pavadinimo" className="h-11 rounded-md border border-input bg-background px-3 text-sm" />
            <select aria-label="Incidento tipas" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)} className="h-11 rounded-md border border-input bg-background px-3 text-sm"><option value="all">Visi tipai</option><option value="info">Techninė priežiūra</option><option value="warn">Sutrikimai</option><option value="critical">Saugumo incidentai</option></select>
          </div>
          <div role="radiogroup" aria-label="Incidento kodas" className="grid gap-2 sm:grid-cols-2">
            {choices.map((c) => {
              const active = c.code === selectedCode;
              return (
                <Button variant="outline" role="radio" aria-checked={active} key={c.code} type="button" onClick={() => setSelectedCode(c.code)}
                  className={`h-auto min-h-20 flex-col items-stretch whitespace-normal rounded-lg border p-3 text-left ${
                    active
                      ? `${SEVERITY_CHIP[c.severity]} ring-2 ring-primary/30`
                      : "border-border bg-background/40 hover:border-primary/40"
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold">{c.code}</span>
                    <span className="text-[9px] font-bold uppercase opacity-70">{c.severity === "info" ? "Priežiūra" : c.severity === "warn" ? "Sutrikimas" : "Saugumas"}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold">{c.title}</p>
                </Button>
              );
            })}
          </div>

          <label className="mt-5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Papildoma žinutė (nebūtina)
          </label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} maxLength={400}
            placeholder="Palik tuščią — bus rodomas tik kodas"
            className="mt-2 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary" />
          <Button onClick={saveSettings} disabled={saving}
            className="mt-3 rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
            Išsaugoti
          </Button>
        </div>
      </details>

      {/* Quick actions row */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Button onClick={runHealthCheck} disabled={checking}
          className="flex items-center justify-between rounded-2xl border border-border bg-card/60 p-4 text-left transition hover:border-primary/40 hover:bg-accent/40 disabled:opacity-60">
          <div>
            <p className="text-sm font-bold">Sistemos patikra</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {healthSummary
                ? `${healthSummary.critical} kritinių · ${healthSummary.warnings} įspėjimų`
                : "Patikrinti paslaugų būseną"}
            </p>
          </div>
          <span>
            <RefreshCw className="h-5 w-5 text-primary" />
          </span>
        </Button>
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
