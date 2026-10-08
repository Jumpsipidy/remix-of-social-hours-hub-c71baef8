import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, ShieldCheck, Fingerprint, ChevronDown, Sun, TreePine, Heart, Star, House, Bike, BookOpen, Leaf, Moon, Cloud, type LucideIcon } from "lucide-react";
import { Captcha } from "./captcha";
import { useSecurityGateway } from "./security-gateway-provider";
import { motionFeatures, reasonLabel, solvePow } from "@/lib/bot-signals";
import { issueGateChallenge, verifyGate } from "@/lib/bot-gate.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import type { GateBehavior } from "@/lib/gate-behavior";

const HOLD_MS = 1600;
const MotionButton = motion.create(Button);
type Challenge = Awaited<ReturnType<typeof issueGateChallenge>>;

const ICONS: Record<string, { Icon: LucideIcon; label: string }> = {
  sun: { Icon: Sun, label: "Saulė" }, tree: { Icon: TreePine, label: "Eglė" },
  heart: { Icon: Heart, label: "Širdis" }, star: { Icon: Star, label: "Žvaigždė" },
  house: { Icon: House, label: "Namas" }, bike: { Icon: Bike, label: "Dviratis" },
  book: { Icon: BookOpen, label: "Knyga" }, leaf: { Icon: Leaf, label: "Lapas" },
  moon: { Icon: Moon, label: "Mėnulis" }, cloud: { Icon: Cloud, label: "Debesis" },
};

/**
 * Full-screen verification page. Our own check runs on the server:
 * signed challenge + proof-of-work computed by the device + hold timing and
 * pointer behaviour. Two failures (or a server problem) → reCAPTCHA.
 */
