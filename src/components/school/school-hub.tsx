import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Check, Loader2, MessageCircle, Search, Send, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { openDmRoom, sendDmMessage } from "@/lib/dm";
import type { SchoolReservation, SchoolStudent, SchoolOrg } from "@/lib/school-data.functions";

export const KIND_LABEL: Record<string, string> = {
  volunteer: "Dirbo",
  consultation: "Pasitarimo valandos",
  event: "Renginys",
  other: "Kita",
};
const KINDS = ["volunteer", "consultation", "event", "other"] as const;

export function classLabel(s: { class_year: string | null; class_letter?: string | null }) {
  if (!s.class_year) return "Be klasės";
  const [num, gimn] = s.class_year.split(" / ");
  return `${num}${s.class_letter ?? ""}${gimn ? ` (${gimn})` : ""}`;
}

export function KindBadge({ kind }: { kind?: string | null }) {
  const k = kind ?? "volunteer";
  return <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">{KIND_LABEL[k] ?? k}</span>;
}

function pct(s: SchoolStudent) {
  return s.hours_needed ? Math.min(100, Math.round((s.hours_earned / s.hours_needed) * 100)) : 0;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-border bg-card p-5 text-card-foreground ${className}`}>{children}</div>;
}

/* ------------------------------ Klasė ------------------------------ */
export function ClassRoster({ students, reservations, onMessage, onRecommend }: {
  students: SchoolStudent[];
  reservations: SchoolReservation[];
  onMessage: (s: SchoolStudent) => void;
  onRecommend: (s: SchoolStudent) => void;
}) {
  const groups = useMemo(() => {
    const m = new Map<string, SchoolStudent[]>();
    for (const s of students) {
      const k = classLabel(s);
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "lt", { numeric: true }));
  }, [students]);
  const pendingBy = useMemo(() => {
    const m: Record<string, number> = {};
    reservations.forEach((r) => { if (r.status === "pending" || r.status === "approved") m[r.student_id] = (m[r.student_id] ?? 0) + 1; });
    return m;
  }, [reservations]);

  if (!students.length) return <Card><p className="text-sm text-muted-foreground">Klasėje dar nėra mokinių.</p></Card>;
  return (
    <div className="space-y-6">
      {groups.map(([name, list]) => (
        <Card key={name} className="p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="text-lg font-bold">{name} klasė</h3>
            <span className="text-sm text-muted-foreground">{list.length} mokin.</span>
          </div>
          <ul className="divide-y divide-border">
            {list.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold text-foreground">
                  {(s.full_name ?? "?").split(" ").map((x) => x[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-[10rem] flex-1">
                  <p className="text-sm font-semibold">{s.full_name ?? s.email ?? "Mokinys"}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${pct(s)}%` }} /></div>
                    <span className="font-mono text-xs text-muted-foreground">{s.hours_earned}/{s.hours_needed} val.</span>
                    {pendingBy[s.id] ? <span className="rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold text-foreground">{pendingBy[s.id]} vyksta</span> : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onMessage(s)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted"><MessageCircle className="h-3.5 w-3.5" /> Rašyti</button>
                  <button onClick={() => onRecommend(s)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"><Sparkles className="h-3.5 w-3.5" /> Rekomenduoti</button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------ Rezervacijų centras ----------------------- */
const today = () => new Date().toISOString().slice(0, 10);

export function ReservationHub({ students, orgs, reservations, orgName, onChanged }: {
  students: SchoolStudent[];
  orgs: SchoolOrg[];
  reservations: SchoolReservation[];
  orgName: (id: string) => string;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [hoursFor, setHoursFor] = useState<Record<string, number>>({});
  const byId = useMemo(() => Object.fromEntries(students.map((s) => [s.id, s])), [students]);
  const school = reservations.filter((r) => r.source === "school");
  const active = school.filter((r) => r.status === "approved" || r.status === "pending");
  const done = school.filter((r) => r.status !== "approved" && r.status !== "pending");

  async function finish(r: SchoolReservation, decline = false) {
    setBusy(r.id);
    const { error } = await (supabase.rpc as any)("school_complete_reservation", {
      _reservation_id: r.id, _hours: hoursFor[r.id] ?? Number(r.hours_to_earn), _decline: decline,
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(decline ? "Atšaukta" : "Valandos įskaitytos");
    onChanged();
  }

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold">Mokyklos rezervacijos</h3>
          <p className="text-sm text-muted-foreground">Rezervacijos, kurias sukuri tu. QR registracijos nereikia — valandas patvirtini čia.</p>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"><CalendarPlus className="h-4 w-4" /> Nauja rezervacija</button>
      </Card>

      <Card className="p-0">
        <div className="border-b border-border px-5 py-4"><h3 className="font-bold">Vykstančios ({active.length})</h3></div>
        {active.length === 0 ? <p className="px-5 py-6 text-sm text-muted-foreground">Nėra vykstančių mokyklos rezervacijų.</p> : (
          <ul className="divide-y divide-border">
            {active.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-[12rem] flex-1">
                  <p className="text-sm font-semibold">{byId[r.student_id]?.full_name ?? "Mokinys"} <span className="font-normal text-muted-foreground">· {orgName(r.organization_id)}</span></p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><KindBadge kind={r.kind} /> {r.reservation_date} {r.start_time?.slice(0, 5)}–{r.end_time?.slice(0, 5)}</p>
                </div>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">Val.
                  <input type="number" min={0} max={8} value={hoursFor[r.id] ?? Number(r.hours_to_earn)}
                    onChange={(e) => setHoursFor((h) => ({ ...h, [r.id]: Math.max(0, Math.min(8, Math.round(Number(e.target.value)))) }))}
                    className="h-8 w-14 rounded-lg border border-border bg-background px-2 text-sm text-foreground" />
                </label>
                <button disabled={busy === r.id} onClick={() => finish(r, true)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-destructive disabled:opacity-50">Atšaukti</button>
                <button disabled={busy === r.id} onClick={() => finish(r)} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
                  {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Patvirtinti valandas
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {done.length > 0 && (
        <Card className="p-0">
          <div className="border-b border-border px-5 py-4"><h3 className="font-bold">Užbaigtos</h3></div>
          <ul className="divide-y divide-border">
            {done.slice(0, 50).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <span className="flex-1 font-medium">{byId[r.student_id]?.full_name ?? "Mokinys"}</span>
                <KindBadge kind={r.kind} />
                <span className="text-xs text-muted-foreground">{r.reservation_date}</span>
                <span className="font-mono text-xs">{r.status === "declined" ? "atšaukta" : `${r.hours_to_earn} val.`}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {open && <NewReservationDialog students={students} orgs={orgs} onClose={() => setOpen(false)} onDone={() => { setOpen(false); onChanged(); }} />}
    </div>
  );
}

function NewReservationDialog({ students, orgs, onClose, onDone }: { students: SchoolStudent[]; orgs: SchoolOrg[]; onClose: () => void; onDone: () => void }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]>("volunteer");
  const [org, setOrg] = useState("");
  const [date, setDate] = useState(today());
  const [start, setStart] = useState("14:00");
  const [len, setLen] = useState(2);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useMemo(() => {
    const [h, m] = start.split(":").map(Number);
    const t = Math.min(23 * 60 + 59, h * 60 + m + len * 60);
    return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  }, [start, len]);
  const shown = students.filter((s) => `${s.full_name ?? ""} ${classLabel(s)}`.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function save() {
    if (!picked.size) return toast.error("Pasirink bent vieną mokinį");
    setBusy(true);
    const { data, error } = await (supabase.rpc as any)("school_create_reservations", {
      _student_ids: [...picked], _organization_id: org || null, _task_id: null, _date: date,
      _start: start, _end: end, _hours: len, _kind: kind, _note: note || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Sukurta rezervacijų: ${data ?? picked.size}`);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Nauja rezervacija">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border bg-card text-card-foreground sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-lg font-bold">Nauja rezervacija</h3>
          <button onClick={onClose} aria-label="Uždaryti" className="rounded-full p-2 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-5 overflow-y-auto p-5">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Veiklos tipas</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {KINDS.map((k) => (
                <button key={k} type="button" onClick={() => setKind(k)} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${kind === k ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}>{KIND_LABEL[k]}</button>
              ))}
            </div>
            {kind === "consultation" && <p className="mt-2 text-xs text-muted-foreground">Pasitarimo valandos — laikas, kada mokinys gali ateiti pasikalbėti su organizacija.</p>}
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Mokiniai ({picked.size})</p>
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-border bg-background px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ieškoti…" className="h-10 w-full bg-transparent text-sm outline-none" />
              <button type="button" onClick={() => setPicked(new Set(shown.map((s) => s.id)))} className="shrink-0 text-xs font-bold text-primary">Visi</button>
            </div>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-border p-1">
              {shown.map((s) => (
                <label key={s.id} className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${picked.has(s.id) ? "bg-primary/10" : "hover:bg-muted"}`}>
                  <input type="checkbox" checked={picked.has(s.id)} onChange={() => toggle(s.id)} />
                  <span className="flex-1">{s.full_name ?? s.email}</span>
                  <span className="text-xs text-muted-foreground">{classLabel(s)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Organizacija
              <select value={org} onChange={(e) => setOrg(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground">
                <option value="">Mokykla (be organizacijos)</option>
                {orgs.map((o) => <option key={o.id} value={o.id}>{o.organization_name ?? o.full_name}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Data
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground" />
            </label>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Pradžia</p>
            <div className="flex flex-wrap gap-2">
              {["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"].map((t) => (
                <button key={t} type="button" onClick={() => setStart(t)} className={`rounded-lg border px-3 py-1.5 font-mono text-sm ${start === t ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}>{t}</button>
              ))}
              <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground" aria-label="Kitas laikas" />
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Trukmė ir valandos · baigsis {end}</p>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 8].map((h) => (
                <button key={h} type="button" onClick={() => setLen(h)} className={`h-9 w-11 rounded-lg border font-mono text-sm ${len === h ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}>{h}h</button>
              ))}
            </div>
          </div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Pastaba
            <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 1000))} rows={2} className="mt-1.5 w-full rounded-xl border border-border bg-background p-3 text-sm font-normal normal-case tracking-normal text-foreground" placeholder="Pvz. susitikimas prie bibliotekos" />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-border p-4">
          <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted">Atšaukti</button>
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sukurti
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Istorija ----------------------------- */
const STATUS: Record<string, string> = { pending: "Laukia", approved: "Vykdoma", completed: "Užbaigta", confirmed: "Užbaigta", declined: "Atmesta" };

export function HistoryPanel({ students, reservations, orgName }: { students: SchoolStudent[]; reservations: SchoolReservation[]; orgName: (id: string) => string }) {
  const [studentF, setStudentF] = useState("all");
  const [q, setQ] = useState("");
  const byId = useMemo(() => Object.fromEntries(students.map((s) => [s.id, s])), [students]);
  const rows = reservations
    .filter((r) => studentF === "all" || r.student_id === studentF)
    .filter((r) => `${byId[r.student_id]?.full_name ?? ""} ${orgName(r.organization_id)}`.toLowerCase().includes(q.toLowerCase()));
  const verif = (r: SchoolReservation) =>
    r.source === "school" ? (r.status === "completed" ? "Patvirtino mokykla" : "Mokyklos rezervacija")
      : r.checked_in_at ? `QR ${new Date(r.checked_in_at).toLocaleString("lt-LT", { dateStyle: "short", timeStyle: "short" })}`
      : r.status === "completed" || r.status === "confirmed" ? "Patvirtino organizacija" : "—";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {students.slice().sort((a, b) => b.hours_earned - a.hours_earned).slice(0, 4).map((s) => (
          <Card key={s.id}>
            <p className="truncate text-sm font-semibold">{s.full_name}</p>
            <p className="text-xs text-muted-foreground">{classLabel(s)}</p>
            <p className="mt-2 font-mono text-2xl font-bold">{s.hours_earned}<span className="text-sm text-muted-foreground">/{s.hours_needed} val.</span></p>
          </Card>
        ))}
      </div>
      <Card className="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <h3 className="flex-1 font-bold">Visa istorija ({rows.length})</h3>
          <select value={studentF} onChange={(e) => setStudentF(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground">
            <option value="all">Visi mokiniai</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ieškoti…" className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-5 py-3">Mokinys</th><th className="px-5 py-3">Veikla</th><th className="px-5 py-3">Data</th><th className="px-5 py-3">Val.</th><th className="px-5 py-3">Būsena</th><th className="px-5 py-3">Patvirtinimas</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.slice(0, 300).map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3 font-medium">{byId[r.student_id]?.full_name ?? "—"}<span className="ml-1 text-xs text-muted-foreground">{byId[r.student_id] ? classLabel(byId[r.student_id]) : ""}</span></td>
                  <td className="px-5 py-3"><div className="flex flex-wrap items-center gap-2"><KindBadge kind={r.kind} /><span className="text-muted-foreground">{orgName(r.organization_id)}</span></div></td>
                  <td className="px-5 py-3 font-mono text-xs">{r.reservation_date}</td>
                  <td className="px-5 py-3 font-mono">{r.hours_to_earn}</td>
                  <td className="px-5 py-3">{STATUS[r.status] ?? r.status}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{verif(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="px-5 py-6 text-sm text-muted-foreground">Įrašų nėra.</p>}
        </div>
      </Card>
    </div>
  );
}

/* --------------------------- Rekomendacija --------------------------- */
type OpenTask = { id: string; title: string; task_date: string; location: string; available_hours: number };

export function RecommendDialog({ student, me, onClose }: { student: SchoolStudent | null; me: string; onClose: () => void }) {
  const [tasks, setTasks] = useState<OpenTask[] | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!student) return;
    setPick(null); setNote("");
    supabase.from("tasks").select("id, title, task_date, location, available_hours").eq("is_open", true)
      .gte("task_date", today()).order("task_date").limit(60)
      .then(({ data }) => setTasks((data as OpenTask[]) ?? []));
  }, [student?.id]);
  if (!student) return null;

  async function send() {
    if (!pick && !note.trim()) return toast.error("Pasirink užduotį arba parašyk rekomendaciją");
    setBusy(true);
    try {
      const room = await openDmRoom(student!.id);
      const t = tasks?.find((x) => x.id === pick);
      const link = t ? `\n${window.location.origin}/tasks?task=${t.id}` : "";
      const body = `💡 Rekomendacija${t ? `: „${t.title}“ (${t.task_date})` : ""}${note.trim() ? `\n${note.trim()}` : ""}${link}`;
      await sendDmMessage(room, me, body);
      toast.success("Rekomendacija išsiųsta");
      onClose();
    } catch (e: any) { toast.error(e?.message ?? "Nepavyko išsiųsti"); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Siųsti rekomendaciją">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-card text-card-foreground sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div><h3 className="font-bold">Siųsti rekomendaciją</h3><p className="text-xs text-muted-foreground">{student.full_name} · {classLabel(student)}</p></div>
          <button onClick={onClose} aria-label="Uždaryti" className="rounded-full p-2 hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 overflow-y-auto p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Siųsti rezervaciją (nuoroda į užduotį)</p>
          <div className="max-h-60 space-y-1 overflow-y-auto">
            {tasks === null ? <p className="text-sm text-muted-foreground">Kraunama…</p> : tasks.length === 0 ? <p className="text-sm text-muted-foreground">Atvirų užduočių nėra.</p> :
              tasks.map((t) => (
                <button key={t.id} type="button" onClick={() => setPick(pick === t.id ? null : t.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm ${pick === t.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
                  <span className="flex-1"><span className="block font-semibold">{t.title}</span><span className="text-xs text-muted-foreground">{t.task_date} · {t.location}</span></span>
                  <span className="font-mono text-xs">{t.available_hours} val.</span>
                </button>
              ))}
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 800))} rows={3} placeholder="Kodėl rekomenduoji? (nebūtina)" className="w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground" />
        </div>
        <div className="flex justify-end border-t border-border p-4">
          <button onClick={send} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Siųsti mokiniui
          </button>
        </div>
      </div>
    </div>
  );
}
