import { csvCell } from "@/lib/csv-safe";
import { QuickTiles } from "@/components/quick-tiles";
import { WrongRole } from "@/components/wrong-role";
import { MessageCircle } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlarmClock,
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  FileSearch,
  Filter,
  GraduationCap,
  MessageSquare,
  PlayCircle,
  ScrollText,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { PageShell } from "../components/layout";
import { StatTile, DASH_EMBER, DASH_GOLD, DASH_GREEN } from "@/components/dashboard-kit";
import { ChatDialog, type ChatReservation } from "@/components/chat-dialog";
import { CreateEventPanel } from "@/components/create-event-panel";
import { SchoolEventsManager } from "@/components/school-events-manager";
import { SchoolCreateOrgPanel } from "@/components/school-create-org-panel";
import { SchoolClaimPanel } from "@/components/school-claim-panel";
import { SchoolClassesPanel } from "@/components/school-classes-panel";
import { DashboardSkeleton } from "@/components/skeleton-loader";
import { useAuth } from "@/hooks/use-auth";
import {
  getSchoolSnapshot,
  getSchoolStudentReservations,
  type SchoolScope,
  type SchoolReservation,
} from "@/lib/school-data.functions";

import {
  detectFlags,
  highestSeverity,
  type FraudFlag,
  type ReservationLike,
} from "@/lib/fraud-flags";
import { loadAntiCheatConfig } from "@/lib/anti-cheat-config";
import { RiskCenter } from "@/components/school/risk-center";
import { CertificateVerifyPanel } from "@/components/certificate-verify-panel";
import { toast } from "sonner";

const SCHOOL_TABS = [
  "overview", "students", "classes", "queue", "risk", "verify", "orgs", "events", "accounts",
] as const;

