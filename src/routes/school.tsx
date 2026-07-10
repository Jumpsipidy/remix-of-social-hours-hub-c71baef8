import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "../components/layout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Search, ShieldCheck, Users, Clock, Target, FileSearch, X, CheckCircle2, XCircle, AlarmClock, MessageSquare, PlayCircle, ScrollText, Building2, UserPlus } from "lucide-react";
import { ChatDialog, type ChatReservation } from "@/components/chat-dialog";
import { CreateEventPanel } from "@/components/create-event-panel";
import { SchoolCreateOrgPanel } from "@/components/school-create-org-panel";

export const Route = createFileRoute("/school")({
  head: () => ({
    meta: [
      { title: "Mokyklos sritis — Socialinės Valandos" },
      { name: "description", content: "Stebėk mokinių progresą ir audituok savanorystės rezervacijas." },
    ],
  }),
  component: SchoolDashboard,
});

type Student = {
  id: string;
  full_name: string | null;
  email: string | null;
  hours_needed: number;
  hours_earned: number;
};

type Reservation = {
  id: string;
  student_id: string;
  organization_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  hours_to_earn: number;
  status: "pending" | "approved" | "completed" | "confirmed" | "declined";
  legal_disclosure?: string | null;
};

type OrgProfile = { id: string; full_name: string | null; organization_name: string | null; email: string | null };

const STATUS_LT: Record<string, string> = {
  pending: "Laukia patvirtinimo",
  approved: "Vykdoma",
  completed: "Užbaigta",
  confirmed: "Užbaigta",
  declined: "Atmesta",
};

