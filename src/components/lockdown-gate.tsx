import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, X, Copy, Check, BookOpen, ChevronDown, ShieldAlert } from "lucide-react";
import { LOCKDOWN_CODES, getLockdownCode, type LockdownCode } from "@/lib/lockdown-codes";
import { verifyBypassCode, verifyBypassToken, bypassStatus } from "@/lib/lockdown-bypass.functions";
import { getPublicSiteSettings } from "@/lib/site-settings.functions";
import { readPublicLockdown } from "@/lib/public-lockdown";

import { IncidentScreen } from "@/components/incident-screen";
import { appendAccessKey, lockdownBlocks, parseLockdownState } from "@/lib/lockdown-state";
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

  async function readStatus() {
    // A session-free client avoids auth refresh locks or an expired visitor JWT
    // delaying the public status RPC. No user credentials are required here.
    try {
      const { data, error } = await readPublicLockdown();
      const state = parseLockdownState(data);
      if (!error && state) return state;
    } catch { /* Try the independent server path. */ }
    const { data, error } = await readPublicSettings();
    const state = parseLockdownState(data);
    if (error || !state) throw new Error("Būsena negauta");
    return state;
  }

  useEffect(() => {
    let mounted = true;
    let inFlight = false;
    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        let state = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try { state = await readStatus(); break; }
          catch { if (attempt < 2) await new Promise((r) => setTimeout(r, 250)); }
        }
        if (!mounted) return;
        if (!state) { setSettingsFailed(true); return; }
        setSettingsFailed(false);
        setLockdown(state.lockdown_enabled);
        setMessage(state.lockdown_message);
        setCodeId(state.lockdown_code);
      } finally { inFlight = false; }
    };
    void load();
    const poll = setInterval(load, 15_000);
    return () => { mounted = false; clearInterval(poll); };
  }, [readPublicSettings]);

  useEffect(() => {
    if (bypassed || (lockdown === false && !settingsFailed)) return;
    setAutoTick(15);
    const tick = setInterval(() => {
      setAutoTick((s) => {
        if (s <= 1) return 15;
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockdown, bypassed, settingsFailed]);

  useEffect(() => {
    if (bypassed || (lockdown === false && !settingsFailed)) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      bufferRef.current = appendAccessKey(bufferRef.current, e.key);
      if (bufferRef.current === TRIGGER_WORD) { bufferRef.current = ""; setShowCodeModal(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lockdown, bypassed, settingsFailed]);

  const visible = lockdownBlocks(lockdown, settingsFailed, bypassed);
  useEffect(() => {
    document.documentElement.dataset.accessBlocked = String(visible);
    window.dispatchEvent(new CustomEvent("sv:access-blocked", { detail: visible }));
    return () => { document.documentElement.dataset.accessBlocked = "true"; };
  }, [visible]);
  const errInfo = getLockdownCode(codeId);
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
      const state = await readStatus();
      const enabled = state.lockdown_enabled;
      const msg = state.lockdown_message;
      const cid = state.lockdown_code;
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
          <IncidentScreen
            mark={settingsFailed ? "!" : "SV"}
            code={displayCode}
            title={settingsFailed ? "Nepavyksta susisiekti" : errInfo?.title ?? "Sistema laikinai nepasiekiama"}
            description={settingsFailed ? "Svetainės būsena dar nepatvirtinta. Bandome prisijungti iš naujo — tau nieko daryti nereikia. Tai ryšio sutrikimas, ne patvirtintas saugumo incidentas." : (message?.startsWith("[auto]") ? errInfo?.description : message?.trim()) || errInfo?.description || "Šiuo metu svetainė laikinai uždaryta. Prieiga bus atverta, kai administratorius patvirtins, kad saugu tęsti."}
            icon={<ShieldAlert className="h-4 w-4" />}
            details={<div className="flex flex-wrap items-start justify-between gap-4 text-xs">
              <div><p className="text-muted-foreground">{settingsFailed ? "Patikros kodas" : "Incidento kodas"}</p><Button variant="ghost" onClick={copyCode} aria-label="Kopijuoti incidento kodą" className="mt-1 h-9 px-0 font-mono">{displayCode}{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</Button></div>
              <div className="text-right"><p className="text-muted-foreground">{settingsFailed ? "Ryšio būsena" : "Numatoma trukmė"}</p><p className="mt-2 font-semibold">{settingsFailed ? "Laukiama patvirtinimo" : errInfo?.eta ?? "Dar nepatvirtinta"}</p><p className="mt-2 text-muted-foreground">Kita patikra po {autoTick} s</p></div>
            </div>}
            actions={<><Button onClick={() => runCheck(false)} disabled={refreshing} className="min-h-12"><RefreshCw className="h-4 w-4" />{refreshing ? "Tikrinama…" : "Patikrinti dar kartą"}</Button>{!settingsFailed && <Button variant="outline" onClick={() => setShowGuide(true)} className="min-h-12"><BookOpen className="h-4 w-4" />Apie sutrikimą</Button>}<p role="status" className="w-full min-h-5 text-xs text-muted-foreground">{refreshOk === false ? "Prieiga dar neatverta. Patikra bus kartojama." : "Būsena tikrinama automatiškai."}</p></>}
          />
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
                <input autoFocus aria-label="Prieigos kodas" type="password" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitCode()} disabled={codeChecking} maxLength={32} className={`mt-5 w-full rounded-xl border bg-muted px-4 py-3 text-center font-mono text-2xl outline-none focus:ring-2 focus:ring-ring ${codeError ? "border-destructive" : "border-border"}`} placeholder="••••" />
                {codeError && <p role="alert" className="mt-2 text-center text-xs text-destructive">{codeError}</p>}
                {captchaRequired && <div className="mt-4"><Captcha tone="light" onVerify={(proof) => setCaptchaProof(proof)} /></div>}
                <Button onClick={submitCode} disabled={codeChecking || (captchaRequired && !captchaProof)} className="lockdown-primary mt-4 min-h-12 w-full rounded-xl">{codeChecking && <RefreshCw className="h-4 w-4" />}{codeChecking ? "Tikrinama…" : "Patvirtinti"}</Button>
              </DialogPrimitive.Content>
            </DialogPortal>
          </Dialog>
        </div>
        )
      ) : children}
    </>
  );
}