export const Route = createFileRoute("/school")({
  // Kiekviena sekcija turi savo adresą – atsidaro kaip atskiras puslapis,
  // o ne kaip turinys, kurį reikia slinkti žemyn.
  validateSearch: (search: Record<string, unknown>) => {
    const t = String(search?.tab ?? "overview");
    const tab: SchoolTab = (SCHOOL_TABS as readonly string[]).includes(t) ? (t as SchoolTab) : "overview";
    return { tab } as { tab?: SchoolTab };
  },
  head: () => ({
    meta: [
      { title: "Mokyklos sritis — Socialinės Valandos" },
      {
        name: "description",
        content:
          "Stebėk priskirtų klasių mokinių progresą, audituok rezervacijas ir valdyk mokyklos partnerius.",
      },
      { name: "robots", content: "noindex, nofollow" },
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
  created_at?: string;
  checked_in_at?: string | null;
  checked_in_by?: string | null;
};

type OrgProfile = {
  id: string;
  full_name: string | null;
  organization_name: string | null;
  email: string | null;
};
type SchoolTab =
  | "overview"
  | "students"
  | "classes"
  | "queue"
  | "risk"
  | "verify"
  | "orgs"
  | "events"
  | "accounts";

const STATUS_LT: Record<string, string> = {
  pending: "Laukia patvirtinimo",
  approved: "Vykdoma",
  completed: "Užbaigta",
  confirmed: "Užbaigta",
  declined: "Atmesta",
};

const REVIEWED_KEY = "sv_reviewed_reservations";

function pct(student: Student) {
  return student.hours_needed
    ? Math.min(100, Math.round((Number(student.hours_earned) / Number(student.hours_needed)) * 100))
    : 0;
}

function SchoolDashboard() {
  const { user, profile, loading } = useAuth();
  const [eventsKey, setEventsKey] = useState(0);
  const [students, setStudents] = useState<Student[]>([]);
  const [orgs, setOrgs] = useState<OrgProfile[]>([]);
  const [orgMap, setOrgMap] = useState<Record<string, OrgProfile>>({});
  const [q, setQ] = useState("");
  const [auditing, setAuditing] = useState<Student | null>(null);
  const [auditRes, setAuditRes] = useState<Reservation[]>([]);
  const [chatRes, setChatRes] = useState<ChatReservation | null>(null);
  const { tab = "overview" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const setTab = useCallback(
    (next: SchoolTab) => {
      void navigate({ search: { tab: next } });
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [navigate],
  );
  const [antiCheatCfg, setAntiCheatCfg] = useState<Record<string, boolean> | undefined>(undefined);
  useEffect(() => setAntiCheatCfg(loadAntiCheatConfig()), []);
  const [allRes, setAllRes] = useState<Reservation[]>([]);
  const [classFilter, setClassFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [onlyUnreviewed, setOnlyUnreviewed] = useState(false);
  const [reviewed, setReviewed] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(REVIEWED_KEY) || "[]"));
    } catch {
      return new Set();
    }
  });

  const [scope, setScope] = useState<SchoolScope | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const assignedClasses = useMemo(
    () => scope?.assigned_classes ?? profile?.assigned_classes ?? [],
    [scope?.assigned_classes, profile?.assigned_classes],
  );
  const classRestricted = (scope?.class_restricted ?? assignedClasses.length > 0) === true;

  const refresh = useCallback(async () => {
    if (!user || (profile?.role !== "school_admin" && profile?.role !== "admin")) return;
    setDataLoading(true);
    try {
      const snap = await getSchoolSnapshot();
      setScope(snap.scope ?? null);
      // Serveris jau apriboja pagal mokyklą + priskirtas klases.
      const rawStudents = snap.students as Student[];
      setStudents(rawStudents);

      const orgList = snap.organizations as OrgProfile[];
      setOrgs(orgList);
      const nextMap: Record<string, OrgProfile> = {};
      orgList.forEach((o) => (nextMap[o.id] = o));
      setOrgMap(nextMap);

      const allowed = new Set(rawStudents.map((s) => s.id));
      setAllRes((snap.reservations as Reservation[]).filter((r) => allowed.has(r.student_id)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepavyko įkelti mokyklos duomenų");
    } finally {
      setDataLoading(false);
    }
  }, [profile?.role, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!auditing) return;
    let active = true;
    getSchoolStudentReservations({ data: { studentId: auditing.id } })
      .then((rows: SchoolReservation[]) => {
        if (active) setAuditRes((rows as Reservation[]) ?? []);
      })
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : "Nepavyko įkelti audito");
      });
    return () => {
      active = false;
    };
  }, [auditing]);


  const filteredStudents = useMemo(() => {
    const term = q.toLowerCase().trim();
    return students.filter(
      (s) =>
        !term ||
        (s.full_name ?? "").toLowerCase().includes(term) ||
        (s.email ?? "").toLowerCase().includes(term) ||
        (s.class_year ?? "").toLowerCase().includes(term),
    );
  }, [students, q]);

  const availableClasses = useMemo(() => {
    const s = new Set<string>();
    students.forEach((st) => st.class_year && s.add(String(st.class_year)));
    return Array.from(s).sort((a, b) => Number(a) - Number(b));
  }, [students]);

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
      m[r.id] = detectFlags(r as unknown as ReservationLike, byStudent[r.student_id] ?? [], {
        config: antiCheatCfg,
        hoursNeeded: studentById[r.student_id]?.hours_needed,
      });
    });
    return m;
  }, [allRes, antiCheatCfg, studentById]);


  const visibleStudentIds = useMemo(
    () => new Set(filteredStudents.map((s) => s.id)),
    [filteredStudents],
  );

  const queueRows = useMemo(() => {
    return allRes
      .filter((r) => visibleStudentIds.has(r.student_id))
      .filter((r) => classFilter === "all" || studentById[r.student_id]?.class_year === classFilter)
      .filter((r) => (onlyFlagged ? (flagsByRes[r.id]?.length ?? 0) > 0 : true))
      .filter((r) => (onlyUnreviewed ? !reviewed.has(r.id) : true))
      .filter((r) => {
        const term = q.toLowerCase().trim();
        if (!term) return true;
        const s = studentById[r.student_id];
        return (
          (s?.full_name ?? "").toLowerCase().includes(term) ||
          (orgMap[r.organization_id]?.organization_name ?? "").toLowerCase().includes(term)
        );
      });
  }, [
    allRes,
    visibleStudentIds,
    classFilter,
    studentById,
    onlyFlagged,
    onlyUnreviewed,
    reviewed,
    flagsByRes,
    q,
    orgMap,
  ]);

  const classRows = useMemo(() => {
    return availableClasses.map((klass) => {
      const classStudents = students.filter((s) => s.class_year === klass);
      const ids = new Set(classStudents.map((s) => s.id));
      const reservations = allRes.filter((r) => ids.has(r.student_id));
      const earned = classStudents.reduce((a, s) => a + Number(s.hours_earned ?? 0), 0);
      const needed = classStudents.reduce((a, s) => a + Number(s.hours_needed ?? 0), 0);
      const risks = reservations.filter((r) => (flagsByRes[r.id]?.length ?? 0) > 0).length;
      const inactive = classStudents.filter((s) => Number(s.hours_earned ?? 0) === 0).length;
      return {
        klass,
        students: classStudents.length,
        earned,
        needed,
        progress: needed ? Math.round((earned / needed) * 100) : 0,
        reservations: reservations.length,
        risks,
        inactive,
      };
    });
  }, [availableClasses, students, allRes, flagsByRes]);

  const riskStudents = useMemo(() => {
    return students
      .map((student) => {
        const reservations = allRes.filter((r) => r.student_id === student.id);
        const flags = reservations.flatMap((r) => flagsByRes[r.id] ?? []);
        const p = pct(student);
        const overdue = p < 35;
        return {
          student,
          reservations,
          flags,
          progress: p,
          score: flags.length * 20 + (overdue ? 30 : 0) + (reservations.length === 0 ? 20 : 0),
        };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [students, allRes, flagsByRes]);

  const filteredOrgs = useMemo(() => {
    const term = q.toLowerCase().trim();
    return orgs.filter(
      (o) =>
        !term ||
        (o.organization_name ?? o.full_name ?? "").toLowerCase().includes(term) ||
        (o.email ?? "").toLowerCase().includes(term),
    );
  }, [orgs, q]);

  const flaggedCount = queueRows.filter((r) => (flagsByRes[r.id]?.length ?? 0) > 0).length;
  const unreviewedCount = queueRows.filter((r) => !reviewed.has(r.id)).length;
  const totalEarned = students.reduce((a, s) => a + Number(s.hours_earned ?? 0), 0);
  const totalNeeded = students.reduce((a, s) => a + Number(s.hours_needed ?? 0), 0);
  const avgPct = students.length
    ? Math.round(students.reduce((a, s) => a + pct(s), 0) / students.length)
    : 0;
  const completedCount = allRes.filter(
    (r) => r.status === "completed" || r.status === "confirmed",
  ).length;
  const pendingCount = allRes.filter((r) => r.status === "pending").length;
  const completedRes = auditRes.filter((r) => r.status === "completed" || r.status === "confirmed");
  /* Mokyklos masto anti-sukčiavimo suvestinė: kiek valandų turi QR įrodymą. */
  const schoolCompleted = allRes.filter(
    (r) => r.status === "completed" || r.status === "confirmed",
  );
  const schoolVerifiedHours = schoolCompleted.reduce(
    (a, r) => (r.checked_in_at ? a + Number(r.hours_to_earn ?? 0) : a),
    0,
  );
  const schoolUnverifiedHours = schoolCompleted.reduce(
    (a, r) => (r.checked_in_at ? a : a + Number(r.hours_to_earn ?? 0)),
    0,
  );
  const schoolTotalHours = schoolVerifiedHours + schoolUnverifiedHours;
  const verifiedPct = schoolTotalHours
    ? Math.round((schoolVerifiedHours / schoolTotalHours) * 100)
    : 0;
  const unverifiedRows = schoolCompleted.filter((r) => !r.checked_in_at).length;

  const orgName = (id: string) =>
    orgMap[id]?.organization_name ?? orgMap[id]?.full_name ?? "Organizacija";

  const persistReviewed = (s: Set<string>) => {
    setReviewed(new Set(s));
    localStorage.setItem(REVIEWED_KEY, JSON.stringify([...s]));
  };
  const toggleSel = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const selectAll = () => setSelected(new Set(queueRows.map((r) => r.id)));
  const clearSel = () => setSelected(new Set());
  const bulkMarkReviewed = () => {
    const n = new Set(reviewed);
    selected.forEach((id) => n.add(id));
    persistReviewed(n);
    clearSel();
    toast.success(`Pažymėta peržiūrėta: ${selected.size}`);
  };
  const bulkUnreview = () => {
    const n = new Set(reviewed);
    selected.forEach((id) => n.delete(id));
    persistReviewed(n);
    clearSel();
    toast.success(`Peržiūros žymė nuimta: ${selected.size}`);
  };
  const exportSelected = () => {
    const rows = queueRows.filter((r) => selected.has(r.id));
    if (rows.length === 0) {
      toast.error("Pažymėk bent vieną eilutę");
      return;
    }
    const header = [
      "Mokinys",
      "Klasė",
      "Data",
      "Nuo",
      "Iki",
      "Valandų",
      "Statusas",
      "Organizacija",
      "Įtarimai",
      "Peržiūrėta",
    ];
    const csv = [header.join(",")]
      .concat(
        rows.map((r) => {
          const s = studentById[r.student_id];
          const fl = (flagsByRes[r.id] ?? []).map((f) => f.label).join("; ");
          return [
            csvCell(s?.full_name ?? ""),
            csvCell(s?.class_year ?? ""),
            r.reservation_date,
            r.start_time?.slice(0, 5),
            r.end_time?.slice(0, 5),
            Number(r.hours_to_earn),
            r.status,
            csvCell(orgName(r.organization_id)),
            csvCell(fl),
            reviewed.has(r.id) ? "taip" : "ne",
          ].join(",");
        }),
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rezervacijos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <PageShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-10">
          <DashboardSkeleton />
        </div>
      </PageShell>
    );
  }

  if (user && profile?.role && profile.role !== "school_admin" && profile.role !== "admin") return <WrongRole role={profile.role} />;
  if (!user || (profile?.role !== "school_admin" && profile?.role !== "admin")) {
    return (
      <PageShell>
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Reikalingos mokyklos administratoriaus teisės</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Prisijunk su mokyklos administratoriaus paskyra.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Prisijungti
          </Link>
        </div>
      </PageShell>
    );
  }

  const nav = [
    { id: "overview", label: "Apžvalga", icon: BarChart3, badge: "live" },
    { id: "students", label: "Mokiniai", icon: Users, badge: String(students.length) },
    { id: "classes", label: "Klasės", icon: GraduationCap, badge: String(availableClasses.length) },
    { id: "queue", label: "Peržiūros eilė", icon: ClipboardCheck, badge: String(unreviewedCount) },
    {
      id: "risk",
      label: "Rizikos centras",
      icon: AlertTriangle,
      badge: String(riskStudents.length),
    },
    { id: "verify", label: "PDF / QR patikra", icon: ShieldCheck, badge: "skenuoti" },
    { id: "orgs", label: "Partneriai", icon: Building2, badge: String(orgs.length) },
    { id: "events", label: "Renginiai", icon: CalendarPlus, badge: "kurti" },
    { id: "accounts", label: "Paskyros", icon: UserPlus, badge: "org" },
  ] satisfies Array<{ id: SchoolTab; label: string; icon: typeof Users; badge: string }>;

  return (
    <PageShell>
      <section className="dash-v3 mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <header className="border-b border-border pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">
                {classRestricted ? "Klasės auklėtojo kabinetas" : "Mokyklos vadovo kabinetas"}
              </p>
              <h1 className="truncate font-display text-xl font-bold sm:text-2xl">
                {profile.full_name ?? "Administratorius"}
              </h1>
            </div>
            <div className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 sm:w-80">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ieškoti mokinio, klasės, partnerio…"
                className="h-10 w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Prieiga:</span>
            {classRestricted ? (
              assignedClasses.map((c) => (
                <span key={c} className="rounded-md bg-primary/10 px-2 py-0.5 font-semibold text-primary">{c} kl.</span>
              ))
            ) : (
              <span className="rounded-md bg-primary/10 px-2 py-0.5 font-semibold text-primary">Visa mokykla</span>
            )}
          </div>
        </header>

        <nav className="sticky top-16 z-20 -mx-4 flex gap-1 overflow-x-auto border-b border-border bg-background/95 px-4 sm:mx-0 sm:px-0" aria-label="Mokyklos skiltys">
          {nav.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${tab === item.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{item.badge}</span>
            </button>
          ))}
          <Link to="/chat" className="-mb-px flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <MessageCircle className="h-4 w-4" /> Pokalbiai
          </Link>
        </nav>

        <main className="mt-6 min-w-0 space-y-6">
          {dataLoading && <DashboardSkeleton />}

          {scope?.unscoped && (
            <>
              <SchoolClaimPanel onClaimed={() => void refresh()} />
              <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
                Paskyra dar nepririšta prie mokyklos, todėl mokinių duomenys nerodomi. Įvesk
                mokyklos kodą viršuje — po to lentelės užsipildys realiais duomenimis.
              </div>
            </>
          )}

          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">
              {nav.find((n) => n.id === tab)?.label}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {classRestricted
                ? `Matai tik priskirtų klasių (${assignedClasses.join(", ")}) mokinius.`
                : "Visa įstaiga — klasės, mokiniai ir organizacijos vienoje vietoje."}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              icon={Users}
              label="Mokinių prieigoje"
              value={students.length}
              hint={classRestricted ? "tik priskirtos klasės" : "visa mokykla"}
              accent={DASH_EMBER}
            />
            <Metric
              icon={Clock}
              label="Surinkta valandų"
              value={totalEarned}
              hint={`${totalNeeded} val. tikslas`}
              accent={DASH_GREEN}
            />
            <Metric
              icon={TrendingUp}
              label="Vidut. progresas"
              value={`${avgPct}%`}
              hint={`${completedCount} užbaigtų rezervacijų`}
              accent={DASH_GREEN}
            />
            <Metric
              icon={Activity}
              label="Reikia dėmesio"
              value={riskStudents.length}
              hint={`${pendingCount} laukia patvirtinimo`}
              accent={DASH_GOLD}
            />
          </div>

          {/* Anti-sukčiavimo / valandų tikrumo juosta */}
          <div className="rounded-3xl border border-border bg-card/60 p-5 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-success/15 text-success">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-lg font-bold">Valandų tikrumo patikra</p>
                  <p className="text-xs text-muted-foreground">
                    „QR patvirtinta“ = organizacija vietoje nuskenavo mokinio kodą. Be QR — tik
                    organizacijos rankinis patvirtinimas, todėl reikia papildomos peržiūros.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-success">
                  <ShieldCheck className="h-3.5 w-3.5" /> QR patvirtinta:{" "}
                  {schoolVerifiedHours.toFixed(1)} val.
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 ${
                    schoolUnverifiedHours > 0
                      ? "border-warning/40 bg-warning/10 text-warning-foreground"
                      : "border-border bg-accent text-muted-foreground"
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> Be QR įrodymo:{" "}
                  {schoolUnverifiedHours.toFixed(1)} val. ({unverifiedRows} įrašai)
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-accent px-3 py-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Įtartinų rezervacijų: {flaggedCount}
                </span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-accent">
                <motion.div
                  className="h-full rounded-full bg-success"
                  initial={{ width: 0 }}
                  animate={{ width: `${verifiedPct}%` }}
                />
              </div>
              <span className="text-sm font-bold tabular-nums">{verifiedPct}% su įrodymu</span>
            </div>
          </div>



          {tab === "overview" && (
            <div className="mb-4">
              <QuickTiles tiles={[
                { label: "Peržiūros eilė", value: unreviewedCount, hint: "Nepatvirtintos rezervacijos", icon: ClipboardCheck, tone: unreviewedCount ? "warning" : "default", onClick: () => setTab("queue") },
                { label: "Rizika", value: riskStudents.length, hint: "Reikia dėmesio", icon: ShieldCheck, onClick: () => setTab("risk") },
                { label: "Mokiniai", value: students.length, hint: "Visi mokyklos", icon: Users, onClick: () => setTab("students") },
                { label: "Pokalbiai", hint: "Su organizacijomis", icon: MessageCircle, to: "/chat" },
                { label: "PDF / QR patikra", hint: "Pažymėjimų tikrinimas", icon: ShieldCheck, onClick: () => setTab("verify") },
                { label: "Sukurti renginį", hint: "Mokyklos renginys", icon: CalendarPlus, tone: "primary", onClick: () => setTab("events") },
              ]} />
            </div>
          )}
          {tab === "overview" && (
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <Panel title="Klasės progresas" subtitle="Greita priskirtų klasių sveikatos būsena">
                <div className="space-y-3">
                  {classRows.map((row) => (
                    <button
                      key={row.klass}
                      onClick={() => {
                        setClassFilter(row.klass);
                        setTab("classes");
                      }}
                      className="w-full rounded-2xl border border-border bg-background/55 p-4 text-left transition hover:border-primary/50 hover:bg-accent/30"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-display text-xl font-bold">{row.klass} klasė</p>
                          <p className="text-xs text-muted-foreground">
                            {row.students} mokinių · {row.reservations} rezervacijų
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="mt-4 flex items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-accent">
                          <motion.div
                            className="h-full bg-gradient-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, row.progress)}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold tabular-nums">{row.progress}%</span>
                      </div>
                    </button>
                  ))}
                  {classRows.length === 0 && <Empty text="Priskirtose klasėse mokinių nėra." />}
                </div>
              </Panel>
              <Panel title="Greiti signalai" subtitle="Kas pirmiausia reikalauja peržiūros">
                <div className="space-y-3">
                  {riskStudents.slice(0, 6).map(({ student, flags, progress, score }) => (
                    <button
                      key={student.id}
                      onClick={() => setAuditing(student)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background/55 p-3 text-left transition hover:border-warning/50 hover:bg-warning/5"
                    >
                      <Avatar name={student.full_name} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{student.full_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {student.class_year ?? "—"} kl. · {progress}% · {flags.length} įtarimų
                        </p>
                      </div>
                      <span className="rounded-full bg-warning/15 px-2 py-1 text-[11px] font-bold text-warning-foreground">
                        {score}
                      </span>
                    </button>
                  ))}
                  {riskStudents.length === 0 && <Empty text="Rizikos signalų nėra." />}
                </div>
              </Panel>
            </div>
          )}

          {tab === "students" && (
            <Panel
              title="Mokinių monitoringas"
              subtitle="Progresas, valandos ir individualus auditas"
            >
              <StudentsTable students={filteredStudents} onAudit={setAuditing} />
            </Panel>
          )}

          {tab === "classes" && (
            <SchoolClassesPanel current={assignedClasses} onSaved={() => void refresh()} />
          )}

          {tab === "classes" && (
            <Panel
              title="Per-klasės vaizdas"
              subtitle="Matomos tik administratoriui priskirtos klasės"
            >
              <div className="grid gap-4 lg:grid-cols-2">
                {classRows.map((row) => (
                  <div
                    key={row.klass}
                    className="rounded-2xl border border-border bg-background/55 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-2xl font-bold">{row.klass} klasė</p>
                        <p className="text-sm text-muted-foreground">
                          {row.students} mokiniai · {row.inactive} be progreso
                        </p>
                      </div>
                      {row.risks > 0 && (
                        <span className="rounded-full bg-destructive/15 px-2 py-1 text-xs font-bold text-destructive">
                          {row.risks} rizikos
                        </span>
                      )}
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                      <MiniStat label="Surinkta" value={row.earned} />
                      <MiniStat label="Tikslas" value={row.needed} />
                      <MiniStat label="Rezerv." value={row.reservations} />
                    </div>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-accent">
                      <div
                        className="h-full bg-gradient-primary"
                        style={{ width: `${Math.min(100, row.progress)}%` }}
                      />
                    </div>
                  </div>
                ))}
                {classRows.length === 0 && <Empty text="Klasių duomenų nėra." />}
              </div>
            </Panel>
          )}

          {tab === "queue" && (
            <Panel
              title="Rezervacijų peržiūros eilė"
              subtitle="Auditas, CSV eksportas ir peržiūrėjimo žymos"
            >
              <QueueControls
                availableClasses={availableClasses}
                classFilter={classFilter}
                setClassFilter={setClassFilter}
                onlyFlagged={onlyFlagged}
                setOnlyFlagged={setOnlyFlagged}
                onlyUnreviewed={onlyUnreviewed}
                setOnlyUnreviewed={setOnlyUnreviewed}
              />
              {selected.size > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3">
                  <span className="text-xs font-semibold">
                    Pažymėta: <b>{selected.size}</b>
                  </span>
                  <button
                    onClick={bulkMarkReviewed}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Pažymėti peržiūrėtomis
                  </button>
                  <button
                    onClick={bulkUnreview}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                  >
                    Nuimti peržiūrą
                  </button>
                  <button
                    onClick={exportSelected}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                  >
                    <Download className="h-3.5 w-3.5" /> Eksportuoti CSV
                  </button>
                  <button
                    onClick={clearSel}
                    className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                  >
                    Atšaukti
                  </button>
                </div>
              )}
              <QueueTable
                rows={queueRows}
                studentById={studentById}
                orgMap={orgMap}
                flagsByRes={flagsByRes}
                selected={selected}
                reviewed={reviewed}
                toggleSel={toggleSel}
                selectAll={selectAll}
                clearSel={clearSel}
                setAuditing={setAuditing}
                setChatRes={setChatRes}
                persistReviewed={persistReviewed}
              />
            </Panel>
          )}

          {tab === "risk" && (
            <Panel
              title="Rizikos centras"
              subtitle="Paspausk kortelę, kad filtruotum. Peržiūra atidaro visą mokinio istoriją."
            >
              <RiskCenter rows={riskStudents} onAudit={setAuditing} />
            </Panel>
          )}

          {tab === "orgs" && (
            <Panel
              title="Organizacijos partneriai"
              subtitle="Kontaktai ir pokalbiai su partneriais"
            >
              <div className="grid gap-3 md:grid-cols-2">
                {filteredOrgs.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/55 p-4 transition hover:border-primary/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {o.organization_name ?? o.full_name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{o.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setChatRes({
                          id: `direct-${o.id}`,
                          student_id: user.id,
                          organization_id: o.id,
                          organization_name: o.organization_name ?? o.full_name ?? "Organizacija",
                          direct: true,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Pokalbis
                    </button>
                  </div>
                ))}
                {filteredOrgs.length === 0 && <Empty text="Organizacijų nerasta." />}
              </div>
            </Panel>
          )}

          {tab === "verify" && (
            <Panel
              title="Mokinio pažymos patikra"
              subtitle="Mokinys atneša PDF su QR kodu — nuskenuok arba įvesk kodą ir palygink su tikrais duomenimis"
            >
              <CertificateVerifyPanel />
            </Panel>
          )}

          {tab === "events" && (
            <Panel title="Vienkartiniai renginiai" subtitle="Mokyklos admino kuriamos veiklos">
              <CreateEventPanel onCreated={() => setEventsKey((k) => k + 1)} />
            </Panel>
          )}
          {tab === "events" && (
            <Panel title="Užsiregistravę mokiniai" subtitle="Priimk arba atmesk mokinius, po renginio patvirtink valandas">
              <SchoolEventsManager refreshKey={eventsKey} />
            </Panel>
          )}

          {tab === "accounts" && (
            <Panel
              title="Naujos partnerių paskyros"
              subtitle="Kurk organizacijų paskyras savo mokyklos veikloms"
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <SchoolCreateOrgPanel />
                <div className="rounded-2xl border border-dashed border-border bg-background/40 p-5 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">Prieigos taisyklė</p>
                  <p className="mt-2">
                    Ši sritis skirta tik tavo mokyklos partneriams. Mokinių monitoringas lieka
                    apribotas pagal <b>assigned_classes</b>, todėl kitos klasės / mokyklos
                    neatsidengia.
                  </p>
                  <p className="mt-3 text-xs">
                    Limitas — 10 paskyrų vienam mokyklos administratoriui.
                  </p>
                </div>
              </div>
            </Panel>
          )}
        </main>
      </section>

      <AuditDrawer
        auditing={auditing}
        setAuditing={setAuditing}
        auditRes={auditRes}
        completedRes={completedRes}
        orgName={orgName}
        setChatRes={setChatRes}
      />
      <ChatDialog reservation={chatRes} onClose={() => setChatRes(null)} />
    </PageShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  accent = DASH_EMBER,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  hint: string;
  accent?: string;
}) {
  return <StatTile icon={Icon} label={label} value={value} sub={hint} accent={accent} />;
}


function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-border bg-gradient-card p-5 shadow-elegant backdrop-blur sm:p-6">
      <div className="mb-5">
        <h3 className="font-display text-2xl font-bold">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Avatar({ name }: { name: string | null }) {
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
      {(name ?? "?")
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <p className="font-display text-lg font-bold">{value}</p>
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
}

function StudentsTable({
  students,
  onAudit,
}: {
  students: Student[];
  onAudit: (student: Student) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="py-3 pr-3">Mokinys</th>
            <th className="hidden py-3 pr-3 md:table-cell">El. paštas</th>
            <th className="py-3 pr-3">Klasė</th>
            <th className="py-3 pr-3 text-right">Surinkta</th>
            <th className="py-3 pr-3">Progresas</th>
            <th className="py-3 pr-3 text-right">Veiksmas</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => {
            const p = pct(s);
            return (
              <tr key={s.id} className="border-b border-border/60 transition hover:bg-accent/40">
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.full_name} />
                    <span className="font-medium">{s.full_name ?? "—"}</span>
                  </div>
                </td>
                <td className="hidden py-3 pr-3 text-muted-foreground md:table-cell">{s.email}</td>
                <td className="py-3 pr-3 text-muted-foreground">{s.class_year ?? "—"}</td>
                <td className="py-3 pr-3 text-right font-semibold">
                  {Number(s.hours_earned)} / {s.hours_needed}
                </td>
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-40 overflow-hidden rounded-full bg-accent">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${p}%` }}
                        transition={{ duration: 0.6 }}
                        className="h-full bg-gradient-primary"
                      />
                    </div>
                    <span className="text-xs font-semibold tabular-nums">{p}%</span>
                  </div>
                </td>
                <td className="py-3 pr-3 text-right">
                  <button
                    onClick={() => onAudit(s)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold transition hover:bg-primary hover:text-primary-foreground"
                  >
                    <FileSearch className="h-3.5 w-3.5" /> Auditas
                  </button>
                </td>
              </tr>
            );
          })}
          {students.length === 0 && (
            <tr>
              <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                Mokinių nerasta.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function QueueControls(props: {
  availableClasses: string[];
  classFilter: string;
  setClassFilter: (v: string) => void;
  onlyFlagged: boolean;
  setOnlyFlagged: (v: boolean) => void;
  onlyUnreviewed: boolean;
  setOnlyUnreviewed: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-background/60 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Filter className="h-3.5 w-3.5" /> Klasė:
      </div>
      <button
        onClick={() => props.setClassFilter("all")}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${props.classFilter === "all" ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"}`}
      >
        Visos
      </button>
      {props.availableClasses.map((c) => (
        <button
          key={c}
          onClick={() => props.setClassFilter(c)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${props.classFilter === c ? "bg-primary text-primary-foreground" : "border border-border hover:bg-accent"}`}
        >
          {c}
        </button>
      ))}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <input
            type="checkbox"
            checked={props.onlyFlagged}
            onChange={(e) => props.setOnlyFlagged(e.target.checked)}
          />{" "}
          Tik įtartinos
        </label>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <input
            type="checkbox"
            checked={props.onlyUnreviewed}
            onChange={(e) => props.setOnlyUnreviewed(e.target.checked)}
          />{" "}
          Tik neperžiūrėtos
        </label>
      </div>
    </div>
  );
}

function QueueTable({
  rows,
  studentById,
  orgMap,
  flagsByRes,
  selected,
  reviewed,
  toggleSel,
  selectAll,
  clearSel,
  setAuditing,
  setChatRes,
  persistReviewed,
}: {
  rows: Reservation[];
  studentById: Record<string, Student>;
  orgMap: Record<string, OrgProfile>;
  flagsByRes: Record<string, FraudFlag[]>;
  selected: Set<string>;
  reviewed: Set<string>;
  toggleSel: (id: string) => void;
  selectAll: () => void;
  clearSel: () => void;
  setAuditing: (student: Student) => void;
  setChatRes: (r: ChatReservation) => void;
  persistReviewed: (s: Set<string>) => void;
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-background/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="w-10 py-3 pl-3">
              <input
                type="checkbox"
                checked={selected.size > 0 && selected.size === rows.length}
                onChange={(e) => (e.target.checked ? selectAll() : clearSel())}
              />
            </th>
            <th className="py-3 pr-3">Mokinys</th>
            <th className="hidden py-3 pr-3 md:table-cell">Klasė</th>
            <th className="py-3 pr-3">Data · laikas</th>
            <th className="py-3 pr-3">Val.</th>
            <th className="hidden py-3 pr-3 md:table-cell">Organizacija</th>
            <th className="py-3 pr-3">Statusas</th>
            <th className="py-3 pr-3">Įrodymas</th>
            <th className="py-3 pr-3">Įtarimai</th>

            <th className="py-3 pr-3"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                Nieko nerasta pagal filtrus.
              </td>
            </tr>
          )}
          {rows.map((r) => {
            const s = studentById[r.student_id];
            const fl = flagsByRes[r.id] ?? [];
            const sev = highestSeverity(fl);
            const sevTone =
              sev === "high"
                ? "bg-destructive/15 text-destructive border-destructive/30"
                : sev === "medium"
                  ? "bg-warning/15 text-warning-foreground border-warning/30"
                  : sev === "low"
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "";
            const isReviewed = reviewed.has(r.id);
            return (
              <tr
                key={r.id}
                className={`border-b border-border/50 transition hover:bg-accent/30 ${isReviewed ? "opacity-60" : ""}`}
              >
                <td className="py-2 pl-3">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggleSel(r.id)}
                  />
                </td>
                <td className="py-2 pr-3 font-semibold">{s?.full_name ?? "—"}</td>
                <td className="hidden py-2 pr-3 text-muted-foreground md:table-cell">
                  {s?.class_year ?? "—"}
                </td>
                <td className="py-2 pr-3 text-muted-foreground">
                  {r.reservation_date} · {r.start_time?.slice(0, 5)}–{r.end_time?.slice(0, 5)}
                </td>
                <td className="py-2 pr-3 font-bold">{Number(r.hours_to_earn)}</td>
                <td className="hidden max-w-[180px] truncate py-2 pr-3 text-muted-foreground md:table-cell">
                  {orgMap[r.organization_id]?.organization_name ??
                    orgMap[r.organization_id]?.full_name ??
                    "—"}
                </td>
                <td className="py-2 pr-3">
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs">
                    {STATUS_LT[r.status] ?? r.status}
                  </span>
                </td>
                <td className="py-2 pr-3">
                  {r.checked_in_at ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success"
                      title={`QR nuskenuota ${new Date(r.checked_in_at).toLocaleString("lt-LT")}`}
                    >
                      <ShieldCheck className="h-3 w-3" /> QR
                    </span>
                  ) : r.status === "completed" || r.status === "confirmed" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning-foreground">
                      <AlertTriangle className="h-3 w-3" /> Be QR
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-2 pr-3">

                  {fl.length === 0 ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${sevTone}`}
                      title={fl.map((x) => x.label).join("\n")}
                    >
                      <AlertTriangle className="h-3 w-3" /> {fl.length}
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => s && setAuditing(s)}
                      className="rounded-full border border-border bg-background px-2 py-1 text-[11px] hover:bg-accent"
                      title="Auditas"
                    >
                      <FileSearch className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() =>
                        setChatRes({
                          id: r.id,
                          student_id: r.student_id,
                          organization_id: r.organization_id,
                          organization_name:
                            orgMap[r.organization_id]?.organization_name ??
                            orgMap[r.organization_id]?.full_name ??
                            "Organizacija",
                        })
                      }
                      className="rounded-full border border-border bg-background px-2 py-1 text-[11px] hover:bg-accent"
                      title="Pokalbis"
                    >
                      <MessageSquare className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => {
                        const n = new Set(reviewed);
                        if (n.has(r.id)) n.delete(r.id);
                        else n.add(r.id);
                        persistReviewed(n);
                      }}
                      className={`rounded-full border px-2 py-1 text-[11px] ${isReviewed ? "border-success/40 bg-success/10 text-success" : "border-border bg-background hover:bg-accent"}`}
                    >
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
  );
}

function AuditDrawer({
  auditing,
  setAuditing,
  auditRes,
  completedRes,
  orgName,
  setChatRes,
}: {
  auditing: Student | null;
  setAuditing: (s: Student | null) => void;
  auditRes: Reservation[];
  completedRes: Reservation[];
  orgName: (id: string) => string;
  setChatRes: (r: ChatReservation) => void;
}) {
  const verifiedHours = completedRes.reduce(
    (a, r) => (r.checked_in_at ? a + Number(r.hours_to_earn ?? 0) : a),
    0,
  );
  const unverifiedHours = completedRes.reduce(
    (a, r) => (r.checked_in_at ? a : a + Number(r.hours_to_earn ?? 0)),
    0,
  );
  return (

    <AnimatePresence>
      {auditing && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-end bg-foreground/40 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setAuditing(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-border bg-background shadow-elegant sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border bg-gradient-card p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Įrodymų peržiūra
                </p>
                <h3 className="mt-1 font-display text-xl font-bold">{auditing.full_name}</h3>
                <p className="text-xs text-muted-foreground">{auditing.email}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-success/15 px-2.5 py-1 font-semibold text-success">
                    Užbaigta: {completedRes.length}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">
                    Surinkta: {Number(auditing.hours_earned)} / {auditing.hours_needed} val.
                  </span>
                  <span className="rounded-full bg-success/15 px-2.5 py-1 font-semibold text-success">
                    QR patvirtinta: {verifiedHours.toFixed(1)} val.
                  </span>
                  {unverifiedHours > 0 && (
                    <span className="rounded-full bg-warning/15 px-2.5 py-1 font-semibold text-warning-foreground">
                      Be QR įrodymo: {unverifiedHours.toFixed(1)} val.
                    </span>
                  )}
                </div>
                <p className="mt-2 max-w-md text-[11px] text-muted-foreground">
                  „QR patvirtinta“ reiškia, kad organizacija vietoje nuskenavo mokinio kodą — laikas užfiksuotas
                  sistemoje. Likusias valandas verta patikrinti su organizacija prieš užskaitant.
                </p>

              </div>
              <button
                onClick={() => setAuditing(null)}
                className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {auditRes.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Šis mokinys dar neturi rezervacijų.
                </div>
              )}
              {auditRes.map((r) => {
                const isDone = r.status === "completed" || r.status === "confirmed";
                const tone = isDone
                  ? "bg-success/15 text-success"
                  : r.status === "approved"
                    ? "bg-primary/15 text-primary"
                    : r.status === "declined"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-warning/15 text-warning-foreground";
                const Icon = isDone
                  ? CheckCircle2
                  : r.status === "approved"
                    ? PlayCircle
                    : r.status === "declined"
                      ? XCircle
                      : AlarmClock;
                return (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-border bg-card/60 p-4 transition hover:border-primary/40"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{orgName(r.organization_id)}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.reservation_date} · {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}{" "}
                          · {Number(r.hours_to_earn)} val.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}
                        >
                          <Icon className="h-3 w-3" /> {STATUS_LT[r.status] ?? r.status}
                        </span>
                        <button
                          onClick={() =>
                            setChatRes({
                              id: r.id,
                              student_id: r.student_id,
                              organization_id: r.organization_id,
                              organization_name: orgName(r.organization_id),
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-semibold hover:bg-accent"
                        >
                          <MessageSquare className="h-3 w-3" /> Pokalbis
                        </button>
                      </div>
                    </div>
                    {isDone && (
                      <div
                        className={`mt-3 flex flex-wrap items-center gap-2 rounded-xl border p-2.5 text-[11px] ${
                          r.checked_in_at
                            ? "border-success/25 bg-success/5 text-success"
                            : "border-warning/30 bg-warning/5 text-warning-foreground"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1 font-semibold">
                          {r.checked_in_at ? (
                            <>
                              <ShieldCheck className="h-3 w-3" /> QR patvirtinta vietoje ·{" "}
                              {new Date(r.checked_in_at).toLocaleString("lt-LT")}
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3 w-3" /> Be QR įrodymo — patvirtino tik organizacija
                            </>
                          )}
                        </span>
                        {r.legal_disclosure && (
                          <span className="inline-flex items-center gap-1 font-semibold text-foreground/70">
                            <ScrollText className="h-3 w-3" /> Pasirašytas teisinis patvirtinimas
                          </span>
                        )}
                      </div>
                    )}
                    {isDone && r.legal_disclosure && (
                      <div className="mt-2 rounded-xl border border-border bg-background/60 p-3 text-xs text-foreground/80">
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
  );
}
