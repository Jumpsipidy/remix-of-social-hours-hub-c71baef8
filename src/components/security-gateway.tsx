import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, ShieldCheck, Fingerprint, ChevronDown } from "lucide-react";
import { Captcha } from "./captcha";
import { useSecurityGateway } from "./security-gateway-provider";
import { motionFeatures, reasonLabel, solvePow } from "@/lib/bot-signals";
import { issueGateChallenge, verifyGate } from "@/lib/bot-gate.functions";

const HOLD_MS = 1600;
type Challenge = Awaited<ReturnType<typeof issueGateChallenge>>;

/**
 * Full-screen verification page. Our own check runs on the server:
 * signed challenge + proof-of-work computed by the device + hold timing and
 * pointer behaviour. Two failures (or a server problem) → reCAPTCHA.
 */
export function SecurityGatewayInternal() {
  const { isBlocked, pass, reasons } = useSecurityGateway();
  const [stage, setStage] = useState<"hold" | "checking" | "captcha" | "ok">("hold");
  const [progress, setProgress] = useState(0);
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
    challenge.current = issueGateChallenge().then(async (c) => {
      setServerReasons(c.serverReasons);
      return { c, solution: await solvePow(c.nonce, c.difficulty) };
    });
    challenge.current.catch(() => setStage("captcha"));
  };

  useEffect(() => { if (isBlocked) loadChallenge(); }, [isBlocked]);

  if (!isBlocked) return null;

  const tick = () => {
    const p = Math.min(1, (performance.now() - start.current) / HOLD_MS);
    setProgress(p);
    if (p < 1) raf.current = requestAnimationFrame(tick);
    else void finish(true);
  };
  const begin = (e: React.PointerEvent) => {
    if (stage !== "hold") return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    trusted.current = e.isTrusted;
    pointerType.current = (e.pointerType as typeof pointerType.current) || "";
    points.current = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
    start.current = holdStart.current = performance.now();
    raf.current = requestAnimationFrame(tick);
  };
  const move = (e: React.PointerEvent) => {
    if (!start.current) return;
    if (!e.isTrusted) trusted.current = false;
    points.current.push({ x: e.clientX, y: e.clientY, t: performance.now() });
  };
  const finish = async (complete: boolean) => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    const wasHolding = start.current !== 0;
    start.current = 0;
    if (!wasHolding) return;
    if (!complete) { setProgress(0); return; }
    setStage("checking");
    try {
      const { c, solution } = await challenge.current!;
      const m = motionFeatures(points.current);
      const r = await verifyGate({
        data: {
          nonce: c.nonce, issuedAt: c.issuedAt, difficulty: c.difficulty, sig: c.sig, solution,
          holdMs: Math.round(performance.now() - holdStart.current), ...m,
          pointerType: pointerType.current, trusted: trusted.current,
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
        <h1 id="sv-bot-title" className="text-2xl font-black tracking-tight" style={{ color: "#fff" }}>
          Patikrinimas, ar jūs ne robotas
        </h1>
        <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,.6)" }}>
          {stage === "captcha"
            ? "Papildoma patikra. Užbaik žemiau esančią užduotį."
            : "Mūsų sistema pastebėjo neįprastą įrenginį. Paspausk ir palaikyk mygtuką."}
        </p>

        <div className="mt-8 flex justify-center">
          <AnimatePresence mode="wait">
            {stage === "captcha" ? (
              <motion.div key="cap" initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} className="w-full">
                <Captcha tone="dark" onVerify={() => { setStage("ok"); setTimeout(() => pass(), 600); }} />
              </motion.div>
            ) : (
              <motion.button
                key="hold"
                type="button"
                onPointerDown={begin}
                onPointerMove={move}
                onPointerUp={() => void finish(false)}
                onPointerCancel={() => void finish(false)}
                onPointerLeave={() => void finish(false)}
                onContextMenu={(e) => e.preventDefault()}
                disabled={stage !== "hold"}
                whileTap={{ scale: 0.96 }}
                className="relative grid h-40 w-40 touch-none select-none place-items-center rounded-full"
                style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
                aria-label="Paspausk ir palaikyk"
              >
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="4" />
                  <circle cx="60" cy="60" r={R} fill="none" stroke={stage === "ok" ? "#22c55e" : "#fff"} strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={C} strokeDashoffset={C * (1 - (stage === "hold" ? progress : 1))} style={{ transition: stage === "hold" ? "none" : "stroke-dashoffset .3s" }} />
                </svg>
                {stage === "ok" ? <ShieldCheck className="h-12 w-12" style={{ color: "#22c55e" }} />
                  : stage === "checking" ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Fingerprint className="h-12 w-12" style={{ color: "#fff" }} /></motion.div>
                  : <Fingerprint className="h-12 w-12" style={{ color: "#fff", opacity: .5 + progress / 2 }} />}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-6 min-h-4 text-xs" style={{ color: "rgba(255,255,255,.5)" }}>
          {stage === "checking" ? "Tikrinama serveryje…" : stage === "ok" ? "Patvirtinta. Įleidžiame…" : fails > 0 && stage === "hold" ? "Nepavyko. Pabandyk dar kartą, laikyk ilgiau." : stage === "hold" ? "Laikyk paspaudęs, kol ratas užsipildys" : ""}
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
