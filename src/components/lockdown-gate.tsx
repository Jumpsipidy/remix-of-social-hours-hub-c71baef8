import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, RefreshCw, Lock, ShieldCheck, X, ExternalLink, Copy, Check } from "lucide-react";
import { readSiteSettings } from "@/lib/site-settings";
import { getLockdownCode } from "@/lib/lockdown-codes";

const BYPASS_KEY = "sv_lockdown_bypass_v1";
const TRIGGER_WORD = "jumpsipidy";
const BYPASS_CODE = "7851";

const SEVERITY_STYLES = {
  info: { badge: "from-sky-400 to-blue-500", glow: "shadow-sky-500/30", ring: "border-sky-400/40", text: "text-sky-200" },
  warn: { badge: "from-amber-400 to-rose-500", glow: "shadow-amber-500/30", ring: "border-amber-400/40", text: "text-amber-200" },
  critical: { badge: "from-rose-500 to-fuchsia-600", glow: "shadow-rose-500/40", ring: "border-rose-400/50", text: "text-rose-200" },
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
  const bufferRef = useRef("");

  useEffect(() => {
    try { if (sessionStorage.getItem(BYPASS_KEY) === "1") setBypassed(true); } catch {}
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

  const errInfo = getLockdownCode(codeId);
  const severity = errInfo?.severity ?? "warn";
  const styles = SEVERITY_STYLES[severity];

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
    if (!errInfo) return;
    try { await navigator.clipboard.writeText(errInfo.code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-[#04030d]">
      {/* Aurora orbs */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className={`absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full blur-3xl bg-gradient-to-br ${
            severity === "critical" ? "from-rose-600/30 to-fuchsia-600/20" :
            severity === "info" ? "from-sky-500/25 to-blue-600/15" :
            "from-amber-500/30 to-rose-500/20"
          }`}
          animate={{ x: [0, 80, 0], y: [0, 50, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -right-40 bottom-0 h-[560px] w-[560px] rounded-full bg-gradient-to-tr from-violet-600/25 to-cyan-500/15 blur-3xl"
          animate={{ x: [0, -60, 0], y: [0, -40, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      {/* Scanline */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] p-8 sm:p-10 shadow-2xl backdrop-blur-xl"
        >
          {/* Conic spinning border */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -inset-[1px] rounded-[28px]"
            style={{
              background:
                severity === "critical"
                  ? "conic-gradient(from 0deg, transparent 0deg, rgba(244,63,94,0.65) 60deg, transparent 140deg, transparent 220deg, rgba(217,70,239,0.6) 300deg, transparent 360deg)"
                  : severity === "info"
                  ? "conic-gradient(from 0deg, transparent 0deg, rgba(56,189,248,0.6) 60deg, transparent 140deg, transparent 220deg, rgba(99,102,241,0.55) 300deg, transparent 360deg)"
                  : "conic-gradient(from 0deg, transparent 0deg, rgba(250,204,21,0.65) 60deg, transparent 140deg, transparent 220deg, rgba(244,63,94,0.6) 300deg, transparent 360deg)",
              maskImage: "linear-gradient(#000,#000) content-box, linear-gradient(#000,#000)",
              WebkitMaskImage: "linear-gradient(#000,#000) content-box, linear-gradient(#000,#000)",
              padding: 1,
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
          />

          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, -8, 8, 0] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                  className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${styles.badge} shadow-lg ${styles.glow}`}
                >
                  <AlertTriangle className="h-6 w-6 text-black" />
                </motion.div>
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.32em] ${styles.text}`}>
                    {severity === "critical" ? "Kritinis įvykis" : severity === "info" ? "Techninė priežiūra" : "Sistemos gedimas"}
                  </p>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    Sistema laikinai neveikia
                  </h1>
                </div>
              </div>

              {errInfo && (
                <button
                  onClick={copyCode}
                  className={`group inline-flex items-center gap-2 rounded-full border ${styles.ring} bg-black/40 px-3 py-1.5 font-mono text-xs font-bold ${styles.text} transition hover:bg-black/60`}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5 opacity-70" />}
                  {errInfo.code}
                </button>
              )}
            </div>

            {errInfo && (
              <div className={`mt-6 rounded-2xl border ${styles.ring} bg-black/30 p-5`}>
                <p className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${styles.text}`}>{errInfo.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/80">{errInfo.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-white/50">
                  <span>Numatoma trukmė: <strong className="text-white/80">{errInfo.eta}</strong></span>
                  <a href="/status" className="inline-flex items-center gap-1 hover:text-white">
                    Klaidų kodų gidas <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            <p className="mt-6 text-sm leading-relaxed text-white/70">
              {message || "Šiuo metu tvarkome sistemą, kad viskas veiktų sklandžiai. Grįžk po kelių minučių — viskas jau kelyje."}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={runCheck}
                disabled={refreshing}
                className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.1] disabled:opacity-70"
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
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-transparent px-5 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/[0.05] hover:text-white"
              >
                Peržiūrėti kodų gidą
              </a>

              <AnimatePresence>
                {refreshOk === false && (
                  <motion.span key="nope" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-xs font-medium text-amber-300/90">
                    Dar tvarkoma. Netrukus.
                  </motion.span>
                )}
                {refreshOk === true && (
                  <motion.span key="yay" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300">
                    <ShieldCheck className="h-3.5 w-3.5" /> Viskas veikia!
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-8 flex items-center justify-between gap-2 border-t border-white/10 pt-4 text-[11px] uppercase tracking-widest text-white/30">
              <span className="inline-flex items-center gap-2"><Lock className="h-3 w-3" /> Socialinės Valandos</span>
              <span className="font-mono">status.page</span>
            </div>
          </div>
        </motion.div>
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
