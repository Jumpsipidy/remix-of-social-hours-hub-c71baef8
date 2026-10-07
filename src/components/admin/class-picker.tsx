import { CLASS_YEARS } from "@/lib/class-years";

/** Multi-select chips for class years with an "all" toggle. */
export function ClassPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const all = CLASS_YEARS.every((c) => value.includes(c));
  const toggle = (c: string) => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c]);
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(all ? [] : [...CLASS_YEARS])}
        className={`rounded-full border px-3 py-1 text-xs font-bold transition active:scale-95 ${all ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary"}`}
      >
        Visos klasės
      </button>
      {CLASS_YEARS.map((c) => {
        const on = value.includes(c);
        return (
          <button
            key={c}
            type="button"
            onClick={() => toggle(c)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition active:scale-95 ${on ? "border-primary bg-primary/20 text-foreground" : "border-border text-muted-foreground hover:border-primary"}`}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}

/** Klasės raidė: abi (null), A arba B. Keisti gali tik Super Admin. */
export function LetterPicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const opts: { v: string | null; label: string }[] = [{ v: null, label: "A ir B" }, { v: "A", label: "Tik A" }, { v: "B", label: "Tik B" }];
  return (
    <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Klasės raidė">
      <span className="text-xs font-semibold text-muted-foreground">Raidė:</span>
      {opts.map((o) => (
        <button key={o.label} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)}
          className={`rounded-full border px-3 py-1 text-xs font-bold transition active:scale-95 ${value === o.v ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
