import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * VALORA — vidinis Socialinių Valandų variklis.
 *
 * Trys posistemės, kurios realiai suka platformą:
 *   Discovery Engine — užduočių paieška ir rikiavimas (žemėlapis, filtrai)
 *   Matching Engine  — mokinio ir organizacijos suvedimas, rezervacijos
 *   Time Engine      — valandų skaičiavimas, QR įsiregistravimas, sertifikatai
 *
 * Šis ekranas rodomas trumpai (~1.5 s) pirmą kartą per sesiją.
 */
const SESSION_KEY = "sv_valora_boot_v1";

const STAGES = [
  { label: "Discovery Engine", detail: "užduočių indeksas" },
  { label: "Matching Engine", detail: "rezervacijų srautas" },
  { label: "Time Engine", detail: "valandų apskaita" },
];

export function ValoraBoot() {
  const [show, setShow] = useState(false);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* privatus režimas — vis tiek parodom kartą */
    }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    setShow(true);
    const t1 = window.setTimeout(() => setStage(1), 380);
    const t2 = window.setTimeout(() => setStage(2), 720);
    const t3 = window.setTimeout(() => setStage(3), 1040);
    const done = window.setTimeout(() => setShow(false), 1550);
    return () => [t1, t2, t3, done].forEach(window.clearTimeout);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="valora-boot"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(6px)" }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[200] grid place-items-center bg-background"
          role="status"
          aria-live="polite"
          aria-label="Valora variklis kraunasi"
        >
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[130px]" />
          </div>

          <div className="relative flex flex-col items-center px-6 text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative grid h-16 w-16 place-items-center rounded-2xl border border-primary/30 bg-primary/10"
            >
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-2xl border border-primary/40"
                animate={{ scale: [1, 1.35], opacity: [0.7, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
              />
              <span className="font-display text-2xl font-black tracking-tight text-primary">V</span>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.4 }}
              className="mt-5 text-[10px] font-bold uppercase tracking-[0.42em] text-muted-foreground"
            >
              Veikia su
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.45 }}
              className="mt-1 font-display text-4xl font-black tracking-tight text-foreground sm:text-5xl"
            >
              VALORA
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.28 }}
              className="mt-2 text-xs text-muted-foreground"
            >
              Socialinių Valandų vidinis variklis
            </motion.p>

            <div className="mt-7 grid gap-1.5">
              {STAGES.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0.25 }}
                  animate={{ opacity: stage > i ? 1 : 0.25 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center justify-center gap-2 text-[11px] font-medium tracking-wide"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${stage > i ? "bg-primary" : "bg-muted-foreground/40"}`}
                  />
                  <span className="text-foreground">{s.label}</span>
                  <span className="text-muted-foreground">· {s.detail}</span>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 h-[2px] w-44 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.4, ease: "easeInOut" }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