function SchoolDashboard() {
  const { user, profile, loading } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [orgs, setOrgs] = useState<OrgProfile[]>([]);
  const [orgMap, setOrgMap] = useState<Record<string, OrgProfile>>({});
  const [q, setQ] = useState("");
  const [auditing, setAuditing] = useState<Student | null>(null);
  const [auditRes, setAuditRes] = useState<Reservation[]>([]);
  const [chatRes, setChatRes] = useState<ChatReservation | null>(null);
  const [tab, setTab] = useState<"students" | "orgs" | "events" | "accounts">("students");

  useEffect(() => {
    if (!user || profile?.role !== "school_admin") return;
    (async () => {
      const [{ data: st }, { data: og }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, hours_needed, hours_earned").eq("role", "student").order("full_name", { ascending: true }),
        supabase.from("profiles").select("id, full_name, email, organization_name").eq("role", "organization").order("organization_name", { ascending: true }),
      ]);
      setStudents((st as Student[]) ?? []);
      const orgList = (og as OrgProfile[]) ?? [];
      setOrgs(orgList);
      const m: Record<string, OrgProfile> = {};
      orgList.forEach((o) => (m[o.id] = o));
      setOrgMap(m);
    })();
  }, [user, profile]);

  useEffect(() => {
    if (!auditing) return;
    supabase
      .from("reservations")
      .select("*")
      .eq("student_id", auditing.id)
      .order("reservation_date", { ascending: false })
      .then(({ data }) => setAuditRes((data as Reservation[]) ?? []));
  }, [auditing]);

  const filteredStudents = useMemo(
    () => students.filter((s) => !q || (s.full_name ?? "").toLowerCase().includes(q.toLowerCase()) || (s.email ?? "").toLowerCase().includes(q.toLowerCase())),
    [students, q],
  );
  const filteredOrgs = useMemo(
    () => orgs.filter((o) => !q || (o.organization_name ?? o.full_name ?? "").toLowerCase().includes(q.toLowerCase())),
    [orgs, q],
  );

  const orgName = (id: string) => orgMap[id]?.organization_name ?? orgMap[id]?.full_name ?? "Organizacija";

  if (loading) {
    return <PageShell><div className="p-20 text-center text-muted-foreground">Kraunama…</div></PageShell>;
  }
  if (!user || profile?.role !== "school_admin") {
    return (
      <PageShell>
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Reikalingos mokyklos administratoriaus teisės</h1>
          <p className="mt-2 text-sm text-muted-foreground">Prisijunk su mokyklos administratoriaus paskyra.</p>
          <Link to="/login" className="mt-6 inline-flex rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">Prisijungti</Link>
        </div>
      </PageShell>
    );
  }

  const totalEarned = students.reduce((a, s) => a + Number(s.hours_earned ?? 0), 0);
  const totalNeeded = students.reduce((a, s) => a + Number(s.hours_needed ?? 0), 0);
  const avgPct = students.length ? Math.round(students.reduce((a, s) => a + (s.hours_needed ? Math.min(100, (Number(s.hours_earned) / Number(s.hours_needed)) * 100) : 0), 0) / students.length) : 0;
  const completedRes = auditRes.filter((r) => r.status === "completed" || r.status === "confirmed");

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Mokyklos sritis</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">Sveiki, {profile.full_name ?? "Administratoriau"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Stebėk mokyklos mokinius, audituok rezervacijas ir palaikyk ryšį su organizacijomis.</p>
      </section>

      <section className="mx-auto mt-8 grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {[
          { icon: Users, label: "Mokinių", value: students.length },
          { icon: Clock, label: "Surinkta valandų", value: totalEarned },
          { icon: Target, label: "Reikia valandų", value: totalNeeded },
          { icon: ShieldCheck, label: "Vidut. progresas", value: `${avgPct}%` },
        ].map((s) => (
          <motion.div key={s.label} whileHover={{ y: -3 }} className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md backdrop-blur transition">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
              <s.icon className="h-5 w-5" />
            </div>
            <p className="mt-5 font-display text-3xl font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 pb-16 sm:px-6">
        <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-full border border-border bg-background/70 p-1">
              <button onClick={() => setTab("students")}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === "students" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}>
                Mokiniai
              </button>
              <button onClick={() => setTab("orgs")}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === "orgs" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}>
                Organizacijos partneriai
              </button>
              <button onClick={() => setTab("events")}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === "events" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}>
                Vienkartiniai renginiai
              </button>
              <button onClick={() => setTab("accounts")}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === "accounts" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}>
                <UserPlus className="mr-1 inline h-3.5 w-3.5" /> Naujos paskyros
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder={tab === "students" ? "Ieškoti mokinio…" : "Ieškoti organizacijos…"}
                className="h-10 w-56 bg-transparent text-sm outline-none" />
            </div>
          </div>

          {tab === "students" && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 pr-3">Mokinys</th>
                    <th className="hidden py-3 pr-3 md:table-cell">El. paštas</th>
                    <th className="py-3 pr-3 text-right">Surinkta</th>
                    <th className="py-3 pr-3 text-right">Reikia</th>
                    <th className="py-3 pr-3">Progresas</th>
                    <th className="py-3 pr-3 text-right">Veiksmas</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => {
                    const pct = s.hours_needed ? Math.min(100, Math.round((Number(s.hours_earned) / Number(s.hours_needed)) * 100)) : 0;
                    return (
                      <tr key={s.id} className="border-b border-border/60 transition hover:bg-accent/40">
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
                              {(s.full_name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("")}
                            </div>
                            <span className="font-medium">{s.full_name ?? "—"}</span>
                          </div>
                        </td>
                        <td className="hidden py-3 pr-3 text-muted-foreground md:table-cell">{s.email}</td>
                        <td className="py-3 pr-3 text-right font-semibold">{Number(s.hours_earned)}</td>
                        <td className="py-3 pr-3 text-right text-muted-foreground">{s.hours_needed}</td>
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-40 overflow-hidden rounded-full bg-accent">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} className="h-full bg-gradient-primary" />
                            </div>
                            <span className="text-xs font-semibold tabular-nums">{pct}%</span>
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-right">
                          <button onClick={() => setAuditing(s)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold transition hover:bg-primary hover:text-primary-foreground">
                            <FileSearch className="h-3.5 w-3.5" /> Peržiūrėti įrodymus
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">Mokinių nerasta.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {tab === "orgs" && (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {filteredOrgs.map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4 transition hover:border-primary/40">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{o.organization_name ?? o.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{o.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setChatRes({ id: `direct-${o.id}`, student_id: user!.id, organization_id: o.id, organization_name: o.organization_name ?? o.full_name ?? "Organizacija", direct: true })}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Pokalbis
                  </button>
                </div>
              ))}
              {filteredOrgs.length === 0 && <div className="col-span-2 py-12 text-center text-sm text-muted-foreground">Organizacijų nerasta.</div>}
            </div>
          )}
          {tab === "events" && (
            <div className="mt-6">
              <CreateEventPanel />
            </div>
          )}
        </div>
      </section>

      {/* Audit drawer */}
      <AnimatePresence>
        {auditing && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-end bg-foreground/40 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setAuditing(null)}
          >
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }} onClick={(e) => e.stopPropagation()}
              className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-border bg-background shadow-elegant sm:rounded-3xl">
              <div className="flex items-start justify-between gap-4 border-b border-border bg-gradient-card p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Įrodymų peržiūra</p>
                  <h3 className="mt-1 font-display text-xl font-bold">{auditing.full_name}</h3>
                  <p className="text-xs text-muted-foreground">{auditing.email}</p>
                  <div className="mt-3 flex gap-3 text-xs">
                    <span className="rounded-full bg-success/15 px-2.5 py-1 font-semibold text-success">Užbaigta: {completedRes.length}</span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">Surinkta: {Number(auditing.hours_earned)} / {auditing.hours_needed} val.</span>
                  </div>
                </div>
                <button onClick={() => setAuditing(null)} className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-accent">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {auditRes.length === 0 && (
                  <div className="py-10 text-center text-sm text-muted-foreground">Šis mokinys dar neturi rezervacijų.</div>
                )}
                {auditRes.map((r) => {
                  const isDone = r.status === "completed" || r.status === "confirmed";
                  const tone = isDone ? "bg-success/15 text-success"
                    : r.status === "approved" ? "bg-primary/15 text-primary"
                    : r.status === "declined" ? "bg-destructive/15 text-destructive"
                    : "bg-warning/15 text-warning-foreground";
                  const Icon = isDone ? CheckCircle2 : r.status === "approved" ? PlayCircle : r.status === "declined" ? XCircle : AlarmClock;
                  return (
                    <div key={r.id} className="rounded-2xl border border-border bg-card/60 p-4 transition hover:border-primary/40">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{orgName(r.organization_id)}</p>
                          <p className="text-xs text-muted-foreground">{r.reservation_date} · {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)} · {Number(r.hours_to_earn)} val.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
                            <Icon className="h-3 w-3" /> {STATUS_LT[r.status] ?? r.status}
                          </span>
                          <button
                            onClick={() => setChatRes({ id: r.id, student_id: r.student_id, organization_id: r.organization_id, organization_name: orgName(r.organization_id) })}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-semibold hover:bg-accent"
                          >
                            <MessageSquare className="h-3 w-3" /> Pokalbis
                          </button>
                        </div>
                      </div>
                      {isDone && r.legal_disclosure && (
                        <div className="mt-3 rounded-xl border border-success/20 bg-success/5 p-3 text-xs text-foreground/80">
                          <p className="mb-1 inline-flex items-center gap-1 font-semibold text-success"><ScrollText className="h-3 w-3" /> Pasirašytas teisinis patvirtinimas</p>
                          <p className="whitespace-pre-wrap leading-relaxed">{r.legal_disclosure}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ChatDialog reservation={chatRes} onClose={() => setChatRes(null)} />
    </PageShell>
  );
}
