import { Zap } from "lucide-react";

const DAY = ["Sk", "Pr", "An", "Tr", "Kt", "Pn", "Št"];
function iso(d: Date) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function addH(t: string, h: number) {
  const [a, b] = t.split(":").map(Number);
  const m = Math.min(23 * 60 + 59, a * 60 + b + h * 60);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

const STARTS = ["09:00", "12:00", "14:00", "15:00", "16:00", "17:00"];
const DURS = [1, 2, 3, 4];

/** Greiti mygtukai: diena, pradžia ir trukmė vienu paspaudimu — nereikia rinkti ranka. */
export function QuickTimePicker({
  date, start, end, onChange, fromTomorrow = false,
}: {
  date: string; start: string; end: string;
  onChange: (v: { date?: string; start?: string; end?: string }) => void;
  fromTomorrow?: boolean;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i + (fromTomorrow ? 1 : 0));
    const label = i === 0 && !fromTomorrow ? "Šiandien" : (i === 0 || (i === 1 && !fromTomorrow)) ? "Rytoj" : DAY[d.getDay()];
    return { v: iso(d), label, n: d.getDate() };
  });
  const dur = (() => {
    if (!start || !end) return 0;
    const [a, b] = start.split(":").map(Number), [c, e] = end.split(":").map(Number);
    return Math.round((c * 60 + e - a * 60 - b) / 60);
  })();
  const chip = (on: boolean) =>
    `shrink-0 rounded-xl border px-3 py-2 text-xs font-bold transition active:scale-95 ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"}`;

  return (
    <div className="mb-5 space-y-3 rounded-2xl border border-border bg-muted/30 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Zap className="h-3.5 w-3.5 text-primary" /> Greitas pasirinkimas</p>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {days.map((d) => (
          <button key={d.v} type="button" onClick={() => onChange({ date: d.v })} className={chip(date === d.v) + " flex flex-col items-center leading-tight"}>
            <span className="text-[10px] opacity-80">{d.label}</span><span className="text-sm tabular-nums">{d.n}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {STARTS.map((s) => (
          <button key={s} type="button" onClick={() => onChange({ start: s, end: addH(s, dur > 0 ? dur : 2) })} className={chip(start === s)}>{s}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DURS.map((h) => (
          <button key={h} type="button" onClick={() => onChange({ end: addH(start || "14:00", h), ...(start ? {} : { start: "14:00" }) })} className={chip(dur === h)}>{h} val.</button>
        ))}
      </div>
    </div>
  );
}
