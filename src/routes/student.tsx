import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PageShell } from "../components/layout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Target, CalendarCheck, Building2, TrendingUp, MessageSquare, CheckCircle2, AlarmClock, XCircle, PlayCircle, Sparkles, School } from "lucide-react";
import { ChatDialog, type ChatReservation } from "@/components/chat-dialog";
import { CustomReservationDialog } from "@/components/custom-reservation-dialog";

export const Route = createFileRoute("/student")({
  head: () => ({
    meta: [
      { title: "Mokinio sritis — Socialinės Valandos" },
      { name: "description", content: "Stebėk sukauptas valandas, suplanuotus vizitus ir savanorystės progresą." },
    ],
  }),
  component: StudentDashboard,
});

type Reservation = {
  id: string;
  student_id: string;
  organization_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  hours_to_earn: number;
  status: "pending" | "approved" | "confirmed" | "completed" | "declined";
};

type OrgLite = { id: string; organization_name: string | null; full_name: string | null };
type SchoolRow = { id: string; name: string; city: string | null };

const CLASS_YEARS = ["5", "6", "7", "8", "9 / I gimn.", "10 / II gimn.", "11 / III gimn.", "12 / IV gimn."];

function StudentDashboard() {
  const { user, profile, loading } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [orgMap, setOrgMap] = useState<Record<string, OrgLite>>({});
  const [chatRes, setChatRes] = useState<ChatReservation | null>(null);
  const [customOpen, setCustomOpen] = useState(false);

  const loadReservations = async (uid: string) => {
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .eq("student_id", uid)
      .order("reservation_date", { ascending: false });
    const rs = (data as Reservation[]) ?? [];
    setReservations(rs);
    const ids = Array.from(new Set(rs.map((r) => r.organization_id)));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, organization_name, full_name").in("id", ids);
      const m: Record<string, OrgLite> = {};
      (ps as OrgLite[] | null)?.forEach((p) => (m[p.id] = p));
      setOrgMap(m);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadReservations(user.id);
  }, [user]);

  const orgName = (id: string) => orgMap[id]?.organization_name ?? orgMap[id]?.full_name ?? "Organizacija";
  const orgInitial = (id: string) => (orgName(id) || "?").trim().charAt(0).toUpperCase();

  if (loading) return <PageShell><div className="p-20 text-center text-muted-foreground">Kraunama…</div></PageShell>;
  if (!user || !profile) {
    return (
      <PageShell>
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <h1 className="text-2xl font-bold">Prisijunk, kad pamatytum savo progresą</h1>
          <Link to="/login" className="mt-6 inline-flex rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">Prisijungti</Link>
        </div>
      </PageShell>
    );
  }

  if (profile.role === "student" && (!profile.school_id || !profile.class_year || !profile.hours_needed)) {
    return <StudentProfileSetup userId={user.id} />;
  }

  const completed = Number(profile.hours_earned ?? 0);
  const required = Number(profile.hours_needed ?? 0);
  const progress = required ? Math.min(100, Math.round((completed / required) * 100)) : 0;
  const remaining = Math.max(0, required - completed);
  const upcoming = reservations.filter((r) => r.status !== "declined");

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Mokinio sritis</p>
            <h1 className="mt-1 truncate text-3xl font-bold tracking-tight sm:text-4xl">Sveika, {profile.full_name ?? "moksleivi"} 👋</h1>
            <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              onClick={() => setCustomOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:border-primary/40 hover:shadow-md"
            >
              <Sparkles className="h-4 w-4 text-primary" /> Pasiūlyk rezervaciją
            </button>
            <Link to="/tasks" className="rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">+ Naršyti užduotis</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Clock, label: "Užbaigtos valandos", value: `${completed}`, sub: `iš ${required} reikalingų` },
            { icon: Target, label: "Liko valandų", value: `${remaining}`, sub: `${progress}% iki tikslo` },
            { icon: CalendarCheck, label: "Aktyvios rezervacijos", value: upcoming.length, sub: "" },
            { icon: Building2, label: "Skirtingų organizacijų", value: new Set(reservations.map((r) => r.organization_id)).size, sub: "" },
          ].map((s) => (
            <div key={s.label} className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
              <div className="flex items-center justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
                  <s.icon className="h-5 w-5" />
                </div>
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
              <p className="mt-5 font-display text-3xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              {s.sub && <p className="text-xs text-muted-foreground/80">{s.sub}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
        <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Progresas iki tikslo</h2>
              <p className="text-xs text-muted-foreground">{completed} iš {required} val.</p>
            </div>
            <span className="font-display text-2xl font-bold">{progress}%</span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-accent">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8 }} className="h-full bg-gradient-primary" />
          </div>
        </div>
      </section>

      <OpenTasksFeed />

      <section className="mx-auto mt-6 max-w-7xl px-4 pb-16 sm:px-6">
        <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
          <h2 className="text-lg font-bold">Mano rezervacijos</h2>
          <p className="text-xs text-muted-foreground">Bendrauk su organizacija ar mokyklos administratoriumi saugiame 3-šalių pokalbyje.</p>
          <div className="mt-5 space-y-3">
            {reservations.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Dar nėra rezervacijų. <Link to="/tasks" className="font-semibold text-primary hover:underline">Pasirink organizaciją</Link>
              </div>
            )}
            {reservations.map((r) => {
              const isDone = r.status === "completed" || r.status === "confirmed";
              const isApproved = r.status === "approved";
              const tone = isDone ? "bg-success/15 text-success" : r.status === "declined" ? "bg-destructive/15 text-destructive" : isApproved ? "bg-primary/15 text-primary" : "bg-warning/15 text-warning-foreground";
              const Icon = isDone ? CheckCircle2 : r.status === "declined" ? XCircle : isApproved ? PlayCircle : AlarmClock;
              const label = isDone ? "Užbaigta" : r.status === "declined" ? "Atmesta" : isApproved ? "Vykdoma" : "Laukia patvirtinimo";
              return (
                <div key={r.id} className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-4 ${isApproved ? "border-primary/40 bg-primary/5" : "border-border bg-background/60"}`}>
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-primary text-sm font-bold text-primary-foreground shadow-glow">{orgInitial(r.organization_id)}</div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{orgName(r.organization_id)}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.reservation_date} · {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)} · {Number(r.hours_to_earn)} val.</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
                      <Icon className="h-3 w-3" /> {label}
                    </span>
                    <button
                      onClick={() => setChatRes({ id: r.id, student_id: r.student_id, organization_id: r.organization_id, organization_name: orgName(r.organization_id) })}
                      className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition hover:opacity-90"
                    >
                      <MessageSquare className="h-3 w-3" /> Pokalbis
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <ChatDialog reservation={chatRes} onClose={() => setChatRes(null)} />
      <CustomReservationDialog
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        onCreated={() => loadReservations(user.id)}
      />
    </PageShell>
  );
}

function StudentProfileSetup({ userId }: { userId: string }) {
  const { user, profile } = useAuth();
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [fullName, setFullName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [signupCode, setSignupCode] = useState("");
  const [classYear, setClassYear] = useState("");
  const [hoursNeeded, setHoursNeeded] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("schools").select("id, name, city").eq("is_active", true).order("name")
      .then(({ data }) => {
        const rows = (data as SchoolRow[]) ?? [];
        setSchools(rows);
        if (rows[0]?.id) setSchoolId(rows[0].id);
      });
  }, []);

  // Prefill full name from Google (or existing profile)
  useEffect(() => {
    if (fullName) return;
    const fromMeta = (user?.user_metadata as any)?.full_name
      ?? (user?.user_metadata as any)?.name
      ?? profile?.full_name
      ?? "";
    if (fromMeta) setFullName(fromMeta);
  }, [user, profile, fullName]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !classYear || !fullName.trim() || !signupCode.trim()) return;
    setBusy(true);
    setError(null);

    // Verify signup code matches the selected school
    const { data: school, error: schoolErr } = await supabase
      .from("schools")
      .select("id, signup_code")
      .eq("id", schoolId)
      .maybeSingle();
    if (schoolErr || !school) {
      setBusy(false);
      setError("Nepavyko patikrinti mokyklos.");
      return;
    }
    if ((school as any).signup_code?.toUpperCase() !== signupCode.trim().toUpperCase()) {
      setBusy(false);
      setError("Neteisingas mokyklos kodas. Gauk jį iš savo mokyklos administratoriaus.");
      return;
    }

    const { error: updErr } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        school_id: schoolId,
        class_year: classYear,
        hours_needed: hoursNeeded,
        role: "student",
      })
      .eq("id", userId);
    setBusy(false);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    window.location.reload();
  };

  return (
    <PageShell>
      <section className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-border bg-gradient-card p-7 shadow-elegant backdrop-blur-xl">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
            <School className="h-5 w-5" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">Užbaik mokinio profilį</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Patikrink savo vardą, pasirink mokyklą ir įvesk mokyklos kodą, kurį gavai iš mokyklos administratoriaus.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Vardas ir pavardė</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Vardenis Pavardenis"
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Mokykla</span>
              <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} required className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary">
                {schools.length === 0 && <option value="">Kraunama…</option>}
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}{s.city ? ` (${s.city})` : ""}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Mokyklos kodas</span>
              <input
                type="text"
                value={signupCode}
                onChange={(e) => setSignupCode(e.target.value.toUpperCase())}
                required
                placeholder="pvz. A1B2C3D4"
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-mono tracking-wider outline-none focus:border-primary"
              />
              <span className="mt-1 block text-[11px] text-muted-foreground">
                Kodą gauni iš savo mokyklos administratoriaus. Be jo negalėsi registruotis kaip mokinys.
              </span>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Klasė</span>
              <select value={classYear} onChange={(e) => setClassYear(e.target.value)} required className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary">
                <option value="">Pasirink…</option>
                {CLASS_YEARS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Valandų tikslas</span>
              <input type="number" min={1} max={500} value={hoursNeeded} onChange={(e) => setHoursNeeded(Math.max(1, Number(e.target.value)))} className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
            </label>
            {error && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}
            <button disabled={busy} className="w-full rounded-full bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
              {busy ? "Saugoma…" : "Išsaugoti ir tęsti"}
            </button>
          </form>
        </div>
      </section>
    </PageShell>
  );
}

function OpenTasksFeed() {
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; task_date: string; available_hours: number; location: string; organization_id: string }>>([]);
  const [orgs, setOrgs] = useState<Record<string, { organization_name: string | null; full_name: string | null }>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tasks")
        .select("id, title, task_date, available_hours, location, organization_id")
        .eq("is_open", true)
        .order("task_date", { ascending: true })
        .limit(4);
      const list = (data as any[]) ?? [];
      setTasks(list);
      const ids = Array.from(new Set(list.map((t) => t.organization_id)));
      if (ids.length) {
        const { data: ps } = await supabase.from("profiles").select("id, organization_name, full_name").in("id", ids);
        const map: Record<string, any> = {};
        (ps ?? []).forEach((p: any) => (map[p.id] = p));
        setOrgs(map);
      }
    })();
  }, []);

  if (tasks.length === 0) return null;
  return (
    <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
      <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Naujausios atviros užduotys</h2>
            <p className="text-xs text-muted-foreground">Realios užduotys, paskelbtos organizacijų.</p>
          </div>
          <Link to="/tasks" className="text-xs font-semibold text-primary hover:underline">Visos →</Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {tasks.map((t) => {
            const orgLabel = orgs[t.organization_id]?.organization_name ?? orgs[t.organization_id]?.full_name ?? "Organizacija";
            return (
              <Link key={t.id} to="/tasks" className="group rounded-2xl border border-border bg-background/60 p-4 transition hover:border-primary/40 hover:shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold group-hover:text-primary">{t.title}</p>
                  <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">{Number(t.available_hours)} val.</span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">{orgLabel} · {t.task_date}{t.location ? ` · ${t.location}` : ""}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
