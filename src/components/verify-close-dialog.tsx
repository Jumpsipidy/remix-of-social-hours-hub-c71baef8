import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldAlert, CheckCircle2 } from "lucide-react";

export function VerifyCloseDialog({
  open,
  hours,
  studentName,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  hours: number;
  studentName: string;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}) {
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!accepted || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
      setAccepted(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-background shadow-elegant"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border bg-gradient-card p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-destructive/15 text-destructive">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-destructive">Institucinis patvirtinimas</p>
                  <h3 className="mt-1 font-display text-xl font-bold">Patvirtinti ir uždaryti užduotį</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{studentName} · {hours} val.</p>
                </div>
              </div>
              <button
                onClick={onCancel}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-background hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm leading-relaxed text-foreground">
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-destructive">Kritinis teisinis įspėjimas</p>
                Spausdami „Patvirtinti“, jūs teisiškai patvirtinate pagal institucinę politiką, kad mokinys sėkmingai
                atliko nurodytas valandas. Sutinkate, kad šis įrašas nedelsiant perduodamas mokyklos administracijai
                galutiniam akademiniam vertinimui. Bet koks melagingas patvirtinimas ar iškraipymas užtrauks nedelsiamą
                organizacijos įtraukimą į juodąjį sąrašą ir tiesioginę institucinę atsakomybę, kurią užtikrina mokyklų tinklas.
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-3 text-sm hover:border-primary/40">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <span>Sutinku su šiomis sąlygomis ir patvirtinu atliktą darbą</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border bg-card/60 p-4">
              <button
                onClick={onCancel}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent"
              >
                Atšaukti
              </button>
              <motion.button
                whileTap={{ scale: accepted ? 0.97 : 1 }}
                onClick={submit}
                disabled={!accepted || submitting}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {submitting ? "Tvirtinama…" : "Confirm & credit hours"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
