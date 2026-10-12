import { useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Bug, Check, CheckCircle2, ChevronDown, ImagePlus, Loader2, Send, ShieldCheck, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deviceMeta, sessionId } from "@/lib/device-meta";
import { getActionBreadcrumbs } from "@/lib/user-breadcrumbs";
import { insertWithSchemaFallback } from "@/lib/schema-safe-insert";
import { escalateAppError } from "@/lib/error-escalation.functions";
import { captureScreenshot, prepareReportImage } from "@/lib/screenshot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Severity = "low" | "normal" | "high" | "critical";
const impacts: { value: Severity; label: string; detail: string }[] = [
  { value: "low", label: "Smulkmena", detail: "Išvaizda ar tekstas" },
  { value: "normal", label: "Trukdo", detail: "Veikia ne taip, kaip turėtų" },
  { value: "high", label: "Negaliu tęsti", detail: "Nepavyksta atlikti veiksmo" },
  { value: "critical", label: "Skubu", detail: "Duomenų ar saugumo problema" },
];

function collectDiagnostics() {
  const dev = deviceMeta() as Record<string, unknown>;
  return {
    session: sessionId(),
    url: typeof window !== "undefined" ? window.location.href.slice(0, 500) : null,
    device: dev,
    breadcrumbs: getActionBreadcrumbs(12).map((b) => ({ t: b.t, kind: b.kind, label: b.label?.slice(0, 160), path: b.path })),
    viewport: typeof window !== "undefined" ? `${window.innerWidth}×${window.innerHeight}` : null,
    online: typeof navigator !== "undefined" ? navigator.onLine : null,
    at: new Date().toISOString(),
  };
}

