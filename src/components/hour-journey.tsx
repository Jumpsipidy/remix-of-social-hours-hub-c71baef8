import { useState } from "react";
import { Search, CalendarCheck, CheckCircle2, FileCheck, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [{ label: "Rask veiklą", icon: Search }, { label: "Rezervuok", icon: CalendarCheck }, { label: "Gauk patvirtinimą", icon: CheckCircle2 }, { label: "Atsisiųsk pažymėjimą", icon: FileCheck }];

export function HourJourney() {
  const [run, setRun] = useState(0);
  return <div className="mx-auto mt-8 max-w-2xl border-t border-border pt-5">
    <div className="mb-4 flex items-center justify-between gap-3 text-sm">
      <span className="font-semibold text-foreground">Nuo veiklos iki pažymėjimo</span>
      <Button variant="ghost" size="icon" aria-label={run ? "Pakartoti animaciją" : "Paleisti animaciją"} title={run ? "Pakartoti animaciją" : "Paleisti animaciją"} onClick={() => setRun(v => v + 1)}>{run ? <RotateCcw /> : <Play />}</Button>
    </div>
    <ol key={run} className={`hour-journey grid grid-cols-2 gap-4 sm:grid-cols-4 ${run ? "is-playing" : ""}`}>
      {steps.map((step, i) => <li key={step.label} className="journey-step relative flex flex-col items-center gap-2 text-center">
        <span className="journey-icon grid h-11 w-11 place-items-center rounded-lg border border-border bg-card text-primary"><step.icon className="h-5 w-5" /></span>
        <span className="text-xs font-medium text-muted-foreground">{i + 1}. {step.label}</span>
      </li>)}
    </ol>
  </div>;
}