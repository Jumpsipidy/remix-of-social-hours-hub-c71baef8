import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, X, Copy, Check, BookOpen, ChevronDown, Wrench, Unplug, ShieldAlert, Mail } from "lucide-react";
import { LOCKDOWN_CODES, getLockdownCode, type LockdownCode } from "@/lib/lockdown-codes";
import { verifyBypassCode, verifyBypassToken, bypassStatus } from "@/lib/lockdown-bypass.functions";
import { getPublicSiteSettings } from "@/lib/site-settings.functions";

import { Captcha } from "@/components/captcha";
import { Button } from "@/components/ui/button";
import { Dialog, DialogPortal, DialogOverlay, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";


const BYPASS_TOKEN_KEY = "sv_lockdown_bypass_token_v2";
const TRIGGER_WORD = "jumpsipidy";

export function LockdownGate({ children }: { children?: ReactNode }) {
  const [lockdown, setLockdown] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [codeId, setCodeId] = useState<string | null>(null);
  const [bypassed, setBypassed] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeChecking, setCodeChecking] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaProof, setCaptchaProof] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshOk, setRefreshOk] = useState<null | boolean>(null);
  const [copied, setCopied] = useState(false);
  const [autoTick, setAutoTick] = useState(60);
  const bufferRef = useRef("");
  const verifyToken = useServerFn(verifyBypassToken);
  const readBypassStatus = useServerFn(bypassStatus);
  const readPublicSettings = useServerFn(getPublicSiteSettings);
  const [settingsFailed, setSettingsFailed] = useState(false);

  const submitCodeFn = useServerFn(verifyBypassCode);

  useEffect(() => {
    let alive = true;
    const t = (() => { try { return sessionStorage.getItem(BYPASS_TOKEN_KEY); } catch { return null; } })();
    if (!t) return;
    verifyToken({ data: { token: t } })
      .then((r) => { if (alive && r?.ok) setBypassed(true); else { try { sessionStorage.removeItem(BYPASS_TOKEN_KEY); } catch {} } })
      .catch(() => {});
    return () => { alive = false; };
  }, [verifyToken]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data, error } = await readPublicSettings();
        if (!mounted) return;
        if (error) throw new Error(error.message);
        if (!data) throw new Error("Būsena negauta");
        setSettingsFailed(false);
        setLockdown(Boolean(data.lockdown_enabled));
        setMessage(data?.lockdown_message ?? null);
        setCodeId(data?.lockdown_code ?? null);
      } catch {
        // Server function not reachable (e.g. Lovable preview / cold worker) →
        // fall back to the public RPC exposed on the database directly.
        try {
          const { supabase } = await import("@/integrations/supabase/client");
          const { data, error } = await supabase.rpc("get_lockdown_public");
          if (error) throw error;
          const row = Array.isArray(data) ? data[0] : data;
          if (!mounted) return;
          if (!row || typeof row.lockdown_enabled !== "boolean") throw new Error("Būsena negauta");
          setSettingsFailed(false);
          setLockdown(row.lockdown_enabled);
          setMessage(row?.lockdown_message ?? null);
          setCodeId(row?.lockdown_code ?? null);
        } catch {
          if (mounted) setSettingsFailed(true);
        }
      }

    };
    load();
    const poll = setInterval(load, 15_000);
    return () => { mounted = false; clearInterval(poll); };
  }, []);

  useEffect(() => {
    if (!lockdown || bypassed) return;
    setAutoTick(60);
    const tick = setInterval(() => {
      setAutoTick((s) => {
        if (s <= 1) { runCheck(true); return 60; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockdown, bypassed]);

  useEffect(() => {
    if (!lockdown || bypassed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.length !== 1) return;
      bufferRef.current = (bufferRef.current + e.key.toLowerCase()).slice(-TRIGGER_WORD.length);
      if (bufferRef.current === TRIGGER_WORD) { bufferRef.current = ""; setShowCodeModal(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lockdown, bypassed]);

  const visible = !bypassed && (lockdown !== false || settingsFailed);
  useEffect(() => { window.dispatchEvent(new CustomEvent("sv:access-blocked", { detail: visible })); return () => { window.dispatchEvent(new CustomEvent("sv:access-blocked", { detail: false })); }; }, [visible]);
  const errInfo = getLockdownCode(codeId);
  const severity = errInfo?.severity ?? "warn";
  const displayCode = settingsFailed ? "E-4001" : errInfo?.code ?? codeId ?? "E-9000";

  const submitCode = async () => {
    if (codeChecking) return;
    if (captchaRequired && !captchaProof) {
      setCodeError("Prašome įrodyti, kad esate žmogus.");
      return;
    }
    setCodeChecking(true);
    setCodeError(null);
    try {
      const r = await submitCodeFn({ data: { code: code.trim(), captchaProof: captchaProof ?? "" } });
      if (r?.ok) {
        try { sessionStorage.setItem(BYPASS_TOKEN_KEY, r.token); } catch {}
        setBypassed(true); setShowCodeModal(false);
      } else if ((r as { locked?: boolean; retryAfter?: number } | undefined)?.locked) {
        const secs = (r as { retryAfter?: number }).retryAfter ?? 900;
        setCodeError(`Užblokuota. Bandyk po ${Math.ceil(secs / 60)} min.`);
      } else {
        if ((r as { captchaRequired?: boolean } | undefined)?.captchaRequired) {
          setCaptchaRequired(true);
          setCaptchaProof(null);
        }
        setCodeError("Neteisingas kodas.");
      }
    } catch {
      setCodeError("Nepavyko patikrinti. Bandyk dar kartą.");
    } finally { setCodeChecking(false); }
  };

  // When the code modal opens, sync failed-attempt state so captcha shows if needed
  useEffect(() => {
    if (!showCodeModal) return;
    let alive = true;
    readBypassStatus()
      .then((r) => { if (alive && r) { setCaptchaRequired(Boolean(r.captchaRequired)); } })
      .catch(() => {});
    return () => { alive = false; };
  }, [showCodeModal, readBypassStatus]);


  async function runCheck(_auto = false) {
    setRefreshing(true); setRefreshOk(null);
    try {
      let enabled = false;
      let msg: string | null = null;
      let cid: string | null = null;
      try {
        const { data, error } = await readPublicSettings();
        if (error) throw new Error(error.message);
        if (!data) throw new Error("Būsena negauta");
        enabled = Boolean(data.lockdown_enabled);
        msg = data?.lockdown_message ?? null;
        cid = data?.lockdown_code ?? null;
      } catch {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data, error } = await supabase.rpc("get_lockdown_public");
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        if (!row || typeof row.lockdown_enabled !== "boolean") throw new Error("Būsena negauta");
        enabled = row.lockdown_enabled;
        msg = row?.lockdown_message ?? null;
        cid = row?.lockdown_code ?? null;
      }
      setSettingsFailed(false);
      if (!enabled) {
        setRefreshOk(true);
        setLockdown(false);
      } else {
        setLockdown(true);
        setMessage(msg);
        setCodeId(cid);
        setRefreshOk(false);
      }
    } catch { setSettingsFailed(true); setRefreshOk(false); }
    finally { setRefreshing(false); setTimeout(() => setRefreshOk(null), 2500); }
  }

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(displayCode); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  const grouped = useMemo(() => {
    const g: Record<LockdownCode["severity"], LockdownCode[]> = { info: [], warn: [], critical: [] };
    for (const c of LOCKDOWN_CODES) g[c.severity].push(c);
    return g;
  }, []);

  return (
    <>
      {visible ? (
        lockdown === null && !settingsFailed ? (
          <div key="boot" role="status" aria-label="Tikrinama saugi prieiga" className="sv-boot fixed inset-0 z-[9999] grid place-items-center bg-background text-foreground">
            <div className="sv-boot-inner flex flex-col items-center gap-6 px-6 text-center">
              <div className="sv-boot-ring" aria-hidden><span className="sv-boot-core" /></div>
              <p className="sv-boot-text text-sm font-semibold tracking-wide text-muted-foreground">Tikrinama saugi prieiga…</p>
              <div className="sv-boot-bar" aria-hidden />
            </div>
          </div>
        ) : (
        <div key="lockdown" role="alert" className="lockdown-ui fixed inset-0 z-[9999] overflow-y-auto bg-background text-foreground">
          <div className="flex min-h-dvh items-center justify-center p-4 sm:p-8">
            <section aria-labelledby="lockdown-title" className="lockdown-panel w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-card">
              <header className="lockdown-header flex items-center justify-between gap-3 px-6 py-4 sm:px-8">
                <div className="flex min-w-0 items-center gap-3">
                  <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                  <span className="text-xs font-bold">Socialinės Valandos · Sistemos pranešimas</span>
                </div>
                <span className="hidden shrink-0 font-mono text-xs sm:block">{displayCode}</span>
              </header>
              <div className="px-6 py-8 text-center sm:px-16 sm:py-12">
                <div className="mb-8 flex justify-center" aria-hidden>
                  <div className="lockdown-symbol grid h-24 w-24 place-items-center rounded-lg bg-accent text-primary">
                    {severity === "info" ? <Wrench className="h-12 w-12" strokeWidth={1.5} /> : severity === "critical" ? <ShieldAlert className="h-12 w-12" strokeWidth={1.5} /> : <Unplug className="h-12 w-12" strokeWidth={1.5} />}
                  </div>
                </div>
                <h1 id="lockdown-title" className="text-3xl font-black leading-tight sm:text-5xl">{settingsFailed ? "Nepavyko patikrinti saugios prieigos" : lockdown === null ? "Tikrinama saugi prieiga" : errInfo?.title ?? "Sistema laikinai nepasiekiama"}</h1>
                <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {settingsFailed ? "Svetainės būsena nepasiekiama. Prieiga neatveriama, kol nepavyks jos patikrinti. Pabandyk dar kartą." : lockdown === null ? "Palauk, kol bus patikrinta svetainės būsena." : message?.trim() || errInfo?.description || "Įvyko sistemos sutrikimas. Šiuo metu platforma nepasiekiama. Pabandyk patikrinti būseną po kelių minučių."}
                </p>
                <dl className="my-8 grid grid-cols-1 gap-4 text-left sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-muted p-5">
                    <dt className="text-xs font-semibold text-muted-foreground">Incidento kodas</dt>
                    <dd className="mt-2">
                      <Button variant="ghost" onClick={copyCode} title="Kopijuoti kodą" aria-label="Kopijuoti incidento kodą" className="h-auto min-h-11 justify-start gap-3 px-0 font-mono text-lg font-bold hover:bg-transparent hover:text-primary">
                        {displayCode}{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </dd>
                    <dt className="mt-3 text-xs text-muted-foreground">Numatoma trukmė</dt>
                    <dd className="mt-1 text-sm font-medium">{errInfo?.eta ?? "Nežinoma"}</dd>
                  </div>
                  <div className="rounded-lg border border-border bg-muted p-5">
                    <dt className="text-xs font-semibold text-muted-foreground">Dabartinė būsena</dt>
                    <dd className="mt-2 flex min-h-11 items-center gap-2.5 text-lg font-bold"><span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />{severity === "info" ? "Techninė priežiūra" : severity === "critical" ? "Saugumo patikra" : "Sistemos sutrikimas"}</dd>
                    <dt className="mt-3 text-xs text-muted-foreground">Kitas patikrinimas</dt>
                    <dd className="mt-1 text-sm font-medium tabular-nums">{autoTick} s</dd>
                  </div>
                </dl>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Button onClick={() => runCheck(false)} disabled={refreshing} className="lockdown-primary h-auto min-h-14 whitespace-normal rounded-lg px-4 py-4 text-sm font-bold">
                    <RefreshCw className={refreshing ? "h-4 w-4" : "h-4 w-4"} />{refreshing ? "Tikrinama…" : "Patikrinti dar kartą"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowGuide(true)} className="h-auto min-h-14 whitespace-normal rounded-lg border-2 px-4 py-4 text-sm font-bold"><BookOpen className="h-4 w-4 shrink-0" />Ką reiškia šis kodas?</Button>
                </div>
                <div role="status" className="mt-4 min-h-5 text-xs text-muted-foreground">
                  {refreshOk === false ? "Sistema vis dar nepasiekiama — pabandyk po minutės." : refreshOk === true ? "Sistema veikia. Grįžtame." : "Būsena tikrinama automatiškai."}
                </div>
              </div>
              <footer className="flex flex-col items-center justify-center gap-3 border-t border-border bg-muted px-6 py-6 text-center sm:flex-row sm:text-left">
                <div className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-card text-muted-foreground"><Mail className="h-5 w-5" /></div>
                <div><p className="text-xs font-semibold text-muted-foreground">Techninė pagalba</p><a href="mailto:pagalba@socialinesvalandos.dev" className="mt-1 block break-all text-sm font-bold underline decoration-border underline-offset-4 hover:text-primary">pagalba@socialinesvalandos.dev</a></div>
              </footer>
            </section>
          </div>
          <Dialog open={showGuide} onOpenChange={setShowGuide}>
            <DialogPortal>
              <DialogOverlay className="lockdown-dialog-overlay z-[10001]" />
              <DialogPrimitive.Content className="lockdown-ui fixed inset-x-4 top-[50%] z-[10002] mx-auto max-h-[85dvh] max-w-2xl translate-y-[-50%] overflow-y-auto rounded-lg border border-border bg-card p-6 sm:p-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div><DialogTitle>Klaidų kodų gidas</DialogTitle><DialogDescription className="mt-2">Incidento priežastis ir orientacinė trukmė.</DialogDescription></div>
                  <DialogPrimitive.Close asChild><Button variant="ghost" size="icon" aria-label="Uždaryti kodų gidą"><X className="h-4 w-4" /></Button></DialogPrimitive.Close>
                </div>
                {(["critical", "warn", "info"] as const).map((sev) => grouped[sev].length ? (
                  <div key={sev} className="mb-6">
                    <p className="mb-3 text-xs font-semibold text-muted-foreground">{sev === "critical" ? "Saugumo incidentai" : sev === "warn" ? "Sutrikimai" : "Techninė priežiūra"}</p>
                    <ul className="divide-y divide-border">
                      {grouped[sev].map((c) => <li key={c.code} className={c.code === displayCode ? "rounded-lg bg-muted" : ""}>
                        <details className="group"><summary className="flex cursor-pointer flex-wrap items-center gap-3 p-3 marker:hidden [&::-webkit-details-marker]:hidden"><span className="font-mono text-xs font-bold text-primary">{c.code}</span><span className="min-w-0 flex-1 text-sm font-semibold">{c.title}</span><ChevronDown className="h-4 w-4 shrink-0 transition group-open:rotate-180" /></summary><div className="px-3 pb-4 text-sm leading-relaxed text-muted-foreground"><p>{c.description}</p><p className="mt-2 font-medium">Numatoma trukmė: {c.eta}</p></div></details>
                      </li>)}
                    </ul>
                  </div>
                ) : null)}
                <p className="text-xs text-muted-foreground">Trukmė orientacinė. Būseną galima patikrinti pagrindiniame ekrane.</p>
              </DialogPrimitive.Content>
            </DialogPortal>
          </Dialog>
          <Dialog open={showCodeModal} onOpenChange={setShowCodeModal}>
            <DialogPortal>
              <DialogOverlay className="lockdown-dialog-overlay z-[10001]" />
              <DialogPrimitive.Content className="lockdown-ui fixed inset-x-4 top-[50%] z-[10002] mx-auto max-h-[85dvh] max-w-sm translate-y-[-50%] overflow-y-auto rounded-lg border border-border bg-card p-6">
                <div className="flex items-start justify-between gap-3"><div><DialogTitle>Administracinė prieiga</DialogTitle><DialogDescription className="mt-2">Įvesk prieigos kodą.</DialogDescription></div><DialogPrimitive.Close asChild><Button variant="ghost" size="icon" aria-label="Uždaryti prieigos langą"><X className="h-4 w-4" /></Button></DialogPrimitive.Close></div>
                <input autoFocus aria-label="Prieigos kodas" type="password" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitCode()} disabled={codeChecking} maxLength={10} className={`mt-5 w-full rounded-xl border bg-muted px-4 py-3 text-center font-mono text-2xl outline-none focus:ring-2 focus:ring-ring ${codeError ? "border-destructive" : "border-border"}`} placeholder="••••" />
                {codeError && <p role="alert" className="mt-2 text-center text-xs text-destructive">{codeError}</p>}
                {captchaRequired && <div className="mt-4"><Captcha tone="light" onVerify={(proof) => setCaptchaProof(proof)} /></div>}
                <Button onClick={submitCode} disabled={codeChecking || (captchaRequired && !captchaProof)} className="lockdown-primary mt-4 min-h-12 w-full rounded-xl">{codeChecking && <RefreshCw className="h-4 w-4" />}{codeChecking ? "Tikrinama…" : "Patvirtinti"}</Button>
              </DialogPrimitive.Content>
            </DialogPortal>
          </Dialog>
        </div>
      ) : children}
    </>
  );
}
