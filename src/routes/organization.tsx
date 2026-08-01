import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageShell } from "../components/layout";
import { StatTile, DASH_EMBER, DASH_GOLD, DASH_GREEN } from "@/components/dashboard-kit";
import { useAuth } from "@/hooks/use-auth";
import { listOrgStudents } from "@/lib/org-students.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  Clock, Users, Check, X, Inbox, MessageSquare, AlarmClock, XCircle,
  PlayCircle, ShieldCheck, ListTodo, Trash2, Sparkles, CalendarDays, CheckCircle2,
  BarChart3, Target, Repeat, Percent, ScanLine, ImageIcon, Eye, MapPin, UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { ChatDialog, type ChatReservation } from "@/components/chat-dialog";
import { CreateTaskPanel } from "@/components/create-task-panel";
import { VerifyCloseDialog } from "@/components/verify-close-dialog";
import { OrgProfileEditor } from "@/components/org-profile-editor";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { sendHoursConfirmedEmail, sendReservationApprovedEmail, sendReservationDeclinedEmail } from "@/lib/email.functions";

export const Route = createFileRoute("/organization")({
  head: () => ({
    meta: [
      { title: "Organizacijos sritis — Socialinės Valandos" },
      { name: "description", content: "Tvarkyk savanorystės užklausas ir stebėk savo organizacijos statistiką." },
      { property: "og:title", content: "Organizacijos sritis — Socialinės Valandos" },
      { property: "og:description", content: "Organizacijos savanorystės užklausų, QR tikrinimo ir statistikos valdymas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OrgDashboard,
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
  created_at?: string;
  tags?: string[] | null;
  checked_in_at?: string | null;

};

type StudentLite = { id: string; full_name: string | null; email: string | null; hours_earned: number };
type TaskRow = { id: string; title: string; task_date: string; available_hours: number; location: string | null; is_open: boolean; created_at: string };

async function ensureRoomAndNotify(reservation: Reservation, content: string, senderId: string) {
  const { data: existing } = await supabase.from("chat_rooms").select("id").eq("reservation_id", reservation.id).maybeSingle();
  let roomId = existing?.id;
  if (!roomId) {
    const { data: created, error } = await supabase.from("chat_rooms").insert({
      reservation_id: reservation.id, student_id: reservation.student_id, organization_id: reservation.organization_id,
    }).select("id").maybeSingle();
    if (error || !created) return;
    roomId = created.id;
  }
  await supabase.from("messages").insert({ chat_room_id: roomId, sender_id: senderId, content });
}

const STATUS_COLORS: Record<string, string> = {
  pending: "hsl(45 100% 60%)",
  approved: "hsl(var(--primary))",
  completed: "hsl(140 60% 45%)",
  declined: "hsl(0 70% 55%)",
};

function OrgDashboard() {
  const { user, profile, loading } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [students, setStudents] = useState<Record<string, StudentLite>>({});
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [chatRes, setChatRes] = useState<ChatReservation | null>(null);
  const [verifyRes, setVerifyRes] = useState<Reservation | null>(null);
  const [view, setView] = useState<"dashboard" | "profile">("dashboard");
  const [dataLoading, setDataLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async (uid: string) => {
    try {
      const [{ data: rData, error: rErr }, { data: tData, error: tErr }] = await Promise.all([
        supabase.from("reservations").select("*").eq("organization_id", uid).order("created_at", { ascending: false }),
        supabase.from("tasks").select("id, title, task_date, available_hours, location, is_open, created_at").eq("organization_id", uid).order("created_at", { ascending: false }),
      ]);
      if (rErr) throw rErr;
      if (tErr) throw tErr;
      const rs = (rData as Reservation[]) ?? [];
      setReservations(rs);
      setTasks((tData as TaskRow[]) ?? []);
      const ids = Array.from(new Set(rs.map((r) => r.student_id).filter((v): v is string => !!v)));
      if (ids.length) {
        const map: Record<string, StudentLite> = {};
        const { data: ps } = await supabase.from("profiles").select("id, full_name, email, hours_earned").in("id", ids);
        (ps as StudentLite[] | null)?.forEach((p) => (map[p.id] = p));
        // RLS often hides student profiles from organizations -> names fall back
        // to "Mokinys". Fill the gaps through a scoped server function.
        if (ids.some((id) => !map[id]?.full_name)) {
          try {
            const rows = await listOrgStudents();
            rows.forEach((r) => {
              if (!map[r.id]?.full_name) map[r.id] = { id: r.id, full_name: r.full_name, email: r.email, hours_earned: Number(r.hours_earned ?? 0) };
            });
          } catch { /* keep whatever RLS allowed */ }
        }
        setStudents(map);
      } else {
        setStudents({});
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko įkelti duomenų");
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { if (user) refresh(user.id); }, [user, refresh]);

  // Realaus laiko atnaujinimas — naujos užklausos matomos iškart
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`org-dash-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations", filter: `organization_id=eq.${user.id}` }, () => refresh(user.id))
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `organization_id=eq.${user.id}` }, () => refresh(user.id))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user, refresh]);

  const toggleTask = async (t: TaskRow) => {
    if (busyId) return;
    setBusyId(t.id);
    const { error } = await supabase.from("tasks").update({ is_open: !t.is_open }).eq("id", t.id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success(t.is_open ? "Užduotis paslėpta" : "Užduotis vėl atvira");
    if (user) refresh(user.id);
  };
  const deleteTask = async (t: TaskRow) => {
    if (busyId) return;
    if (!confirm(`Ištrinti užduotį „${t.title}"?`)) return;
    setBusyId(t.id);
    const { error } = await supabase.from("tasks").delete().eq("id", t.id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success("Užduotis ištrinta");
    if (user) refresh(user.id);
  };

  // -------------- ANALYTICS ---------------
  const { pending, approved, completed, declined } = useMemo(() => ({
    pending: reservations.filter((r) => r.status === "pending"),
    approved: reservations.filter((r) => r.status === "approved"),
    completed: reservations.filter((r) => r.status === "completed" || r.status === "confirmed"),
    declined: reservations.filter((r) => r.status === "declined"),
  }), [reservations]);

  const hoursDelivered = useMemo(
    () => Math.round(completed.reduce((a, r) => a + (Number(r.hours_to_earn) || 0), 0) * 10) / 10,
    [completed],
  );
  // Tikslu: savanoriai, kurie realiai atliko darbą (ne atmestos užklausos)
  const uniqueStudents = useMemo(
    () => new Set(completed.map((r) => r.student_id).filter(Boolean)).size,
    [completed],
  );
  const engagedStudents = useMemo(
    () => new Set(reservations.map((r) => r.student_id).filter(Boolean)).size,
    [reservations],
  );
  const returningStudents = useMemo(() => {
    const byS: Record<string, number> = {};
    completed.forEach((r) => (byS[r.student_id] = (byS[r.student_id] ?? 0) + 1));
    return Object.values(byS).filter((n) => n >= 2).length;
  }, [completed]);
  const totalHandled = completed.length + declined.length;
  const acceptanceRate = totalHandled ? Math.round((completed.length / totalHandled) * 100) : 0;
  const avgHours = completed.length ? hoursDelivered / completed.length : 0;

  const chartData = useMemo(() => {
    const days: { label: string; hrs: number; count: number; iso: string }[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({ iso, label: `${d.getDate()}.${d.getMonth() + 1}`, hrs: 0, count: 0 });
    }
    const idx: Record<string, number> = Object.fromEntries(days.map((d, i) => [d.iso, i]));
    completed.forEach((r) => {
      const i = idx[String(r.reservation_date).slice(0, 10)];
      if (i !== undefined) { days[i].hrs += Number(r.hours_to_earn) || 0; days[i].count += 1; }
    });
    return days.map((d) => ({ ...d, hrs: Math.round(d.hrs * 10) / 10 }));
  }, [completed]);

  const pieData = useMemo(() => [
    { name: "Užbaigtos", value: completed.length, color: STATUS_COLORS.completed },
    { name: "Vykdomos", value: approved.length, color: STATUS_COLORS.approved },
    { name: "Laukia", value: pending.length, color: STATUS_COLORS.pending },
    { name: "Atmesta", value: declined.length, color: STATUS_COLORS.declined },
  ].filter((s) => s.value > 0), [completed, approved, pending, declined]);

  // Busiest weekday
  const { weekdayCounts, maxWD, busiestIdx, hasWeekdayData } = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    completed.forEach((r) => {
      const d = new Date(`${String(r.reservation_date).slice(0, 10)}T00:00:00`);
      if (Number.isNaN(d.getTime())) return;
      counts[(d.getDay() + 6) % 7] += 1;
    });
    const max = Math.max(...counts);
    return { weekdayCounts: counts, maxWD: Math.max(max, 1), busiestIdx: counts.indexOf(max), hasWeekdayData: max > 0 };
  }, [completed]);
  const weekdays = ["Pr", "An", "Tr", "Kt", "Pn", "Št", "Sk"];


  if (loading) return <PageShell><div className="p-20 text-center text-muted-foreground">Kraunama…</div></PageShell>;
  if (!user || profile?.role !== "organization") {
    return (
      <PageShell>
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <h1 className="text-2xl font-bold">Reikalingos organizacijos teisės</h1>
          <Link to="/login" className="mt-6 inline-flex rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">Prisijungti</Link>
        </div>
      </PageShell>
    );
  }

  const orgLabel = profile.organization_name ?? profile.full_name ?? "Organizacija";
  const openTasks = tasks.filter((t) => t.is_open).length;
  const todayIso = new Date().toISOString().slice(0, 10);
  const approvedSorted = [...approved].sort((a, b) =>
    `${a.reservation_date} ${a.start_time}`.localeCompare(`${b.reservation_date} ${b.start_time}`),
  );
  // Kitas darbas = artimiausias dar neįvykęs; jei visi praėję — rodom naujausią
  const nextApproved = approvedSorted.find((r) => String(r.reservation_date).slice(0, 10) >= todayIso) ?? approvedSorted[0];
  const overdue = approvedSorted.filter((r) => String(r.reservation_date).slice(0, 10) < todayIso);
  const orgMedia = profile as typeof profile & { logo_url?: string | null; cover_url?: string | null; address?: string | null; bio?: string | null };
  const profileChecks = [profile.organization_name, profile.email, orgMedia.logo_url, orgMedia.cover_url, orgMedia.bio, orgMedia.address];
  const profileStrength = profileChecks.filter(Boolean).length;
  const profilePct = Math.round((profileStrength / profileChecks.length) * 100);
  const liveWorkload = pending.length + approved.length;

  const approveInitial = async (r: Reservation) => {
    if (busyId) return;
    setBusyId(r.id);
    const { data, error } = await supabase
      .from("reservations").update({ status: "approved" }).eq("id", r.id).eq("status", "pending").select("id");
    if (error) { setBusyId(null); toast.error(error.message); return; }
    if (!data?.length) { setBusyId(null); toast.info("Ši užklausa jau apdorota"); refresh(user.id); return; }
    await ensureRoomAndNotify(r, `🤖 Sistema: ${orgLabel} PATVIRTINO užklausą. Statusas: ON WORK / IN PROGRESS. Valandos bus įskaitytos tik po galutinio uždarymo.`, user.id);
    sendReservationApprovedEmail({ data: { reservationId: r.id } })
      .catch((e) => console.warn("[email] reservation-approved failed", e));
    toast.success("Užklausa patvirtinta — mokinys pradeda darbą");
    setBusyId(null);
    refresh(user.id);
  };

  const decline = async (r: Reservation) => {
    if (busyId) return;
    setBusyId(r.id);
    const { data, error } = await supabase
      .from("reservations").update({ status: "declined" }).eq("id", r.id).eq("status", "pending").select("id");
    if (error) { setBusyId(null); toast.error(error.message); return; }
    if (!data?.length) { setBusyId(null); toast.info("Ši užklausa jau apdorota"); refresh(user.id); return; }
    await ensureRoomAndNotify(r, `🤖 Sistema: ${orgLabel} ATMETĖ šią rezervaciją.`, user.id);
    sendReservationDeclinedEmail({ data: { reservationId: r.id } })
      .catch((e) => console.warn("[email] reservation-declined failed", e));
    toast.success("Atmesta — žinutė nusiųsta į pokalbį");
    setBusyId(null);
    refresh(user.id);
  };

  const finalizeCompleted = async (r: Reservation) => {
    if (busyId) return;
    if (!r.checked_in_at) {
      toast.error("Mokinys dar neįsiregistravo — nuskaityk jo QR arba 6 skaitmenų kodą");
      setVerifyRes(null);
      return;
    }
    setBusyId(r.id);

    const { error } = await supabase.rpc("award_reservation_hours", { _reservation_id: r.id });
    if (error) { setBusyId(null); toast.error(error.message); return; }
    await ensureRoomAndNotify(r, `🤖 Sistema: ${orgLabel} teisiškai patvirtino darbo užbaigimą. ${Number(r.hours_to_earn)} val. įskaityta į mokinio profilį ir išsiųsta mokyklos taryboms.`, user.id);
    // Fire-and-forget email — never block the UI on Resend
    sendHoursConfirmedEmail({ data: { reservationId: r.id } })
      .catch((e) => console.warn("[email] hours-confirmed failed", e));
    toast.success(`Užduotis uždaryta · ${Number(r.hours_to_earn)} val. įskaityta`);
    setVerifyRes(null);
    setBusyId(null);
    refresh(user.id);
  };


  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-card shadow-xl">
          {orgMedia.cover_url && (
            <img
              src={orgMedia.cover_url}
              alt="Organizacijos viršelio nuotrauka"
              className="absolute inset-0 h-full w-full object-cover opacity-30"
            />
          )}
          <div className="absolute inset-0 bg-[radial-gradient(900px_360px_at_12%_0%,hsl(var(--primary)/0.24),transparent_60%),linear-gradient(90deg,hsl(var(--background)/0.96),hsl(var(--background)/0.78),hsl(var(--background)/0.92))]" aria-hidden />
          <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                <ShieldCheck className="h-3.5 w-3.5" /> Organizacijos sritis
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-gradient-primary text-xl font-black text-primary-foreground shadow-glow sm:h-20 sm:w-20">
                  {orgMedia.logo_url ? <img src={orgMedia.logo_url} alt="Organizacijos logotipas" className="h-full w-full object-cover" /> : orgLabel.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h1 className="truncate font-display text-3xl font-black tracking-tight sm:text-5xl">{orgLabel}</h1>
                  <p className="mt-1 max-w-2xl truncate text-sm text-muted-foreground">
                    {profile.email} · {openTasks} aktyvios užduotys · {hoursDelivered} val. suteikta
                  </p>
                </div>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {pending.length ? `${pending.length} naujos užklausos laukia sprendimo.` : "Naujos užklausos apdorotos."} {approved.length ? ` ${approved.length} darbai šiuo metu vykdomi.` : ""}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild size="sm" className="rounded-full shadow-glow">
                  <Link to="/organization/scan">
                    <ScanLine className="mr-1.5 h-4 w-4" /> Skenuoti QR
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <Link to="/org/$id" params={{ id: user.id }} target="_blank">
                    <Eye className="mr-1.5 h-4 w-4" /> Viešas profilis
                  </Link>
                </Button>
                <Button size="sm" variant="secondary" className="rounded-full" onClick={() => setView("profile")}>
                  <ImageIcon className="mr-1.5 h-4 w-4" /> Logo / baneris
                </Button>
                <span className="inline-flex items-center rounded-full bg-success/15 px-3 py-1.5 text-xs font-semibold text-success">● Online</span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <HeroMetric label="Darbo eilė" value={liveWorkload} sub={liveWorkload ? `${pending.length} laukia · ${approved.length} vyksta` : "nėra aktyvių darbų"} />
              <HeroMetric label="Profilio kokybė" value={`${profilePct}%`} sub={profilePct >= 85 ? "paruoštas mokiniams" : "papildyk logo, banerį ir aprašymą"} />
              <HeroMetric
                label="Kitas darbas"
                value={nextApproved ? String(nextApproved.reservation_date).slice(0, 10) : "—"}
                sub={nextApproved ? `${String(nextApproved.start_time).slice(0, 5)} · ${Number(nextApproved.hours_to_earn)} val.` : "nėra vykdomų"}
              />
            </div>
          </div>
          <div className="relative border-t border-border/70 bg-background/45 px-5 py-3 backdrop-blur sm:px-7">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5 text-success" /> {uniqueStudents} savanoriai atliko darbą</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> {orgMedia.address ?? "vieta dar nepridėta"}</span>

              <span className="h-1 w-1 rounded-full bg-border" />
              <span className="min-w-[140px] flex-1">Profilis</span>
              <span className="font-semibold text-foreground">{profileStrength}/{profileChecks.length}</span>
              <span className="h-2 w-28 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-gradient-primary" style={{ width: `${profilePct}%` }} />
              </span>
            </div>
          </div>
        </div>

        {/* View switcher */}
        <div className="mt-6 inline-flex rounded-full border border-border bg-card/80 p-1 shadow-sm backdrop-blur">
          <button
            onClick={() => setView("dashboard")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${view === "dashboard" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}
          >
            📊 Ataskaita
          </button>
          <button
            onClick={() => setView("profile")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${view === "profile" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}
          >
            🏢 Mano profilis
          </button>
        </div>
      </section>

      {view === "profile" && (
        <section className="mx-auto mt-8 max-w-5xl px-4 pb-16 sm:px-6">
          <OrgProfileEditor userId={user.id} />
        </section>
      )}

      {view === "dashboard" && <>


      {/* Primary stats */}
      <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6">
        {overdue.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
            <AlarmClock className="h-4 w-4 text-warning-foreground" />
            <span className="font-semibold">{overdue.length} vykdomos užduotys jau praėjo pagal datą</span>
            <span className="text-muted-foreground">— uždaryk jas, kad mokiniams būtų įskaitytos valandos.</span>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Inbox, label: "Laukia patvirtinimo", value: pending.length, sub: pending.length ? "Reikia dėmesio" : "Viskas apdorota", accent: DASH_GOLD },
            { icon: PlayCircle, label: "Vykdomos", value: approved.length, sub: overdue.length ? `${overdue.length} vėluoja` : "Vyksta dabar", accent: DASH_EMBER },
            { icon: Clock, label: "Suteikta valandų", value: hoursDelivered, sub: `${completed.length} užbaigti vizitai`, accent: DASH_GREEN },
            { icon: Users, label: "Skirtingų savanorių", value: uniqueStudents, sub: `${returningStudents} grįžtančių · ${engagedStudents} kreipėsi`, accent: DASH_GREEN },
          ].map((s, i) => (
            <StatTile key={s.label} icon={s.icon} label={s.label} value={s.value} sub={s.sub} accent={s.accent} loading={dataLoading} delay={i * 0.06} />
          ))}
        </div>
      </section>


      {/* Analytics */}
      <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Valandų srautas (30 d.)</h2>
                <p className="text-xs text-muted-foreground">Užbaigtos savanorystės valandos pagal dieną.</p>
              </div>
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                {chartData.reduce((a, d) => a + d.hrs, 0)} val. per 30 d.
              </span>
            </div>
            <div className="mt-4 h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ohrs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                  <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="hrs" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#ohrs)" name="Valandos" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
            <h2 className="text-lg font-bold">Rezervacijų būsenos</h2>
            <p className="text-xs text-muted-foreground">Visos gautos užklausos.</p>
            {pieData.length > 0 ? (
              <div className="mt-2 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" innerRadius={38} outerRadius={70} paddingAngle={3} stroke="none">
                      {pieData.map((e) => <Cell key={e.name} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">Nėra duomenų</div>
            )}
          </div>
        </div>

        {/* KPI row */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPI icon={Percent} label="Priėmimo lygis" value={`${acceptanceRate}%`} sub={`${completed.length} / ${totalHandled} apdorotos`} />
          <KPI icon={Target} label="Vid. valandos / vizitui" value={avgHours.toFixed(1)} sub={`iš ${completed.length} vizitų`} />
          <KPI icon={Repeat} label="Grįžtantys savanoriai" value={returningStudents} sub={`iš ${uniqueStudents} visų`} />
          <KPI icon={CalendarDays} label="Aktyviausia diena" value={hasWeekdayData ? weekdays[busiestIdx] : "—"} sub={hasWeekdayData ? `${weekdayCounts[busiestIdx]} vizitai` : "dar nėra užbaigtų vizitų"} />
        </div>

        {/* Weekday distribution */}
        <div className="mt-4 rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
          <h2 className="text-lg font-bold">Vizitai pagal savaitės dieną</h2>
          <div className="mt-4 grid grid-cols-7 gap-2 sm:gap-3">
            {weekdays.map((w, i) => {
              const h = 8 + (weekdayCounts[i] / maxWD) * 80;
              const isMax = i === busiestIdx && weekdayCounts[i] > 0;
              return (
                <div key={w} className="flex flex-col items-center gap-1.5">
                  <div className="flex h-24 w-full items-end">
                    <div className={`w-full rounded-t-lg transition ${isMax ? "bg-gradient-primary shadow-glow" : "bg-primary/30"}`} style={{ height: `${h}%` }} />
                  </div>
                  <p className="text-[10px] font-semibold text-muted-foreground">{w}</p>
                  <p className="text-xs font-bold tabular-nums">{weekdayCounts[i]}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
        <CreateTaskPanel organizationId={user.id} />
      </section>

      {/* Published tasks */}
      <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
        <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2"><ListTodo className="h-5 w-5 text-primary" /> Mano paskelbtos užduotys</h2>
              <p className="text-xs text-muted-foreground">Įjunk / išjunk matomumą mokiniams arba pašalink užduotį.</p>
            </div>
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">{tasks.filter((t) => t.is_open).length} atviros · {tasks.length} iš viso</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {tasks.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Dar nesukūrei nė vienos užduoties. Pradėk viršuje ↑</div>
            )}
            {tasks.map((t) => (
              <div key={t.id} className={`rounded-2xl border p-4 transition ${t.is_open ? "border-primary/30 bg-primary/5" : "border-border bg-background/60 opacity-70"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{t.title}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" /> {t.task_date} · {Number(t.available_hours)} val.{t.location ? ` · ${t.location}` : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${t.is_open ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                    {t.is_open ? "AKTYVI" : "PASLĖPTA"}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => toggleTask(t)} disabled={busyId === t.id} className="flex-1 disabled:opacity-50 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold transition hover:bg-accent">
                    {t.is_open ? "Paslėpti" : "Vėl atidaryti"}
                  </button>
                  <button onClick={() => deleteTask(t)} disabled={busyId === t.id} aria-label="Ištrinti užduotį" className="disabled:opacity-50 grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground transition hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top volunteers */}
      {(() => {
        const totals: Record<string, number> = {};
        completed.forEach((r) => { totals[r.student_id] = (totals[r.student_id] ?? 0) + Number(r.hours_to_earn); });
        const top = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5);
        if (top.length === 0) return null;
        return (
          <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
            <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
              <h2 className="text-lg font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Aktyviausi savanoriai</h2>
              <ul className="mt-4 space-y-2">
                {top.map(([sid, hrs], i) => {
                  const s = students[sid];
                  return (
                    <li key={sid} className="flex items-center gap-3 rounded-2xl bg-background/60 p-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground shadow-glow">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{s?.full_name ?? "Mokinys"}</p>
                        <p className="truncate text-xs text-muted-foreground">{s?.email}</p>
                      </div>
                      <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success">{hrs} val.</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        );
      })()}

      <section className="mx-auto mt-6 grid max-w-7xl gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-5">
        <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md lg:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Laukiančios užklausos</h2>
              <p className="text-xs text-muted-foreground">Patvirtinimas / atmetimas automatiškai nusiunčia sistemos žinutę į pokalbį.</p>
            </div>
            <span className="rounded-full bg-warning/20 px-3 py-1 text-xs font-semibold text-warning-foreground">{pending.length} naujos</span>
          </div>
          <div className="mt-6 space-y-3">
            {pending.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Visos užklausos apdorotos 🎉</div>
            )}
            {pending.map((r) => {
              const s = students[r.student_id];
              return (
                <div key={r.id} className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
                        {(s?.full_name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{s?.full_name ?? "Mokinys"}</p>
                        <p className="truncate text-xs text-muted-foreground">{r.reservation_date} · {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)} · {Number(r.hours_to_earn)} val.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setChatRes({ id: r.id, student_id: r.student_id, organization_id: r.organization_id })}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                    >
                      <MessageSquare className="h-3 w-3" /> Pokalbis
                    </button>
                  </div>
                  {r.tags && r.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.tags.slice(0, 6).map((t) => (
                        <span key={t} className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">#{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => approveInitial(r)} disabled={busyId === r.id} className="disabled:opacity-60 inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
                      <Check className="h-4 w-4" /> {busyId === r.id ? "Vykdoma…" : "Patvirtinti ir pradėti darbą"}
                    </button>
                    <button onClick={() => decline(r)} disabled={busyId === r.id} className="disabled:opacity-60 inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive">
                      <X className="h-4 w-4" /> Atmesti
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vykdomos */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Vykdomos užduotys</h3>
                <p className="text-xs text-muted-foreground">Patvirtinta — laukiama darbo užbaigimo. Valandos dar NĖRA įskaitytos.</p>
              </div>
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">{approved.length}</span>
            </div>
            <div className="mt-3 space-y-3">
              {approved.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">Nėra vykdomų užduočių.</div>
              )}
              {approved.map((r) => {
                const s = students[r.student_id];
                return (
                  <div key={r.id} className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
                          {(s?.full_name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{s?.full_name ?? "Mokinys"}</p>
                          <p className="truncate text-xs text-muted-foreground">{r.reservation_date} · {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)} · {Number(r.hours_to_earn)} val.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setChatRes({ id: r.id, student_id: r.student_id, organization_id: r.organization_id })}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                      >
                        <MessageSquare className="h-3 w-3" /> Pokalbis
                      </button>
                    </div>
                    <div className="mt-4 space-y-2">
                      {r.checked_in_at ? (
                        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-xs font-semibold text-success">
                          <UserCheck className="h-3.5 w-3.5" />
                          Mokinys įsiregistravo {new Date(r.checked_in_at).toLocaleString("lt-LT")}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                          <div className="flex items-center gap-2 font-semibold"><ScanLine className="h-3.5 w-3.5" /> Mokinys dar neįsiregistravo</div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Kai mokinys atvyks, paprašyk jo QR kodo arba 6 skaitmenų kodo iš jo telefono — tik tada galėsi uždaryti užduotį.
                          </p>
                          <Link to="/organization/scan" className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1.5 text-[11px] font-semibold text-foreground hover:bg-foreground/20">
                            <ScanLine className="h-3 w-3" /> Nuskaityti kodą
                          </Link>
                        </div>
                      )}
                      <button
                        onClick={() => setVerifyRes(r)}
                        disabled={!r.checked_in_at}
                        title={r.checked_in_at ? undefined : "Pirma įregistruok mokinį QR arba 6 skaitmenų kodu"}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                      >
                        <ShieldCheck className="h-4 w-4" /> Patvirtinti ir uždaryti užduotį
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md lg:col-span-2">
          <h2 className="text-lg font-bold">Istorija</h2>
          <p className="text-xs text-muted-foreground">Patvirtintos ir atmestos rezervacijos</p>
          <div className="mt-5 space-y-2">
            {reservations.filter((r) => r.status !== "pending" && r.status !== "approved").length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">Dar tuščia.</div>
            )}
            {reservations.filter((r) => r.status !== "pending" && r.status !== "approved").map((r) => {
              const s = students[r.student_id];
              const isDone = r.status === "completed" || r.status === "confirmed";
              const Icon = isDone ? CheckCircle2 : r.status === "declined" ? XCircle : AlarmClock;
              const tone = isDone ? "text-success" : "text-destructive";
              return (
                <div key={r.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-background/60 p-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold">
                    {(s?.full_name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s?.full_name ?? "Mokinys"}</p>
                    <p className="text-xs text-muted-foreground">{r.reservation_date} · {Number(r.hours_to_earn)} val.</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icon className={`h-4 w-4 ${tone}`} />
                    <button
                      onClick={() => setChatRes({ id: r.id, student_id: r.student_id, organization_id: r.organization_id })}
                      aria-label="Atidaryti pokalbį su mokiniu"
                      className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground"
                      title="Pokalbis"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      </>}

      <ChatDialog reservation={chatRes} onClose={() => setChatRes(null)} />
      <VerifyCloseDialog
        open={!!verifyRes}
        hours={Number(verifyRes?.hours_to_earn ?? 0)}
        studentName={verifyRes ? (students[verifyRes.student_id]?.full_name ?? "Mokinys") : ""}
        onCancel={() => setVerifyRes(null)}
        onConfirm={async () => { if (verifyRes) await finalizeCompleted(verifyRes); }}
      />
    </PageShell>
  );
}

function KPI({ icon: Icon, label, value, sub }: { icon: typeof Percent; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-5 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" /> {label}
      </div>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function HeroMetric({ label, value, sub }: { label: string; value: React.ReactNode; sub: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-4 shadow-sm backdrop-blur">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-black tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}
