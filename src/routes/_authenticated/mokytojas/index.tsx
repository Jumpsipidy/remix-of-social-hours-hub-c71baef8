import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck, Clock, Flame, TrendingUp, Users } from "lucide-react";
import { useSchoolData } from "@/components/teacher/use-school-data";

export const Route = createFileRoute("/_authenticated/mokytojas/")({
  head: () => ({
    meta: [
      { title: "Auklėtojo apžvalga — Socialinės Valandos" },
      { name: "description", content: "Priskirtų klasių progresas, rezervacijos ir statistika vienoje vietoje." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Auklėtojo apžvalga — Socialinės Valandos" },
      { property: "og:description", content: "Priskirtų klasių progresas ir rezervacijų statistika." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeacherOverview,
});

function pct(s: { hours_earned: number; hours_needed: number }) {
  return s.hours_needed ? Math.min(100, Math.round((s.hours_earned / s.hours_needed) * 100)) : 0;
}

function TeacherOverview() {
  const { data, loading } = useSchoolData();
  const students = data?.students ?? [];
  const reservations = data?.reservations ?? [];
  const schoolRes = reservations.filter((r) => r.source === "school");

  const avgPct = students.length ? Math.round(students.reduce((a, s) => a + pct(s), 0) / students.length) : 0;
  const totalHours = students.reduce((a, s) => a + s.hours_earned, 0);
  const upcoming = schoolRes.filter((r) => r.status === "approved").length;
  const pendingReview = schoolRes.filter((r) => r.status === "pending").length;
  const lowProgress = students.filter((s) => pct(s) < 35);
  const streakTop = [...students].sort((a, b) => (b.login_streak ?? 0) - (a.login_streak ?? 0)).slice(0, 5);
  const upcomingList = schoolRes
    .filter((r) => r.status === "approved")
    .sort((a, b) => a.reservation_date.localeCompare(b.reservation_date))
    .slice(0, 6);
  const studentName = (id: string) => students.find((s) => s.id === id)?.full_name ?? "Mokinys";

  if (loading && !data) {
    return <div className="grid min-h-[40dvh] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Apžvalga</h1>
        <p className="text-sm text-muted-foreground">
          {data?.scope.class_restricted
            ? `Priskirtos klasės: ${data.scope.assigned_classes.join(", ") || "visos"}${data.scope.assigned_letter ? ` · ${data.scope.assigned_letter}` : ""}`
            : "Visos mokyklos klasės"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: Users, label: "Mokiniai", value: students.length, hint: "priskirtose klasėse" },
          { icon: TrendingUp, label: "Vidutinis progresas", value: `${avgPct}%`, hint: "privalomų valandų" },
          { icon: Clock, label: "Surinkta valandų", value: totalHours, hint: "visų mokinių" },
          { icon: CalendarCheck, label: "Artėjančios", value: upcoming, hint: pendingReview ? `${pendingReview} laukia peržiūros` : "mokyklos rezervacijos" },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border border-border bg-card p-4">
            <m.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-2xl font-bold tabular-nums">{m.value}</p>
            <p className="text-sm font-semibold">{m.label}</p>
            <p className="text-xs text-muted-foreground">{m.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Artėjančios rezervacijos</h2>
            <Link to="/mokytojas/rezervacijos" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              Visos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {upcomingList.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{studentName(r.student_id)}</span>
                <span className="ml-3 shrink-0 text-xs text-muted-foreground tabular-nums">
                  {r.reservation_date} · {String(r.start_time).slice(0, 5)} · {r.hours_to_earn} val.
                </span>
              </li>
            ))}
            {upcomingList.length === 0 && <li className="py-4 text-center text-sm text-muted-foreground">Artėjančių rezervacijų nėra.</li>}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Reikia dėmesio</h2>
            <Link to="/mokytojas/mokiniai" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              Mokiniai <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {lowProgress.slice(0, 6).map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{s.full_name ?? "—"}</span>
                <span className="text-xs text-muted-foreground">{s.class_year ?? "—"}{s.class_letter ?? ""}</span>
                <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-bold text-warning-foreground">{pct(s)}%</span>
              </li>
            ))}
            {lowProgress.length === 0 && <li className="py-4 text-center text-sm text-muted-foreground">Visi mokiniai laikosi tempą.</li>}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 font-bold"><Flame className="h-4 w-4 text-primary" /> Streak lyderiai</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {streakTop.map((s, i) => (
            <li key={s.id} className="rounded-xl bg-muted/60 p-3 text-center">
              <p className="text-xs font-bold text-muted-foreground">#{i + 1}</p>
              <p className="mt-1 truncate text-sm font-semibold">{s.full_name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{s.login_streak ?? 0} d. iš eilės</p>
            </li>
          ))}
          {streakTop.length === 0 && <li className="py-4 text-sm text-muted-foreground">Mokinių dar nėra.</li>}
        </ul>
      </section>
    </div>
  );
}
