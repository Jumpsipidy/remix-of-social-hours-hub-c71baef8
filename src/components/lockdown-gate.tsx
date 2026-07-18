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
    accent: "#7ea8d1",
    ring: "border-slate-300/25",
    text: "text-slate-200",
    dot: "bg-slate-300",
    label: "Techninė priežiūra",
  },
  warn: {
    accent: "#d4a574",
    ring: "border-amber-300/30",
    text: "text-amber-100/90",
    dot: "bg-amber-300",
    label: "Sistemos gedimas",
  },
  critical: {
    accent: "#d47a7a",
    ring: "border-rose-300/30",
    text: "text-rose-100/90",
    dot: "bg-rose-400",
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
      await new Promise((r) => setTimeout(r, 1200));
      if (!error && !data?.lockdown_enabled) { setBypassed(true); setRefreshOk(true); }
      else setRefreshOk(false);
    } catch { setRefreshOk(false); }
    finally {
      setRefreshing(false);
      setTimeout(() => setRefreshOk(null), 2500);
    }
  };

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(displayCode); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-[oklch(0.11_0.015_250)]">
      {/* Editorial base wash */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full opacity-40 blur-3xl"
          style={{ background: `radial-gradient(circle, ${styles.accent}22, transparent 65%)` }}
        />
        <div
          className="absolute -right-40 bottom-0 h-[560px] w-[560px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.55 0.06 240 / 0.5), transparent 65%)" }}
        />
      </div>

      {/* Faint grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage: "radial-gradient(ellipse at center, #000 40%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, #000 40%, transparent 80%)",
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 py-10">
        {/* Top badge */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`mb-10 inline-flex items-center gap-2 rounded-full border ${styles.ring} bg-white/[0.03] px-4 py-1.5 backdrop-blur-xl`}
        >
          <span className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${styles.dot} opacity-60`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${styles.dot}`} />
          </span>
          <span className={`text-[10px] font-semibold uppercase tracking-[0.32em] ${styles.text}`}>
            {styles.label}
          </span>
        </motion.div>

        {/* Giant editorial code */}
        <motion.button
          onClick={copyCode}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="group relative select-none"
          title="Kopijuoti kodą"
        >
          <div className="relative flex items-center justify-center gap-1 sm:gap-2">
            {codeChars.map((ch, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05, duration: 0.5, ease: "easeOut" }}
                className={`font-display font-semibold leading-none tracking-tight text-white/95 ${
                  ch === "-" ? "text-6xl sm:text-8xl md:text-9xl text-white/25" : "text-7xl sm:text-9xl md:text-[10rem]"
                }`}
              >
                {ch}
              </motion.span>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.32em] text-white/35 group-hover:text-white/60"
          >
            {copied ? <><Check className="h-3 w-3" /> Nukopijuota</> : <><Copy className="h-3 w-3" /> Kopijuoti kodą</>}
          </motion.div>
        </motion.button>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="mt-10 max-w-2xl text-balance text-center font-display text-2xl font-medium tracking-tight text-white sm:text-3xl"
        >
          {errInfo?.title ?? "Sistema laikinai neveikia"}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-4 max-w-xl text-center text-[15px] leading-relaxed text-white/55"
        >
          {message?.trim() || errInfo?.description || "Šiuo metu tvarkome sistemą. Grįžk po kelių minučių."}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.24em] text-white/35"
        >
          {errInfo?.eta && (<span>Trukmė · <strong className="text-white/70">{errInfo.eta}</strong></span>)}
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Duomenys saugūs</span>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.5 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <button
            onClick={runCheck}
            disabled={refreshing}
            className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[oklch(0.11_0.015_250)] transition hover:bg-white/90 disabled:opacity-70"
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
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-6 py-3 text-sm font-medium text-white/75 backdrop-blur transition hover:bg-white/[0.07] hover:text-white"
          >
            Klaidų kodų gidas <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </motion.div>

        <AnimatePresence>
          {refreshOk === false && (
            <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 text-xs font-medium text-amber-200/85">
              Dar tvarkoma. Netrukus.
            </motion.span>
          )}
          {refreshOk === true && (
            <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" /> Viskas veikia!
            </motion.span>
          )}
        </AnimatePresence>

        <div className="absolute bottom-6 left-0 right-0 mx-auto flex max-w-2xl items-center justify-between px-6 text-[10px] uppercase tracking-widest text-white/25">
          <span className="inline-flex items-center gap-2"><Lock className="h-3 w-3" /> Socialinės Valandos</span>
          <span className="font-mono">status</span>
        </div>
      </div>

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
              initial={{ scale: 0.94, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-2xl border border-white/12 bg-[oklch(0.14_0.015_250)] p-6 shadow-2xl"
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
                className={`mt-4 w-full rounded-xl border bg-black/40 px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] text-white outline-none transition ${
                  codeError ? "border-rose-500 animate-shake" : "border-white/12 focus:border-white/50"
                }`}
                placeholder="••••"
              />
              <button
                onClick={submitCode}
                className="mt-4 w-full rounded-xl bg-white py-3 text-sm font-semibold text-[oklch(0.11_0.015_250)] hover:bg-white/90"
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
