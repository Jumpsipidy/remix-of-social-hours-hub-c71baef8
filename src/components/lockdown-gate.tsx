import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, X, Copy, Check, ShieldCheck, BookOpen, ChevronDown, Lock } from "lucide-react";
import { readSiteSettings } from "@/lib/site-settings";
import { LOCKDOWN_CODES, getLockdownCode, type LockdownCode } from "@/lib/lockdown-codes";
import { verifyBypassCode, verifyBypassToken, bypassStatus } from "@/lib/lockdown-bypass.functions";
import { Captcha } from "@/components/captcha";


const BYPASS_TOKEN_KEY = "sv_lockdown_bypass_token_v2";
const TRIGGER_WORD = "jumpsipidy";

const SEVERITY = {
  info:     { accent: "#8fb3c7", warm: "#c9d7de", label: "Pranešimas",         kicker: "Techninė priežiūra" },
  warn:     { accent: "#d4a15a", warm: "#e6c58a", label: "Įspėjimas",          kicker: "Sistemos gedimas" },
  critical: { accent: "#c26a5a", warm: "#e39280", label: "Kritinis pranešimas", kicker: "Sistemos incidentas" },
} as const;

const SEV_PILL = {
  info:     "border-slate-300/15 bg-slate-300/[0.04] text-slate-200/80",
  warn:     "border-amber-300/25 bg-amber-500/[0.06] text-amber-100/90",
  critical: "border-rose-400/25 bg-rose-500/[0.06] text-rose-100/90",
} as const;

/** Floating dust motes — slow, warm, ambient. Not neon, not orbital. */
function Dust({ accent }: { accent: string }) {
  const motes = useMemo(
    () => Array.from({ length: 22 }, () => ({
      x: Math.random() * 100,
      y: 60 + Math.random() * 40,
      s: 0.5 + Math.random() * 1.6,
      d: 14 + Math.random() * 22,
      delay: Math.random() * 10,
    })),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {motes.map((m, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 0.55, 0], y: [-10, -160] }}
          transition={{ duration: m.d, delay: m.delay, repeat: Infinity, ease: "easeOut" }}
          className="absolute rounded-full blur-[0.5px]"
          style={{
            left: `${m.x}%`,
            top: `${m.y}%`,
            width: m.s,
            height: m.s,
            background: accent,
          }}
        />
      ))}
    </div>
  );
}

