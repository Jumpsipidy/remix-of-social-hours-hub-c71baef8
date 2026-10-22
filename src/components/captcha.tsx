import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { RefreshCw, ShieldCheck, Loader2 } from "lucide-react";
import { issueMathChallenge, solveCaptcha, captchaConfig } from "@/lib/captcha.functions";
import { Button } from "@/components/ui/button";
import { captchaMode } from "@/lib/captcha-state";

type Props = {
  onVerify: (proof: string, expiresAt: number) => void;
  /** Optional theme hint. */
  tone?: "dark" | "light";
};

// Declare grecaptcha global for TS
declare global {
  interface Window {
    grecaptcha?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void; "expired-callback"?: () => void; "error-callback"?: () => void; theme?: "light" | "dark" }) => number;
      reset: (id?: number) => void;
    };
    onCaptchaScriptLoad?: () => void;
  }
}

let recaptchaScriptPromise: Promise<void> | null = null;
function loadRecaptchaScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.grecaptcha?.render) return Promise.resolve();
  if (recaptchaScriptPromise) return recaptchaScriptPromise;
  recaptchaScriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://www.google.com/recaptcha/api.js?render=explicit&hl=lt";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => { s.remove(); recaptchaScriptPromise = null; reject(new Error("recaptcha_load_failed")); };
    document.head.appendChild(s);
  });
  return recaptchaScriptPromise;
}

export function Captcha({ onVerify, tone = "dark" }: Props) {
  const cfg = useServerFn(captchaConfig);
  const issueFn = useServerFn(issueMathChallenge);
  const solveFn = useServerFn(solveCaptcha);
  const [siteKey, setSiteKey] = useState<string | null | undefined>(undefined);
  const [configError, setConfigError] = useState(false);
  const [retry, setRetry] = useState(0);
  const onVerifyRef = useRef(onVerify);
  useEffect(() => { onVerifyRef.current = onVerify; }, [onVerify]);

  // Math state
  const [question, setQuestion] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const recaptchaRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  // Load config once
  useEffect(() => {
    let alive = true;
    setConfigError(false); setError(null); setSiteKey(undefined);
    cfg().then((r) => { if (alive) setSiteKey(r.recaptchaSiteKey); }).catch(() => { if (alive) setConfigError(true); });
    return () => { alive = false; };
  }, [cfg, retry]);

  // Math: request a challenge
  const requestChallenge = async () => {
    setError(null); setAnswer(""); setOk(false); setQuestion(null); setChallenge(null);
    try {
      const r = await issueFn();
      setQuestion(r.question); setChallenge(r.challenge);
    } catch {
      setError("Nepavyko gauti užduoties.");
    }
  };

  useEffect(() => {
    if (siteKey === null) void requestChallenge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  // reCAPTCHA: mount widget
  useEffect(() => {
    if (!siteKey || !recaptchaRef.current || widgetIdRef.current !== null) return;
    let cancelled = false;
    loadRecaptchaScript()
      .then(async () => {
        // grecaptcha readiness — poll briefly
        for (let i = 0; i < 40 && !window.grecaptcha?.render; i++) {
          await new Promise((r) => setTimeout(r, 100));
        }
        if (cancelled) return;
        if (!recaptchaRef.current || !window.grecaptcha?.render) { recaptchaScriptPromise = null; setError("reCAPTCHA neįsikrovė. Bandyk dar kartą; jei blokuoji Google turinį, leisk jį šiam puslapiui."); return; }
        try {
          widgetIdRef.current = window.grecaptcha.render(recaptchaRef.current, {
            sitekey: siteKey,
            theme: tone === "dark" ? "dark" : "light",
            callback: async (token: string) => {
              setBusy(true); setError(null);
              try {
                const r = await solveFn({ data: { kind: "recaptcha", token } });
                if (r.ok) { setOk(true); onVerifyRef.current(r.proof, r.expiresAt); }
                else setError("reCAPTCHA nepavyko patikrinti.");
              } catch { setError("Klaida tikrinant reCAPTCHA."); }
              finally { setBusy(false); window.grecaptcha?.reset(widgetIdRef.current ?? undefined); }
            },
            "expired-callback": () => { setOk(false); },
            "error-callback": () => { setError("reCAPTCHA ryšys nutrūko. Bandyk dar kartą."); },
          });
        } catch {
          setError("Nepavyko įkelti reCAPTCHA.");
        }
      })
      .catch(() => { if (!cancelled) setError("reCAPTCHA neįsikrovė. Bandyk dar kartą; jei blokuoji Google turinį, leisk jį šiam puslapiui."); });
    return () => { cancelled = true; widgetIdRef.current = null; };
  }, [siteKey, tone, solveFn]);

  const submitMath = async () => {
    if (busy || !challenge) return;
    setBusy(true); setError(null);
    try {
      const r = await solveFn({ data: { kind: "math", challenge, answer } });
      if (r.ok) { setOk(true); onVerifyRef.current(r.proof, r.expiresAt); }
      else { setError("Neteisingas atsakymas."); void requestChallenge(); }
    } catch { setError("Nepavyko patikrinti."); }
    finally { setBusy(false); }
  };

  const containerCls = "rounded-lg border border-border bg-card p-3 text-card-foreground";
  const labelCls = "text-muted-foreground";
  const inputCls = "min-w-0 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
  const mode = captchaMode(siteKey, configError);

  if (mode === "config-error") return <div className={containerCls}><p role="alert" className="text-sm text-destructive">Nepavyko įkelti reCAPTCHA nustatymų. Prieiga dar nepatvirtinta.</p><Button variant="outline" className="mt-3" onClick={() => setRetry((v) => v + 1)}><RefreshCw className="h-4 w-4" />Bandyti dar kartą</Button></div>;

  if (mode === "loading") {
    return (
      <div className={containerCls}>
        <p className={`flex items-center gap-2 text-xs ${labelCls}`}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Kraunama saugumo patikra…
        </p>
      </div>
    );
  }

  if (ok) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={containerCls}>
        <p className="flex items-center gap-2 text-xs font-semibold text-primary">
          <ShieldCheck className="h-4 w-4" /> Patvirtinta — gali tęsti.
        </p>
      </motion.div>
    );
  }

  if (mode === "recaptcha") {
    return (
      <div className={containerCls}>
        <p className={`mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] ${labelCls}`}>Saugumo patikra</p>
        <div ref={recaptchaRef} className="flex min-h-[78px] justify-center" />
        {busy && <p className={`mt-2 text-xs ${labelCls}`}>Tikrinama…</p>}
        {error && <><p role="alert" className="mt-2 text-xs text-destructive">{error}</p><Button variant="outline" className="mt-3" onClick={() => setRetry((v) => v + 1)}><RefreshCw className="h-4 w-4" />Bandyti dar kartą</Button></>}
      </div>
    );
  }

  // Math fallback
  return (
    <div className={containerCls}>
      <div className="flex items-center justify-between">
        <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${labelCls}`}>Įrodyk, kad ne robotas</p>
        <Button type="button" variant="ghost" size="icon" onClick={requestChallenge} title="Nauja užduotis" aria-label="Nauja užduotis">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
        <div className="rounded-md border border-border bg-background px-3 py-2 text-center font-mono text-sm">
          {question ?? "…"} =
        </div>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={answer}
          onChange={(e) => setAnswer(e.target.value.replace(/[^\d-]/g, "").slice(0, 4))}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submitMath())}
          placeholder="?"
          className={inputCls}
        />
        <Button type="button" onClick={submitMath} disabled={busy || !answer || !challenge} className="col-span-2">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          Tikrinti
        </Button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
