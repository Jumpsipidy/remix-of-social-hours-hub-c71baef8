import { useMemo, useState } from "react";
import { Bug, X, Send, ShieldCheck, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { deviceMeta, sessionId } from "@/lib/device-meta";
import { getActionBreadcrumbs } from "@/lib/user-breadcrumbs";
import { insertWithSchemaFallback } from "@/lib/schema-safe-insert";
import { escalateAppError } from "@/lib/error-escalation.functions";
import { captureScreenshot } from "@/lib/screenshot";

type Severity = "low" | "normal" | "high" | "critical";

/** Everything we attach automatically so a report is actually debuggable. */
function collectDiagnostics() {
  const dev = deviceMeta() as Record<string, unknown>;
  const crumbs = getActionBreadcrumbs(12).map((b) => ({
    t: b.t,
    kind: b.kind,
    label: b.label?.slice(0, 160),
    path: b.path,
  }));
  return {
    session: sessionId(),
    url: typeof window !== "undefined" ? window.location.href.slice(0, 500) : null,
    device: dev,
    breadcrumbs: crumbs,
    viewport:
      typeof window !== "undefined" ? `${window.innerWidth}×${window.innerHeight}` : null,
    online: typeof navigator !== "undefined" ? navigator.onLine : null,
    at: new Date().toISOString(),
  };
}

export function BugReportWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [severity, setSeverity] = useState<Severity>("normal");
  const [busy, setBusy] = useState(false);
  const [showDiag, setShowDiag] = useState(false);
  const [shot, setShot] = useState<string | null>(null);

  const diagPreview = useMemo(() => {
    if (!open) return null;
    const d = collectDiagnostics();
    return {
      device: `${d.device?.["browser"] ?? "?"} · ${d.device?.["os"] ?? "?"} · ${d.device?.["device"] ?? "?"}`,
      viewport: d.viewport,
      steps: d.breadcrumbs.length,
      shot: shot ? "ekrano nuotrauka pridėta" : "be nuotraukos",
      session: String(d.session).slice(0, 8),
    };
  }, [open, shot]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim().length < 5) {
      toast.error("Aprašyk problemą detaliau (min. 5 simboliai).");
      return;
    }
    setBusy(true);
    const diag = { ...collectDiagnostics(), screenshot: shot };
    const text = message.trim().slice(0, 4000);
    let reachedAdmin = false;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1) Persist. Extra columns are dropped automatically if the DB is older.
      const { error } = await insertWithSchemaFallback("bug_reports", {
        message: text,
        reporter_email: email.trim() || user?.email || null,
        reporter_user_id: user?.id ?? null,
        page_url: diag.url,
        severity,
        diagnostics: diag,
        session_id: diag.session,
      });
      if (!error) reachedAdmin = true;

      // 2) Always push to the alert channels (Discord/email) with full context,
      //    even if the insert failed — a report must never get lost.
      try {
        await escalateAppError({
          data: {
            level: severity === "critical" || severity === "high" ? "critical" : "warning",
            message: `[Vartotojo pranešimas · ${severity}] ${text.slice(0, 400)}`,
            path: diag.url ?? undefined,
            source: "bug-report",
            userEmail: (email.trim() || user?.email || undefined)?.slice(0, 200),
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : undefined,
            browser: String(diag.device?.["browser"] ?? "").slice(0, 60) || undefined,
            os: String(diag.device?.["os"] ?? "").slice(0, 60) || undefined,
            device: String(diag.device?.["device"] ?? "").slice(0, 30) || undefined,
            breadcrumbs: diag.breadcrumbs.slice(0, 15),
            test: true, // user-submitted: bypass noise filters & dedupe
          },
        });
        reachedAdmin = true;
      } catch {
        /* channel failure — insert may still have worked */
      }

      if (!reachedAdmin) throw new Error(error?.message ?? "Nepavyko išsiųsti");

      toast.success("Ačiū! Pranešimas su diagnostika išsiųstas.");
      setMessage("");
      setEmail("");
      setSeverity("normal");
      setShot(null);
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Nepavyko išsiųsti");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sv-bug-widget fixed bottom-20 left-4 z-[100] font-sans md:bottom-4" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
      {!open ? (
        <button onClick={() => { void captureScreenshot({ force: true }).then(setShot); setOpen(true); }}
          title="Pranešti apie klaidą"
          data-tour="bug"
          className="flex h-11 items-center gap-2 rounded-full border border-border bg-card/95 px-4 text-sm font-semibold shadow-lg backdrop-blur transition hover:scale-105">
          <Bug className="h-4 w-4 text-warning" /> <span className="hidden sm:inline">Pranešti apie klaidą</span>
        </button>
      ) : (
        <form onSubmit={submit} className="w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-warning/10 to-transparent px-4 py-3">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-warning" />
              <span className="text-sm font-bold">Pranešti apie klaidą</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-accent">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-3 p-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Kas neveikia / ką matai?</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={4000}
                placeholder="Aprašyk kuo detaliau — ką darei, ką tikėjaisi, ką pamatei…"
                className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-primary" required />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tavo el. paštas (nebūtina)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jei nori atsakymo"
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Svarbumas</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}
                className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-primary">
                <option value="low">Menkas</option>
                <option value="normal">Įprastas</option>
                <option value="high">Aukštas</option>
                <option value="critical">Kritinis</option>
              </select>
            </div>

            <button type="button" onClick={() => setShowDiag((v) => !v)}
              className="flex w-full items-center gap-1.5 rounded-lg border border-border bg-background/60 px-2.5 py-2 text-left text-[11px] font-semibold text-muted-foreground hover:bg-accent">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              Automatiškai pridedama diagnostika
              <ChevronDown className={`ml-auto h-3.5 w-3.5 transition ${showDiag ? "rotate-180" : ""}`} />
            </button>
            {showDiag && diagPreview && (
              <ul className="space-y-1 rounded-lg bg-background/60 p-2.5 text-[11px] text-muted-foreground">
                <li>Įrenginys: {diagPreview.device}</li>
                <li>Ekranas: {diagPreview.viewport}</li>
                <li>Paskutiniai veiksmai: {diagPreview.steps}</li>
                <li>Sesija: {diagPreview.session}…</li>
                <li>Puslapis, kuriame esi</li>
                <li>Ekrano nuotrauka: {shot ? "pridėta ✅" : "ruošiama…"}</li>
              </ul>
            )}

            <button type="submit" disabled={busy}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-primary py-2 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
              <Send className="h-3.5 w-3.5" /> {busy ? "Siunčiama…" : "Išsiųsti"}
            </button>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Pranešimas iškart keliauja į administratoriaus įspėjimus kartu su paskutiniais tavo veiksmais — taip bugą randame greičiau.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
