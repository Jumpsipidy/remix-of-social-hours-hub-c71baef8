import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PageShell } from "../components/layout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Clock, Target, CalendarCheck, Building2, TrendingUp, MessageSquare,
  CheckCircle2, AlarmClock, XCircle, PlayCircle, Sparkles, School,
  Flame, Award, Trophy, CalendarDays, MapPin, Rocket, Timer, Star,
} from "lucide-react";
import { ChatDialog, type ChatReservation } from "@/components/chat-dialog";
import { CustomReservationDialog } from "@/components/custom-reservation-dialog";
import { FriendsPanel } from "@/components/friends-panel";
import { GroupInvitesInbox } from "@/components/group-invites-inbox";
import { CertificateButton } from "@/components/certificate-button";
import { verifySchoolSignupCode } from "@/lib/school-signup.functions";
import { LeafletMap } from "@/components/leaflet-map";
import { ACHIEVEMENTS, syncAchievements, type AchievementCtx } from "@/lib/achievements";

import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from "recharts";

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
  const [customOpen, setCustomOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "completed">("all");

  const loadReservations = async (uid: string) => {
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .eq("student_id", uid)
      .order("reservation_date", { ascending: false });
    const rs = (data as Reservation[]) ?? [];
    setReservations(rs);
    const ids = Array.from(new Set(rs.map((r) => r.organization_id).filter((v): v is string => !!v)));
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

  useEffect(() => {
    if (!user || !profile) return;
    const ctx: AchievementCtx = {
      hoursEarned: Number(profile.hours_earned ?? 0),
      hoursNeeded: Number(profile.hours_needed ?? 0),
      completedCount: reservations.filter((r) => r.status === "completed" || r.status === "confirmed").length,
      uniqueOrgs,
      streakWeeks: streak,
      friendsCount,
      groupJoined,
    };
    syncAchievements(user.id, ctx).then(setUnlockedKeys);
  }, [user, profile, reservations, uniqueOrgs, streak, friendsCount, groupJoined]);

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
  const active = reservations.filter((r) => r.status === "pending" || r.status === "approved");
  const done = reservations.filter((r) => r.status === "completed" || r.status === "confirmed");
  const nextRes = active
    .slice()
    .sort((a, b) => (a.reservation_date + a.start_time).localeCompare(b.reservation_date + b.start_time))[0];
  const avgHoursPerVisit = done.length ? (done.reduce((a, r) => a + Number(r.hours_to_earn), 0) / done.length) : 0;

  const filtered = reservations.filter((r) => {
    if (filter === "all") return true;
    if (filter === "completed") return r.status === "completed" || r.status === "confirmed";
    return r.status === filter;
  });


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
            <CertificateButton />
            <Link to="/tasks" className="rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">+ Naršyti užduotis</Link>
          </div>

        </div>
      </section>

      {/* Hero: Ring + Next reservation */}
      <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6">
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
                  <Pill icon={Flame} tone="warn">{streak} sav. iš eilės</Pill>
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
                  {nextRes.status === "approved" ? "Vykdoma" : "Laukiama"}
                </span>
              )}
            </div>
            {nextRes ? (
              <div className="mt-4">
                <p className="font-display text-xl font-bold">{orgName(nextRes.organization_id)}</p>
                <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> {nextRes.reservation_date} · {nextRes.start_time.slice(0, 5)}–{nextRes.end_time.slice(0, 5)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{Number(nextRes.hours_to_earn)} val. socialinių</p>
                {nextRes.tags && nextRes.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {nextRes.tags.slice(0, 5).map((t) => (
                      <span key={t} className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">#{t}</span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setChatRes({ id: nextRes.id, student_id: nextRes.student_id, organization_id: nextRes.organization_id, organization_name: orgName(nextRes.organization_id) })}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:opacity-90"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Atverti pokalbį
                </button>
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
      <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Clock, label: "Užbaigtos valandos", value: `${completed}`, sub: `iš ${required} reikalingų` },
            { icon: Target, label: "Liko valandų", value: `${remaining}`, sub: `${progress}% iki tikslo` },
            { icon: CalendarCheck, label: "Aktyvios rezervacijos", value: active.length, sub: nextRes ? `Artimiausia: ${nextRes.reservation_date}` : "" },
            { icon: Building2, label: "Organizacijos", value: new Set(reservations.map((r) => r.organization_id)).size, sub: "kur savanoriavai" },
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

      {/* Weekly chart + Achievements */}
      <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
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

          <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
            <h2 className="text-lg font-bold flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Pasiekimai</h2>
            <p className="text-xs text-muted-foreground">Atrakinta {ACHIEVEMENTS.filter((a) => unlockedKeys.has(a.key)).length} iš {ACHIEVEMENTS.length}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {ACHIEVEMENTS.map((a) => {
                const got = unlockedKeys.has(a.key);
                return (
                  <div key={a.key} title={a.description} className={`rounded-xl border p-3 text-xs transition ${got ? "border-primary/40 bg-primary/5" : "border-dashed border-border bg-background/40 opacity-60"}`}>
                    <a.icon className={`h-4 w-4 ${got ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="mt-2 font-semibold leading-tight">{a.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <OpenTasksFeed />

      {/* Group invites + Friends */}
      <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-4">
            <GroupInvitesInbox userId={user.id} />
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

      {/* Reservations list w/ filter */}
      <section className="mx-auto mt-6 max-w-7xl px-4 pb-16 sm:px-6">
        <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">Mano rezervacijos</h2>
              <p className="text-xs text-muted-foreground">Bendrauk saugiame 3-šalių pokalbyje su organizacija.</p>
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
              const label = isDone ? "Užbaigta" : r.status === "declined" ? "Atmesta" : isApproved ? "Vykdoma" : "Laukia patvirtinimo";
              return (
                <div key={r.id} className={`rounded-2xl border p-4 ${isApproved ? "border-primary/40 bg-primary/5" : "border-border bg-background/60"}`}>
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
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
        .order("task_date", { ascending: true })
        .limit(4);
      const list = (data as Array<{ id: string; title: string; task_date: string; available_hours: number; location: string; organization_id: string }>) ?? [];
      setTasks(list);
      const ids = Array.from(new Set(list.map((t) => t.organization_id).filter((v): v is string => !!v)));
      if (ids.length) {
        const { data: ps } = await supabase.from("profiles").select("id, organization_name, full_name").in("id", ids);
        const map: Record<string, { organization_name: string | null; full_name: string | null }> = {};
        (ps ?? []).forEach((p: { id: string; organization_name: string | null; full_name: string | null }) => (map[p.id] = p));
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
