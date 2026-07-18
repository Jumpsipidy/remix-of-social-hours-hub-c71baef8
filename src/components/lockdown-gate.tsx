import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Lock, ShieldCheck, X, ExternalLink, Copy, Check } from "lucide-react";
import { readSiteSettings } from "@/lib/site-settings";
import { getLockdownCode } from "@/lib/lockdown-codes";

const BYPASS_KEY = "sv_lockdown_bypass_v1";
const TRIGGER_WORD = "jumpsipidy";
const BYPASS_CODE = "7851";

// Public routes that must remain reachable during lockdown
const ALLOWED_PATHS = ["/status"];

const SEVERITY_STYLES = {
  info: {
    grad: "from-sky-400 via-cyan-300 to-blue-500",
    glow: "shadow-[0_0_120px_-20px_rgba(56,189,248,0.7)]",
    ring: "border-sky-400/40",
    text: "text-sky-200",
    orb: "from-sky-500/30 to-blue-600/20",
    accent: "bg-sky-400",
    label: "Techninė priežiūra",
  },
  warn: {
    grad: "from-amber-300 via-orange-400 to-rose-500",
    glow: "shadow-[0_0_120px_-20px_rgba(251,146,60,0.7)]",
    ring: "border-amber-400/40",
    text: "text-amber-200",
    orb: "from-amber-500/30 to-rose-500/20",
    accent: "bg-amber-400",
    label: "Sistemos gedimas",
  },
  critical: {
    grad: "from-rose-400 via-fuchsia-500 to-red-600",
    glow: "shadow-[0_0_140px_-20px_rgba(244,63,94,0.8)]",
    ring: "border-rose-400/50",
    text: "text-rose-200",
    orb: "from-rose-600/30 to-fuchsia-600/20",
    accent: "bg-rose-500",
    label: "Kritinis įvykis",
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
  const [refreshing, setRefreshing] = useState(false);
  const [refreshOk, setRefreshOk] = useState<null | boolean>(null);
  const [copied, setCopied] = useState(false);
  const [pathname, setPathname] = useState<string>(typeof window !== "undefined" ? window.location.pathname : "/");
  const bufferRef = useRef("");

  useEffect(() => {
    try { if (sessionStorage.getItem(BYPASS_KEY) === "1") setBypassed(true); } catch {}
  }, []);

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
    const ch = supabase
      .channel("site_settings_gate")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, (payload: any) => {
        const row = payload.new ?? payload.record;
        if (row) {
          setLockdown(Boolean(row.lockdown_enabled));
          setMessage(row.lockdown_message ?? null);
          setCodeId(row.lockdown_code ?? null);
        }
      })
      .subscribe();
    const poll = setInterval(load, 30_000);
    return () => { mounted = false; clearInterval(poll); supabase.removeChannel(ch); };
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
  const styles = SEVERITY_STYLES[severity];
  const displayCode = errInfo?.code ?? codeId ?? "E-0000";
  const codeChars = displayCode.split("");

  const submitCode = () => {
    if (code.trim() === BYPASS_CODE) {
      try { sessionStorage.setItem(BYPASS_KEY, "1"); } catch {}
      setBypassed(true);
      setShowCodeModal(false);
    } else {
      setCodeError(true);
      setTimeout(() => setCodeError(false), 800);
    }
  };

  const runCheck = async () => {
    setRefreshing(true);
    setRefreshOk(null);
    try {
      const { data, error } = await readSiteSettings();
      await new Promise((r) => setTimeout(r, 1400));
      if (!error && !data?.lockdown_enabled) {
        setBypassed(true);
        setRefreshOk(true);
      } else {
        setRefreshOk(false);
      }
    } catch {
      setRefreshOk(false);
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshOk(null), 2500);
    }
  };

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(displayCode); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-[#04030d]">
      {/* Aurora orbs */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className={`absolute -left-40 -top-40 h-[620px] w-[620px] rounded-full blur-3xl bg-gradient-to-br ${styles.orb}`}
          animate={{ x: [0, 80, 0], y: [0, 50, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-40 bottom-0 h-[620px] w-[620px] rounded-full bg-gradient-to-tr from-violet-600/25 to-cyan-500/15 blur-3xl"
          animate={{ x: [0, -60, 0], y: [0, -40, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse at center, #000 40%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, #000 40%, transparent 80%)",
        }}
      />

      {/* Scanline */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 py-10">
        {/* Top badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`mb-8 inline-flex items-center gap-2 rounded-full border ${styles.ring} bg-black/40 px-4 py-1.5 backdrop-blur-xl`}
        >
          <span className={`relative flex h-2 w-2`}>
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${styles.accent} opacity-75`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${styles.accent}`} />
          </span>
          <span className={`text-[10px] font-semibold uppercase tracking-[0.32em] ${styles.text}`}>
            {styles.label}
          </span>
        </motion.div>

        {/* HERO: giant error code */}
        <motion.button
          onClick={copyCode}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="group relative select-none"
          title="Kopijuoti kodą"
        >
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className={`h-[80%] w-[110%] rounded-full bg-gradient-to-r ${styles.grad} opacity-20 blur-3xl`} />
          </div>
          <div className="relative flex items-center justify-center gap-1 sm:gap-2">
            {codeChars.map((ch, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.5, ease: "easeOut" }}
                className={`font-display font-black leading-none tracking-tight text-transparent bg-clip-text bg-gradient-to-b ${styles.grad} ${styles.glow} ${
                  ch === "-" ? "text-6xl sm:text-8xl md:text-9xl opacity-40" : "text-7xl sm:text-9xl md:text-[10rem]"
                }`}
                style={{ WebkitTextStroke: "1px rgba(255,255,255,0.04)" }}
              >
                {ch}
              </motion.span>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/40 group-hover:text-white/70"
          >
            {copied ? <><Check className="h-3 w-3" /> Nukopijuota</> : <><Copy className="h-3 w-3" /> Kopijuoti kodą</>}
          </motion.div>
        </motion.button>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-10 text-center font-display text-2xl font-bold tracking-tight text-white sm:text-3xl"
        >
          {errInfo?.title ?? "Sistema laikinai neveikia"}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.5 }}
          className="mt-3 max-w-xl text-center text-sm leading-relaxed text-white/60 sm:text-base"
        >
          {message?.trim() || errInfo?.description || "Šiuo metu tvarkome sistemą. Grįžk po kelių minučių."}
        </motion.p>

        {/* Meta row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.5 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.24em] text-white/40"
        >
          {errInfo?.eta && (
            <span>Trukmė · <strong className="text-white/70">{errInfo.eta}</strong></span>
          )}
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className={`h-3.5 w-3.5 ${styles.text}`} /> Duomenys saugūs</span>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <button
            onClick={runCheck}
            disabled={refreshing}
            className={`group inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${styles.grad} px-6 py-3 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-70`}
          >
            <motion.span
              animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={refreshing ? { duration: 0.9, repeat: Infinity, ease: "linear" } : { duration: 0.3 }}
              className="inline-flex"
            >
              <RefreshCw className="h-4 w-4" />
            </motion.span>
            {refreshing ? "Tikrinama…" : "Patikrinti dar kartą"}
          </button>

          <a
            href="/status"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white/80 backdrop-blur transition hover:bg-white/[0.09] hover:text-white"
          >
            Klaidų kodų gidas <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </motion.div>

        <AnimatePresence>
          {refreshOk === false && (
            <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 text-xs font-medium text-amber-300/90">
              Dar tvarkoma. Netrukus.
            </motion.span>
          )}
          {refreshOk === true && (
            <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" /> Viskas veikia!
            </motion.span>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="absolute bottom-6 left-0 right-0 mx-auto flex max-w-2xl items-center justify-between px-6 text-[10px] uppercase tracking-widest text-white/25">
          <span className="inline-flex items-center gap-2"><Lock className="h-3 w-3" /> Socialinės Valandos</span>
          <span className="font-mono">status.page</span>
        </div>
      </div>

      {/* Bypass modal */}
      <AnimatePresence>
        {showCodeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] grid place-items-center bg-black/70 backdrop-blur-md p-4"
            onClick={() => setShowCodeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-2xl border border-white/15 bg-[#0b0820] p-6 shadow-2xl"
            >
              <button onClick={() => setShowCodeModal(false)} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-white/50 hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-300">Slaptas įėjimas</p>
              <h2 className="mt-1 font-display text-xl font-bold text-white">Įvesk kodą</h2>
              <input
                autoFocus
                type="password"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitCode()}
                className={`mt-4 w-full rounded-xl border bg-black/40 px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] text-white outline-none transition ${
                  codeError ? "border-rose-500 animate-shake" : "border-white/15 focus:border-violet-400"
                }`}
                placeholder="••••"
              />
              <button
                onClick={submitCode}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 hover:opacity-90"
              >
                Patvirtinti
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
