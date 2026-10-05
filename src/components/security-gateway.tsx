import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, ShieldCheck, Fingerprint } from "lucide-react";
import { Captcha } from "./captcha";
import { useSecurityGateway } from "./security-gateway-provider";
import { humanMotionScore } from "@/lib/bot-signals";

const HOLD_MS = 1600;

/**
 * Full-screen black verification page. Step 1: our own press-and-hold check
 * that measures real pointer behaviour. Step 2 (only if step 1 fails twice):
 * reCAPTCHA / server math challenge.
 */
export function SecurityGatewayInternal() {
  const { isBlocked, pass } = useSecurityGateway();
  const [stage, setStage] = useState<"hold" | "checking" | "captcha" | "ok">("hold");
  const [progress, setProgress] = useState(0);
  const [fails, setFails] = useState(0);
  const points = useRef<{ x: number; y: number; t: number }[]>([]);
  const start = useRef<number>(0);
  const raf = useRef<number | null>(null);

  if (!isBlocked) return null;

  const tick = () => {
    const p = Math.min(1, (performance.now() - start.current) / HOLD_MS);
    setProgress(p);
    if (p < 1) raf.current = requestAnimationFrame(tick);
    else finish(true);
  };
  const begin = (e: React.PointerEvent) => {
    if (stage !== "hold") return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    points.current = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
    start.current = performance.now();
    raf.current = requestAnimationFrame(tick);
  };
  const move = (e: React.PointerEvent) => {
    if (start.current) points.current.push({ x: e.clientX, y: e.clientY, t: performance.now() });
  };
  const finish = (complete: boolean) => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    const wasHolding = start.current !== 0;
    start.current = 0;
    if (!wasHolding) return;
    if (!complete) { setProgress(0); return; }
    setStage("checking");
    const trusted = humanMotionScore(points.current) >= 1;
    setTimeout(() => {
      if (trusted) { setStage("ok"); setTimeout(pass, 700); }
      else {
        const f = fails + 1;
        setFails(f);
        setProgress(0);
        setStage(f >= 2 ? "captcha" : "hold");
      }
    }, 900);
  };

  const R = 54, C = 2 * Math.PI * R;

  return (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-background px-4" style={{ background: "#000" }} role="dialog" aria-modal="true" aria-labelledby="sv-bot-title">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center">
        <h1 id="sv-bot-title" className="text-2xl font-black tracking-tight text-foreground" style={{ color: "#fff" }}>
          Patikrinimas, ar jūs ne robotas
        </h1>
        <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,.6)" }}>
          {stage === "captcha"
            ? "Papildoma patikra. Užbaik žemiau esančią užduotį."
            : "Mūsų sistema pastebėjo neįprastą įrenginį. Paspausk ir palaikyk mygtuką."}
        </p>

        <div className="mt-10 flex justify-center">
          <AnimatePresence mode="wait">
            {stage === "captcha" ? (
              <motion.div key="cap" initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} className="w-full">
                <Captcha tone="dark" onVerify={() => { setStage("ok"); setTimeout(pass, 600); }} />
              </motion.div>
            ) : (
              <motion.button
                key="hold"
                type="button"
                onPointerDown={begin}
                onPointerMove={move}
                onPointerUp={() => finish(false)}
                onPointerLeave={() => finish(false)}
                onContextMenu={(e) => e.preventDefault()}
                disabled={stage !== "hold"}
                whileTap={{ scale: 0.96 }}
                className="relative grid h-40 w-40 touch-none select-none place-items-center rounded-full"
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

        <p className="mt-6 text-xs" style={{ color: "rgba(255,255,255,.45)" }}>
          {stage === "checking" ? "Tikrinama…" : stage === "ok" ? "Patvirtinta. Įleidžiame…" : fails > 0 && stage === "hold" ? "Nepavyko. Pabandyk dar kartą, laikyk ilgiau." : stage === "hold" ? "Laikyk paspaudęs, kol ratas užsipildys" : ""}
        </p>
        <div className="mt-10 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,.35)" }}>
          <ShieldAlert className="h-3 w-3" /> Apsaugota Socialinės Valandos
        </div>
      </motion.div>
    </div>
  );
}

export const SecurityGateway = SecurityGatewayInternal;