export function SecurityGatewayInternal() {
  const { isBlocked, pass, reasons } = useSecurityGateway();
  const [stage, setStage] = useState<"hold" | "tap" | "checking" | "captcha" | "ok">("hold");
  const [current, setCurrent] = useState<Challenge | null>(null);
  const [taps, setTaps] = useState<number[]>([]);
  const tapTimes = useRef<number[]>([]);
  const holdData = useRef<(GateBehavior & ReturnType<typeof motionFeatures>) | null>(null);
  const issueChallenge = useServerFn(issueGateChallenge);
  const verify = useServerFn(verifyGate);
  const inputMode = useRef<"pointer" | "keyboard">("pointer");
  const [progress, setProgress] = useState(0);
  const [moving, setMoving] = useState(false);
  const [holding, setHolding] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);
  const [fails, setFails] = useState(0);
  const [failReasons, setFailReasons] = useState<string[]>([]);
  const [serverReasons, setServerReasons] = useState<string[]>([]);
  const [showWhy, setShowWhy] = useState(false);
  const points = useRef<{ x: number; y: number; t: number }[]>([]);
  const start = useRef(0);
  const holdStart = useRef(0);
  const pointerType = useRef<"mouse" | "touch" | "pen" | "">("");
  const trusted = useRef(true);
  const raf = useRef<number | null>(null);
  const challenge = useRef<Promise<{ c: Challenge; solution: number }> | null>(null);

  const loadChallenge = () => {
    challenge.current = issueChallenge({ data: { clientRisk: Math.min(50, reasons.length) } }).then(async (c) => {
      setServerReasons(c.serverReasons);
      setCurrent(c);
      setTaps([]);
      return { c, solution: await solvePow(c.nonce, c.difficulty) };
    });
    challenge.current.catch(() => setStage("captcha"));
  };

  useEffect(() => { if (isBlocked) loadChallenge(); }, [isBlocked]);
  useEffect(() => {
    setCoarsePointer(window.matchMedia("(pointer: coarse)").matches);
    const cancel = () => { if (document.hidden || !document.hasFocus()) void finish(false); };
    document.addEventListener("visibilitychange", cancel);
    window.addEventListener("blur", cancel);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      document.removeEventListener("visibilitychange", cancel);
      window.removeEventListener("blur", cancel);
    };
  }, []);

  if (!isBlocked) return null;

  const tick = () => {
    const p = Math.min(1, (performance.now() - start.current) / HOLD_MS);
    const needsMotion = inputMode.current !== "keyboard" && pointerType.current === "mouse" && motionFeatures(points.current).jitter < 2;
    setProgress(needsMotion ? Math.min(.95, p) : p);
    if (performance.now() - start.current > 15000) { void finish(false); return; }
    if (p < 1 || needsMotion) raf.current = requestAnimationFrame(tick);
    else void finish(true);
  };
  const begin = (e: React.PointerEvent) => {
    if (stage !== "hold") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setHolding(true);
    setMoving(false);
    setFailReasons([]);
    trusted.current = e.isTrusted;
    inputMode.current = "pointer";
    pointerType.current = (e.pointerType as typeof pointerType.current) || "";
    points.current = [{ x: e.clientX, y: e.clientY, t: 0 }];
    start.current = holdStart.current = performance.now();
    raf.current = requestAnimationFrame(tick);
  };
  const move = (e: React.PointerEvent) => {
    if (!start.current) return;
    if (!e.isTrusted) trusted.current = false;
    const t = performance.now() - holdStart.current;
    const last = points.current[points.current.length - 1];
    if (points.current.length < 128 && (!last || t - last.t >= 12)) {
      points.current.push({ x: e.clientX, y: e.clientY, t });
      setMoving(motionFeatures(points.current).jitter >= 2);
    }
  };
  const finish = async (complete: boolean) => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    const wasHolding = start.current !== 0;
    start.current = 0;
    setHolding(false);
    if (!wasHolding) return;
    if (!complete) { setProgress(0); return; }
    const m = motionFeatures(points.current);
    holdData.current = {
      holdMs: Math.round(performance.now() - holdStart.current), ...m,
      pointerType: pointerType.current, trusted: trusted.current, inputMode: inputMode.current, samples: points.current,
    };
    try {
      const pending = challenge.current;
      if (!pending) throw new Error("challenge_missing");
      const { c } = await pending;
      if (c.steps === 2) {
        setTaps([]);
        tapTimes.current = [performance.now()];
        setStage("tap");
        return;
      }
    } catch { setStage("captcha"); return; }
    await submit([]);
  };

  const onTap = (i: number, isTrusted: boolean) => {
    if (stage !== "tap" || taps.includes(i)) return;
    if (!isTrusted) trusted.current = false;
    tapTimes.current.push(performance.now());
    const next = [...taps, i];
    setTaps(next);
    if (next.length === 3) {
      if (holdData.current) holdData.current.trusted = trusted.current;
      void submit(next);
    }
  };

  const submit = async (tapAnswer: number[]) => {
    setStage("checking");
    try {
      const pending = challenge.current;
      const behavior = holdData.current;
      if (!pending || !behavior) throw new Error("challenge_missing");
      const { c, solution } = await pending;
      const t = tapTimes.current;
      const tapIntervals = t.slice(1).map((v, i) => Math.round(v - t[i]));
      const r = await verify({
        data: {
          nonce: c.nonce, issuedAt: c.issuedAt, difficulty: c.difficulty, sig: c.sig, solution,
          steps: c.steps, grid: c.grid, targets: c.targets,
          tapAnswer: c.steps === 2 ? tapAnswer : undefined,
          tapIntervals: c.steps === 2 ? tapIntervals : undefined,
          ...behavior,
        },
      });
      if (r.ok) { setStage("ok"); setTimeout(() => pass(r.token), 700); return; }
      const f = fails + 1;
      setFails(f);
      setFailReasons(r.reasons);
      setProgress(0);
      setStage(f >= 2 ? "captcha" : "hold");
      if (f < 2) loadChallenge();
    } catch {
      setStage("captcha");
    }
  };

  const allReasons = [...reasons, ...serverReasons.filter((r) => !reasons.includes(r))];
  const R = 54, C = 2 * Math.PI * R;

  return (
    <div className="fixed inset-0 z-[2147483647] overflow-y-auto px-4 py-[max(2rem,env(safe-area-inset-top))]" style={{ background: "#000" }} role="dialog" aria-modal="true" aria-labelledby="sv-bot-title">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex min-h-full w-full max-w-sm flex-col justify-center text-center">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5" style={{ border: "1px solid rgba(255,255,255,.18)", background: "rgba(255,255,255,.06)" }}>
          <ShieldCheck className="h-4 w-4" style={{ color: "#60a5fa" }} />
          <span className="text-xs font-black tracking-wide" style={{ color: "#fff" }}>SOCI GUARD</span>
          <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,.5)" }}>· mūsų apsauga</span>
        </div>
        <h1 id="sv-bot-title" className="text-2xl font-black tracking-tight" style={{ color: "#fff" }}>
          Patikrinimas, ar jūs ne robotas
        </h1>
        <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,.6)" }}>
          {stage === "captcha"
            ? "Papildoma patikra. Užbaik žemiau esančią užduotį."
            : stage === "tap"
              ? "Dar vienas trumpas žingsnis — tavo įrenginys atrodo neįprastai."
              : coarsePointer ? "Paspausk ir palaikyk, kol ratas užsipildys. Piršto judinti nereikia."
              : "Paspausk ir palaikyk mygtuką. Laikydamas šiek tiek pajudink pelę. Arba pažymėk mygtuką ir palaikyk tarpo klavišą — pelės judinti nereikės."}
        </p>

        <div className="mt-8 flex justify-center">
          <AnimatePresence mode="wait">
            {stage === "captcha" ? (
              <motion.div key="cap" initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} className="w-full">
                <Captcha tone="dark" onVerify={() => { setStage("ok"); setTimeout(() => pass(), 600); }} />
              </motion.div>
            ) : stage === "tap" && current ? (
              <motion.div key="tap" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                <p className="mb-3 text-sm font-semibold" style={{ color: "#fff" }}>
                  2 žingsnis iš 2: paspausk šiuos paveikslėlius tokia tvarka
                </p>
                <div className="mb-4 flex justify-center gap-2" aria-label="Tvarka">
                  {current.targets.map((t, k) => {
                    const it = ICONS[t]; const done = taps.length > k;
                    return (
                      <span key={k} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
                        style={{ background: done ? "rgba(34,197,94,.2)" : "rgba(255,255,255,.1)", color: done ? "#86efac" : "#fff" }}>
                        {k + 1}. {it && <it.Icon className="h-4 w-4" aria-hidden />} {it?.label}
                      </span>
                    );
                  })}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {current.grid.map((g, i) => {
                    const it = ICONS[g]; const picked = taps.indexOf(i);
                    return (
                      <Button key={i} type="button" variant="ghost" onClick={(e) => onTap(i, e.isTrusted)} aria-label={it?.label ?? g}
                        className="relative grid h-20 place-items-center rounded-2xl transition active:scale-95 focus-visible:outline focus-visible:outline-2"
                        style={{ background: picked >= 0 ? "rgba(34,197,94,.2)" : "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.15)", color: "#fff" }}>
                        {it && <it.Icon className="h-8 w-8" aria-hidden />}
                        {picked >= 0 && <span className="absolute right-2 top-1.5 text-xs font-black" style={{ color: "#86efac" }}>{picked + 1}</span>}
                      </Button>
                    );
                  })}
                </div>
                <button type="button" onClick={() => { setTaps([]); tapTimes.current = [performance.now()]; }}
                  className="mt-3 text-xs underline" style={{ color: "rgba(255,255,255,.6)" }}>Pradėti iš naujo</button>
              </motion.div>
            ) : (
              <MotionButton
                key="hold"
                type="button"
                variant="ghost"
                onPointerDown={begin}
                onPointerMove={move}
                onPointerUp={() => void finish(false)}
                onPointerCancel={() => void finish(false)}
                onPointerLeave={() => void finish(false)}
                onContextMenu={(e) => e.preventDefault()}
                onKeyDown={(e) => {
                  if ((e.key === " " || e.key === "Enter") && !e.repeat && stage === "hold" && !start.current) {
                    e.preventDefault();
                    trusted.current = e.isTrusted;
                    inputMode.current = "keyboard";
                    setHolding(true);
                    setMoving(false);
                    setFailReasons([]);
                    pointerType.current = "";
                    points.current = [];
                    start.current = holdStart.current = performance.now();
                    raf.current = requestAnimationFrame(tick);
                  }
                }}
                onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); void finish(false); } }}
                disabled={stage !== "hold"}
                whileTap={{ scale: 0.96 }}
                className="relative grid h-40 w-40 touch-none select-none place-items-center rounded-full bg-transparent p-0 hover:bg-transparent [&_svg]:size-auto"
                style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
                aria-label="Paspausk ir palaikyk"
                aria-describedby="sv-hold-status"
              >
                <svg className="absolute inset-0 !h-full !w-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
                  <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="4" />
                  <circle cx="60" cy="60" r={R} fill="none" stroke={stage === "ok" ? "#22c55e" : "#fff"} strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={C} strokeDashoffset={C * (1 - (stage === "hold" ? progress : 1))} style={{ transition: stage === "hold" ? "none" : "stroke-dashoffset .3s" }} />
                </svg>
                {stage === "ok" ? <ShieldCheck className="!h-12 !w-12" style={{ color: "#22c55e" }} />
                  : stage === "checking" ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Fingerprint className="!h-12 !w-12" style={{ color: "#fff" }} /></motion.div>
                  : <Fingerprint className="!h-12 !w-12" style={{ color: "#fff", opacity: .5 + progress / 2 }} />}
              </MotionButton>
            )}
          </AnimatePresence>
        </div>

        <p id="sv-hold-status" role="status" className="mt-6 min-h-10 text-xs text-muted-foreground">
          {stage === "checking" ? "Tikrinama serveryje…" : stage === "ok" ? "Patvirtinta. Įleidžiame…" : stage === "hold" && holding && pointerType.current === "mouse" ? moving ? "Judesys užfiksuotas. Laikyk toliau…" : "Neatleisk mygtuko — šiek tiek pajudink pelę" : fails > 0 && stage === "hold" ? "Pabandyk dar kartą. Gali naudoti ir tarpo klavišą." : stage === "hold" ? "Laikyk paspaudęs, kol ratas užsipildys" : ""}
        </p>

        {failReasons.length > 0 && stage !== "ok" && (
          <ul className="mt-3 space-y-1 rounded-lg p-3 text-left text-xs" style={{ background: "rgba(239,68,68,.12)", color: "#fca5a5" }}>
            {failReasons.map((r) => <li key={r}>• {reasonLabel(r)}</li>)}
          </ul>
        )}

        {allReasons.length > 0 && (
          <div className="mt-6 rounded-lg text-left text-xs" style={{ border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.7)" }}>
            <button type="button" onClick={() => setShowWhy((v) => !v)} className="flex w-full items-center justify-between px-3 py-2.5 font-semibold" aria-expanded={showWhy}>
              Kodėl matau šį puslapį? ({allReasons.length})
              <ChevronDown className="h-4 w-4 transition-transform" style={{ transform: showWhy ? "rotate(180deg)" : undefined }} />
            </button>
            {showWhy && (
              <ul className="space-y-1.5 px-3 pb-3">
                {allReasons.map((r) => <li key={r}>• {reasonLabel(r)}</li>)}
              </ul>
            )}
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,.35)" }}>
          <ShieldAlert className="h-3 w-3" /> Apsaugota Socialinės Valandos
        </div>
      </motion.div>
    </div>
  );
}

export const SecurityGateway = SecurityGatewayInternal;
