import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "../components/layout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Search, ShieldCheck, Users, Clock, Target, FileSearch, X, CheckCircle2, XCircle, AlarmClock, MessageSquare, PlayCircle, ScrollText, Building2, UserPlus, AlertTriangle, Filter, ClipboardCheck, Download } from "lucide-react";
import { ChatDialog, type ChatReservation } from "@/components/chat-dialog";
import { CreateEventPanel } from "@/components/create-event-panel";
import { SchoolCreateOrgPanel } from "@/components/school-create-org-panel";
import { detectFlags, highestSeverity, type FraudFlag, type ReservationLike } from "@/lib/fraud-flags";
import { toast } from "sonner";

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
  class_year?: string | null;
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
  const [tab, setTab] = useState<"students" | "queue" | "orgs" | "events" | "accounts">("students");

  // Peržiūros eilė
  const [allRes, setAllRes] = useState<Reservation[]>([]);
  const [classFilter, setClassFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const REVIEWED_KEY = "sv_reviewed_reservations";
  const [reviewed, setReviewed] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(REVIEWED_KEY) || "[]")); } catch { return new Set(); }
  });
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [onlyUnreviewed, setOnlyUnreviewed] = useState(false);
  const persistReviewed = (s: Set<string>) => {
    setReviewed(new Set(s));
    localStorage.setItem(REVIEWED_KEY, JSON.stringify([...s]));
  };

  useEffect(() => {
    if (!user || profile?.role !== "school_admin") return;
    (async () => {
      const [{ data: st }, { data: og }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, hours_needed, hours_earned, class_year").eq("role", "student").order("full_name", { ascending: true }),
        supabase.from("profiles").select("id, full_name, email, organization_name").eq("role", "organization").order("organization_name", { ascending: true }),
      ]);

      setStudents((st as Student[]) ?? []);
      const orgList = (og as OrgProfile[]) ?? [];
      setOrgs(orgList);
      const m: Record<string, OrgProfile> = {};
      orgList.forEach((o) => (m[o.id] = o));
      setOrgMap(m);

      // Load recent reservations for the review queue
      const ids = (st as Student[] | null)?.map((s) => s.id) ?? [];
      if (ids.length) {
        const { data: rs } = await supabase
          .from("reservations")
          .select("*")
          .in("student_id", ids)
          .order("reservation_date", { ascending: false })
          .limit(500);
        setAllRes((rs as Reservation[]) ?? []);
      }
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

  const assignedClasses = profile?.assigned_classes ?? [];
  // If admin has classes assigned, restrict view to those only. Empty = see all (fallback for old accounts).
  const classRestricted = assignedClasses.length > 0;
  const filteredStudents = useMemo(
    () =>
      students
        .filter((s) => !classRestricted || (s.class_year && assignedClasses.includes(String(s.class_year))))
        .filter((s) => !q || (s.full_name ?? "").toLowerCase().includes(q.toLowerCase()) || (s.email ?? "").toLowerCase().includes(q.toLowerCase())),
    [students, q, classRestricted, assignedClasses],
  );

  // Klasių sąrašas iš mokinių
  const availableClasses = useMemo(() => {
    const s = new Set<string>();
    filteredStudents.forEach((st) => st.class_year && s.add(String(st.class_year)));
    return Array.from(s).sort();
  }, [filteredStudents]);

  const studentById = useMemo(() => {
    const m: Record<string, Student> = {};
    students.forEach((s) => (m[s.id] = s));
    return m;
  }, [students]);

  const flagsByRes = useMemo(() => {
    const byStudent: Record<string, ReservationLike[]> = {};
    allRes.forEach((r) => {
      (byStudent[r.student_id] ??= []).push(r as unknown as ReservationLike);
    });
    const m: Record<string, FraudFlag[]> = {};
    allRes.forEach((r) => {
      m[r.id] = detectFlags(r as unknown as ReservationLike, byStudent[r.student_id] ?? []);
    });
    return m;
  }, [allRes]);

  const visibleStudentIds = useMemo(() => new Set(filteredStudents.map((s) => s.id)), [filteredStudents]);

  const queueRows = useMemo(() => {
    return allRes
      .filter((r) => visibleStudentIds.has(r.student_id))
      .filter((r) => {
        if (classFilter === "all") return true;
        const s = studentById[r.student_id];
        return s?.class_year === classFilter;
      })
      .filter((r) => (onlyFlagged ? (flagsByRes[r.id]?.length ?? 0) > 0 : true))
      .filter((r) => (onlyUnreviewed ? !reviewed.has(r.id) : true))
      .filter((r) => {
        if (!q) return true;
        const s = studentById[r.student_id];
        return (s?.full_name ?? "").toLowerCase().includes(q.toLowerCase());
      });
  }, [allRes, visibleStudentIds, classFilter, studentById, onlyFlagged, onlyUnreviewed, reviewed, flagsByRes, q]);

  const flaggedCount = useMemo(() => queueRows.filter((r) => (flagsByRes[r.id]?.length ?? 0) > 0).length, [queueRows, flagsByRes]);
  const unreviewedCount = useMemo(() => queueRows.filter((r) => !reviewed.has(r.id)).length, [queueRows, reviewed]);

  const toggleSel = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () => setSelected(new Set(queueRows.map((r) => r.id)));
  const clearSel = () => setSelected(new Set());
  const bulkMarkReviewed = () => {
    const n = new Set(reviewed); selected.forEach((id) => n.add(id)); persistReviewed(n); clearSel();
    toast.success(`Pažymėta peržiūrėta: ${selected.size}`);
  };
  const bulkUnreview = () => {
    const n = new Set(reviewed); selected.forEach((id) => n.delete(id)); persistReviewed(n); clearSel();
    toast.success(`Peržiūros žymė nuimta: ${selected.size}`);
  };
  const exportSelected = () => {
    const rows = queueRows.filter((r) => selected.has(r.id));
    if (rows.length === 0) { toast.error("Pažymėk bent vieną eilutę"); return; }
    const header = ["Mokinys","Klasė","Data","Nuo","Iki","Valandų","Statusas","Organizacija","Įtarimai","Peržiūrėta"];
    const csv = [header.join(",")].concat(rows.map((r) => {
      const s = studentById[r.student_id];
      const fl = (flagsByRes[r.id] ?? []).map((f) => f.label).join("; ");
      return [
        `"${(s?.full_name ?? "").replace(/"/g,'""')}"`, s?.class_year ?? "",
        r.reservation_date, r.start_time?.slice(0,5), r.end_time?.slice(0,5),
        Number(r.hours_to_earn), r.status, `"${(orgMap[r.organization_id]?.organization_name ?? orgMap[r.organization_id]?.full_name ?? "").replace(/"/g,'""')}"`,
        `"${fl.replace(/"/g,'""')}"`, reviewed.has(r.id) ? "taip" : "ne",
      ].join(",");
    })).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `rezervacijos-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };


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
        {classRestricted && (
          <div className="mt-3 inline-flex flex-wrap items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Priskirtos klasės:</span>
            {assignedClasses.map((c) => (
              <span key={c} className="rounded-full bg-gradient-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">{c} kl.</span>
            ))}
          </div>
        )}
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
        <div className="rounded-3xl border border-border bg-gradient-card p-4 shadow-md backdrop-blur sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="inline-flex rounded-full border border-border bg-background/70 p-1">
                <button onClick={() => setTab("students")}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${tab === "students" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}>
                  Mokiniai
                </button>
                <button onClick={() => setTab("queue")}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${tab === "queue" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}>
                  <ClipboardCheck className="mr-1 inline h-3.5 w-3.5" /> Peržiūros eilė
                  {unreviewedCount > 0 && <span className="ml-1.5 rounded-full bg-warning/20 px-1.5 text-[10px] font-bold text-warning-foreground">{unreviewedCount}</span>}
                  {flaggedCount > 0 && <span className="ml-1 rounded-full bg-destructive/20 px-1.5 text-[10px] font-bold text-destructive">{flaggedCount}⚠</span>}
                </button>
                <button onClick={() => setTab("orgs")}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${tab === "orgs" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}>
                  Organizacijos partneriai
                </button>
                <button onClick={() => setTab("events")}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${tab === "events" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}>
                  Vienkartiniai renginiai
                </button>
                <button onClick={() => setTab("accounts")}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${tab === "accounts" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}>
                  <UserPlus className="mr-1 inline h-3.5 w-3.5" /> Naujos paskyros
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder={tab === "students" ? "Ieškoti mokinio…" : "Ieškoti organizacijos…"}
                className="h-10 w-full min-w-0 bg-transparent text-sm outline-none sm:w-56" />
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
          {tab === "queue" && (
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-background/60 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Filter className="h-3.5 w-3.5" /> Klasė:
                </div>
                <button onClick={() => setClassFilter("all")} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${classFilter === "all" ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"}`}>Visos</button>
                {availableClasses.map((c) => (
                  <button key={c} onClick={() => setClassFilter(c)} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${classFilter === c ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"}`}>{c}</button>
                ))}
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} /> Tik įtartinos
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <input type="checkbox" checked={onlyUnreviewed} onChange={(e) => setOnlyUnreviewed(e.target.checked)} /> Tik neperžiūrėtos
                  </label>
                </div>
              </div>

              {selected.size > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3">
                  <span className="text-xs font-semibold">Pažymėta: <b>{selected.size}</b></span>
                  <button onClick={bulkMarkReviewed} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"><CheckCircle2 className="h-3.5 w-3.5" /> Pažymėti peržiūrėtomis</button>
                  <button onClick={bulkUnreview} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent">Nuimti peržiūrą</button>
                  <button onClick={exportSelected} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent"><Download className="h-3.5 w-3.5" /> Eksportuoti CSV</button>
                  <button onClick={clearSel} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Atšaukti</button>
                </div>
              )}

              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-background/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="w-10 py-3 pl-3">
                        <input type="checkbox" checked={selected.size > 0 && selected.size === queueRows.length} onChange={(e) => e.target.checked ? selectAll() : clearSel()} />
                      </th>
                      <th className="py-3 pr-3">Mokinys</th>
                      <th className="hidden py-3 pr-3 md:table-cell">Klasė</th>
                      <th className="py-3 pr-3">Data · laikas</th>
                      <th className="py-3 pr-3">Val.</th>
                      <th className="hidden py-3 pr-3 md:table-cell">Organizacija</th>
                      <th className="py-3 pr-3">Statusas</th>
                      <th className="py-3 pr-3">Įtarimai</th>
                      <th className="py-3 pr-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueRows.length === 0 && (
                      <tr><td colSpan={9} className="py-10 text-center text-sm text-muted-foreground">Nieko nerasta pagal filtrus.</td></tr>
                    )}
                    {queueRows.map((r) => {
                      const s = studentById[r.student_id];
                      const fl = flagsByRes[r.id] ?? [];
                      const sev = highestSeverity(fl);
                      const sevTone = sev === "high" ? "bg-destructive/15 text-destructive border-destructive/30"
                        : sev === "medium" ? "bg-warning/15 text-warning-foreground border-warning/30"
                        : sev === "low" ? "bg-primary/10 text-primary border-primary/20" : "";
                      const isReviewed = reviewed.has(r.id);
                      return (
                        <tr key={r.id} className={`border-b border-border/50 transition hover:bg-accent/30 ${isReviewed ? "opacity-60" : ""}`}>
                          <td className="py-2 pl-3"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSel(r.id)} /></td>
                          <td className="py-2 pr-3 font-semibold">{s?.full_name ?? "—"}</td>
                          <td className="hidden py-2 pr-3 md:table-cell text-muted-foreground">{s?.class_year ?? "—"}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{r.reservation_date} · {r.start_time?.slice(0,5)}–{r.end_time?.slice(0,5)}</td>
                          <td className="py-2 pr-3 font-bold">{Number(r.hours_to_earn)}</td>
                          <td className="hidden py-2 pr-3 md:table-cell text-muted-foreground truncate max-w-[180px]">{orgMap[r.organization_id]?.organization_name ?? orgMap[r.organization_id]?.full_name ?? "—"}</td>
                          <td className="py-2 pr-3"><span className="rounded-full bg-accent px-2 py-0.5 text-xs">{STATUS_LT[r.status] ?? r.status}</span></td>
                          <td className="py-2 pr-3">
                            {fl.length === 0 ? <span className="text-xs text-muted-foreground">—</span> : (
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${sevTone}`} title={fl.map((x) => x.label).join("\n")}>
                                <AlertTriangle className="h-3 w-3" /> {fl.length}
                              </span>
                            )}
                          </td>
                          <td className="py-2 pr-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => s && setAuditing(s)} className="rounded-full border border-border bg-background px-2 py-1 text-[11px] hover:bg-accent" title="Auditas"><FileSearch className="h-3 w-3" /></button>
                              <button onClick={() => setChatRes({ id: r.id, student_id: r.student_id, organization_id: r.organization_id, organization_name: orgMap[r.organization_id]?.organization_name ?? orgMap[r.organization_id]?.full_name ?? "Organizacija" })} className="rounded-full border border-border bg-background px-2 py-1 text-[11px] hover:bg-accent" title="Pokalbis"><MessageSquare className="h-3 w-3" /></button>
                              <button onClick={() => { const n = new Set(reviewed); n.has(r.id) ? n.delete(r.id) : n.add(r.id); persistReviewed(n); }} className={`rounded-full border px-2 py-1 text-[11px] ${isReviewed ? "border-success/40 bg-success/10 text-success" : "border-border bg-background hover:bg-accent"}`}>
                                <CheckCircle2 className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
          {tab === "accounts" && (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <SchoolCreateOrgPanel />
              <div className="rounded-2xl border border-dashed border-border bg-background/40 p-5 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">Kada tai naudinga?</p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>Miesto <b>bendruomenė</b> priima mokinius savanoriauti.</li>
                  <li>Nauja <b>organizacija</b> nori bendradarbiauti tik su tavo mokykla.</li>
                  <li>Vienkartinis renginys, kuriam reikia atskiros paskyros.</li>
                </ul>
                <p className="mt-3 text-xs">Limitas — 10 paskyrų vienam mokyklos administratoriui. Kredencialus perduodi asmeniškai; vartotojas galės iškart prisijungti ir kurti užduotis.</p>
              </div>
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