export function BugReportWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [email, setEmail] = useState("");
  const [severity, setSeverity] = useState<Severity>("normal");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [showDiag, setShowDiag] = useState(false);
  const [shot, setShot] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const captureId = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const diagPreview = useMemo(() => open ? collectDiagnostics() : null, [open]);

  function changeOpen(next: boolean) {
    if (busy) return;
    setOpen(next);
    if (next) { setSent(false); setError(""); }
    else { captureId.current += 1; setCapturing(false); }
  }

  async function addScreenshot() {
    const id = ++captureId.current;
    setCapturing(true);
    const image = await captureScreenshot({ force: true });
    if (id !== captureId.current) return;
    setCapturing(false);
    if (image) { setShot(image); setError(""); }
    else setError("Naršyklė neleido nufotografuoti puslapio. Pasirink ekrano nuotrauką iš savo įrenginio arba siųsk be jos.");
  }

  async function addFile(file: File | undefined) {
    if (!file) return;
    const id = ++captureId.current;
    setCapturing(true);
    const image = await prepareReportImage(file).catch(() => null);
    if (id !== captureId.current) return;
    setCapturing(false);
    if (image) { setShot(image); setError(""); }
    else setError("Pasirink PNG, JPG arba WebP nuotrauką iki 10 MB.");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (message.trim().length < 5) { setError("Trumpai aprašyk problemą (bent 5 simboliai)."); return; }
    setError("");
    setBusy(true);
    const diag = { ...collectDiagnostics(), screenshot: shot };
    const text = [message.trim(), steps.trim() && `Kaip pakartoti:\n${steps.trim()}`, expected.trim() && `Tikėjausi:\n${expected.trim()}`].filter(Boolean).join("\n\n").slice(0, 4000);
    let reachedAdmin = false;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insertError } = await insertWithSchemaFallback("bug_reports", {
        message: text, reporter_email: email.trim() || user?.email || null,
        reporter_user_id: user?.id ?? null, page_url: diag.url, severity,
        diagnostics: diag, session_id: diag.session,
      });
      if (!insertError) reachedAdmin = true;
      try {
        await escalateAppError({ data: {
          level: severity === "critical" || severity === "high" ? "critical" : "warning",
          message: `[Vartotojo pranešimas · ${severity}] ${text.slice(0, 400)}`,
          path: diag.url ?? undefined, source: "bug-report",
          userEmail: (email.trim() || user?.email || undefined)?.slice(0, 200),
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : undefined,
          browser: String(diag.device?.["browser"] ?? "").slice(0, 60) || undefined,
          os: String(diag.device?.["os"] ?? "").slice(0, 60) || undefined,
          device: String(diag.device?.["device"] ?? "").slice(0, 30) || undefined,
          breadcrumbs: diag.breadcrumbs.slice(0, 15), test: true,
        } });
        reachedAdmin = true;
      } catch { /* Retain the existing notification fallback. */ }
      // Alert delivery is not proof that the report appears in the admin board.
      if (insertError || !reachedAdmin) throw new Error("delivery-failed");
      setSent(true);
      setMessage(""); setSteps(""); setExpected(""); setEmail(""); setSeverity("normal"); setShot(null);
    } catch {
      setError("Pranešimo išsiųsti nepavyko. Tavo tekstas išsaugotas šiame lange — pabandyk dar kartą.");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" aria-label="Pranešti apie klaidą" title="Pranešti apie klaidą" data-tour="bug"
          className="sv-bug-widget fixed bottom-3 right-3 z-40 h-11 w-11 rounded-full border-border bg-card text-muted-foreground shadow-md hover:text-foreground sm:bottom-4 sm:right-4 sm:w-auto sm:rounded-lg sm:px-3">
          <Bug aria-hidden="true" /><span className="hidden sm:inline">Pranešti apie klaidą</span>
        </Button>
      </DialogTrigger>
      <DialogContent data-no-screenshot="true" className="bug-report-dialog gap-0 overflow-hidden p-0 font-sans sm:max-w-xl sm:p-0" onEscapeKeyDown={(e) => { if (busy) e.preventDefault(); }} onPointerDownOutside={(e) => { if (busy) e.preventDefault(); }}>
        <DialogHeader className="border-b border-border px-5 py-5 pr-14 sm:px-7 sm:pr-14">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-primary"><Bug className="h-4 w-4" aria-hidden="true" /> SOCIALINĖS VALANDOS · PAGALBA</div>
          <DialogTitle className="text-2xl leading-tight tracking-normal">{sent ? "Ačiū, kad pranešei." : "Kas nutiko?"}</DialogTitle>
          <DialogDescription className="pt-1">{sent ? "Tavo pranešimas išsiųstas administratoriui." : "Pastebėjai klaidą? Padėk mums ją sutvarkyti."}</DialogDescription>
        </DialogHeader>
        {sent ? (
          <div className="space-y-6 px-5 py-8 sm:px-7">
            <div className="flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-success/10 text-success"><CheckCircle2 className="h-6 w-6" /></div><div><h3 className="font-semibold">Pranešimas išsiųstas</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Problemos aprašymas ir puslapio informacija perduoti peržiūrai. Gali grįžti prie savo veiklos.</p></div></div>
            <Button className="h-11 w-full" onClick={() => changeOpen(false)}><ArrowLeft /> Grįžti į puslapį</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex min-h-0 flex-col">
            <fieldset disabled={busy} className="bug-report-scroll min-w-0 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
              <div className="space-y-2"><Label htmlFor="bug-description">Kas neveikia? <span className="text-destructive">*</span></Label><Textarea id="bug-description" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2200} rows={3} required placeholder="Pvz., paspaudžiu „Rezervuoti“, bet nieko neįvyksta…" className="min-h-24 resize-y text-base sm:text-sm" /></div>
              <div className="space-y-2"><Label htmlFor="bug-steps">Ką darei prieš tai? <span className="font-normal text-muted-foreground">(nebūtina)</span></Label><Textarea id="bug-steps" value={steps} onChange={(e) => setSteps(e.target.value)} maxLength={1000} rows={2} placeholder="Atidariau užduotį, pasirinkau laiką…" className="min-h-16 text-base sm:text-sm" /></div>
              <div className="space-y-2"><Label htmlFor="bug-expected">Kas turėjo įvykti? <span className="font-normal text-muted-foreground">(nebūtina)</span></Label><Input id="bug-expected" value={expected} onChange={(e) => setExpected(e.target.value)} maxLength={500} placeholder="Turėjo pasirodyti rezervacijos patvirtinimas" className="h-11 text-base sm:text-sm" /></div>
              <div className="space-y-2"><Label>Kiek tai trukdo?</Label><div role="radiogroup" aria-label="Problemos svarbumas" className="grid grid-cols-2 gap-2">{impacts.map((impact) => <label key={impact.value} className={`relative flex cursor-pointer items-start gap-2 rounded-md border p-3 transition-colors ${severity === impact.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}><input type="radio" name="bug-impact" value={impact.value} checked={severity === impact.value} onChange={() => setSeverity(impact.value)} className="peer sr-only" /><span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border peer-focus-visible:ring-2 peer-focus-visible:ring-ring ${severity === impact.value ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{severity === impact.value && <Check className="h-3 w-3" />}</span><span><span className="block text-sm font-medium">{impact.label}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{impact.detail}</span></span></label>)}</div></div>
              <div className="space-y-2"><Label htmlFor="bug-email">El. paštas atsakymui <span className="font-normal text-muted-foreground">(nebūtina)</span></Label><Input id="bug-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} placeholder="tavo@pastas.lt" className="h-11 text-base sm:text-sm" /></div>
              <div className="border-t border-border pt-4">
                <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Pridėti ekrano nuotraukos failą" className="sr-only" onChange={(event) => { void addFile(event.target.files?.[0]); event.target.value = ""; }} />
                {shot ? <div className="flex items-center gap-3"><img src={shot} alt="Pridedama ekrano nuotrauka" className="h-16 w-24 rounded-md border border-border object-cover" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">Ekrano nuotrauka pridėta</p><p className="text-xs text-muted-foreground">Prieš siųsdamas patikrink jos turinį.</p></div><Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Pašalinti ekrano nuotrauką" title="Pašalinti ekrano nuotrauką" onClick={() => setShot(null)}><Trash2 /></Button></div> : <><Button type="button" variant="outline" className="h-11 w-full" disabled={capturing} onClick={() => void addScreenshot()}>{capturing ? <Loader2 className="animate-spin" /> : <ImagePlus />}{capturing ? "Ruošiama nuotrauka…" : "Pridėti šio puslapio nuotrauką"}</Button><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Nebūtina. Nuotraukoje gali matytis asmeniniai duomenys.</p></>}
              </div>
              {!shot && <Button type="button" variant="secondary" className="h-11 w-full" disabled={capturing} onClick={() => fileInput.current?.click()}><ImagePlus /> Pasirinkti nuotrauką iš įrenginio</Button>}
              <div><Button type="button" variant="ghost" className="h-auto w-full justify-start whitespace-normal px-0 py-2 text-left text-xs text-muted-foreground" aria-expanded={showDiag} aria-controls="bug-diagnostics" onClick={() => setShowDiag(!showDiag)}><ShieldCheck className="text-success" /><span className="flex-1">Pridedama puslapio ir įrenginio informacija</span><ChevronDown className={showDiag ? "rotate-180" : ""} /></Button>{showDiag && diagPreview && <dl id="bug-diagnostics" className="mt-2 space-y-2 border-l-2 border-border pl-3 text-xs text-muted-foreground"><div><dt className="font-medium text-foreground">Puslapis</dt><dd className="break-all">{diagPreview.url?.split("?")[0]}</dd></div><div><dt className="font-medium text-foreground">Įrenginys</dt><dd>{String(diagPreview.device["browser"] ?? "—")} · {String(diagPreview.device["os"] ?? "—")} · {diagPreview.viewport}</dd></div><div><dt className="font-medium text-foreground">Paskutiniai veiksmai</dt><dd>{diagPreview.breadcrumbs.length}</dd></div></dl>}</div>
            </fieldset>
            <div className="space-y-3 border-t border-border bg-muted/20 px-5 py-4 sm:px-7">
              {error && <p role="alert" className="flex items-start gap-2 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
              <Button type="submit" disabled={busy || capturing} className="h-11 w-full">{busy ? <Loader2 className="animate-spin" /> : <Send />}{busy ? "Siunčiama…" : "Siųsti pranešimą"}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
