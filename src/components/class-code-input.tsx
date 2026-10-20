import { useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, KeyRound } from "lucide-react";

const FULL = /^MKC-[A-Z0-9]{5}-[A-Z0-9]$/;
const GHOST = "MKC#####E";

/** Formats raw input to MKC-XXXXX-X; other (older) codes pass through. */
export function formatClassCode(value: string) {
  const raw = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!"MKC".startsWith(raw.slice(0, 3)) || raw.length === 0) return value.toUpperCase().replace(/\s+/g, "").slice(0, 64);
  const s = raw.slice(0, 9);
  return [s.slice(0, 3), s.slice(3, 8), s.slice(8, 9)].filter(Boolean).join("-");
}

export function isCompleteClassCode(code: string) { return FULL.test(code); }

/**
 * Class signup code field with slot animation: characters pop into place,
 * separators appear on their own and the frame lights up once complete.
 * Validity is format-only — the server decides whether the code exists.
 */
export function ClassCodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const calm = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const raw = value.replace(/-/g, "");
  const mkc = raw.length === 0 || "MKC".startsWith(raw.slice(0, 3));
  const done = isCompleteClassCode(value);
  const slots = Array.from({ length: 9 }, (_, i) => raw[i] ?? "");

  return (
    <div className="auth-field">
      <label htmlFor={id} className="block text-xs font-semibold leading-4 text-foreground/80">Klasės registracijos kodas</label>
      <div
        onClick={() => ref.current?.focus()}
        className={`relative mt-1.5 cursor-text overflow-hidden rounded-2xl border bg-background px-3 py-3 transition-colors ${done ? "border-primary shadow-glow" : focused ? "border-primary/60" : "border-border"}`}
      >
        {!calm && done && (
          <motion.span aria-hidden className="pointer-events-none absolute inset-0 bg-primary/10" initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ duration: 0.8, ease: "easeOut" }} />
        )}
        <input
          ref={ref}
          id={id}
          value={value}
          onChange={(e) => onChange(formatClassCode(e.target.value))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
          aria-describedby={`${id}-hint`}
          style={mkc ? { color: "transparent", caretColor: "transparent", background: "transparent", border: 0, boxShadow: "none" } : undefined}
          className={mkc ? "absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent" : "relative h-8 w-full bg-transparent pl-7 font-mono text-base font-bold tracking-wider outline-none"}
        />
        {mkc ? (
          <div aria-hidden className="pointer-events-none relative flex items-center justify-center gap-1 font-mono text-lg font-black sm:gap-1.5">
            <KeyRound className={`mr-1 h-4 w-4 shrink-0 transition-colors ${done ? "text-primary" : "text-muted-foreground"}`} />
            {slots.map((ch, i) => {
              const active = focused && i === raw.length;
              return (
                <span key={i} className="flex items-center gap-1 sm:gap-1.5">
                  {(i === 3 || i === 8) && (
                    <motion.span animate={{ opacity: raw.length >= i ? 1 : 0.25, scale: raw.length >= i ? 1 : 0.8 }} className="text-muted-foreground">-</motion.span>
                  )}
                  <span className={`relative grid h-9 w-6 place-items-center rounded-lg border sm:w-7 ${ch ? "border-primary/40 bg-primary/10 text-foreground" : active ? "border-primary bg-background" : "border-border bg-muted/40 text-muted-foreground/30"}`}>
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={ch || `g${i}`}
                        initial={calm ? false : { y: 12, opacity: 0, scale: 0.6 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={calm ? undefined : { y: -10, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 520, damping: 26 }}
                      >
                        {ch || (i < 3 ? GHOST[i] : "")}
                      </motion.span>
                    </AnimatePresence>
                    {active && <span className="absolute bottom-1.5 h-0.5 w-3 animate-pulse rounded bg-primary" />}
                  </span>
                </span>
              );
            })}
            <AnimatePresence>
              {done && (
                <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} className="ml-1.5 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3.5 w-3.5" />
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <KeyRound aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
      </div>
      <p id={`${id}-hint`} className={`mt-1.5 text-xs transition-colors ${done ? "font-semibold text-primary" : "text-muted-foreground"}`}>
        {done ? "Kodas pilnas — klasė, raidė ir valandos bus priskirtos pagal jį." : "Gausi iš klasės auklėtojo. Klasė ir privalomos valandos užrakintos pagal kodą."}
      </p>
    </div>
  );
}
