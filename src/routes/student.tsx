import { reservationTimeLabel } from "@/lib/reservation-time";
import { isActiveStudentReservation, isSchoolReservation, studentReservationNeedsQr, studentReservationStatus } from "@/lib/student-reservation";
import { InviteFriendsDialog } from "@/components/invite-friends-dialog";
import { Users } from "lucide-react";
import { DmInbox } from "@/components/dm-inbox";
import { KindBadge } from "@/components/school/school-hub";
import { TeacherSuggestions } from "@/components/teacher-suggestions";
import { WrongRole } from "@/components/wrong-role";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PageShell } from "../components/layout";
import { DashboardSkeleton } from "@/components/skeleton-loader";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Clock, Target, CalendarCheck, Building2, TrendingUp, MessageSquare,
  CheckCircle2, AlarmClock, XCircle, PlayCircle, Sparkles, School,
  Flame, Award, Trophy, CalendarDays, MapPin, Rocket, Timer, Star, ShieldCheck, GraduationCap,
} from "lucide-react";
import { ChatDialog, type ChatReservation } from "@/components/chat-dialog";
import { CustomReservationDialog } from "@/components/custom-reservation-dialog";
import { FriendsPanel } from "@/components/friends-panel";
import { GroupInvitesInbox } from "@/components/group-invites-inbox";
import { PushToggle } from "@/components/push-toggle";
import { CertificateButton } from "@/components/certificate-button";
import { verifySchoolSignupCode } from "@/lib/school-signup.functions";
import { listOrganizations } from "@/lib/orgs.functions";
import { LeafletMap } from "@/components/leaflet-map";
import { ACHIEVEMENTS, syncAchievements, type AchievementCtx } from "@/lib/achievements";
import { AchievementsGrid } from "@/components/achievements-grid";
import { StreakCard } from "@/components/streak-card";
import { DashHero, StatTile, DASH_EMBER, DASH_GOLD, DASH_GREEN } from "@/components/dashboard-kit";
import { celebrate, setCelebrationContext } from "@/lib/celebrate";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from "recharts";

