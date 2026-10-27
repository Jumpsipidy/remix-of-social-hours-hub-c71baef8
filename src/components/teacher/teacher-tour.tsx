import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Check, GraduationCap, Sparkles, X } from "lucide-react";
import { TEACHER_TOUR_STEPS, markTourCompleted } from "@/lib/teacher-tour";

const PAD = 10;
const CARD_W = 340;
const CARD_H = 240;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

type Phase = "intro" | number | "done";

/**
 * Interaktyvus auklėtojo sąsajos vedlys: slystantis prožektorius,
 * animuotos kortelės, klaviatūros valdymas, praleidimas ir įsiminimas naršyklėje.
 */
export function TeacherTour({ open, onDone }: { open: boolean; onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [rect, setRect] = useState<Rect | null>(null);

  const step = typeof phase === "number" ? TEACHER_TOUR_STEPS[phase] : null;

  const locate = useCallback(() => {
    if (!step) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.selector);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({
      top: Math.max(8, r.top - PAD),
      left: Math.max(8, r.left - PAD),
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    });
  }, [step]);

  useEffect(() => {
    if (open) {
      setPhase("intro");
      setRect(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !step) return;
    const el = document.querySelector(step.selector);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    locate();
    const t = window.setTimeout(locate, 420);
    window.addEventListener("resize", locate);
    window.addEventListener("scroll", locate, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", locate);
      window.removeEventListener("scroll", locate, true);
    };
  }, [open, step, locate]);

  const finish = useCallback(() => {
    markTourCompleted();
    onDone();
  }, [onDone]);

  const next = useCallback(() => {
    setPhase((p) => {
      if (p === "intro") return 0;
      if (p === "done") return p;
      return p + 1 >= TEACHER_TOUR_STEPS.length ? "done" : p + 1;
    });
  }, []);

  const back = useCallback(() => {
    setPhase((p) => (typeof p === "number" && p > 0 ? p - 1 : p));
  }, []);

  // Klaviatūra: Enter/→ — toliau, ← — atgal, Esc — baigti.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight" || e.key === "Enter") {
        if (phase === "done") finish();
        else next();
      } else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, phase, next, back, finish]);

  if (!open) return null;

  // Kortelės pozicija žingsnių metu: po elementu, jei telpa, kitaip — virš jo.
  let cardStyle: React.CSSProperties = {
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: CARD_W,
    maxWidth: "calc(100vw - 32px)",
  };
  if (step && rect && typeof window !== "undefined") {
    const below = rect.top + rect.height + 16 + CARD_H < window.innerHeight;
    const top = below ? rect.top + rect.height + 16 : Math.max(12, rect.top - CARD_H - 16);
    const left = Math.min(Math.max(16, rect.left), window.innerWidth - CARD_W - 16);
    cardStyle = { top, left, width: CARD_W, maxWidth: "calc(100vw - 32px)" };
  }

  const progress =
    phase === "intro" ? 0 : phase === "done" ? 100 : ((phase + 1) / TEACHER_TOUR_STEPS.length) * 100;

  const spotlight = step && rect && (
    <>
      <div className="tour-spot absolute inset-x-0 top-0 bg-foreground/60 backdrop-blur-[2px]" style={{ height: rect.top }} />
      <div className="tour-spot absolute bg-foreground/60 backdrop-blur-[2px]" style={{ top: rect.top, left: 0, width: rect.left, height: rect.height }} />
      <div className="tour-spot absolute bg-foreground/60 backdrop-blur-[2px]" style={{ top: rect.top, left: rect.left + rect.width, right: 0, height: rect.height }} />
      <div className="tour-spot absolute inset-x-0 bottom-0 bg-foreground/60 backdrop-blur-[2px]" style={{ top: rect.top + rect.height }} />
      {/* Švytintis rėmelis su pulsuojančiu tašku kampe */}
      <div
        className="tour-spot tour-ring pointer-events-none absolute rounded-2xl border-2 border-primary"
        style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
      >
        <span className="tour-dot absolute -right-1.5 -top-1.5 h-3 w-3 rounded-full bg-primary" />
      </div>
    </>
  );

  return createPortal(
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Sąsajos vedlys">
      {spotlight ?? <div className="absolute inset-0 bg-foreground/60 backdrop-blur-[2px]" />}

      {/* ==== Pradžios ekranas ==== */}
      {phase === "intro" && (
        <div key="intro" className="tour-card-in absolute rounded-3xl border border-border bg-card p-6 shadow-2xl" style={cardStyle}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-3xl"
            style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / .35), hsl(var(--primary)))" }}
          />
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <GraduationCap className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-lg font-extrabold tracking-tight">Sveiki atvykę į auklėtojo sritį!</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Trumpas interaktyvus turas per {TEACHER_TOUR_STEPS.length} svarbiausias vietas — užtruksite mažiau nei minutę.
            Galite valdyti ir klaviatūra: <span className="font-semibold text-foreground">Enter</span> — toliau,{" "}
            <span className="font-semibold text-foreground">Esc</span> — uždaryti.
          </p>
          <div className="mt-5 flex items-center justify-between gap-2">
            <button type="button" onClick={finish} className="text-xs font-semibold text-muted-foreground transition hover:text-foreground">
              Praleisti
            </button>
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-md transition hover:opacity-90"
            >
              <Sparkles className="h-4 w-4" /> Pradėti turą
            </button>
          </div>
        </div>
      )}

      {/* ==== Žingsnio kortelė ==== */}
      {step && (
        <div key={`step-${step.id}`} className="tour-card-in absolute rounded-3xl border border-border bg-card p-5 shadow-2xl" style={cardStyle}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-3xl"
            style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / .35), hsl(var(--primary)))" }}
          />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
                {phase + 1} / {TEACHER_TOUR_STEPS.length}
              </p>
              <h3 className="mt-1 text-base font-bold">{step.title}</h3>
            </div>
            <button
              type="button"
              onClick={finish}
              aria-label="Uždaryti vedlį"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>

          {/* Animuota eigos juosta */}
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button type="button" onClick={finish} className="text-xs font-semibold text-muted-foreground transition hover:text-foreground">
              Praleisti
            </button>
            <div className="flex items-center gap-2">
              {typeof phase === "number" && phase > 0 && (
                <button
                  type="button"
                  onClick={back}
                  className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition hover:bg-muted"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Atgal
                </button>
              )}
              <button
                type="button"
                onClick={next}
                className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-md transition hover:opacity-90"
              >
                {phase + 1 >= TEACHER_TOUR_STEPS.length ? "Baigti" : "Toliau"} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==== Pabaigos ekranas ==== */}
      {phase === "done" && (
        <div key="done" className="tour-card-in absolute rounded-3xl border border-border bg-card p-6 text-center shadow-2xl" style={cardStyle}>
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-success/15 text-success">
            <Check className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-lg font-extrabold tracking-tight">Viskas parodyta!</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Vedlį bet kada paleisi iš naujo paspaudęs <span className="font-semibold text-foreground">?</span> mygtuką viršutinėje juostoje.
          </p>
          <button
            type="button"
            onClick={finish}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-md transition hover:opacity-90"
          >
            Pradėti darbą <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
