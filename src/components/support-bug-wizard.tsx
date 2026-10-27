import { useEffect, useState } from "react";
import { Bug, ChevronLeft, Sparkles, X } from "lucide-react";

export type BugAnswers = { where: string; tried: string; saw: string; expected: string; frequency: string; severity: "low" | "normal" | "high" | "critical" };

type Step =
  | { key: "where" | "tried" | "saw" | "expected"; q: string; hint: string; chips?: string[]; optional?: boolean }
  | { key: "frequency"; q: string; hint: string; choices: string[] }
  | { key: "severity"; q: string; hint: string; choices: { v: BugAnswers["severity"]; label: string; emoji: string }[] };

const STEPS: Step[] = [
  { key: "where", q: "Kur tai nutiko?", hint: "Puslapis ar mygtukas, kurį spaudei.", chips: ["Mano sritis", "Veiklų paieška", "Mano QR kodai", "Pokalbiai", "Prisijungimas"] },
  { key: "tried", q: "Ką bandei padaryti?", hint: "Pvz.: „Norėjau rezervuoti veiklą su draugu“." },
  { key: "saw", q: "Kas nutiko vietoj to?", hint: "Klaidos tekstas, baltas ekranas, niekas nevyksta…" },
  { key: "expected", q: "Ko tikėjaisi?", hint: "Nebūtina, bet labai padeda.", optional: true },
  { key: "frequency", q: "Ar tai kartojasi?", hint: "Pasirink vieną.", choices: ["Kiekvieną kartą", "Kartais", "Tik vieną kartą"] },
  { key: "severity", q: "Kiek tai trukdo?", hint: "Pagal tai skubame taisyti.", choices: [
    { v: "low", label: "Smulkmena", emoji: "🙂" }, { v: "normal", label: "Trukdo", emoji: "😕" },
    { v: "high", label: "Labai trukdo", emoji: "😣" }, { v: "critical", label: "Visai negaliu naudotis", emoji: "🚨" },
  ] },
];

function useTyped(text: string) {
  const [n, setN] = useState(0);
  useEffect(() => { setN(0); }, [text]);
  useEffect(() => { if (n < text.length) { const id = window.setTimeout(() => setN((x) => x + 1), 22); return () => clearTimeout(id); } }, [n, text]);
  return text.slice(0, n);
}

export function SupportBugWizard({ onCancel, onSubmit, busy, initialWhere }: {
  onCancel: () => void; onSubmit: (a: BugAnswers) => void; busy: boolean; initialWhere: string;
}) {
  const [i, setI] = useState(0);
  const [a, setA] = useState<BugAnswers>({ where: initialWhere, tried: "", saw: "", expected: "", frequency: "", severity: "normal" });
  const step = STEPS[i]!;
  const typed = useTyped(step.q);
  const next = () => (i < STEPS.length - 1 ? setI(i + 1) : onSubmit(a));
  const val = step.key === "frequency" || step.key === "severity" ? "" : a[step.key];
  const canNext = "choices" in step || ("optional" in step && step.optional) || val.trim().length >= 3;

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-popover/95 p-4 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-destructive/15 text-destructive"><Bug className="h-4 w-4" /></div>
        <div className="flex-1 text-sm font-semibold">Pranešimas apie klaidą</div>
        <button type="button" aria-label="Atšaukti" onClick={onCancel} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <div className="mb-5 flex gap-1">{STEPS.map((_, k) => (
        <span key={k} className={`h-1 flex-1 rounded-full transition-all duration-500 ${k <= i ? "bg-primary" : "bg-muted"}`} />
      ))}</div>

      <div key={i} className="flex-1 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">Klausimas {i + 1} iš {STEPS.length}</div>
        <h3 className="mb-1 min-h-[2rem] text-xl font-bold leading-tight">{typed}<span className="ml-0.5 inline-block w-[2px] animate-pulse bg-primary align-middle">&nbsp;</span></h3>
        <p className="mb-4 text-xs text-muted-foreground">{step.hint}</p>

        {"choices" in step ? (
          <div className="grid gap-2">
            {step.key === "frequency"
              ? step.choices.map((c) => (
                <button key={c} type="button" onClick={() => { setA({ ...a, frequency: c }); setI(i + 1); }}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-all hover:-translate-y-0.5 hover:border-primary ${a.frequency === c ? "border-primary bg-primary/10" : "border-border"}`}>{c}</button>
              ))
              : step.choices.map((c) => (
                <button key={c.v} type="button" disabled={busy} onClick={() => { const n = { ...a, severity: c.v }; setA(n); onSubmit(n); }}
                  className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-left text-sm transition-all hover:-translate-y-0.5 hover:border-primary disabled:opacity-50">
                  <span className="text-lg">{c.emoji}</span>{c.label}
                </button>
              ))}
          </div>
        ) : (
          <>
            <textarea autoFocus value={val} rows={3} maxLength={800}
              onChange={(e) => setA({ ...a, [step.key]: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && canNext) { e.preventDefault(); next(); } }}
              className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            {"chips" in step && step.chips && (
              <div className="mt-2 flex flex-wrap gap-1.5">{step.chips.map((c) => (
                <button key={c} type="button" onClick={() => setA({ ...a, [step.key]: c })} className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-accent hover:text-accent-foreground">{c}</button>
              ))}</div>
            )}
          </>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button type="button" onClick={() => (i ? setI(i - 1) : onCancel())} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ChevronLeft className="h-3.5 w-3.5" />{i ? "Atgal" : "Atšaukti"}</button>
        {!("choices" in step) && (
          <button type="button" disabled={!canNext} onClick={next} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.03] disabled:opacity-40">
            {"optional" in step && step.optional && !val.trim() ? "Praleisti" : "Toliau"}<Sparkles className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
