import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, X, ExternalLink, Copy, Check, ShieldCheck } from "lucide-react";
import { readSiteSettings } from "@/lib/site-settings";
import { getLockdownCode } from "@/lib/lockdown-codes";
import { verifyBypassCode, verifyBypassToken } from "@/lib/lockdown-bypass.functions";

const BYPASS_TOKEN_KEY = "sv_lockdown_bypass_token_v2";
const TRIGGER_WORD = "jumpsipidy";

// Public routes that must remain reachable during lockdown
const ALLOWED_PATHS = ["/status"];

const SEVERITY = {
  info: {
    accent: "#4a6b8a",
    label: "Pranešimas",
    kicker: "Techninė priežiūra",
  },
  warn: {
    accent: "#a67c3a",
    label: "Įspėjimas",
    kicker: "Sistemos gedimas",
  },
  critical: {
    accent: "#9b3535",
    label: "Kritinis pranešimas",
    kicker: "Sistemos incidentas",
  },
} as const;

export function LockdownGate() {
  const [lockdown, setLockdown] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [codeId, setCodeId] = useState<string | null>(null);
  const [bypassed, setBypassed] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [codeChecking, setCodeChecking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshOk, setRefreshOk] = useState<null | boolean>(null);
  const [copied, setCopied] = useState(false);
  const [pathname, setPathname] = useState<string>(
    typeof window !== "undefined" ? window.location.pathname : "/"
  );
  const [autoTick, setAutoTick] = useState(60);
  const [now, setNow] = useState<string>(() => new Date().toISOString().slice(11, 19));
  const bufferRef = useRef("");
  const verifyToken = useServerFn(verifyBypassToken);
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
    const update = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", update);
    const int = setInterval(update, 500);
    return () => { window.removeEventListener("popstate", update); clearInterval(int); };
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await readSiteSettings();
      if (!mounted) return;
      if (error) { setLockdown(false); return; }
      setLockdown(Boolean(data?.lockdown_enabled));
      setMessage(data?.lockdown_message ?? null);
      setCodeId(data?.lockdown_code ?? null);
    };
    load();
    const poll = setInterval(load, 60_000);
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
    const t = setInterval(() => setNow(new Date().toISOString().slice(11, 19)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!lockdown || bypassed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.length !== 1) return;
      bufferRef.current = (bufferRef.current + e.key.toLowerCase()).slice(-TRIGGER_WORD.length);
      if (bufferRef.current === TRIGGER_WORD) {
        bufferRef.current = "";
        setShowCodeModal(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lockdown, bypassed]);

  if (lockdown === null) return null;
  if (!lockdown || bypassed) return null;
  if (ALLOWED_PATHS.includes(pathname)) return null;

  const errInfo = getLockdownCode(codeId);
  const severity = errInfo?.severity ?? "warn";
  const s = SEVERITY[severity];
  const displayCode = errInfo?.code ?? codeId ?? "E-0000";

  const submitCode = async () => {
    if (codeChecking) return;
    setCodeChecking(true);
    try {
      const r = await submitCodeFn({ data: { code: code.trim() } });
      if (r?.ok) {
        try { sessionStorage.setItem(BYPASS_TOKEN_KEY, r.token); } catch {}
        setBypassed(true);
        setShowCodeModal(false);
      } else {
        setCodeError(true);
        setTimeout(() => setCodeError(false), 800);
      }
    } catch {
      setCodeError(true);
      setTimeout(() => setCodeError(false), 800);
    } finally {
      setCodeChecking(false);
    }
  };

  async function runCheck(auto = false) {
    setRefreshing(true);
    setRefreshOk(null);
    try {
      const { data, error } = await readSiteSettings();
      await new Promise((r) => setTimeout(r, auto ? 400 : 900));
      if (!error && !data?.lockdown_enabled) {
        setLockdown(false);
        setRefreshOk(true);
      } else {
        setLockdown(Boolean(data?.lockdown_enabled));
        setMessage(data?.lockdown_message ?? null);
        setCodeId(data?.lockdown_code ?? null);
        setRefreshOk(false);
      }
    } catch { setRefreshOk(false); }
    finally {
      setRefreshing(false);
      setTimeout(() => setRefreshOk(null), 2500);
    }
  }

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(displayCode); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  const fade = (delay = 0) => ({
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  });

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-[#0e0d0c] text-[#e8e4dd]">
      {/* Subtle paper grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
      {/* Very soft warm vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(212,182,140,0.05), transparent 60%)," +
            "radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.6), transparent 65%)",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[880px] flex-col px-6 py-10 sm:px-10 sm:py-14">
        {/* Header rule */}
        <motion.header
          {...fade(0)}
          className="flex items-center justify-between border-b border-white/12 pb-5"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-sm border border-white/15 bg-white/[0.03] font-display text-sm font-semibold tracking-tight text-white">
              SV
            </div>
            <div className="leading-tight">
              <div className="font-display text-[15px] text-white/95">Socialinės Valandos</div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/45">Sistemos būklės pranešimas</div>
            </div>
          </div>
          <div className="hidden items-center gap-2 font-mono text-[11px] text-white/50 sm:flex">
            <motion.span
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2.2, repeat: Infinity }}
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: s.accent }}
            />
            <span>UTC {now}</span>
          </div>
        </motion.header>

        {/* Kicker + severity label */}
        <motion.div {...fade(0.05)} className="mt-12 flex items-baseline gap-4">
          <span
            className="inline-block h-px w-10"
            style={{ background: s.accent }}
          />
          <span
            className="text-[11px] font-medium uppercase tracking-[0.32em]"
            style={{ color: s.accent }}
          >
            {s.label}
          </span>
          <span className="text-[11px] uppercase tracking-[0.28em] text-white/40">{s.kicker}</span>
        </motion.div>

        {/* Editorial serif headline */}
        <motion.h1
          {...fade(0.12)}
          className="mt-5 max-w-[720px] font-display text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-white sm:text-[56px]"
          style={{ fontFamily: "Fraunces, Georgia, serif" }}
        >
          {errInfo?.title ?? "Sistema laikinai neveikia"}
        </motion.h1>

        {/* Body copy */}
        <motion.p
          {...fade(0.2)}
          className="mt-6 max-w-[620px] text-[17px] leading-[1.65] text-white/70"
        >
          {message?.trim() || errInfo?.description ||
            "Šiuo metu tvarkome sistemą. Grįžk po kelių minučių — jokie tavo duomenys nebus prarasti."}
        </motion.p>

        {/* Data grid: code / eta / auto refresh */}
        <motion.dl
          {...fade(0.28)}
          className="mt-12 grid grid-cols-1 gap-x-8 gap-y-6 border-y border-white/10 py-6 sm:grid-cols-3"
        >
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">
              Klaidos kodas
            </dt>
            <dd className="mt-2 flex items-center gap-2">
              <button
                onClick={copyCode}
                className="group inline-flex items-center gap-2 rounded-sm border border-white/15 bg-white/[0.03] px-2.5 py-1 font-mono text-[15px] tracking-[0.08em] text-white transition hover:border-white/35 hover:bg-white/[0.06]"
                title="Kopijuoti kodą"
                style={{ borderLeft: `2px solid ${s.accent}` }}
              >
                {displayCode}
                <span className="text-white/40 group-hover:text-white/70">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </span>
              </button>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">
              Numatoma trukmė
            </dt>
            <dd className="mt-2 font-display text-[17px] text-white/90">
              {errInfo?.eta ?? "nežinoma"}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">
              Kitas automatinis patikrinimas
            </dt>
            <dd className="mt-2 flex items-center gap-2 font-display text-[17px] text-white/90">
              <span className="tabular-nums">{autoTick}s</span>
              <span
                aria-hidden
                className="relative h-1 w-16 overflow-hidden rounded-full bg-white/8"
              >
                <motion.span
                  key={autoTick}
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: 1, ease: "linear" }}
                  className="absolute inset-y-0 left-0 w-full origin-left rounded-full"
                  style={{ background: s.accent }}
                />
              </span>
            </dd>
          </div>
        </motion.dl>

        {/* Actions */}
        <motion.div {...fade(0.36)} className="mt-10 flex flex-wrap items-center gap-3">
          <button
            onClick={() => runCheck(false)}
            disabled={refreshing}
            className="group relative inline-flex items-center gap-2.5 rounded-sm bg-white px-5 py-3 text-sm font-medium tracking-tight text-[#0e0d0c] transition hover:bg-white/90 disabled:opacity-70"
          >
            <motion.span
              animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={
                refreshing
                  ? { duration: 0.9, repeat: Infinity, ease: "linear" }
                  : { type: "spring", stiffness: 180, damping: 14 }
              }
              className="inline-flex"
            >
              <RefreshCw className="h-4 w-4" />
            </motion.span>
            {refreshing ? "Tikrinama…" : "Patikrinti dar kartą"}
          </button>

          <a
            href="/status"
            className="inline-flex items-center gap-2 rounded-sm border border-white/15 bg-transparent px-5 py-3 text-sm font-medium text-white/80 transition hover:border-white/30 hover:text-white"
          >
            Klaidų kodų gidas <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <AnimatePresence>
            {refreshOk === false && (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-white/60"
              >
                Sistema vis dar neveikia — pabandyk po minutės.
              </motion.span>
            )}
            {refreshOk === true && (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-300/90"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Sistema veikia. Grįžtame.
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer meta */}
        <motion.footer
          {...fade(0.5)}
          className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-[11px] uppercase tracking-[0.24em] text-white/40"
        >
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5" /> Duomenys apsaugoti
          </span>
          <span className="font-mono text-white/35">socialinesvalandos.lt / status</span>
        </motion.footer>
      </div>

      <AnimatePresence>
        {showCodeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] grid place-items-center bg-black/75 backdrop-blur-md p-4"
            onClick={() => setShowCodeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-sm border border-white/15 bg-[#141311] p-6 shadow-2xl"
            >
              <button
                onClick={() => setShowCodeModal(false)}
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-sm text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/50">
                Administracinė prieiga
              </p>
              <h2 className="mt-1 font-display text-xl font-medium text-white" style={{ fontFamily: "Fraunces, Georgia, serif" }}>
                Įvesk kodą
              </h2>
              <input
                autoFocus
                type="password"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitCode()}
                disabled={codeChecking}
                className={`mt-4 w-full rounded-sm border bg-black/40 px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] text-white outline-none transition disabled:opacity-60 ${
                  codeError ? "border-rose-500 animate-shake" : "border-white/15 focus:border-white/50"
                }`}
                placeholder="••••"
              />
              <button
                onClick={submitCode}
                disabled={codeChecking}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-white py-3 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-70"
              >
                {codeChecking && (
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}>
                    <RefreshCw className="h-4 w-4" />
                  </motion.span>
                )}
                {codeChecking ? "Tikrinama…" : "Patvirtinti"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
