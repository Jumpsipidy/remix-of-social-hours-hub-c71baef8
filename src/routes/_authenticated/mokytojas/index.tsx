import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, ArrowUpRight, CalendarCheck, CalendarPlus, ChevronRight, Clock,
  Flame, Megaphone, MessageCircle, TrendingUp, Users,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSchoolData } from "@/components/teacher/use-school-data";
import { useAuth } from "@/hooks/use-auth";
import { reservationTimeLabel } from "@/lib/reservation-time";
import { classBreakdown, greetingForHour, hoursByClass, hoursByMonth, monthTrend } from "@/lib/teacher-stats";

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

function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "M") + (parts[1]?.[0] ?? "");
}

const tooltipStyle = {
  background: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  fontSize: 12,
} as const;

function TeacherOverview() {
  const { profile } = useAuth();
  const { data, loading } = useSchoolData();
  const students = data?.students ?? [];
  const reservations = data?.reservations ?? [];
  const schoolRes = reservations.filter((r) => r.source === "school");

  const avgPct = students.length ? Math.round(students.reduce((a, s) => a + pct(s), 0) / students.length) : 0;
  const totalHours = students.reduce((a, s) => a + s.hours_earned, 0);
  const upcoming = schoolRes.filter((r) => r.status === "approved");
  const pendingReview = schoolRes.filter((r) => r.status === "pending");
  const lowProgress = students.filter((s) => pct(s) < 35);
  const streakTop = [...students].sort((a, b) => (b.login_streak ?? 0) - (a.login_streak ?? 0)).slice(0, 5);
  const upcomingList = upcoming
    .slice()
    .sort((a, b) => a.reservation_date.localeCompare(b.reservation_date))
    .slice(0, 6);
  const studentName = (id: string) => students.find((s) => s.id === id)?.full_name ?? "Mokinys";

  const monthly = hoursByMonth(schoolRes, 12);
  const trend = monthTrend(monthly);
  const byClass = hoursByClass(students);
  const classes = classBreakdown(students);
  const firstName = (profile?.full_name ?? "").trim().split(/\s+/)[0] || "auklėtoja";
  const greeting = greetingForHour(Number(new Date().toLocaleString("lt-LT", { hour: "numeric", hour12: false, timeZone: "Europe/Vilnius" })));
  const today = new Date().toLocaleDateString("lt-LT", { weekday: "long", month: "long", day: "numeric", timeZone: "Europe/Vilnius" });

  if (loading && !data) {
    return <div className="grid min-h-[40dvh] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  const kpis = [
    { icon: Users, label: "Mokiniai", value: students.length, sub: `${classes.length} klasės`, sub2: lowProgress.length ? `${lowProgress.length} atsilieka` : "visi laikosi" },
    { icon: TrendingUp, label: "Vidutinis progresas", value: `${avgPct}%`, sub: "privalomų valandų", sub2: `${totalHours} val. iš viso` },
    { icon: Clock, label: "Surinkta valandų", value: totalHours, sub: "visų mokinių", sub2: trend === null ? "—" : `${trend > 0 ? "+" : ""}${trend}% šį mėn.` },
    { icon: CalendarCheck, label: "Artėjančios", value: upcoming.length, sub: pendingReview.length ? `${pendingReview.length} laukia peržiūros` : "mokyklos rezervacijos", sub2: `${schoolRes.length} iš viso` },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Antraštė su pasisveikinimu */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Apžvalga</h1>
          <p className="text-sm text-muted-foreground">
            {greeting}, {firstName}! Šiandien {today}.
          </p>
        </div>
        <p className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
          {data?.scope.class_restricted
            ? `Klasės: ${data.scope.assigned_classes.join(", ") || "visos"}${data.scope.assigned_letter ? ` · ${data.scope.assigned_letter}` : ""}`
            : "Visos mokyklos klasės"}
        </p>
      </div>

      {/* Greitieji veiksmai */}
      <div className="flex flex-wrap gap-2">
        <Link to="/mokytojas/rezervacijos" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
          <CalendarPlus className="h-4 w-4" /> Nauja rezervacija
        </Link>
        <Link to="/mokytojas/rezervacijos" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition hover:bg-muted">
          <Megaphone className="h-4 w-4" /> Veikla visiems
        </Link>
        <Link to="/mokytojas/pokalbiai" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition hover:bg-muted">
          <MessageCircle className="h-4 w-4" /> Rašyti organizacijai
        </Link>
      </div>

      {/* KPI kortelės */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((m) => (
          <div key={m.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/12 text-primary">
                <m.icon className="h-4.5 w-4.5" />
              </span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground/50" />
            </div>
            <p className="mt-3 text-2xl font-bold tabular-nums">{m.value}</p>
            <p className="text-sm font-semibold">{m.label}</p>
            <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
              <span>{m.sub}</span>
              <span className="font-semibold text-foreground/70">{m.sub2}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Grafikai */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">Valandų dinamika</h2>
              <p className="text-xs text-muted-foreground">Užbaigtos mokyklos rezervacijų valandos per 12 mėn.</p>
            </div>
            <span className="rounded-full bg-primary/12 px-3 py-1 text-xs font-bold text-primary">
              {monthly.reduce((a, p) => a + p.hrs, 0)} val.
            </span>
          </div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="tch-hrs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="hrs" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#tch-hrs)" name="Valandos" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold">Valandos pagal klases</h2>
          <p className="text-xs text-muted-foreground">Surinkta kiekvienos klasės.</p>
          {byClass.length > 0 ? (
            <div className="mt-4 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byClass} margin={{ top: 8, right: 8, left: -26, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
                  <Bar dataKey="hrs" name="Valandos" radius={[6, 6, 0, 0]}>
                    {byClass.map((c, i) => (
                      <Cell key={c.name} fill="hsl(var(--primary))" opacity={0.45 + (0.55 * (i + 1)) / byClass.length} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">Kol kas nėra duomenų.</p>
          )}
        </section>
      </div>

      {/* Sąrašai */}
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
              <li key={r.id}>
                <Link to="/mokytojas/rezervacijos" className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5 text-sm transition hover:bg-muted">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                    {initials(studentName(r.student_id))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{studentName(r.student_id)}</span>
                    <span className="block text-xs text-muted-foreground tabular-nums">
                      {r.reservation_date} · {reservationTimeLabel(r.start_time, r.end_time)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-bold tabular-nums">{r.hours_to_earn} val.</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                </Link>
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
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-warning/15 text-[11px] font-bold text-warning-foreground">
                  {initials(s.full_name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.full_name ?? "—"}</span>
                  <span className="block text-xs text-muted-foreground">{s.class_year ?? "—"}{s.class_letter ?? ""} klasė</span>
                </span>
                <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-bold text-warning-foreground">{pct(s)}%</span>
              </li>
            ))}
            {lowProgress.length === 0 && <li className="py-4 text-center text-sm text-muted-foreground">Visi mokiniai laikosi tempą.</li>}
          </ul>
        </section>
      </div>

      {/* Klasių progresas */}
      {classes.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-bold"><Users className="h-4 w-4 text-primary" /> Klasių progresas</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((g) => (
              <li key={g.key} className="rounded-xl bg-muted/60 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{g.key} klasė</span>
                  <span className="text-xs text-muted-foreground">{g.count} mok. · {g.avg}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${g.avg}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Streak lyderiai */}
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
