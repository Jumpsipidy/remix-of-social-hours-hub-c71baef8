import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { RefreshCw, ShieldCheck, Loader2 } from "lucide-react";
import { issueMathChallenge, solveCaptcha, captchaConfig } from "@/lib/captcha.functions";

type Props = {
  onVerify: (proof: string, expiresAt: number) => void;
  /** Optional theme hint. */
  tone?: "dark" | "light";
};

// Declare grecaptcha global for TS
declare global {
  interface Window {
    grecaptcha?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void; "expired-callback"?: () => void; theme?: "light" | "dark" }) => number;
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
    s.src = "https://www.google.com/recaptcha/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("recaptcha_load_failed"));
    document.head.appendChild(s);
  });
  return recaptchaScriptPromise;
}

export function Captcha({ onVerify, tone = "dark" }: Props) {
  const cfg = useServerFn(captchaConfig);
  const issueFn = useServerFn(issueMathChallenge);
  const solveFn = useServerFn(solveCaptcha);
  const [siteKey, setSiteKey] = useState<string | null | undefined>(undefined);

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
    cfg().then((r) => { if (alive) setSiteKey(r.recaptchaSiteKey); }).catch(() => { if (alive) setSiteKey(null); });
    return () => { alive = false; };
  }, [cfg]);

  // Math: request a challenge
  const requestChallenge = async () => {
    setError(null); setAnswer(""); setOk(false);
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
        if (cancelled || !recaptchaRef.current || !window.grecaptcha?.render) return;
        try {
          widgetIdRef.current = window.grecaptcha.render(recaptchaRef.current, {
            sitekey: siteKey,
            theme: tone === "dark" ? "dark" : "light",
            callback: async (token: string) => {
              setBusy(true); setError(null);
              try {
                const r = await solveFn({ data: { kind: "recaptcha", token } });
                if (r.ok) { setOk(true); onVerify(r.proof, r.expiresAt); }
                else setError("reCAPTCHA nepavyko patikrinti.");
              } catch { setError("Klaida tikrinant reCAPTCHA."); }
              finally { setBusy(false); }
            },
            "expired-callback": () => { setOk(false); },
          });
        } catch {
          setError("Nepavyko įkelti reCAPTCHA.");
        }
      })
      .catch(() => setError("Nepavyko įkelti reCAPTCHA scripto."));
    return () => { cancelled = true; };
  }, [siteKey, tone, solveFn, onVerify]);

  const submitMath = async () => {
    if (busy || !challenge) return;
    setBusy(true); setError(null);
    try {
      const r = await solveFn({ data: { kind: "math", challenge, answer } });
      if (r.ok) { setOk(true); onVerify(r.proof, r.expiresAt); }
      else { setError("Neteisingas atsakymas."); void requestChallenge(); }
    } catch { setError("Nepavyko patikrinti."); }
    finally { setBusy(false); }
  };

  const isDark = tone === "dark";
  const containerCls = isDark
    ? "rounded-xl border border-white/10 bg-black/30 p-3 backdrop-blur"
    : "rounded-xl border border-border bg-card/60 p-3 backdrop-blur";
  const labelCls = isDark ? "text-white/60" : "text-muted-foreground";
  const inputCls = isDark
    ? "flex-1 rounded-md border border-white/15 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-white/50"
    : "flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
  const btnCls = isDark
    ? "inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-white/90 disabled:opacity-60"
    : "inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60";

  if (siteKey === undefined) {
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
        <p className={`flex items-center gap-2 text-xs font-semibold ${isDark ? "text-emerald-300" : "text-emerald-600"}`}>
          <ShieldCheck className="h-4 w-4" /> Patvirtinta — gali tęsti.
        </p>
      </motion.div>
    );
  }

  if (siteKey) {
    return (
      <div className={containerCls}>
        <p className={`mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] ${labelCls}`}>Saugumo patikra</p>
        <div ref={recaptchaRef} />
        {busy && <p className={`mt-2 text-xs ${labelCls}`}>Tikrinama…</p>}
        {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
      </div>
    );
  }

  // Math fallback
  return (
    <div className={containerCls}>
      <div className="flex items-center justify-between">
        <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${labelCls}`}>Įrodyk, kad ne robotas</p>
        <button type="button" onClick={requestChallenge} className={`text-[11px] ${labelCls} hover:opacity-80`} title="Nauja užduotis">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className={`min-w-[92px] rounded-md border px-3 py-2 text-center font-mono text-sm ${isDark ? "border-white/15 bg-black/50 text-white" : "border-border bg-background"}`}>
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
        <button type="button" onClick={submitMath} disabled={busy || !answer} className={btnCls}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          Tikrinti
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
