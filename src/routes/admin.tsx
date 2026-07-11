import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PageShell } from "../components/layout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Users, Building2, GraduationCap, ClipboardList, Activity, TrendingUp, Search, MessageSquare, PlayCircle, CheckCircle2, AlarmClock, XCircle, Zap, ListTodo, UserPlus, Loader2 } from "lucide-react";
import { adminCreateAccount } from "@/lib/admin-actions.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Sistemos administracija — Socialinės Valandos" }] }),
  component: AdminDashboard,
});

type Stats = {
  students: number;
  organizations: number;
  school_admins: number;
  reservations: number;
  completed: number;
  hours_total: number;
  tasks_open: number;
  messages_24h: number;
};

type Profile = { id: string; role: string; full_name: string | null; organization_name: string | null; email: string | null; hours_earned: number; hours_needed: number };
type Reservation = { id: string; status: string; hours_to_earn: number; reservation_date: string; organization_id: string; student_id: string; created_at: string };

const STATUS_TONE: Record<string, string> = {
  pending: "bg-warning/15 text-warning-foreground",
  approved: "bg-primary/15 text-primary",
  completed: "bg-success/15 text-success",
  confirmed: "bg-success/15 text-success",
  declined: "bg-destructive/15 text-destructive",
};
const STATUS_LT: Record<string, string> = {
  pending: "Laukia",
  approved: "Vykdoma",
  completed: "Užbaigta",
  confirmed: "Užbaigta",
  declined: "Atmesta",
};
const STATUS_ICON: Record<string, any> = {
  pending: AlarmClock,
  approved: PlayCircle,
  completed: CheckCircle2,
  confirmed: CheckCircle2,
  declined: XCircle,
};