export const Route = createFileRoute("/student")({
  head: () => ({
    meta: [
      { title: "Mokinio sritis — Socialinės Valandos" },
      { name: "description", content: "Stebėk sukauptas valandas, suplanuotus vizitus ir savanorystės progresą." },
      { property: "og:title", content: "Mokinio sritis — Socialinės Valandos" },
      { property: "og:description", content: "Sukauptos valandos, savanorystės vizitai ir mokinio pasiekimai." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StudentDashboard,
});

type Reservation = {
  id: string;
  student_id: string;
  organization_id: string;
  reservation_date: string;
  start_time: string | null;
  end_time: string | null;
  source?: string | null;
  requires_checkin?: boolean | null;
  hours_to_earn: number;
  kind?: string | null;
  status: "pending" | "approved" | "confirmed" | "completed" | "declined";
  tags?: string[] | null;
  note?: string | null;
  address?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type OrgLite = { id: string; organization_name: string | null; full_name: string | null };
type SchoolRow = { id: string; name: string; city: string | null };

const CLASS_YEARS = ["5", "6", "7", "8", "9 / I gimn.", "10 / II gimn.", "11 / III gimn.", "12 / IV gimn."];
function isLowerClass(cy: string) { return cy === "5" || cy === "6" || cy === "7"; }

function StudentDashboard() {
  const { user, profile, loading } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [orgMap, setOrgMap] = useState<Record<string, OrgLite>>({});
  const [chatRes, setChatRes] = useState<ChatReservation | null>(null);
  const [groupInvite, setGroupInvite] = useState<{ id: string; label: string } | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "completed">("all");

  // SVARBU: jokių ankstyvų `return` prieš likusius hook'us — kitaip React
  // sugriūva („Rendered more hooks…") ir mokinys mato baltą ekraną.



  const loadReservations = async (uid: string) => {
    // Pasibaigusios, bet neuždarytos rezervacijos automatiškai užsidaro, kad
    // nekabėtų kaip aktyvios.
    // Runs in the background; never blocks the first paint of the dashboard.
    void Promise.resolve(supabase.rpc("expire_stale_reservations" as never)).catch(() => {});

    const [{ data, error }, { data: parts }] = await Promise.all([
      supabase
        .from("reservations")
        .select("*")
        .eq("student_id", uid)
        .order("reservation_date", { ascending: false }),
      supabase
        .from("reservation_participants")
        .select("reservation_id")
        .eq("student_id", uid)
        .eq("status", "accepted"),
    ]);
    if (error) {
      toast.error("Nepavyko įkelti rezervacijų. Bandyk dar kartą.");
      return;
    }
    let rs = (data as Reservation[]) ?? [];
    setReservations(rs);
    const partIds = ((parts as { reservation_id: string }[] | null) ?? [])
      .map((p) => p.reservation_id)
      .filter((id) => !rs.some((r) => r.id === id));
    if (partIds.length) {
      const { data: extra } = await supabase.from("reservations").select("*").in("id", partIds);
      rs = [...rs, ...((extra as Reservation[]) ?? [])].sort((a, b) =>
        a.reservation_date < b.reservation_date ? 1 : -1,
      );
      setReservations(rs);
    }

    const ids = Array.from(new Set(rs.map((r) => r.organization_id).filter((v): v is string => !!v)));
    if (ids.length) {
      // Profiles and the public directory load in parallel instead of one after another.
      const [{ data: ps }, dir] = await Promise.all([
        supabase.from("profiles").select("id, organization_name, full_name").in("id", ids),
        listOrganizations().catch(() => [] as Awaited<ReturnType<typeof listOrganizations>>),
      ]);
      const m: Record<string, OrgLite> = {};
      (ps as OrgLite[] | null)?.forEach((p) => (m[p.id] = p));
      dir.forEach((o) => {
        if (ids.includes(o.id) && !m[o.id]?.organization_name && !m[o.id]?.full_name) m[o.id] = { id: o.id, organization_name: o.organization_name, full_name: o.full_name };
      });
      setOrgMap(m);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadReservations(user.id);
    const refresh = () => { void loadReservations(user.id); };
    window.addEventListener("focus", refresh);
    const channel = supabase.channel(`student-reservations-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations", filter: `student_id=eq.${user.id}` }, refresh)
      .subscribe();
    return () => {
      window.removeEventListener("focus", refresh);
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const orgName = (id: string) => orgMap[id]?.organization_name ?? orgMap[id]?.full_name ?? "Organizacija";
  const orgInitial = (id: string) => (orgName(id) || "?").trim().charAt(0).toUpperCase();

  // Weekly chart data: last 8 weeks of completed hours
  const weeklyData = useMemo(() => {
    const now = new Date();
    const weeks: { label: string; val: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const end = new Date(now); end.setDate(now.getDate() - i * 7);
      const start = new Date(end); start.setDate(end.getDate() - 6);
      const label = `${start.getDate()}.${start.getMonth() + 1}`;
      const val = reservations
        .filter((r) => (r.status === "completed" || r.status === "confirmed") && r.reservation_date >= start.toISOString().slice(0, 10) && r.reservation_date <= end.toISOString().slice(0, 10))
        .reduce((a, r) => a + Number(r.hours_to_earn), 0);
      weeks.push({ label, val });
    }
    return weeks;
  }, [reservations]);

  const streak = useMemo(() => {
    // Consecutive weeks with at least one completed reservation, working backwards.
    let s = 0;
    for (let i = weeklyData.length - 1; i >= 0; i--) {
      if (weeklyData[i].val > 0) s++; else break;
    }
    return s;
  }, [weeklyData]);

  const uniqueOrgs = useMemo(() => new Set(reservations.map((r) => r.organization_id)).size, [reservations]);
  const [unlockedKeys, setUnlockedKeys] = useState<Set<string>>(new Set());
  const [friendsCount, setFriendsCount] = useState(0);
  const [groupJoined, setGroupJoined] = useState(0);
  const [loginStreak, setLoginStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [freezeUsedAt, setFreezeUsedAt] = useState<string | null>(null);
  const [streakBoard, setStreakBoard] = useState<Array<{ id: string; full_name: string | null; class_year: string | null; login_streak: number; longest_login_streak: number }>>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ count: fc }, { count: gc }] = await Promise.all([
        supabase.from("friendships").select("id", { count: "exact", head: true })
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`).eq("status", "accepted"),
        supabase.from("reservation_participants").select("id", { count: "exact", head: true })
          .eq("student_id", user.id).eq("status", "accepted"),
      ]);
      setFriendsCount(fc ?? 0);
      setGroupJoined(gc ?? 0);
    })();
  }, [user]);

  // Streak is claimed by the student with a click (RPC is idempotent per day).
  const [streakActivated, setStreakActivated] = useState(false);
  const [streakLoading, setStreakLoading] = useState(true);

  const loadStreakBoard = async () => {
    const { data: board } = await supabase.rpc("get_school_streak_leaderboard" as never);
    if (Array.isArray(board)) setStreakBoard(board as typeof streakBoard);
  };

  useEffect(() => {
    if (!user || profile?.role !== "student") return;
    (async () => {
      setStreakLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("login_streak, longest_login_streak, freeze_used_at, last_login_day")
        .eq("id", user.id)
        .maybeSingle();
      const row = data as
        | { login_streak: number | null; longest_login_streak: number | null; freeze_used_at: string | null; last_login_day: string | null }
        | null;
      if (row) {
        setLoginStreak(row.login_streak ?? 0);
        setLongestStreak(row.longest_login_streak ?? 0);
        setFreezeUsedAt(row.freeze_used_at ?? null);
        setStreakActivated(row.last_login_day === new Date().toISOString().slice(0, 10));
      }
      setStreakLoading(false);
      await loadStreakBoard();
    })();
  }, [user, profile?.role]);

  const activateStreak = async () => {
    const { data, error } = await supabase.rpc("bump_login_streak" as never);
    if (error) {
      toast.error("Nepavyko aktyvuoti serijos", { description: error.message });
      return;
    }
    const row = Array.isArray(data)
      ? (data as Array<{ login_streak: number; longest_login_streak: number; freeze_used_at: string | null }>)[0]
      : null;
    if (row) {
      setLoginStreak(row.login_streak ?? 0);
      setLongestStreak(row.longest_login_streak ?? 0);
      setFreezeUsedAt(row.freeze_used_at ?? null);
    }
    setStreakActivated(true);
    celebrate({ kind: "streak", days: row?.login_streak ?? loginStreak, longest: row?.longest_login_streak ?? longestStreak });
    toast.success(`🔥 Serija aktyvuota — ${row?.login_streak ?? loginStreak} d. iš eilės`, {
      description: "Užsuk ir rytoj, kad nenutrūktų.",
    });
    await loadStreakBoard();
  };

  useEffect(() => {
    if (!user || !profile) return;
    const ctx: AchievementCtx = {
      hoursEarned: reservations.filter((r) => r.status === "completed").reduce((a, r) => a + Number(r.hours_to_earn || 0), 0),
      hoursNeeded: Number(profile.hours_needed ?? 0),
      completedCount: reservations.filter((r) => r.status === "completed" || r.status === "confirmed").length,
      uniqueOrgs,
      streakWeeks: streak,
      friendsCount,
      groupJoined,
      loginStreakDays: loginStreak,
    };
    // Feed live numbers to the celebration overlay so every clip is personalised.
    setCelebrationContext({
      name: profile.full_name ?? null,
      hoursEarned: ctx.hoursEarned,
      hoursNeeded: ctx.hoursNeeded,
      completedCount: ctx.completedCount,
      uniqueOrgs,
      friendsCount,
      loginStreakDays: loginStreak,
      longestStreak,
      classYear: profile.class_year ?? null,
    });
    syncAchievements(user.id, ctx).then(setUnlockedKeys);
  }, [user, profile, reservations, uniqueOrgs, streak, friendsCount, groupJoined, loginStreak, longestStreak]);


  if (loading) return <PageShell><div className="mx-auto w-full max-w-7xl px-4 py-10"><DashboardSkeleton /></div></PageShell>;
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

  if (profile.role !== "student" && profile.role !== "admin") return <WrongRole role={profile.role} />;
  if (profile.role === "student" && (!profile.school_id || !profile.class_year || !profile.hours_needed)) {
    // One setup flow only: /complete-profile asks for school, 5A/5B… class and the code.
    void StudentProfileSetup;
    return <Navigate to="/complete-profile" replace />;
  }

  // Same source as the certificate: only finished visits count.
  const completed = reservations.filter((r) => r.status === "completed").reduce((a, r) => a + Number(r.hours_to_earn || 0), 0);
  const required = Number(profile.hours_needed ?? 0);
  const progress = required ? Math.min(100, Math.round((completed / required) * 100)) : 0;
  const remaining = Math.max(0, required - completed);
  const active = reservations.filter(isActiveStudentReservation);
  const done = reservations.filter((r) => r.status === "completed" || r.status === "confirmed");
  const nextRes = active
    .slice()
    .sort((a, b) => (a.reservation_date + (a.start_time ?? "")).localeCompare(b.reservation_date + (b.start_time ?? "")))[0];
  const avgHoursPerVisit = done.length ? (done.reduce((a, r) => a + Number(r.hours_to_earn), 0) / done.length) : 0;

  const filtered = reservations.filter((r) => {
    if (filter === "all") return true;
    if (filter === "completed") return r.status === "completed" || r.status === "confirmed";
    return r.status === filter;
  });


  return (
    <PageShell>
      <nav aria-label="Greitos nuorodos" className="sticky top-[72px] z-30 -mb-2 flex gap-2 overflow-x-auto border-b border-border bg-background/95 px-4 py-2 lg:hidden">
        {[["#mano-rezervacijos","Mano rezervacijos"],["/tasks","Rasti užduotį"],["/chat","Pokalbiai"],["#draugai","Draugai"]].map(([href,label]) => (
          <a key={href} href={href} className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold active:scale-95">{label}</a>
        ))}
      </nav>
      <div className="student-v4 dash-v3 mx-auto w-full max-w-[1400px] lg:grid lg:grid-cols-[230px_1fr] lg:gap-2 lg:px-4">
      <aside aria-label="Mokinio meniu" className="hidden lg:block">
        <div className="sticky top-20 mt-8 flex flex-col gap-1 rounded-2xl border border-border bg-card p-3">
          <p className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-wider text-primary">Mokinio sritis</p>
          {[["#pradzia","Pradžia"],["/tasks","Užduotys"],["#mano-rezervacijos","Mano rezervacijos"],["#pasiekimai","Pasiekimai"],["#draugai","Draugai"],["/chat","Žinutės"]].map(([href,label]) => (
            <a key={href} href={href} className="student-nav-link rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-foreground">{label}</a>
          ))}
          <div className="mt-3 border-t border-border pt-3 px-1">
            <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} /></div>
            <p className="mt-2 text-xs text-muted-foreground">{completed} / {required} val. · {progress}%</p>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
      <div className="flex flex-col [&>section]:w-full">
      <section id="pradzia" className="order-1 scroll-mt-20 mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <DashHero
          eyebrow="Mokinio sritis"
          icon={GraduationCap}
          title={<>Sveikas, {profile.full_name ?? "moksleivi"} 👋</>}
          subtitle={
            <>
              Čia matai visas savo socialines valandas vienoje vietoje: kiek jau surinkai, kas suplanuota ir ką verta
              daryti toliau. {remaining > 0 ? `Iki tikslo liko ${remaining} val.` : "Tikslas jau pasiektas — puiku!"}
            </>
          }
          actions={
            <>
              <Link to="/tasks" className="rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
                + Naršyti užduotis
              </Link>
              <button
                onClick={() => setCustomOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-4 py-2.5 text-sm font-semibold backdrop-blur transition hover:border-primary/40"
              >
                <Sparkles className="h-4 w-4 text-primary" /> Pasiūlyk rezervaciją
              </button>
              <CertificateButton />
              <Button asChild className="h-12 min-w-0"><Link to="/checkin" preload="intent"><ShieldCheck /> Parodyti QR kodą</Link></Button>
            </>
          }
        />
      </section>

      {/* Hero: Ring + Next reservation */}
      <section className="order-2 mx-auto mt-8 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-card p-4 shadow-md sm:p-6">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative flex flex-wrap items-center gap-4 sm:gap-6">
              <ProgressRing pct={progress} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Metinis tikslas</p>
                <p className="mt-1 font-display text-3xl font-bold">{completed} / {required} val.</p>
                <p className="mt-1 text-sm text-muted-foreground">{remaining > 0 ? `Liko ${remaining} val. iki tikslo.` : "Tikslas pasiektas 🎉"}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <Pill icon={Flame} tone="warn">{loginStreak} d. iš eilės 🔥</Pill>
                  <Pill icon={Timer} tone="info">Vid. {avgHoursPerVisit.toFixed(1)} val./vizitui</Pill>
                  <Pill icon={CalendarDays} tone="ok">{done.length} užbaigti vizitai</Pill>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-gradient-card p-4 shadow-md sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-primary">Kitas vizitas</h2>
              {nextRes && (
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${nextRes.status === "approved" ? "bg-primary/15 text-primary" : "bg-warning/20 text-warning-foreground"}`}>
                  {studentReservationStatus(nextRes)}
                </span>
              )}
            </div>
            {nextRes ? (
              <div className="mt-4">
                <p className="font-display text-xl font-bold">{isSchoolReservation(nextRes) ? "Auklėtojo rezervacija" : orgName(nextRes.organization_id)}</p>
                <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> {nextRes.reservation_date} · {reservationTimeLabel(nextRes.start_time, nextRes.end_time)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{Number(nextRes.hours_to_earn)} val. socialinių</p>
                {nextRes.tags && nextRes.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {nextRes.tags.slice(0, 5).map((t) => (
                      <span key={t} className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">#{t}</span>
                    ))}
                  </div>
                )}
                {isSchoolReservation(nextRes) ? (
                  <Button asChild variant="outline" className="mt-4"><a href="#mano-rezervacijos">Peržiūrėti rezervaciją</a></Button>
                ) : <button
                  onClick={() => setChatRes({ id: nextRes.id, student_id: nextRes.student_id, organization_id: nextRes.organization_id, organization_name: orgName(nextRes.organization_id) })}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:opacity-90"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Atverti pokalbį
                </button>}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nėra suplanuotų vizitų. <Link to="/tasks" className="font-semibold text-primary hover:underline">Rink užduotį</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <section className="order-4 mx-auto mt-6 max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[
            { icon: Clock, label: "Užbaigtos valandos", value: completed, sub: `iš ${required} reikalingų`, accent: DASH_GREEN },
            { icon: Target, label: "Liko valandų", value: remaining, sub: `${progress}% iki tikslo`, accent: DASH_GOLD },
            { icon: CalendarCheck, label: "Aktyvios rezervacijos", value: active.length, sub: nextRes ? `Artimiausia: ${nextRes.reservation_date}` : "Kol kas nieko nesuplanuota", accent: DASH_EMBER },
            { icon: Building2, label: "Organizacijos", value: new Set(reservations.map((r) => r.organization_id)).size, sub: "kur savanoriavai", accent: DASH_EMBER },
          ].map((s, i) => (
            <StatTile key={s.label} icon={s.icon} label={s.label} value={s.value} sub={s.sub} accent={s.accent} delay={i * 0.06} />
          ))}
        </div>
      </section>

      {/* Login streak + school leaderboard */}
      {profile.role === "student" && (
      <section className="order-5 mx-auto mt-6 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <StreakCard
            streak={loginStreak}
            longest={longestStreak}
            freezeUsedAt={freezeUsedAt}
            activated={streakActivated}
            loading={streakLoading}
            onActivate={activateStreak}
          />


          <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2"><Trophy className="h-5 w-5 text-warning" /> Karščiausi streak'ai mokykloje</h2>
                <p className="text-xs text-muted-foreground">Top 20 mokinių pagal dienų iš eilės.</p>
              </div>
            </div>
            <div className="mt-4 space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {streakBoard.length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Kol kas tuščia. Būk pirmas, kuris pradeda streak'ą!
                </p>
              )}
              {streakBoard.map((row, idx) => {
                const isMe = row.id === user.id;
                const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`;
                return (
                  <div key={row.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${isMe ? "border-primary/50 bg-primary/10" : "border-border/50 bg-background/40"}`}>
                    <span className="w-8 text-center font-bold">{medal}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{row.full_name ?? "Anonimas"} {isMe && <span className="text-xs font-normal text-primary">(tu)</span>}</p>
                      {row.class_year && <p className="text-[11px] text-muted-foreground">{row.class_year} kl.</p>}
                    </div>
                    <div className="flex items-center gap-1 text-warning">
                      <Flame className="h-4 w-4" fill="currentColor" />
                      <span className="font-display font-bold">{row.login_streak}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Weekly chart + Achievements */}

      <section className="order-6 mx-auto mt-6 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Savaitinis aktyvumas</h2>
                <p className="text-xs text-muted-foreground">Užbaigtos valandos per pastarąsias 8 savaites.</p>
              </div>
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                {weeklyData.reduce((a, w) => a + w.val, 0)} val. iš viso
              </span>
            </div>
            <div className="mt-4 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hrs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                  />
                  <Area type="monotone" dataKey="val" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#hrs)" name="Valandos" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div id="pasiekimai" className="scroll-mt-20"><AchievementsGrid unlocked={unlockedKeys} /></div>

        </div>
      </section>

      <OpenTasksFeed />

      {/* Group invites + Friends */}
      <section id="draugai" className="order-4 lg:order-none mx-auto mt-6 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            <GroupInvitesInbox userId={user.id} />
            <DmInbox me={user.id} />
            <PushToggle />
          </div>
          <div>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-lg font-bold">Draugai</h2>
              <span className="text-xs text-muted-foreground">Kviesk juos į grupines rezervacijas</span>
            </div>
            <FriendsPanel userId={user.id} schoolId={profile.school_id ?? null} />
          </div>
        </div>
      </section>

      <div className="order-3 w-full mx-auto mt-6 max-w-7xl px-4 sm:px-6"><TeacherSuggestions /></div>

      {/* Reservations list w/ filter */}
      <section id="mano-rezervacijos" className="order-3 w-full scroll-mt-20 mx-auto mt-6 max-w-7xl px-4 pb-6 sm:px-6">
        <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">Mano rezervacijos</h2>
              <p className="text-xs text-muted-foreground">Auklėtojo rezervacijos ir organizacijų vizitai.</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {([
                ["all", "Visos"],
                ["pending", "Laukia"],
                ["approved", "Vykdomos"],
                ["completed", "Užbaigtos"],
              ] as const).map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filter === k ? "bg-gradient-primary text-primary-foreground shadow-glow" : "border border-border bg-background/60 text-muted-foreground hover:bg-accent"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Nėra rezervacijų šioje kategorijoje. <Link to="/tasks" className="font-semibold text-primary hover:underline">Pasirink organizaciją</Link>
              </div>
            )}
            {filtered.map((r) => {
              const isDone = r.status === "completed" || r.status === "confirmed";
              const isApproved = r.status === "approved";
              const tone = isDone ? "bg-success/15 text-success" : r.status === "declined" ? "bg-destructive/15 text-destructive" : isApproved ? "bg-primary/15 text-primary" : "bg-warning/15 text-warning-foreground";
              const Icon = isDone ? CheckCircle2 : r.status === "declined" ? XCircle : isApproved ? PlayCircle : AlarmClock;
              const school = isSchoolReservation(r);
              const label = studentReservationStatus(r);
              return (
                <div key={r.id} className={`rounded-2xl border p-4 ${isApproved ? "border-primary/40 bg-primary/5" : "border-border bg-background/60"}`}>
                  <div className="student-reservation-row grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-primary text-sm font-bold text-primary-foreground shadow-glow">{orgInitial(r.organization_id)}</div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{school ? "Auklėtojo rezervacija" : orgName(r.organization_id)}</p>
                      {school && <p className="text-xs text-muted-foreground">{orgMap[r.organization_id]?.full_name ?? "Mokykla"} · Papildomai patvirtinti nereikia</p>}
                      <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"><KindBadge kind={r.kind} />{r.reservation_date} · {reservationTimeLabel(r.start_time, r.end_time)} · {Number(r.hours_to_earn)} val.</p>
                    </div>
                    <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 sm:col-span-1 sm:flex-row">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
                        <Icon className="h-3 w-3" /> {label}
                      </span>
                      {!school && !isDone && r.status !== "declined" && <Button variant="outline" size="sm" onClick={() => setGroupInvite({ id: r.id, label: orgName(r.organization_id) })}><Users />Pakviesti draugus</Button>}
                      {studentReservationNeedsQr(r) && <Button variant="outline" asChild className="h-11"><Link to="/checkin" preload="intent"><ShieldCheck /> QR kodas</Link></Button>}
                      {!school && <button
                        onClick={() => setChatRes({ id: r.id, student_id: r.student_id, organization_id: r.organization_id, organization_name: orgName(r.organization_id) })}
                        className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition hover:opacity-90"
                      >
                        <MessageSquare className="h-3 w-3" /> Pokalbis
                      </button>}
                    </div>
                  </div>
                  {(r.tags && r.tags.length > 0) || r.note ? (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
                      {r.tags?.slice(0, 6).map((t) => (
                        <span key={t} className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">#{t}</span>
                      ))}
                      {r.note && <span className="ml-1 flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" /> {r.note.slice(0, 80)}</span>}
                    </div>
                  ) : null}
                  {r.latitude != null && r.longitude != null && (
                    <div className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
                      {r.address && (
                        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3 text-primary" /> {r.address}</p>
                      )}
                      <LeafletMap lat={r.latitude} lng={r.longitude} height={140} interactive={false} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
      </div>
      </div>
      </div>

      <InviteFriendsDialog open={!!groupInvite} reservationId={groupInvite?.id ?? null} inviterId={user.id} reservationLabel={groupInvite?.label} onClose={() => setGroupInvite(null)} />
      <ChatDialog reservation={chatRes} onClose={() => setChatRes(null)} />
      <CustomReservationDialog
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        onCreated={() => loadReservations(user.id)}
      />
    </PageShell>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const size = 128; const stroke = 12; const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, pct) / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--border))" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="hsl(var(--primary))" strokeWidth={stroke} strokeLinecap="round"
          fill="none" strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: off }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="font-display text-2xl font-bold">{pct}%</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">progresas</p>
        </div>
      </div>
    </div>
  );
}

function Pill({ icon: Icon, tone, children }: { icon: typeof Flame; tone: "warn" | "info" | "ok"; children: React.ReactNode }) {
  const cls = tone === "warn" ? "bg-warning/15 text-warning-foreground" : tone === "info" ? "bg-primary/15 text-primary" : "bg-success/15 text-success";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}>
      <Icon className="h-3 w-3" /> {children}
    </span>
  );
}

function StudentProfileSetup({ userId }: { userId: string }) {
  const { user, profile } = useAuth();
  const verifyCode = useServerFn(verifySchoolSignupCode);
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [fullName, setFullName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [classYear, setClassYear] = useState("");
  const [hoursNeeded, setHoursNeeded] = useState(20);
  const [schoolCode, setSchoolCode] = useState("");
  const [agree, setAgree] = useState(false);
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

  useEffect(() => {
    if (fullName) return;
    const fromMeta = (user?.user_metadata as { full_name?: string; name?: string } | undefined)?.full_name
      ?? (user?.user_metadata as { full_name?: string; name?: string } | undefined)?.name
      ?? profile?.full_name
      ?? "";
    if (fromMeta) setFullName(fromMeta);
  }, [user, profile, fullName]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!schoolId || !classYear || !fullName.trim()) { setError("Užpildyk visus laukelius."); return; }
    if (fullName.trim().split(/\s+/).length < 2) { setError("Įvesk tikrą vardą ir pavardę (bent du žodžius)."); return; }
    if (!schoolCode.trim()) { setError("Įvesk mokyklos prisijungimo kodą (gauk iš klasės auklėtojo)."); return; }
    if (!agree) { setError("Patvirtink, kad pateikta informacija yra tikra."); return; }
    const effectiveHours = isLowerClass(classYear) ? 20 : Math.max(8, hoursNeeded);
    if (!isLowerClass(classYear) && hoursNeeded < 8) { setError("8+ klasėms — minimalus tikslas 8 val."); return; }
    setBusy(true);
    try {
      const { ok } = await verifyCode({ data: { schoolId, code: schoolCode.trim() } });
      if (!ok) {
        setBusy(false);
        setError("Neteisingas mokyklos kodas. Paklausk klasės auklėtojo arba mokyklos administratoriaus.");
        return;
      }

      const { error: updErr } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          school_id: schoolId,
          class_year: classYear,
          hours_needed: effectiveHours,
          role: "student",
        })
        .eq("id", userId);
      setBusy(false);
      if (updErr) { setError(updErr.message); return; }
      window.location.reload();
    } catch (e) {
      // Klaidos objektas niekada nepatenka tiesiai į ekraną – kitaip mokinys
      // matydavo „[object Object]".
      setBusy(false);
      setError(e instanceof Error ? e.message : "Nepavyko patvirtinti. Bandyk dar kartą.");
    }
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
            Kad į platformą nepatektų atsitiktiniai žmonės, prašome įvesti tikrus duomenis ir mokyklos prisijungimo kodą.
          </p>
          <div className="mt-3 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
            🔑 <b>Mokyklos kodą</b> gauk iš klasės auklėtojo arba mokyklos administratoriaus. Be jo paskyra nebus aktyvuota.
          </div>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Tikras vardas ir pavardė</span>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                placeholder="Pvz.: Emilija Kazlauskaitė"
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Mokykla</span>
              <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} required className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary">
                {schools.length === 0 && <option value="">Kraunama…</option>}
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}{s.city ? ` (${s.city})` : ""}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Klasė</span>
              <select value={classYear} onChange={(e) => setClassYear(e.target.value)} required className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary">
                <option value="">Pasirink…</option>
                {CLASS_YEARS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Mokyklos prisijungimo kodas</span>
              <input type="text" value={schoolCode} onChange={(e) => setSchoolCode(e.target.value)} required autoComplete="off"
                placeholder="Pvz.: SEDUVOS2026"
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm tracking-wider outline-none focus:border-primary" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Valandų tikslas per mokslo metus</span>
              {isLowerClass(classYear) ? (
                <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2.5 text-sm">
                  <b className="text-lg">20 val.</b>
                  <span className="text-xs text-muted-foreground">— <b>5–7 klasėms</b> nustatyta automatiškai.</span>
                </div>
              ) : (
                <>
                  <input type="number" min={8} max={500} value={hoursNeeded} onChange={(e) => setHoursNeeded(Math.max(8, Number(e.target.value)))} className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
                  <p className="mt-1 text-[11px] text-muted-foreground">8+ klasėms — minimalus tikslas 8 val. Pasirenkama pagal savo mokyklos reikalavimus.</p>
                </>
              )}
            </label>
            <label className="flex items-start gap-2 rounded-xl border border-border bg-background/60 p-3 text-xs text-muted-foreground">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
              <span>Patvirtinu, kad esu tikras mokinys pasirinktoje mokykloje ir pateikti duomenys yra teisingi. Suprantu, kad melagingi duomenys reiškia paskyros pašalinimą.</span>
            </label>
            {error && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>
            )}
            <button disabled={busy} className="w-full rounded-full bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
              {busy ? "Tikrinama…" : "Patvirtinti ir tęsti"}
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
        .gte("task_date", new Date().toISOString().slice(0, 10))
        .order("task_date", { ascending: true })
        .limit(4);
      const list = (data as Array<{ id: string; title: string; task_date: string; available_hours: number; location: string; organization_id: string }>) ?? [];
      setTasks(list);
      const ids = Array.from(new Set(list.map((t) => t.organization_id).filter((v): v is string => !!v)));
      if (ids.length) {
        const { data: ps } = await supabase.from("profiles").select("id, organization_name, full_name").in("id", ids);
        const map: Record<string, { organization_name: string | null; full_name: string | null }> = {};
        (ps ?? []).forEach((p: { id: string; organization_name: string | null; full_name: string | null }) => (map[p.id] = p));
        const missing = ids.filter((id) => !map[id]?.organization_name && !map[id]?.full_name);
        if (missing.length) {
          try {
            const dir = await listOrganizations();
            dir.forEach((o) => {
              if (missing.includes(o.id)) map[o.id] = { organization_name: o.organization_name, full_name: o.full_name };
            });
          } catch { /* ignore */ }
        }
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
