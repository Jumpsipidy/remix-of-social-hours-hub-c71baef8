import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDownWideNarrow, CalendarCheck, Clock, Flame, Mail, QrCode, Search, TrendingUp, Users,
} from "lucide-react";
import { reservationTimeLabel } from "@/lib/reservation-time";
import { useSchoolData } from "@/components/teacher/use-school-data";
import { getSchoolStudentReservations, type SchoolReservation, type SchoolStudent } from "@/lib/school-data.functions";
import {
  STUDENT_SORT_LABELS, classLabel, classOptions, progressPct, sortStudents, studentSummary,
  type StudentSort,
} from "@/lib/teacher-students";
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

function initialsOf(name: string | null | undefined) {
  return (name ?? "?").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("");
}

/** Apvalus progreso žiedas aplink avatarą ar procentą. */
function ProgressRing({ value, size = 48, stroke = 4, children }: { value: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--muted))" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="hsl(var(--primary))"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, value) / 100)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset .6s ease" }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center">{children}</span>
    </span>
  );
}

function TeacherStudents() {
  const { data, loading } = useSchoolData();
  const [q, setQ] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [sort, setSort] = useState<StudentSort>("name");
  const [selected, setSelected] = useState<SchoolStudent | null>(null);

  const students = data?.students ?? [];
  const summary = useMemo(() => studentSummary(students), [students]);
  const classes = useMemo(() => classOptions(students), [students]);

  const filtered = useMemo(() => {
    const base = students.filter((s) => {
      if (classFilter !== "all" && classLabel(s) !== classFilter) return false;
      if (!q.trim()) return true;
      return `${s.full_name ?? ""} ${s.email ?? ""}`.toLowerCase().includes(q.trim().toLowerCase());
    });
    return sortStudents(base, sort);
  }, [students, classFilter, q, sort]);

  if (loading && !data) {
    return <div className="grid min-h-[40dvh] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  const stats = [
    { icon: Users, label: "Mokiniai", value: summary.total },
    { icon: TrendingUp, label: "Vid. progresas", value: `${summary.avgPct}%` },
    { icon: Clock, label: "Surinkta valandų", value: summary.totalHours },
    { icon: Flame, label: "Reikia dėmesio", value: summary.attention },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Mokiniai</h1>
        <p className="text-sm text-muted-foreground">Paspausk ant mokinio kortelės — pamatysi visą informaciją ir istoriją.</p>
      </div>

      {/* Suvestinės juosta */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-border bg-border lg:grid-cols-4">
        {stats.map((m) => (
          <div key={m.label} className="flex items-center gap-3 bg-card p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
              <m.icon className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xl font-extrabold tabular-nums leading-tight">{m.value}</span>
              <span className="block truncate text-xs text-muted-foreground">{m.label}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Paieška, filtrai, rūšiavimas */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ieškoti pagal vardą ar el. paštą" className="pl-9" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setClassFilter("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${classFilter === "all" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            Visos klasės
          </button>
          {classes.map((c) => (
            <button
              key={c}
              onClick={() => setClassFilter(c)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${classFilter === c ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              {c}
            </button>
          ))}
          <span className="mx-1 hidden h-4 w-px bg-border sm:block" />
          <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <ArrowDownWideNarrow className="h-3.5 w-3.5" /> Rūšiuoti:
          </span>
          {(Object.keys(STUDENT_SORT_LABELS) as StudentSort[]).map((key) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${sort === key ? "bg-foreground text-background shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              {STUDENT_SORT_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {/* Mokinių kortelės */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((s) => {
          const p = progressPct(s);
          return (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              className="group rounded-3xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <ProgressRing value={p}>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {initialsOf(s.full_name)}
                  </span>
                </ProgressRing>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{s.full_name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{classLabel(s)} klasė</p>
                </div>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold tabular-nums text-primary">{p}%</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
                <span className="tabular-nums">{s.hours_earned} / {s.hours_needed} val.</span>
                <span className="flex items-center gap-1 font-semibold">
                  <Flame className={`h-3.5 w-3.5 ${(s.login_streak ?? 0) > 0 ? "text-primary" : "text-muted-foreground/50"}`} />
                  {s.login_streak ?? 0} d.
                </span>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
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
  const completedCount = (history ?? []).filter((r) => r.status === "completed" || r.status === "confirmed").length;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg" onOpenAutoFocus={() => student && void load(student.id)}>
        {student && (
          <>
            {/* Gradientinė antraštė su žiedu */}
            <div
              className="relative -mx-6 -mt-6 overflow-hidden px-6 pb-5 pt-8"
              style={{
                background:
                  "radial-gradient(400px 160px at 90% -20%, hsl(var(--primary) / .22), transparent 70%), hsl(var(--muted) / .5)",
              }}
            >
              <SheetHeader>
                <div className="flex items-center gap-4">
                  <ProgressRing value={progressPct(student)} size={72} stroke={5}>
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-base font-bold text-primary">
                      {initialsOf(student.full_name)}
                    </span>
                  </ProgressRing>
                  <div className="min-w-0">
                    <SheetTitle className="truncate text-xl">{student.full_name ?? "Mokinys"}</SheetTitle>
                    <SheetDescription>{classLabel(student)} klasė · {progressPct(student)}% progresas</SheetDescription>
                  </div>
                </div>
              </SheetHeader>
            </div>

            <div className="mt-5 space-y-5 px-1 pb-8">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-muted/60 p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Valandos</p>
                  <p className="mt-1 text-lg font-bold tabular-nums">{student.hours_earned} / {student.hours_needed}</p>
                </div>
                <div className="rounded-2xl bg-muted/60 p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Flame className="h-3.5 w-3.5" /> Streak</p>
                  <p className="mt-1 text-lg font-bold tabular-nums">{student.login_streak ?? 0} d.</p>
                  <p className="text-xs text-muted-foreground">Rekordas: {student.longest_login_streak ?? 0} d.</p>
                </div>
                <div className="rounded-2xl bg-muted/60 p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" /> Draugai</p>
                  <p className="mt-1 text-lg font-bold tabular-nums">{student.friends_count ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-muted/60 p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><QrCode className="h-3.5 w-3.5" /> QR patvirtinta</p>
                  <p className="mt-1 text-lg font-bold tabular-nums">{history ? qrHours : "…"} val.</p>
                  <p className="text-xs text-muted-foreground">Be QR: {history ? manualHours : "…"} val.</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Privalomų valandų progresas</span>
                  <span className="font-bold tabular-nums text-foreground">{progressPct(student)}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct(student)}%` }} />
                </div>
              </div>

              {student.email && (
                <a
                  href={`mailto:${student.email}`}
                  className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <Mail className="h-4 w-4 text-primary" /> {student.email}
                  <span className="ml-auto text-xs font-normal text-muted-foreground">Rašyti el. paštu</span>
                </a>
              )}

              <div>
                <h3 className="flex items-center gap-2 font-bold">
                  <CalendarCheck className="h-4 w-4 text-primary" /> Rezervacijų istorija
                  {history && <span className="text-xs font-semibold text-muted-foreground">({completedCount} užbaigtos)</span>}
                </h3>
                {historyError && <p className="mt-2 text-sm text-destructive">{historyError}</p>}
                {!history && !historyError && <p className="mt-2 text-sm text-muted-foreground">Kraunama…</p>}
                <ul className="mt-3 space-y-2">
                  {(history ?? []).map((r) => (
                    <li key={r.id} className="rounded-2xl border border-border bg-card p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate font-semibold">{r.source === "school" ? "Mokyklos rezervacija" : orgName(r.organization_id)}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                          r.status === "completed" || r.status === "confirmed" ? "bg-success/15 text-success"
                            : r.status === "declined" ? "bg-destructive/10 text-destructive"
                            : "bg-warning/15 text-warning-foreground"
                        }`}>{STATUS_LT[r.status] ?? r.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                        {r.reservation_date} · {reservationTimeLabel(r.start_time, r.end_time)} · {r.hours_to_earn} val.
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
