import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, Lock, ShieldCheck, X, ExternalLink, Copy, Check, AlertTriangle, Radio } from "lucide-react";
import { readSiteSettings } from "@/lib/site-settings";
import { getLockdownCode } from "@/lib/lockdown-codes";
import { verifyBypassCode, verifyBypassToken } from "@/lib/lockdown-bypass.functions";

const BYPASS_TOKEN_KEY = "sv_lockdown_bypass_token_v2";
const TRIGGER_WORD = "jumpsipidy";

// Public routes that must remain reachable during lockdown
const ALLOWED_PATHS = ["/status"];

const SEVERITY = {
  info: {
    hue: "#60a5fa",
    ring: "border-sky-400/30",
    text: "text-sky-100",
    dot: "bg-sky-400",
    glow: "shadow-[0_0_60px_-15px_rgba(96,165,250,0.55)]",
    label: "Techninė priežiūra",
    stripes: "from-sky-500/0 via-sky-500/30 to-sky-500/0",
  },
  warn: {
    hue: "#f59e0b",
    ring: "border-amber-400/40",
    text: "text-amber-100",
    dot: "bg-amber-400",
    glow: "shadow-[0_0_60px_-15px_rgba(245,158,11,0.6)]",
    label: "Sistemos gedimas",
    stripes: "from-amber-500/0 via-amber-500/35 to-amber-500/0",
  },
  critical: {
    hue: "#ef4444",
    ring: "border-red-500/50",
    text: "text-red-100",
    dot: "bg-red-500",
    glow: "shadow-[0_0_80px_-15px_rgba(239,68,68,0.7)]",
    label: "Kritinis įvykis",
    stripes: "from-red-600/0 via-red-500/45 to-red-600/0",
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
  const bufferRef = useRef("");
  const verifyToken = useServerFn(verifyBypassToken);
  const submitCodeFn = useServerFn(verifyBypassCode);

  // Verify stored bypass token server-side on mount
  useEffect(() => {
    let alive = true;
    const t = (() => { try { return sessionStorage.getItem(BYPASS_TOKEN_KEY); } catch { return null; } })();
    if (!t) return;
    verifyToken({ data: { token: t } })
      .then((r) => { if (alive && r?.ok) setBypassed(true); else { try { sessionStorage.removeItem(BYPASS_TOKEN_KEY); } catch {} } })
      .catch(() => {});
    return () => { alive = false; };
  }, [verifyToken]);

  // Track pathname changes
  useEffect(() => {
    const update = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", update);
    const int = setInterval(update, 500);
    return () => { window.removeEventListener("popstate", update); clearInterval(int); };
  }, []);

  // Initial read; then a 60s poll (NO realtime auto-hide — user must trigger a
  // refresh, but that refresh happens automatically every minute).
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

  // Countdown to next auto-refresh (60s), then trigger runCheck
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

  // Trigger word listener
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
  const codeChars = displayCode.split("");

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
      // small dramatic pause
      await new Promise((r) => setTimeout(r, auto ? 400 : 1100));
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

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-[#08070a] text-white">
      {/* Deep vignette + colored halo based on severity */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${s.hue}33, transparent 60%)` }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(0,0,0,0.85)_80%)]" />
      </div>

      {/* Alert candy-stripe bars top & bottom */}
      <motion.div
        aria-hidden
        initial={{ backgroundPositionX: 0 }}
        animate={{ backgroundPositionX: 80 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        className="absolute inset-x-0 top-0 h-2"
        style={{
          background:
            `repeating-linear-gradient(45deg, ${s.hue} 0 12px, transparent 12px 24px)`,
          opacity: 0.7,
        }}
      />
      <motion.div
        aria-hidden
        initial={{ backgroundPositionX: 0 }}
        animate={{ backgroundPositionX: -80 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        className="absolute inset-x-0 bottom-0 h-2"
        style={{
          background:
            `repeating-linear-gradient(45deg, ${s.hue} 0 12px, transparent 12px 24px)`,
          opacity: 0.7,
        }}
      />

      {/* Scanline sweep */}
      <motion.div
        aria-hidden
        initial={{ y: "-100%" }}
        animate={{ y: "120%" }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "linear" }}
        className={`pointer-events-none absolute left-0 right-0 h-40 bg-gradient-to-b ${s.stripes}`}
      />

      {/* Faint grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, #000 45%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, #000 45%, transparent 85%)",
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 py-10">
        {/* Top badge */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`mb-8 inline-flex items-center gap-2 rounded-full border ${s.ring} bg-white/[0.03] px-4 py-1.5 backdrop-blur-xl ${s.glow}`}
        >
          <motion.span
            animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className={`inline-flex h-2 w-2 rounded-full ${s.dot}`}
          />
          <span className={`text-[10px] font-semibold uppercase tracking-[0.32em] ${s.text}`}>
            <AlertTriangle className="mr-1 inline h-3 w-3 -translate-y-[1px]" />
            {s.label}
          </span>
        </motion.div>

        {/* Giant error code */}
        <motion.button
          onClick={copyCode}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="group relative select-none"
          title="Kopijuoti kodą"
        >
          {/* pulsing halo behind code */}
          <motion.div
            aria-hidden
            animate={{ opacity: [0.25, 0.55, 0.25], scale: [0.95, 1.02, 0.95] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 -z-10 rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${s.hue}55, transparent 70%)` }}
          />
          <div className="relative flex items-center justify-center gap-1 sm:gap-2">
            {codeChars.map((ch, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 30, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.55, ease: "easeOut" }}
                className={`font-display font-bold leading-none tracking-tight ${
                  ch === "-"
                    ? "text-6xl sm:text-8xl md:text-9xl text-white/25"
                    : "text-7xl sm:text-9xl md:text-[11rem]"
                }`}
                style={ch !== "-" ? {
                  color: s.hue,
                  textShadow: `0 0 40px ${s.hue}66, 0 0 12px ${s.hue}aa`,
                } : undefined}
              >
                {ch}
              </motion.span>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.32em] text-white/40 group-hover:text-white/70"
          >
            {copied ? <><Check className="h-3 w-3" /> Nukopijuota</> : <><Copy className="h-3 w-3" /> Kopijuoti kodą</>}
          </motion.div>
        </motion.button>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="mt-10 max-w-2xl text-balance text-center font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl"
        >
          {errInfo?.title ?? "Sistema laikinai neveikia"}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mt-4 max-w-xl text-center text-[15px] leading-relaxed text-white/60"
        >
          {message?.trim() || errInfo?.description || "Šiuo metu tvarkome sistemą. Grįžk po kelių minučių."}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.5 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.24em] text-white/40"
        >
          {errInfo?.eta && (<span>Trukmė · <strong className="text-white/75">{errInfo.eta}</strong></span>)}
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Duomenys saugūs</span>
          <span className="inline-flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5" /> Auto: <strong className="text-white/70 tabular-nums">{autoTick}s</strong>
          </span>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.5 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <button
            onClick={() => runCheck(false)}
            disabled={refreshing}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-70"
          >
            <span
              aria-hidden
              className="absolute inset-0 -z-0 opacity-0 transition group-hover:opacity-100"
              style={{ background: `radial-gradient(120px 60px at var(--x,50%) var(--y,50%), ${s.hue}22, transparent 60%)` }}
            />
            <motion.span
              animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={refreshing
                ? { duration: 0.75, repeat: Infinity, ease: "linear" }
                : { type: "spring", stiffness: 200, damping: 15 }}
              className="relative inline-flex"
            >
              <RefreshCw className="h-4 w-4" />
            </motion.span>
            <span className="relative">{refreshing ? "Tikrinama sistema…" : "Patikrinti dar kartą"}</span>
            {refreshing && (
              <motion.span
                aria-hidden
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                className="absolute inset-y-0 left-0 w-1/3"
                style={{ background: `linear-gradient(90deg, transparent, ${s.hue}55, transparent)` }}
              />
            )}
          </button>

          <a
            href="/status"
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-6 py-3 text-sm font-medium text-white/80 backdrop-blur transition hover:bg-white/[0.07] hover:text-white"
          >
            Klaidų kodų gidas <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </motion.div>

        <AnimatePresence>
          {refreshOk === false && (
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-amber-200/90"
            >
              <AlertTriangle className="h-3.5 w-3.5" /> Sistema vis dar neveikia. Netrukus.
            </motion.span>
          )}
          {refreshOk === true && (
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-emerald-300"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Viskas veikia — grįžtame!
            </motion.span>
          )}
        </AnimatePresence>

        <div className="absolute bottom-6 left-0 right-0 mx-auto flex max-w-2xl items-center justify-between px-6 text-[10px] uppercase tracking-widest text-white/25">
          <span className="inline-flex items-center gap-2"><Lock className="h-3 w-3" /> Socialinės Valandos</span>
          <span className="font-mono">status · {new Date().toISOString().slice(11, 19)}</span>
        </div>
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
              initial={{ scale: 0.94, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-2xl border border-white/12 bg-[#0f0e12] p-6 shadow-2xl"
            >
              <button onClick={() => setShowCodeModal(false)} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-white/50 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/50">Slaptas įėjimas</p>
              <h2 className="mt-1 font-display text-xl font-medium text-white">Įvesk kodą</h2>
              <input
                autoFocus
                type="password"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitCode()}
                disabled={codeChecking}
                className={`mt-4 w-full rounded-xl border bg-black/40 px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] text-white outline-none transition disabled:opacity-60 ${
                  codeError ? "border-rose-500 animate-shake" : "border-white/12 focus:border-white/50"
                }`}
                placeholder="••••"
              />
              <button
                onClick={submitCode}
                disabled={codeChecking}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-70"
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
