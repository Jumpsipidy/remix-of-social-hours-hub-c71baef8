import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { CalendarPlus, MapPin, Clock, FileText, Users, Sparkles } from "lucide-react";
import { TagsInput } from "@/components/tags-input";
import { CITIES, type City } from "@/lib/cities";

/**
 * School admins post one-time volunteer events (not tied to an organization).
 * Rows land in `tasks` with is_event=true, created_by=school_admin.id,
 * organization_id also = school_admin.id (so existing joins keep working;
 * the UI shows event_host_name instead).
 */
export function CreateEventPanel({ onCreated }: { onCreated?: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [host, setHost] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [hours, setHours] = useState(2);
  const [spots, setSpots] = useState(5);
  const [location, setLocation] = useState("");
  const [city, setCity] = useState<City>("Šeduva");
  const [desc, setDesc] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title || !date || !location || !host) {
      toast.error("Užpildyk pavadinimą, organizatorių, datą ir vietą");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("tasks").insert({
      organization_id: user.id, // FK is nullable-safe; school admin owns the row
      created_by: user.id,
      is_event: true,
      event_host_name: host,
      title,
      description: desc,
      task_date: date,
      start_time: start || null,
      end_time: end || null,
      available_hours: hours,
      spots_total: spots,
      location,
      city,
      is_open: true,
    } as any);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Renginys paskelbtas!");
    setTitle(""); setHost(""); setDate(""); setStart(""); setEnd("");
    setHours(2); setSpots(5); setLocation(""); setDesc(""); setTags([]);
    onCreated?.();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-primary/30 bg-gradient-card p-6 shadow-md backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          <CalendarPlus className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold">Paskelbk vienkartinį renginį</h3>
          <p className="text-xs text-muted-foreground">Vienkartinės progos, kurių nesiūlo jokia organizacija — mokiniai gali užsiregistruoti kaip į įprastą užduotį.</p>
        </div>
      </div>
      <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="col-span-2 text-xs font-semibold text-muted-foreground">
          Renginio pavadinimas
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-background px-3">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="h-10 w-full bg-transparent text-sm outline-none" placeholder="Pvz. Miesto šventės talka" />
          </div>
        </label>
        <label className="col-span-2 text-xs font-semibold text-muted-foreground">
          Organizatorius / kontaktinis asmuo
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-background px-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <input value={host} onChange={(e) => setHost(e.target.value)}
              className="h-10 w-full bg-transparent text-sm outline-none" placeholder="Pvz. J. Jonaitis (mokykla)" />
          </div>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Data
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none" />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Vieta
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-background px-3">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <input value={location} onChange={(e) => setLocation(e.target.value)}
              className="h-10 w-full bg-transparent text-sm outline-none" placeholder="Adresas" />
          </div>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Miestas
          <select value={city} onChange={(e) => setCity(e.target.value as City)}
            className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none">
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Pradžia
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-background px-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)}
              className="h-10 w-full bg-transparent text-sm outline-none" />
          </div>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Pabaiga
          <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-background px-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)}
              className="h-10 w-full bg-transparent text-sm outline-none" />
          </div>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Valandos (viena vieta)
          <input type="number" min={0.5} step={0.5} value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none" />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Vietų skaičius
          <input type="number" min={1} value={spots}
            onChange={(e) => setSpots(Number(e.target.value))}
            className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none" />
        </label>
        <label className="col-span-2 text-xs font-semibold text-muted-foreground">
          Aprašymas
          <div className="mt-1 flex items-start gap-2 rounded-xl border border-border bg-background px-3 py-2">
            <FileText className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)}
              rows={3} className="w-full bg-transparent text-sm outline-none resize-none"
              placeholder="Ką veiks savanoriai, ką atsinešti, kaip užsiregistruoti…" />
          </div>
        </label>
        <div className="col-span-2">
          <TagsInput value={tags} onChange={setTags} hint="Padeda mokiniams ir mokytojams filtruoti tinkamus renginius" />
        </div>
        <button type="submit" disabled={busy}
          className="col-span-2 mt-2 rounded-full bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
          {busy ? "Skelbiama..." : "Paskelbti renginį"}
        </button>
      </form>
    </motion.div>
  );
}
