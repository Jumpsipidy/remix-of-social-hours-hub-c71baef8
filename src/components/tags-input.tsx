import { useState } from "react";
import { X, Plus, Tag as TagIcon } from "lucide-react";

export const TAG_PRESETS = [
  "Lauke",
  "Viduje",
  "Su vaikais",
  "Su senjorais",
  "Su gyvūnais",
  "Aplinkosauga",
  "Kultūra",
  "Sportas",
  "Švietimas",
  "Renginys",
  "Talka",
  "Kūrybiškas",
  "Fiziškas darbas",
  "Mokymai",
];

type Props = {
  value: string[];
  onChange: (v: string[]) => void;
  label?: string;
  hint?: string;
  max?: number;
};

export function TagsInput({ value, onChange, label = "Žymos", hint, max = 8 }: Props) {
  const [text, setText] = useState("");

  const add = (raw: string) => {
    const v = raw.trim().replace(/^#+/, "").slice(0, 24);
    if (!v) return;
    if (value.includes(v)) return;
    if (value.length >= max) return;
    onChange([...value, v]);
    setText("");
  };

  const remove = (t: string) => onChange(value.filter((x) => x !== t));

  return (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <TagIcon className="h-3.5 w-3.5" /> {label}
        {hint && <span className="ml-1 normal-case tracking-normal text-[10px] font-normal text-muted-foreground/80">{hint}</span>}
      </label>

      {/* Chips + input row */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-background p-2">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 pl-2.5 pr-1 py-0.5 text-xs font-semibold text-primary">
            {t}
            <button type="button" aria-label={`Šalinti ${t}`} onClick={() => remove(t)} className="grid h-5 w-5 place-items-center rounded-full text-primary/70 hover:bg-primary/20">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(text);
            } else if (e.key === "Backspace" && !text && value.length) {
              remove(value[value.length - 1]);
            }
          }}
          placeholder={value.length >= max ? "Pasiekta riba" : "Įrašyk žymą ir spausk Enter…"}
          disabled={value.length >= max}
          className="h-7 min-w-[140px] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Presets */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {TAG_PRESETS.filter((p) => !value.includes(p)).slice(0, 14).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => add(p)}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background/70 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
          >
            <Plus className="h-3 w-3" /> {p}
          </button>
        ))}
      </div>
    </div>
  );
}
