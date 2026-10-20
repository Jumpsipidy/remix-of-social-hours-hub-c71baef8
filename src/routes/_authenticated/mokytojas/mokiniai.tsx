import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarCheck, Clock, Flame, Mail, QrCode, Search, Users } from "lucide-react";
import { useSchoolData } from "@/components/teacher/use-school-data";
import { getSchoolStudentReservations, type SchoolReservation, type SchoolStudent } from "@/lib/school-data.functions";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/mokytojas/mokiniai")({
  head: () => ({
    meta: [
      { title: "Mokiniai — Auklėtojo sritis" },
      { name: "description", content: "Priskirtų klasių mokinių sąrašas ir išsami kiekvieno mokinio informacija." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Mokiniai — Auklėtojo sritis" },
      { property: "og:description", content: "Mokinių progresas, valandos ir rezervacijų istorija." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeacherStudents,
});

const STATUS_LT: Record<string, string> = {
  pending: "Laukia",
  approved: "Vykdoma",
  completed: "Užbaigta",
  confirmed: "Užbaigta",
  declined: "Atmesta",
};

function pct(s: { hours_earned: number; hours_needed: number }) {
  return s.hours_needed ? Math.min(100, Math.round((s.hours_earned / s.hours_needed) * 100)) : 0;
}

function TeacherStudents() {
  const { data, loading } = useSchoolData();
  const [q, setQ] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [selected, setSelected] = useState<SchoolStudent | null>(null);

  const students = data?.students ?? [];
  const classYears = useMemo(
    () => [...new Set(students.map((s) => s.class_year).filter(Boolean) as string[])].sort(),
    [students],
  );
  const filtered = students.filter((s) => {
    if (classFilter !== "all" && s.class_year !== classFilter) return false;
    if (!q.trim()) return true;
    return `${s.full_name ?? ""} ${s.email ?? ""}`.toLowerCase().includes(q.trim().toLowerCase());
  });

  if (loading && !data) {
    return <div className="grid min-h-[40dvh] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Mokiniai</h1>
        <p className="text-sm text-muted-foreground">Paspausk ant mokinio, kad pamatytum visą informaciją.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ieškoti pagal vardą ar el. paštą" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setClassFilter("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${classFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            Visos
          </button>
          {classYears.map((y) => (
            <button
              key={y}
              onClick={() => setClassFilter(y)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${classFilter === y ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelected(s)}
            className="rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                {(s.full_name ?? "?").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{s.full_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{s.class_year ?? "—"}{s.class_letter ?? ""} klasė</p>
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums">{pct(s)}%</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct(s)}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground tabular-nums">{s.hours_earned} / {s.hours_needed} val.</p>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <Users className="mx-auto mb-2 h-6 w-6" /> Mokinių nerasta.
          </div>
        )}
      </div>

      <StudentDetail student={selected} orgs={data?.organizations ?? []} onClose={() => setSelected(null)} />
    </div>
  );
}

function StudentDetail({
  student,
  orgs,
  onClose,
}: {
  student: SchoolStudent | null;
  orgs: { id: string; organization_name: string | null; full_name: string | null }[];
  onClose: () => void;
}) {
  const fetchHistory = useServerFn(getSchoolStudentReservations);
  const [history, setHistory] = useState<SchoolReservation[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const open = !!student;
  const load = async (id: string) => {
    setHistory(null);
    setHistoryError(null);
    try {
      setHistory(await fetchHistory({ data: { studentId: id } }));
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : "Nepavyko įkelti istorijos.");
    }
  };

  const orgName = (id: string) => orgs.find((o) => o.id === id)?.organization_name ?? orgs.find((o) => o.id === id)?.full_name ?? "Organizacija";
  const qrHours = (history ?? []).filter((r) => (r.status === "completed" || r.status === "confirmed") && r.checked_in_at).reduce((a, r) => a + Number(r.hours_to_earn), 0);
  const manualHours = (history ?? []).filter((r) => (r.status === "completed" || r.status === "confirmed") && !r.checked_in_at).reduce((a, r) => a + Number(r.hours_to_earn), 0);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg" onOpenAutoFocus={() => student && void load(student.id)}>
        {student && (
          <>
            <SheetHeader>
              <SheetTitle>{student.full_name ?? "Mokinys"}</SheetTitle>
              <SheetDescription>{student.class_year ?? "—"}{student.class_letter ?? ""} klasė</SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-5 px-4 pb-8">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Valandos</p>
                  <p className="mt-1 text-lg font-bold tabular-nums">{student.hours_earned} / {student.hours_needed}</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Flame className="h-3.5 w-3.5" /> Streak</p>
                  <p className="mt-1 text-lg font-bold tabular-nums">{student.login_streak ?? 0} d.</p>
                  <p className="text-xs text-muted-foreground">Rekordas: {student.longest_login_streak ?? 0} d.</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" /> Draugai</p>
                  <p className="mt-1 text-lg font-bold tabular-nums">{student.friends_count ?? 0}</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><QrCode className="h-3.5 w-3.5" /> QR patvirtinta</p>
                  <p className="mt-1 text-lg font-bold tabular-nums">{history ? qrHours : "…"} val.</p>
                  <p className="text-xs text-muted-foreground">Be QR: {history ? manualHours : "…"} val.</p>
                </div>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct(student)}%` }} />
              </div>

              {student.email && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4" /> {student.email}</p>
              )}

              <div>
                <h3 className="flex items-center gap-2 font-bold"><CalendarCheck className="h-4 w-4 text-primary" /> Rezervacijų istorija</h3>
                {historyError && <p className="mt-2 text-sm text-destructive">{historyError}</p>}
                {!history && !historyError && <p className="mt-2 text-sm text-muted-foreground">Kraunama…</p>}
                <ul className="mt-3 space-y-2">
                  {(history ?? []).map((r) => (
                    <li key={r.id} className="rounded-xl border border-border bg-card p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate font-semibold">{r.source === "school" ? "Mokyklos rezervacija" : orgName(r.organization_id)}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                          r.status === "completed" || r.status === "confirmed" ? "bg-success/15 text-success"
                          : r.status === "declined" ? "bg-destructive/10 text-destructive"
                          : "bg-warning/15 text-warning-foreground"
                        }`}>{STATUS_LT[r.status] ?? r.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                        {r.reservation_date} · {String(r.start_time).slice(0, 5)}–{String(r.end_time).slice(0, 5)} · {r.hours_to_earn} val.
                        {r.checked_in_at ? " · QR patvirtinta" : ""}
                      </p>
                      {r.note && <p className="mt-1 text-xs text-muted-foreground">{r.note}</p>}
                    </li>
                  ))}
                  {history && history.length === 0 && <li className="py-3 text-sm text-muted-foreground">Rezervacijų dar nėra.</li>}
                </ul>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
