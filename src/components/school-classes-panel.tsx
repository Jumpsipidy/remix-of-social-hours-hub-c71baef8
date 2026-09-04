import { useEffect, useState } from "react";
import { GraduationCap, Plus, X, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CLASS_YEARS } from "@/lib/class-years";

/**
 * Mokyklos administratorius (auklėtojas) pats pasirenka, kurias klases kuruoja.
 * Tuščias sąrašas = mato visą mokyklą (direktorius).
 * Duomenys saugomi profiles.assigned_classes per `set_my_assigned_classes` RPC.
 */
export function SchoolClassesPanel({
  current,
  onSaved,
}: {
  current: string[];
  onSaved: () => void;
}) {
  const [classes, setClasses] = useState<string[]>(current);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setClasses(current);
  }, [current]);



  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("set_my_assigned_classes" as never, {
        _classes: classes,
      } as never);
      if (error) throw error;
      toast.success(
        classes.length
          ? `Kuruojamos klasės išsaugotos: ${classes.join(", ")}`
          : "Nustatyta: matai visą mokyklą.",
      );
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepavyko išsaugoti klasių");
    } finally {
      setBusy(false);
    }
  }

  const dirty =
    classes.length !== current.length || classes.some((c, i) => c !== current[i]);

  return (
    <section className="rounded-2xl border border-border bg-background/40 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-xl bg-primary/15 p-2 text-primary">
          <GraduationCap className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">Kuruojamos klasės</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pridėk klases, kurias auklėji (pvz. 8A). Matysi tik tų klasių mokinius. Palik
            tuščią, jei turi matyti visą mokyklą.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {classes.length === 0 && (
              <span className="rounded-lg border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground">
                Visa mokykla
              </span>
            )}
            {classes.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground"
              >
                {c}
                <button
                  type="button"
                  aria-label={`Pašalinti ${c}`}
                  onClick={() => setClasses((prev) => prev.filter((x) => x !== c))}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {CLASS_YEARS.map((c) => {
              const on = classes.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() =>
                    setClasses((prev) => (on ? prev.filter((x) => x !== c) : [...prev, c]))
                  }
                  className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition-colors ${
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background/60 text-foreground"
                  }`}
                >
                  {on ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {c}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy || !dirty}
              className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Saugoma…" : "Išsaugoti"}
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
