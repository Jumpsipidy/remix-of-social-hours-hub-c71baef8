import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarPlus, Clock, Pencil, Search, Send, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useSchoolData } from "@/components/teacher/use-school-data";
import { useAuth } from "@/hooks/use-auth";
import {
  teacherCreateReservations,
  teacherDeleteReservation,
  teacherSendInvites,
  teacherUpdateReservation,
} from "@/lib/teacher.functions";
import type { SchoolReservation, SchoolStudent } from "@/lib/school-data.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/mokytojas/rezervacijos")({
  head: () => ({
    meta: [
      { title: "Rezervacijos — Auklėtojo sritis" },
      { name: "description", content: "Kurk, redaguok ir trink mokyklos rezervacijas, kviesk mokinius." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Rezervacijos — Auklėtojo sritis" },
      { property: "og:description", content: "Mokyklos rezervacijų kūrimas ir valdymas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeacherReservations,
});

const STATUS_LT: Record<string, string> = {
  pending: "Laukia",
  approved: "Vykdoma",
  completed: "Užbaigta",
  confirmed: "Užbaigta",
  declined: "Atmesta",
};
const KIND_LT: Record<string, string> = {
  volunteer: "Savanorystė",
  consultation: "Konsultacija",
  event: "Renginys",
  other: "Kita",
};

type FormState = {
  date: string; start: string; end: string; hours: number; kind: string; note: string; organizationId: string;
};
const emptyForm = (): FormState => ({ date: "", start: "", end: "", hours: 1, kind: "event", note: "", organizationId: "" });

function TeacherReservations() {
  const { profile } = useAuth();
  const { data, loading, refresh } = useSchoolData();
  const createFn = useServerFn(teacherCreateReservations);
  const updateFn = useServerFn(teacherUpdateReservation);
  const deleteFn = useServerFn(teacherDeleteReservation);
  const inviteFn = useServerFn(teacherSendInvites);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [classFilter, setClassFilter] = useState("all");
  const [letterFilter, setLetterFilter] = useState("all");
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState<SchoolReservation | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm());

  const [search, setSearch] = useState("");
  const [inviteFor, setInviteFor] = useState<SchoolReservation | null>(null);
  const [inviteClass, setInviteClass] = useState<string | null>(null);

  const students = data?.students ?? [];
  const orgs = data?.organizations ?? [];
  const schoolRes = useMemo(
    () => (data?.reservations ?? []).filter((r) => r.source === "school")
      .sort((a, b) => b.reservation_date.localeCompare(a.reservation_date)),
    [data],
  );

  const classYears = useMemo(() => [...new Set(students.map((s) => s.class_year).filter(Boolean) as string[])].sort(), [students]);

  // Klasių (metai + raidė) sąrašas tik iš to auklėtojo mokinių — serveris jau
  // apriboja pagrindinį sąrašą jo priskirtomis klasėmis, tad čia nieko pridurti negalima.
  const classGroups = useMemo(() => {
    const map = new Map<string, SchoolStudent[]>();
    for (const s of students) {
      if (!s.class_year) continue;
      const key = `${s.class_year}${s.class_letter ? ` ${s.class_letter}` : ""}`;
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [students]);

  const filteredRes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return schoolRes;
    return schoolRes.filter((r) =>
      studentName(r.student_id).toLowerCase().includes(q) ||
      r.reservation_date.includes(q) ||
      (r.note ?? "").toLowerCase().includes(q));
  }, [schoolRes, search, students]);

  const inviteStudents = inviteClass ? (classGroups.find(([k]) => k === inviteClass)?.[1] ?? []) : [];
  const submitClassInvite = async () => {
    if (!inviteFor || busy) return;
    if (!inviteClass || inviteStudents.length === 0) { toast.error("Pasirink klasę su mokiniais."); return; }
    setBusy(true);
    try {
      const ids = inviteStudents.map((s) => s.id);
      const teacherName = profile?.full_name ?? "Auklėtojas";
      const link = `${window.location.origin}/student`;
      const message = `Auklėtojas ${teacherName} kviečia klasę ${inviteClass}: ${KIND_LT[inviteFor.kind ?? ""] ?? "Savanorystė"} — ${inviteFor.reservation_date} ${String(inviteFor.start_time).slice(0, 5)}–${String(inviteFor.end_time).slice(0, 5)} (${inviteFor.hours_to_earn} val.).${inviteFor.note ? ` ${inviteFor.note}` : ""}\n${link}`;
      const res = await inviteFn({ data: { studentIds: ids, message } });
      toast.success(`Kvietimai išsiųsti: ${res.sent}/${res.total}.`);
      setInviteFor(null);
      setInviteClass(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko išsiųsti kvietimų.");
    } finally {
      setBusy(false);
    }
  };
  const pickable = students.filter((s) =>
    (classFilter === "all" || s.class_year === classFilter) &&
    (letterFilter === "all" || (s.class_letter ?? "") === letterFilter));

  const stats = {
    total: schoolRes.length,
    active: schoolRes.filter((r) => r.status === "approved" || r.status === "pending").length,
    done: schoolRes.filter((r) => r.status === "completed" || r.status === "confirmed").length,
    hours: schoolRes.filter((r) => r.status === "completed" || r.status === "confirmed").reduce((a, r) => a + Number(r.hours_to_earn), 0),
  };
  const studentName = (id: string) => students.find((s) => s.id === id)?.full_name ?? "Mokinys";

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const submitCreate = async () => {
    if (busy) return;
    if (!form.date || !form.start || !form.end) { toast.error("Užpildyk datą ir laiką."); return; }
    if (selectedIds.size === 0) { toast.error("Pasirink bent vieną mokinį."); return; }
    setBusy(true);
    try {
      const ids = [...selectedIds];
      await createFn({
        data: {
          studentIds: ids,
          organizationId: form.organizationId || null,
          taskId: null,
          date: form.date, start: form.start, end: form.end,
          hours: form.hours, kind: form.kind, note: form.note,
        },
      });
      const teacherName = profile?.full_name ?? "Auklėtojas";
      const link = `${window.location.origin}/student`;
      const message = `Auklėtojas ${teacherName} siūlo rezervaciją: ${KIND_LT[form.kind] ?? form.kind} — ${form.date} ${form.start}–${form.end} (${form.hours} val.).${form.note ? ` ${form.note}` : ""}\n${link}`;
      const inviteRes = await inviteFn({ data: { studentIds: ids, message } });
      toast.success(`Sukurta ${ids.length} rezervacijų. Kvietimai išsiųsti: ${inviteRes.sent}/${inviteRes.total}.`);
      setCreateOpen(false);
      setForm(emptyForm());
      setSelectedIds(new Set());
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko sukurti rezervacijų.");
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (r: SchoolReservation) => {
    setEditing(r);
    setEditForm({
      date: r.reservation_date,
      start: String(r.start_time).slice(0, 5),
      end: String(r.end_time).slice(0, 5),
      hours: Number(r.hours_to_earn),
      kind: r.kind ?? "event",
      note: r.note ?? "",
      organizationId: "",
    });
  };

  const submitEdit = async () => {
    if (!editing || busy) return;
    setBusy(true);
    try {
      await updateFn({ data: { id: editing.id, date: editForm.date, start: editForm.start, end: editForm.end, hours: editForm.hours, kind: editForm.kind, note: editForm.note } });
      toast.success("Rezervacija atnaujinta.");
      setEditing(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko atnaujinti.");
    } finally {
      setBusy(false);
    }
  };

  const submitDelete = async (r: SchoolReservation) => {
    if (busy) return;
    if (!window.confirm(`Ištrinti ${studentName(r.student_id)} rezervaciją (${r.reservation_date})?`)) return;
    setBusy(true);
    try {
      await deleteFn({ data: { id: r.id } });
      toast.success("Rezervacija ištrinta.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko ištrinti.");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) {
    return <div className="grid min-h-[40dvh] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  const formFields = (state: FormState, set: (f: FormState) => void, showOrg: boolean) => (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-semibold text-muted-foreground">Data
        <Input type="date" value={state.date} onChange={(e) => set({ ...state, date: e.target.value })} className="mt-1" />
      </label>
      <label className="text-xs font-semibold text-muted-foreground">Valandos
        <Input type="number" min={0} max={8} value={state.hours} onChange={(e) => set({ ...state, hours: Number(e.target.value) })} className="mt-1" />
      </label>
      <label className="text-xs font-semibold text-muted-foreground">Pradžia
        <Input type="time" value={state.start} onChange={(e) => set({ ...state, start: e.target.value })} className="mt-1" />
      </label>
      <label className="text-xs font-semibold text-muted-foreground">Pabaiga
        <Input type="time" value={state.end} onChange={(e) => set({ ...state, end: e.target.value })} className="mt-1" />
      </label>
      <label className="text-xs font-semibold text-muted-foreground">Tipas
        <select value={state.kind} onChange={(e) => set({ ...state, kind: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
          {Object.entries(KIND_LT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      {showOrg && (
        <label className="text-xs font-semibold text-muted-foreground">Organizacija (nebūtina)
          <select value={state.organizationId} onChange={(e) => set({ ...state, organizationId: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Mokyklos renginys</option>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.organization_name ?? o.full_name}</option>)}
          </select>
        </label>
      )}
      <label className="text-xs font-semibold text-muted-foreground sm:col-span-2">Pastaba
        <Input value={state.note} onChange={(e) => set({ ...state, note: e.target.value })} placeholder="Pvz.: susitinkame prie aktų salės" className="mt-1" />
      </label>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Rezervacijos</h1>
          <p className="text-sm text-muted-foreground">Kurk mokyklos renginius ir kviesk savo klasių mokinius.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2"><CalendarPlus className="h-4 w-4" /> Nauja rezervacija</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Iš viso", value: stats.total },
          { label: "Vykdomos", value: stats.active },
          { label: "Užbaigtos", value: stats.done },
          { label: "Sukaupta valandų", value: stats.hours },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-2xl font-bold tabular-nums">{m.value}</p>
            <p className="text-sm font-semibold">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ieškoti pagal mokinį, datą ar pastabą…"
          className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      <ul className="space-y-2">
        {filteredRes.map((r) => {
          const finished = r.status === "completed" || r.status === "confirmed";
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{studentName(r.student_id)}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                  <Clock className="h-3.5 w-3.5" /> {r.reservation_date} · {String(r.start_time).slice(0, 5)}–{String(r.end_time).slice(0, 5)} · {r.hours_to_earn} val. · {KIND_LT[r.kind ?? ""] ?? "Savanorystė"}
                </p>
                {r.note && <p className="mt-1 truncate text-xs text-muted-foreground">{r.note}</p>}
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                finished ? "bg-success/15 text-success"
                : r.status === "declined" ? "bg-destructive/10 text-destructive"
                : "bg-warning/15 text-warning-foreground"
              }`}>{STATUS_LT[r.status] ?? r.status}</span>
              {!finished && (
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="gap-1.5" aria-label="Siųsti klasei" onClick={() => { setInviteFor(r); setInviteClass(null); }}>
                    <Users className="h-4 w-4" /> Siųsti klasei
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Redaguoti" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label="Ištrinti" onClick={() => void submitDelete(r)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              )}
            </li>
          );
        })}
        {schoolRes.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Mokyklos rezervacijų dar nėra. Sukurk pirmąją ir pakviesk mokinius.
          </li>
        )}
      </ul>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nauja rezervacija</DialogTitle>
            <DialogDescription>Pasirink laiką, klasę ir mokinius — jie gaus kvietimą į pokalbį.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {formFields(form, setForm, true)}
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Klasė ir raidė</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button onClick={() => setClassFilter("all")} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${classFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Visos klasės</button>
                {classYears.map((y) => (
                  <button key={y} onClick={() => setClassFilter(y)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${classFilter === y ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{y}</button>
                ))}
                <span className="mx-1 border-l border-border" />
                {["all", "A", "B"].map((l) => (
                  <button key={l} onClick={() => setLetterFilter(l)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${letterFilter === l ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{l === "all" ? "A ir B" : l}</button>
                ))}
              </div>
              <div className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                {pickable.map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                    <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleStudent(s.id)} className="h-4 w-4 accent-primary" />
                    <span className="min-w-0 flex-1 truncate">{s.full_name ?? "—"}</span>
                    <span className="text-xs text-muted-foreground">{s.class_year ?? "—"}{s.class_letter ?? ""}</span>
                  </label>
                ))}
                {pickable.length === 0 && <p className="p-3 text-center text-xs text-muted-foreground">Šioje klasėje mokinių nėra.</p>}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Pasirinkta: {selectedIds.size}</span>
                <button className="font-semibold text-primary hover:underline" onClick={() => setSelectedIds(new Set(pickable.map((s) => s.id)))}>Pažymėti visus</button>
              </div>
            </div>
            <Button onClick={() => void submitCreate()} disabled={busy} className="w-full gap-2">
              <Send className="h-4 w-4" /> {busy ? "Kuriama…" : `Sukurti ir siųsti kvietimus (${selectedIds.size})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Redaguoti rezervaciją</DialogTitle>
            <DialogDescription>{editing ? studentName(editing.student_id) : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {formFields(editForm, setEditForm, false)}
            <Button onClick={() => void submitEdit()} disabled={busy} className="w-full">{busy ? "Saugoma…" : "Išsaugoti pakeitimus"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
