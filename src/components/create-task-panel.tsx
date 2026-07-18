import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Calendar, Clock, MapPin, Trash2, Loader2, Sparkles, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TagsInput } from "@/components/tags-input";

type Task = {
  id: string;
  title: string;
  description: string;
  task_date: string;
  start_time: string | null;
  end_time: string | null;
  available_hours: number;
  location: string;
  spots_total: number;
  is_open: boolean;
  tags?: string[] | null;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function CreateTaskPanel({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [start, setStart] = useState("14:00");
  const [end, setEnd] = useState("17:00");
  const [hours, setHours] = useState(3);
  const [location, setLocation] = useState("");
  const [spots, setSpots] = useState(1);
  const [tags, setTags] = useState<string[]>([]);

  const refresh = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("organization_id", organizationId)
      .order("task_date", { ascending: true });
    setTasks((data as Task[]) ?? []);
  };

  useEffect(() => { refresh(); }, [organizationId]);

  const reset = () => {
    setTitle(""); setDescription(""); setDate(todayISO());
    setStart("14:00"); setEnd("17:00"); setHours(3);
    setLocation(""); setSpots(1); setTags([]);
  };

  const submit = async () => {
    if (!title.trim() || !date) { toast.error("Užpildyk pavadinimą ir datą"); return; }
    setBusy(true);
    const { error } = await supabase.from("tasks").insert({
      organization_id: organizationId,
      title: title.trim(),
      description: description.trim(),
      task_date: date,
      start_time: start || null,
      end_time: end || null,
      available_hours: hours,
      location: location.trim(),
      spots_total: spots,
      is_open: true,
      tags,
    } as any);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Užduotis paskelbta");
    reset();
    setOpen(false);
    refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Pašalinta");
    refresh();
  };

  const toggleOpen = async (t: Task) => {
    const { error } = await supabase.from("tasks").update({ is_open: !t.is_open }).eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    refresh();
  };

  return (
    <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">Mano užduotys</h2>
          <p className="text-xs text-muted-foreground">Skelbk savanorystės galimybes — mokiniai matys jas iškart.</p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          {open ? "Uždaryti" : "Nauja užduotis"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-5 overflow-hidden"
          >
            <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Pavadinimas (pvz., Pagalba prieglaudos gyvūnams)"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Trumpas aprašymas: ką darys savanoris?"
                className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <LabeledInput label="Data" type="date" value={date} min={todayISO()} onChange={setDate} />
                <LabeledInput label="Pradžia" type="time" value={start} onChange={setStart} />
                <LabeledInput label="Pabaiga" type="time" value={end} onChange={setEnd} />
                <LabeledInput label="Valandos" type="number" value={String(hours)} onChange={(v) => setHours(Number(v) || 0)} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Vieta / adresas"
                  className="h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3">
                  <span className="text-xs text-muted-foreground">Vietų</span>
                  <input
                    type="number"
                    min={1}
                    value={spots}
                    onChange={(e) => setSpots(Number(e.target.value) || 1)}
                    className="h-11 w-16 bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
              <TagsInput value={tags} onChange={setTags} hint="Padeda mokiniams ir mokytojams rasti tinkamiausią užduotį" />
              <div className="flex justify-end">
                <button
                  onClick={submit}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Paskelbti užduotį
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-5 space-y-2">
        {tasks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            Dar nepaskelbtų užduočių.
          </div>
        )}
        {tasks.map((t) => (
          <div key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-background/60 p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold">{t.title}</p>
                {!t.is_open && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">paslėpta</span>}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {t.task_date}</span>
                {t.start_time && t.end_time && (
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {t.start_time.slice(0,5)}–{t.end_time.slice(0,5)}</span>
                )}
                {t.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {t.location}</span>}
                <span>· {Number(t.available_hours)} val.</span>
              </div>
              {t.tags && t.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {t.tags.map((tg) => (
                    <span key={tg} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{tg}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggleOpen(t)}
                aria-label={t.is_open ? "Paslėpti užduotį" : "Rodyti užduotį"}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-accent"
                title={t.is_open ? "Paslėpti" : "Rodyti"}
              >
                {t.is_open ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => remove(t.id)}
                aria-label="Pašalinti užduotį"
                className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                title="Pašalinti"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LabeledInput({ label, type, value, onChange, min }: { label: string; type: string; value: string; onChange: (v: string) => void; min?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}
