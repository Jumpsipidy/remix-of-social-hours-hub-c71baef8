import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Lightbulb, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Row = { id: string; note: string | null; task_id: string; tasks: { title: string; task_date: string } | null };

/** Auklėtojo rekomenduotos organizacijų veiklos — tik nuoroda, ne rezervacija. */
export function TeacherSuggestions() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (supabase.from as any)("task_suggestions").select("id, note, task_id, tasks(title, task_date)")
      .is("dismissed_at", null).order("created_at", { ascending: false }).limit(10)
      .then(({ data }: { data: Row[] | null }) => setRows((data ?? []).filter((r) => r.tasks && r.tasks.task_date >= new Date().toISOString().slice(0, 10))));
  }, []);
  const dismiss = async (id: string) => {
    setRows((r) => r.filter((x) => x.id !== id));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from as any)("task_suggestions").update({ dismissed_at: new Date().toISOString() }).eq("id", id);
  };
  if (!rows.length) return null;
  return (
    <section className="rounded-3xl border border-primary/30 bg-primary/5 p-5">
      <h2 className="flex items-center gap-2 text-base font-bold"><Lightbulb className="h-4 w-4 text-primary" /> Auklėtojas rekomenduoja</h2>
      <p className="text-xs text-muted-foreground">Tai tik pasiūlymas. Jei patinka — atidaryk veiklą ir užsiregistruok pats.</p>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{r.tasks?.title}</p>
              <p className="truncate text-xs text-muted-foreground">{r.tasks?.task_date}{r.note ? ` · „${r.note}“` : ""}</p>
            </div>
            <Link to="/tasks" search={{ task: r.task_id }} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">Peržiūrėti <ArrowRight className="h-3.5 w-3.5" /></Link>
            <button type="button" aria-label="Paslėpti" onClick={() => void dismiss(r.id)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
    </section>
  );
}