export function LockdownGate() {
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
    if (!lockdown || bypassed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.length !== 1) return;
      bufferRef.current = (bufferRef.current + e.key.toLowerCase()).slice(-TRIGGER_WORD.length);
      if (bufferRef.current === TRIGGER_WORD) { bufferRef.current = ""; setShowCodeModal(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lockdown, bypassed]);

  const visible = lockdown === true && !bypassed;
  const errInfo = getLockdownCode(codeId);
  const severity = errInfo?.severity ?? "warn";
  const s = SEVERITY[severity];
  const displayCode = errInfo?.code ?? codeId ?? "E-0000";

  const submitCode = async () => {
    if (codeChecking) return;
    setCodeChecking(true);
    setCodeError(null);
    try {
      const r = await submitCodeFn({ data: { code: code.trim() } });
      if (r?.ok) {
        try { sessionStorage.setItem(BYPASS_TOKEN_KEY, r.token); } catch {}
        setBypassed(true); setShowCodeModal(false);
      } else if ((r as { locked?: boolean; retryAfter?: number } | undefined)?.locked) {
        const secs = (r as { retryAfter?: number }).retryAfter ?? 900;
        setCodeError(`Užblokuota. Bandyk po ${Math.ceil(secs / 60)} min.`);
      } else {
        setCodeError("Neteisingas kodas.");
      }
    } catch {
      setCodeError("Nepavyko patikrinti. Bandyk dar kartą.");
    } finally { setCodeChecking(false); }
  };

  async function runCheck(auto = false) {
    setRefreshing(true); setRefreshOk(null);
    try {
      const { data, error } = await readSiteSettings();
      await new Promise((r) => setTimeout(r, auto ? 400 : 900));
      if (!error && !data?.lockdown_enabled) {
        setRefreshOk(true);
        setTimeout(() => setLockdown(false), 550);
      } else {
        setLockdown(Boolean(data?.lockdown_enabled));
        setMessage(data?.lockdown_message ?? null);
        setCodeId(data?.lockdown_code ?? null);
        setRefreshOk(false);
      }
    } catch { setRefreshOk(false); }
    finally { setRefreshing(false); setTimeout(() => setRefreshOk(null), 2500); }
  }

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(displayCode); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  const fade = (delay = 0) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  });

  const grouped = useMemo(() => {
    const g: Record<LockdownCode["severity"], LockdownCode[]> = { info: [], warn: [], critical: [] };
    for (const c of LOCKDOWN_CODES) g[c.severity].push(c);
    return g;
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="lockdown"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ y: "-102%", transition: { duration: 0.95, ease: [0.76, 0, 0.24, 1] } }}
          className="fixed inset-0 z-[9999] overflow-y-auto bg-[#0b0b0d] text-[#e9e5dd]"
        >
          {/* Deep vignette + slow breathing warm halo */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background:
                `radial-gradient(ellipse 70% 55% at 50% 38%, ${s.warm}18, transparent 62%),` +
                "radial-gradient(ellipse at 50% 110%, rgba(0,0,0,0.75), transparent 65%)",
            }}
          />
          {/* Faint linen texture */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
            }}
          />
          <Dust accent={s.accent} />

          {/* Slow horizontal light sweep across the top rule */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-[92px] h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${s.accent}70, transparent)`,
            }}
            initial={{ x: "-40%", opacity: 0 }}
            animate={{ x: "60%", opacity: [0, 1, 0] }}
            transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
          />

          <div className="relative z-10 mx-auto grid min-h-screen max-w-[1080px] grid-cols-[64px_1fr] gap-8 px-6 py-10 sm:px-12 sm:py-14">
            {/* Left index rail */}
            <motion.aside {...fade(0)} className="hidden flex-col items-center justify-between border-r border-white/8 pr-4 sm:flex">
              <div className="grid h-10 w-10 place-items-center rounded-sm border border-white/12 bg-white/[0.03] font-display text-sm font-semibold tracking-tight text-white/95">
                SV
              </div>
              <div
                className="rotate-180 text-[10px] uppercase tracking-[0.5em] text-white/35"
                style={{ writingMode: "vertical-rl" }}
              >
                Socialinės Valandos · Būklės pranešimas
              </div>
              <div className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.02]">
                <Lock className="h-3.5 w-3.5 text-white/40" />
              </div>
            </motion.aside>

            <div className="flex min-h-[calc(100vh-7rem)] flex-col">
              <motion.header {...fade(0)} className="flex items-center justify-between border-b border-white/10 pb-5">
                <div className="flex items-center gap-3 sm:hidden">
                  <div className="grid h-9 w-9 place-items-center rounded-sm border border-white/15 bg-white/[0.03] font-display text-sm font-semibold text-white">
                    SV
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.28em] text-white/45">Būklės pranešimas</div>
                </div>
                <div className="hidden items-center gap-2 text-[10px] uppercase tracking-[0.32em] text-white/40 sm:flex">
                  <span>Skyrius</span>
                  <span className="text-white/25">/</span>
                  <span>Sistemos incidentas</span>
                </div>
                <motion.span
                  animate={{ opacity: [0.35, 1, 0.35] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.24em] text-white/60"
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: s.accent }} />
                  Vyksta priežiūra
                </motion.span>
              </motion.header>

              <motion.div {...fade(0.05)} className="mt-14 flex items-baseline gap-4">
                <span className="inline-block h-px w-14" style={{ background: s.accent }} />
                <span className="text-[11px] font-medium uppercase tracking-[0.36em]" style={{ color: s.accent }}>{s.label}</span>
                <span className="text-[11px] uppercase tracking-[0.28em] text-white/35">{s.kicker}</span>
              </motion.div>

              {/* Headline with mask reveal */}
              <div className="relative mt-6 overflow-hidden">
                <motion.h1
                  initial={{ y: "110%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1.05, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  className="max-w-[760px] font-normal leading-[1.02] tracking-[-0.025em] text-white text-[42px] sm:text-[64px]"
                  style={{ fontFamily: "Fraunces, Georgia, serif" }}
                >
                  {errInfo?.title ?? "Sistema laikinai neveikia"}
                </motion.h1>
              </div>

              <motion.p {...fade(0.32)} className="mt-7 max-w-[640px] text-[17px] leading-[1.7] text-white/70">
                {message?.trim() || errInfo?.description ||
                  "Šiuo metu tvarkome sistemą. Grįžk po kelių minučių — jokie tavo duomenys nebus prarasti."}
              </motion.p>

              {/* Divider with tiny ornament */}
              <motion.div {...fade(0.38)} className="mt-12 flex items-center gap-4 text-white/25">
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] tracking-[0.5em]" style={{ color: s.accent }}>◆</span>
                <span className="h-px flex-1 bg-white/10" />
              </motion.div>

              <motion.dl {...fade(0.44)} className="mt-8 grid grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-3">
                <div>
                  <dt className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/40">Klaidos kodas</dt>
                  <dd className="mt-3">
                    <button
                      onClick={copyCode}
                      className="group inline-flex items-center gap-2 rounded-sm border border-white/12 bg-white/[0.02] px-3 py-1.5 font-mono text-[16px] tracking-[0.08em] text-white transition hover:border-white/30 hover:bg-white/[0.05]"
                      title="Kopijuoti kodą"
                      style={{ borderLeft: `2px solid ${s.accent}` }}
                    >
                      {displayCode}
                      <span className="text-white/40 transition group-hover:text-white/80">
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/40">Numatoma trukmė</dt>
                  <dd className="mt-3 font-display text-[17px] text-white/90">{errInfo?.eta ?? "nežinoma"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/40">Kitas patikrinimas</dt>
                  <dd className="mt-3 flex items-center gap-3 font-display text-[17px] text-white/90">
                    <span className="tabular-nums">{autoTick}s</span>
                    <span aria-hidden className="relative h-[3px] w-20 overflow-hidden rounded-full bg-white/8">
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

              <motion.div {...fade(0.55)} className="mt-12 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => runCheck(false)}
                  disabled={refreshing}
                  className="group inline-flex items-center gap-2.5 rounded-sm bg-white px-5 py-3 text-sm font-medium tracking-tight text-[#0b0b0d] transition hover:bg-white/90 disabled:opacity-70"
                >
                  <motion.span
                    animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
                    transition={refreshing
                      ? { duration: 0.9, repeat: Infinity, ease: "linear" }
                      : { type: "spring", stiffness: 180, damping: 14 }}
                    className="inline-flex"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </motion.span>
                  {refreshing ? "Tikrinama…" : "Patikrinti dar kartą"}
                </button>

                <button
                  onClick={() => setShowGuide(true)}
                  className="inline-flex items-center gap-2 rounded-sm border border-white/12 bg-transparent px-5 py-3 text-sm font-medium text-white/75 transition hover:border-white/30 hover:text-white"
                >
                  <BookOpen className="h-3.5 w-3.5" /> Ką reiškia šis kodas?
                </button>

                <AnimatePresence>
                  {refreshOk === false && (
                    <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-xs text-white/55">
                      Sistema vis dar neveikia — pabandyk po minutės.
                    </motion.span>
                  )}
                  {refreshOk === true && (
                    <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1.5 text-xs text-emerald-300/90">
                      <ShieldCheck className="h-3.5 w-3.5" /> Sistema veikia. Grįžtame.
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.footer {...fade(0.7)} className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-[11px] uppercase tracking-[0.24em] text-white/40">
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" /> Duomenys apsaugoti</span>
                <span className="font-mono text-white/30">SV · Status Bulletin</span>
              </motion.footer>
            </div>
          </div>

          {/* Inline guide sheet */}
          <AnimatePresence>
            {showGuide && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowGuide(false)}
                className="fixed inset-0 z-[10001] bg-black/70 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 220, damping: 30 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-white/12 bg-[#131215] px-6 py-8 sm:px-10"
                >
                  <div className="mx-auto max-w-[880px]">
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/45">Klaidų kodų gidas</p>
                        <h3 className="mt-1 font-normal text-2xl text-white sm:text-3xl" style={{ fontFamily: "Fraunces, Georgia, serif" }}>
                          Ką reiškia kiekvienas kodas
                        </h3>
                      </div>
                      <button onClick={() => setShowGuide(false)} className="grid h-9 w-9 place-items-center rounded-sm text-white/60 hover:bg-white/10 hover:text-white">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {(["critical", "warn", "info"] as const).map((sev) => (
                      grouped[sev].length ? (
                        <div key={sev} className="mb-6">
                          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">
                            {sev === "critical" ? "Kritiniai" : sev === "warn" ? "Įspėjimai" : "Informaciniai"}
                          </p>
                          <ul className="divide-y divide-white/8 rounded-sm border border-white/10 bg-white/[0.02]">
                            {grouped[sev].map((c) => (
                              <li key={c.code} className={c.code === displayCode ? "bg-white/[0.05]" : ""}>
                                <details className="group">
                                  <summary className="flex cursor-pointer items-center gap-4 px-4 py-3 marker:hidden [&::-webkit-details-marker]:hidden">
                                    <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[12px] tracking-[0.06em] ${SEV_PILL[sev]}`}>
                                      {c.code}
                                    </span>
                                    <span className="flex-1 text-sm text-white/85">{c.title}</span>
                                    <span className="text-[11px] uppercase tracking-[0.18em] text-white/40">{c.eta}</span>
                                    <ChevronDown className="h-4 w-4 text-white/40 transition group-open:rotate-180" />
                                  </summary>
                                  <div className="px-4 pb-4 pl-[calc(1rem+4.5rem)] text-sm leading-relaxed text-white/60">
                                    {c.description}
                                  </div>
                                </details>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null
                    ))}

                    <p className="mt-4 text-[11px] text-white/40">
                      Kodai naudojami tik informavimui — jokie tavo duomenys nėra prarasti.
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showCodeModal && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[10000] grid place-items-center bg-black/80 backdrop-blur-md p-4"
                onClick={() => setShowCodeModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.96, y: 8, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.96, y: 8, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-sm rounded-sm border border-white/12 bg-[#131215] p-6 shadow-2xl"
                >
                  <button onClick={() => setShowCodeModal(false)} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-sm text-white/50 hover:bg-white/10 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/50">Administracinė prieiga</p>
                  <h2 className="mt-1 text-xl font-medium text-white" style={{ fontFamily: "Fraunces, Georgia, serif" }}>Įvesk kodą</h2>
                  <input
                    autoFocus type="password" inputMode="numeric" value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitCode()}
                    disabled={codeChecking}
                    maxLength={10}
                    className={`mt-4 w-full rounded-sm border bg-black/40 px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] text-white outline-none transition disabled:opacity-60 ${
                      codeError ? "border-rose-500 animate-shake" : "border-white/15 focus:border-white/50"
                    }`}
                    placeholder="••••"
                  />
                  {codeError && <p className="mt-2 text-center text-xs text-rose-300/90">{codeError}</p>}
                  <button
                    onClick={submitCode} disabled={codeChecking}
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
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
