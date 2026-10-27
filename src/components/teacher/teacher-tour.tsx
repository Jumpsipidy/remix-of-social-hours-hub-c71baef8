import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { TEACHER_TOUR_STEPS, markTourCompleted } from "@/lib/teacher-tour";

const PAD = 10;
const CARD_W = 320;
const CARD_H = 210;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Interaktyvus auklėtojo sąsajos vedlys: paryškina elementus,
 * rodo paaiškinimus, leidžia praleisti ir įsimena naršyklėje.
 */
export function TeacherTour({ open, onDone }: { open: boolean; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = TEACHER_TOUR_STEPS[index];

  const locate = useCallback(() => {
    if (!step) return;
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
    if (open) setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open || !step) return;
    const el = document.querySelector(step.selector);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    locate();
    const t = window.setTimeout(locate, 400);
    window.addEventListener("resize", locate);
    window.addEventListener("scroll", locate, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", locate);
      window.removeEventListener("scroll", locate, true);
    };
  }, [open, step, locate]);

  if (!open || !step) return null;

  const finish = () => {
    markTourCompleted();
    onDone();
  };
  const next = () => (index + 1 >= TEACHER_TOUR_STEPS.length ? finish() : setIndex(index + 1));
  const back = () => setIndex(Math.max(0, index - 1));
  const isLast = index + 1 >= TEACHER_TOUR_STEPS.length;

  // Kortelės pozicija: po elementu, jei telpa, kitaip — virš jo; be elemento — centre.
  let cardStyle: React.CSSProperties = {
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: CARD_W,
    maxWidth: "calc(100vw - 32px)",
  };
  if (rect && typeof window !== "undefined") {
    const below = rect.top + rect.height + 14 + CARD_H < window.innerHeight;
    const top = below ? rect.top + rect.height + 14 : Math.max(12, rect.top - CARD_H - 14);
    const left = Math.min(Math.max(16, rect.left), window.innerWidth - CARD_W - 16);
    cardStyle = { top, left, width: CARD_W, maxWidth: "calc(100vw - 32px)" };
  }

  return createPortal(
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Sąsajos vedlys">
      {/* Aptemdymas su išpjova aplink paryškintą elementą */}
      {rect ? (
        <>
          <div className="absolute inset-x-0 top-0 bg-foreground/55" style={{ height: rect.top }} />
          <div
            className="absolute bg-foreground/55"
            style={{ top: rect.top, left: 0, width: rect.left, height: rect.height }}
          />
          <div
            className="absolute bg-foreground/55"
            style={{
              top: rect.top,
              left: rect.left + rect.width,
              right: 0,
              height: rect.height,
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 bg-foreground/55"
            style={{ top: rect.top + rect.height }}
          />
          {/* Švytėjimo rėmelis */}
          <div
            className="pointer-events-none absolute rounded-2xl border-2 border-primary motion-safe:animate-pulse"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              boxShadow:
                "0 0 0 4px hsl(var(--primary) / 0.25), 0 0 32px hsl(var(--primary) / 0.45)",
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-foreground/55" />
      )}

      {/* Paaiškinimo kortelė */}
      <div
        className="absolute rounded-2xl border border-border bg-card p-5 shadow-2xl"
        style={cardStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
              {index + 1} / {TEACHER_TOUR_STEPS.length}
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

        {/* Eigos taškai */}
        <div className="mt-4 flex items-center gap-1.5">
          {TEACHER_TOUR_STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-primary" : i < index ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={finish}
            className="text-xs font-semibold text-muted-foreground transition hover:text-foreground"
          >
            Praleisti
          </button>
          <div className="flex items-center gap-2">
            {index > 0 && (
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
              className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90"
            >
              {isLast ? "Baigti" : "Toliau"} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
