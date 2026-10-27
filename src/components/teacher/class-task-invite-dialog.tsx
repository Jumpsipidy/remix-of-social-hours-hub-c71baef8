import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Check, ChevronLeft, Clock, Loader2, MapPin, Megaphone, Search, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CITIES } from "@/lib/cities";
import { teacherAssignTask, teacherPublishTask } from "@/lib/teacher.functions";
import type { SchoolStudent } from "@/lib/school-data.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type TaskRow = { id: string; title: string; task_date: string; start_time: string | null; end_time: string | null; available_hours: number; location: string | null; city: string | null; organization_id: string; spots_total: number };

function classKey(s: SchoolStudent) { return `${s.class_year ?? "?"}${s.class_letter ? s.class_letter : ""}`; }

/** Mokinių pasirinkimas su „pažymėti visus“ kiekvienai klasei. */
function StudentPicker({ students, selected, setSelected }: { students: SchoolStudent[]; selected: Set<string>; setSelected: (s: Set<string>) => void }) {
  const groups = useMemo(() => {
    const m = new Map<string, SchoolStudent[]>();
    for (const s of students) m.set(classKey(s), [...(m.get(classKey(s)) ?? []), s]);
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b, "lt", { numeric: true }));
  }, [students]);
  const all = students.length > 0 && students.every((s) => selected.has(s.id));
  const toggleMany = (ids: string[], on: boolean) => { const n = new Set(selected); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); setSelected(n); };
  if (students.length === 0) return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Tavo priskirtose klasėse dar nėra mokinių.</p>;
  return (
    <div className="space-y-3">
      <button type="button" onClick={() => toggleMany(students.map((s) => s.id), !all)} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${all ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted/50"}`}>
        <span className="inline-flex items-center gap-2"><Users className="h-4 w-4" /> Pažymėti visus ({students.length})</span>
        <span className={`grid size-5 place-items-center rounded border ${all ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{all && <Check className="h-3.5 w-3.5" />}</span>
      </button>
      {groups.map(([k, list]) => {
        const on = list.every((s) => selected.has(s.id));
        return (
          <div key={k} className="rounded-xl border border-border">
            <button type="button" onClick={() => toggleMany(list.map((s) => s.id), !on)} className="flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>{k} klasė · {list.filter((s) => selected.has(s.id)).length}/{list.length}</span>
              <span className="text-primary">{on ? "Nuimti" : "Visa klasė"}</span>
            </button>
            <div className="grid gap-1 p-1.5 sm:grid-cols-2">
              {list.map((s) => {
                const checked = selected.has(s.id);
                return (
                  <label key={s.id} className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${checked ? "bg-primary/10" : "hover:bg-muted/50"}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleMany([s.id], !checked)} className="accent-[var(--primary)]" />
                    <span className="truncate">{s.full_name ?? "Mokinys"}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** „Priskirti veiklą klasei“: visos svetainės veiklos su filtrais → mokiniai → rezervacijos jų paskyrose. */
export function ClassTaskInviteDialog({ open, onOpenChange, students }: { open: boolean; onOpenChange: (o: boolean) => void; students: SchoolStudent[] }) {
  const assignFn = useServerFn(teacherAssignTask);
  const [tasks, setTasks] = useState<TaskRow[] | null>(null);
  const [orgNames, setOrgNames] = useState<Record<string, string>>({});
  const [q, setQ] = useState(""); const [city, setCity] = useState(""); const [from, setFrom] = useState("");
  const [picked, setPicked] = useState<TaskRow | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState(""); const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPicked(null); setSelected(new Set()); setNote("");
    void (async () => {
      const { data } = await supabase.from("tasks").select("id, title, task_date, start_time, end_time, available_hours, location, city, organization_id, spots_total")
        .eq("is_open", true).gte("task_date", new Date().toISOString().slice(0, 10)).order("task_date").limit(300);
      const list = (data ?? []) as TaskRow[];
      setTasks(list);
      const ids = [...new Set(list.map((t) => t.organization_id))];
      if (ids.length) {
        const { data: orgs } = await supabase.from("profiles").select("id, organization_name, full_name").in("id", ids);
        setOrgNames(Object.fromEntries((orgs ?? []).map((o) => [o.id, o.organization_name ?? o.full_name ?? "Organizacija"])));
      }
    })();
  }, [open]);

  const filtered = useMemo(() => (tasks ?? []).filter((t) => {
    const s = q.trim().toLowerCase();
    return (!s || t.title.toLowerCase().includes(s) || (orgNames[t.organization_id] ?? "").toLowerCase().includes(s) || (t.location ?? "").toLowerCase().includes(s))
      && (!city || t.city === city) && (!from || t.task_date >= from);
  }), [tasks, q, city, from, orgNames]);

  const send = async () => {
    if (!picked || busy) return;
    if (selected.size === 0) { toast.error("Pažymėk bent vieną mokinį."); return; }
    setBusy(true);
    try {
      const res = await assignFn({
        data: {
          studentIds: [...selected],
          taskId: picked.id,
          date: picked.task_date,
          start: picked.start_time ?? "",
          end: picked.end_time ?? "",
          hours: Math.min(8, Math.round(Number(picked.available_hours) || 0)),
          note: note.trim(),
        },
      });
      toast.success(`Veikla priskirta ${res.created} iš ${res.total} mokinių — jie ją mato savo paskyrose.`);
      onOpenChange(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Nepavyko priskirti veiklos."); } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90dvh,760px)] w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border p-5 pb-4 text-left">
          <DialogTitle className="flex items-center gap-2">{picked && <button type="button" aria-label="Atgal" onClick={() => setPicked(null)} className="grid size-8 place-items-center rounded-lg hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>}{picked ? "Kam priskirti?" : "Priskirti veiklą klasei"}</DialogTitle>
          <DialogDescription>{picked ? `Mokiniai gaus rezervaciją „${picked.title}“ savo paskyrose su tavo pastaba.` : "Pasirink veiklą iš visos svetainės — tokios pačios kaip /tasks puslapyje."}</DialogDescription>
          {!picked && <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-3"><Search className="h-4 w-4 text-muted-foreground" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ieškok veiklos ar organizacijos…" className="h-10 w-full bg-transparent text-sm outline-none" /></div>
            <select value={city} onChange={(e) => setCity(e.target.value)} aria-label="Miestas" className="h-10 rounded-lg border border-input bg-background px-2 text-sm"><option value="">Visi miestai</option>{CITIES.map((c) => <option key={c}>{c}</option>)}</select>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Nuo datos" className="h-10" />
          </div>}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {!picked ? (
            tasks === null ? <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="sv-skeleton h-20 rounded-xl bg-muted" />)}</div>
            : filtered.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Nerasta veiklų pagal filtrus.</p>
            : <div className="grid gap-2">{filtered.map((t) => (
                <button key={t.id} type="button" onClick={() => setPicked(t)} className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/60">
                  <span className="grid size-12 place-items-center rounded-lg bg-primary/10 text-center text-[11px] font-bold leading-tight text-primary">{t.task_date.slice(8, 10)}<br />{new Date(t.task_date + "T00:00:00").toLocaleDateString("lt-LT", { month: "short" })}</span>
                  <span className="min-w-0"><span className="block truncate font-semibold">{t.title}</span>
                    <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground"><span className="truncate">{orgNames[t.organization_id] ?? ""}</span>{t.start_time && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{t.start_time.slice(0, 5)}</span>}{t.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{t.city}</span>}</span></span>
                  <span className="rounded-full bg-muted px-2 py-1 text-xs font-bold">{Number(t.available_hours)} val.</span>
                </button>))}</div>
          ) : (
            <div className="space-y-4">
              <StudentPicker students={students} selected={selected} setSelected={setSelected} />
              <label className="block text-xs font-semibold text-muted-foreground">Tavo žinutė (nebūtina)
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={600} placeholder="Pvz.: Puiki proga surinkti valandų prieš atostogas!" className="mt-1 w-full resize-none rounded-lg border border-input bg-background p-2.5 text-sm text-foreground outline-none focus:border-primary" />
              </label>
            </div>
          )}
        </div>
        {picked && <div className="flex items-center justify-between gap-3 border-t border-border p-4">
          <span className="text-sm text-muted-foreground">Pažymėta: <b className="text-foreground">{selected.size}</b></span>
          <Button onClick={send} disabled={busy || selected.size === 0} className="gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Siųsti mano klasei</Button>
        </div>}
      </DialogContent>
    </Dialog>
  );
}

/** Auklėtojo veikla visiems /tasks puslapyje, su galimybe iškart pranešti klasei. */
export function PublishTaskDialog({ open, onOpenChange, students }: { open: boolean; onOpenChange: (o: boolean) => void; students: SchoolStudent[] }) {
  const { profile } = useAuth();
  const publishFn = useServerFn(teacherPublishTask);
  const inviteFn = useServerFn(teacherSendInvites);
  const [f, setF] = useState({ title: "", description: "", date: "", start: "", end: "", hours: 2, city: "Šeduva", location: "", spots: 20 });
  const [notify, setNotify] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setSelected(new Set(students.map((s) => s.id))); }, [open, students]);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { id } = await publishFn({ data: f });
      let sent = 0;
      if (notify && selected.size) {
        const res = await sendCards(inviteFn, { id, title: f.title, date: f.date, time: reservationTimeLabel(f.start, f.end), place: [f.city, f.location].filter(Boolean).join(", "), hours: String(f.hours) }, [...selected], "", profile?.full_name ?? "Auklėtojas");
        sent = res.sent;
      }
      toast.success(sent ? `Veikla paskelbta visiems ir išsiųsta ${sent} mokiniams.` : "Veikla paskelbta — ją mato visi /tasks puslapyje.");
      onOpenChange(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Nepavyko paskelbti."); } finally { setBusy(false); }
  };
  const field = "mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90dvh,780px)] w-[calc(100%-1.5rem)] max-w-xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border p-5 text-left">
          <DialogTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" /> Veikla visiems</DialogTitle>
          <DialogDescription>Ją matys visi mokiniai /tasks puslapyje ir galės rezervuoti.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
          <label className="block text-xs font-semibold text-muted-foreground">Pavadinimas<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Pvz.: Mokyklos kiemo tvarkymas" className={field} /></label>
          <label className="block text-xs font-semibold text-muted-foreground">Aprašymas<textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={2} className={`${field} h-auto resize-none py-2`} /></label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="col-span-2 block text-xs font-semibold text-muted-foreground"><CalendarDays className="mr-1 inline h-3 w-3" />Data<input type="date" value={f.date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setF({ ...f, date: e.target.value })} className={field} /></label>
            <label className="block text-xs font-semibold text-muted-foreground">Pradžia (nebūtina)<input type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} className={field} /></label>
            <label className="block text-xs font-semibold text-muted-foreground">Pabaiga (nebūtina)<input type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} className={field} /></label>
            <label className="block text-xs font-semibold text-muted-foreground">Valandos<input type="number" min={0} max={8} value={f.hours} onChange={(e) => setF({ ...f, hours: Math.round(Number(e.target.value) || 0) })} className={field} /></label>
            <label className="block text-xs font-semibold text-muted-foreground">Vietų<input type="number" min={1} value={f.spots} onChange={(e) => setF({ ...f, spots: Number(e.target.value) || 1 })} className={field} /></label>
            <label className="col-span-2 block text-xs font-semibold text-muted-foreground">Miestas<select value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} className={field}>{CITIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          </div>
          <label className="block text-xs font-semibold text-muted-foreground">Vieta<input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Pvz.: Mokyklos aktų salė" className={field} /></label>
          <label className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm font-semibold"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-[var(--primary)]" /> Taip pat nusiųsti pasiūlymą mano klasės mokiniams</label>
          {notify && <StudentPicker students={students} selected={selected} setSelected={setSelected} />}
        </div>
        <div className="flex justify-end border-t border-border p-4"><Button onClick={submit} disabled={busy} className="gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />} Paskelbti</Button></div>
      </DialogContent>
    </Dialog>
  );
}