function AdminDashboard() {
  const { user, profile, loading } = useAuth();
  const [stats, setStats] = useState<Stats>({ students: 0, organizations: 0, school_admins: 0, reservations: 0, completed: 0, hours_total: 0, tasks_open: 0, messages_24h: 0 });
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tab, setTab] = useState<"overview" | "organizations" | "activity" | "accounts" | "manage">("overview");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!user || profile?.role !== "admin") return;
    (async () => {
      const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const [pRes, rRes, tRes, mRes] = await Promise.all([
        supabase.from("profiles").select("id, role, full_name, organization_name, email, hours_earned, hours_needed"),
        supabase.from("reservations").select("id, status, hours_to_earn, reservation_date, organization_id, student_id, created_at").order("created_at", { ascending: false }),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("is_open", true),
        supabase.from("messages").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
      ]);
      const profs = (pRes.data as Profile[]) ?? [];
      const res = (rRes.data as Reservation[]) ?? [];
      setProfiles(profs);
      setReservations(res);
      setStats({
        students: profs.filter((p) => p.role === "student").length,
        organizations: profs.filter((p) => p.role === "organization").length,
        school_admins: profs.filter((p) => p.role === "school_admin").length,
        reservations: res.length,
        completed: res.filter((r) => r.status === "completed" || r.status === "confirmed").length,
        hours_total: profs.reduce((a, p) => a + Number(p.hours_earned ?? 0), 0),
        tasks_open: tRes.count ?? 0,
        messages_24h: mRes.count ?? 0,
      });
    })();
  }, [user, profile]);

  const orgMap = useMemo(() => {
    const m: Record<string, Profile> = {};
    profiles.filter((p) => p.role === "organization").forEach((p) => (m[p.id] = p));
    return m;
  }, [profiles]);
  const studentMap = useMemo(() => {
    const m: Record<string, Profile> = {};
    profiles.filter((p) => p.role === "student").forEach((p) => (m[p.id] = p));
    return m;
  }, [profiles]);

  const orgAgg = useMemo(() => {
    const rows = Object.values(orgMap).map((o) => {
      const rs = reservations.filter((r) => r.organization_id === o.id);
      const done = rs.filter((r) => r.status === "completed" || r.status === "confirmed");
      return {
        org: o,
        total: rs.length,
        pending: rs.filter((r) => r.status === "pending").length,
        completed: done.length,
        hours: done.reduce((a, r) => a + Number(r.hours_to_earn), 0),
      };
    });
    return rows.sort((a, b) => b.hours - a.hours);
  }, [orgMap, reservations]);

  if (loading) return <PageShell><div className="p-20 text-center text-muted-foreground">Kraunama…</div></PageShell>;
  if (!user || profile?.role !== "admin") {
    return (
      <PageShell>
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Reikia sistemos administratoriaus teisių</h1>
          <p className="mt-2 text-sm text-muted-foreground">Prisijunk su Super Admin paskyra.</p>
          <Link to="/login" className="mt-6 inline-flex rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">Prisijungti</Link>
        </div>
      </PageShell>
    );
  }

  const cards = [
    { icon: GraduationCap, label: "Mokiniai", value: stats.students, tone: "from-primary/20 to-primary/5" },
    { icon: Building2, label: "Organizacijos", value: stats.organizations, tone: "from-warning/20 to-warning/5" },
    { icon: Users, label: "Mokyklos adm.", value: stats.school_admins, tone: "from-success/20 to-success/5" },
    { icon: ClipboardList, label: "Rezervacijos", value: stats.reservations, tone: "from-primary/20 to-primary/5" },
    { icon: Activity, label: "Užbaigtos", value: stats.completed, tone: "from-success/20 to-success/5" },
    { icon: Shield, label: "Iš viso valandų", value: stats.hours_total, tone: "from-primary/20 to-primary/5" },
    { icon: ListTodo, label: "Atviros užduotys", value: stats.tasks_open, tone: "from-warning/20 to-warning/5" },
    { icon: MessageSquare, label: "Žinutės (24 val.)", value: stats.messages_24h, tone: "from-primary/20 to-primary/5" },
  ];

  const filteredOrgAgg = orgAgg.filter((r) => !q || (r.org.organization_name ?? r.org.full_name ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Sistemos savininko sritis</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">Super Admin skydas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Realaus laiko platformos apžvalga.</p>
      </section>

      <section className="mx-auto mt-8 grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {cards.map((c) => (
          <motion.div key={c.label} whileHover={{ y: -3 }} className={`rounded-3xl border border-border bg-gradient-to-br ${c.tone} p-5 shadow-md backdrop-blur`}>
            <div className="flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
                <c.icon className="h-5 w-5" />
              </div>
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <p className="mt-4 font-display text-3xl font-bold">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </motion.div>
        ))}
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 pb-16 sm:px-6">
        <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-full border border-border bg-background/70 p-1">
              {[
                { k: "overview", label: "Apžvalga" },
                { k: "organizations", label: "Organizacijų reitingas" },
                { k: "activity", label: "Aktyvumo istorija" },
                { k: "accounts", label: "Kurti paskyras" },
                { k: "manage", label: "Valdyti paskyras" },
              ].map((t) => (

                <button key={t.k} onClick={() => setTab(t.k as any)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === t.k ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}>
                  {t.label}
                </button>
              ))}
            </div>
            {tab === "organizations" && (
              <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ieškoti organizacijos…" className="h-10 w-56 bg-transparent text-sm outline-none" />
              </div>
            )}
          </div>

          {tab === "overview" && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/60 p-5">
                <h3 className="font-display text-lg font-bold flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Būsenų suvestinė</h3>
                <div className="mt-4 space-y-2">
                  {["pending", "approved", "completed", "declined"].map((k) => {
                    const n = reservations.filter((r) => r.status === k || (k === "completed" && r.status === "confirmed")).length;
                    const pct = stats.reservations ? Math.round((n / stats.reservations) * 100) : 0;
                    const Icon = STATUS_ICON[k];
                    return (
                      <div key={k}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-semibold"><Icon className="h-3.5 w-3.5" /> {STATUS_LT[k]}</span>
                          <span className="tabular-nums text-muted-foreground">{n} · {pct}%</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-accent">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} className="h-full bg-gradient-primary" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background/60 p-5">
                <h3 className="font-display text-lg font-bold">Top 5 organizacijos pagal valandas</h3>
                <ul className="mt-4 space-y-2">
                  {orgAgg.slice(0, 5).map((r, i) => (
                    <li key={r.org.id} className="flex items-center gap-3 rounded-xl bg-card/60 p-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{r.org.organization_name ?? r.org.full_name}</p>
                        <p className="text-xs text-muted-foreground">{r.completed} užbaigtos · {r.total} iš viso</p>
                      </div>
                      <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success">{r.hours} val.</span>
                    </li>
                  ))}
                  {orgAgg.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Nėra duomenų.</p>}
                </ul>
              </div>
            </div>
          )}

          {tab === "organizations" && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 pr-3">Organizacija</th>
                    <th className="hidden py-3 pr-3 md:table-cell">El. paštas</th>
                    <th className="py-3 pr-3 text-right">Rezervacijos</th>
                    <th className="py-3 pr-3 text-right">Laukia</th>
                    <th className="py-3 pr-3 text-right">Užbaigta</th>
                    <th className="py-3 pr-3 text-right">Valandos</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrgAgg.map((r) => (
                    <tr key={r.org.id} className="border-b border-border/60 transition hover:bg-accent/40">
                      <td className="py-3 pr-3 font-medium">{r.org.organization_name ?? r.org.full_name}</td>
                      <td className="hidden py-3 pr-3 text-muted-foreground md:table-cell">{r.org.email}</td>
                      <td className="py-3 pr-3 text-right tabular-nums">{r.total}</td>
                      <td className="py-3 pr-3 text-right tabular-nums text-warning-foreground">{r.pending}</td>
                      <td className="py-3 pr-3 text-right tabular-nums text-success">{r.completed}</td>
                      <td className="py-3 pr-3 text-right font-bold tabular-nums">{r.hours}</td>
                    </tr>
                  ))}
                  {filteredOrgAgg.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Nieko nerasta.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {tab === "activity" && (
            <div className="mt-6 divide-y divide-border">
              {reservations.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Kol kas nėra rezervacijų.</p>}
              {reservations.slice(0, 20).map((r) => {
                const Icon = STATUS_ICON[r.status] ?? AlarmClock;
                const tone = STATUS_TONE[r.status] ?? "";
                const orgN = orgMap[r.organization_id]?.organization_name ?? orgMap[r.organization_id]?.full_name ?? "—";
                const stN = studentMap[r.student_id]?.full_name ?? "Mokinys";
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{stN} → {orgN}</p>
                      <p className="text-xs text-muted-foreground">{r.reservation_date} · {Number(r.hours_to_earn)} val. · sukurta {new Date(r.created_at).toLocaleString("lt-LT")}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
                      <Icon className="h-3 w-3" /> {STATUS_LT[r.status] ?? r.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "accounts" && <CreateAccountPanel />}
        </div>
      </section>
    </PageShell>
  );
}

function CreateAccountPanel() {
  const [role, setRole] = useState<"organization" | "school_admin">("organization");
  const [orgCategory, setOrgCategory] = useState<"organizacija" | "bendruomene">("organizacija");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await adminCreateAccount({
        data: {
          email: email.trim(),
          password,
          full_name: fullName.trim() || (role === "organization" ? orgName.trim() : ""),
          role,
          organization_name: role === "organization" ? orgName.trim() : null,
          org_category: role === "organization" ? orgCategory : null,
        },
      });
      toast.success("Paskyra sukurta");
      setFullName(""); setOrgName(""); setEmail(""); setPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nepavyko sukurti");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <form onSubmit={submit} className="rounded-2xl border border-border bg-background/60 p-5">
        <h3 className="font-display text-lg font-bold flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" /> Sukurti naują paskyrą</h3>
        <p className="mt-1 text-xs text-muted-foreground">Sukuriamos organizacijos/bendruomenės arba mokyklos administratoriaus paskyros. Vartotojas galės iškart prisijungti.</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            { k: "organization", label: "Organizacija/Bendruomenė", icon: Building2 },
            { k: "school_admin", label: "Mokyklos admin.", icon: GraduationCap },
          ].map((r) => {
            const active = role === r.k;
            return (
              <button key={r.k} type="button" onClick={() => setRole(r.k as any)}
                className={`flex items-center gap-2 rounded-2xl border p-3 text-sm font-semibold transition ${active ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow" : "border-border bg-card/60 hover:border-primary/40"}`}>
                <r.icon className="h-4 w-4" /> {r.label}
              </button>
            );
          })}
        </div>

        {role === "organization" && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { k: "organizacija", label: "Organizacija" },
              { k: "bendruomene", label: "Bendruomenė" },
            ].map((c) => {
              const active = orgCategory === c.k;
              return (
                <button key={c.k} type="button" onClick={() => setOrgCategory(c.k as any)}
                  className={`rounded-xl border p-2 text-xs font-semibold transition ${active ? "border-primary bg-primary/15 text-primary" : "border-border bg-card/60 hover:border-primary/40"}`}>
                  {c.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {role === "organization" && (
            <FieldInput label={orgCategory === "bendruomene" ? "Bendruomenės pavadinimas" : "Organizacijos pavadinimas"} value={orgName} onChange={setOrgName} placeholder="Pavyzdys" required />
          )}
          <FieldInput label="Kontaktinis asmuo / Vardas Pavardė" value={fullName} onChange={setFullName} placeholder="Jonas Jonaitis" required={role === "school_admin"} />
          <FieldInput label="El. paštas" value={email} onChange={setEmail} placeholder="vardas@mokykla.lt" type="email" required />
          <FieldInput label="Slaptažodis (min. 6)" value={password} onChange={setPassword} placeholder="••••••" type="password" required />
        </div>

        <button type="submit" disabled={busy}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Sukurti paskyrą
        </button>
      </form>

      <AccessRequestsPanel />
    </div>
  );
}

function FieldInput({ label, value, onChange, placeholder, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
    </label>
  );
}

type AccessRequest = {
  id: string;
  organization_name: string;
  legal_code: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  website: string | null;
  description: string;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
};

function AccessRequestsPanel() {
  const [rows, setRows] = useState<AccessRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("organization_access_requests").select("*").order("created_at", { ascending: false });
    setRows((data as AccessRequest[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    setBusy(id);
    try {
      const { error } = await supabase.from("organization_access_requests").update({ status }).eq("id", id);
      if (error) throw error;
      toast.success(status === "approved" ? "Pažymėta kaip patvirtinta. Sukurk paskyrą aukščiau." : "Atmesta.");
      await load();
    } catch (e: any) { toast.error(e?.message ?? "Klaida"); }
    finally { setBusy(null); }
  };

  return (
    <div className="mt-8 rounded-2xl border border-border bg-background/60 p-5">
      <h3 className="font-display text-lg font-bold">📥 Organizacijų prieigos prašymai</h3>
      <p className="mt-1 text-xs text-muted-foreground">Prašymai iš viešos registracijos formos. Patvirtinus — sukurk paskyrą aukščiau ir pats išsiųsk kredencialus.</p>
      <div className="mt-4 space-y-3">
        {rows.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Kol kas nėra prašymų.</p>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{r.organization_name}</p>
                <p className="text-xs text-muted-foreground">Kodas: {r.legal_code ?? "—"} · {r.contact_name} · {r.contact_email} · {r.contact_phone ?? "—"}</p>
                {r.website && <p className="text-xs text-primary">{r.website}</p>}
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${r.status === "pending" ? "bg-warning/15 text-warning-foreground" : r.status === "approved" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                {r.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>
            {r.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <button disabled={busy === r.id} onClick={() => setStatus(r.id, "approved")} className="rounded-lg bg-success/20 px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/30 disabled:opacity-50">✓ Patvirtinti</button>
                <button disabled={busy === r.id} onClick={() => setStatus(r.id, "rejected")} className="rounded-lg bg-destructive/20 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/30 disabled:opacity-50">✗ Atmesti</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

