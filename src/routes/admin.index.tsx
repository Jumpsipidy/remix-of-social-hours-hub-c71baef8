import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import type { AdminProfile, AdminReservation } from "@/lib/admin-shared";
import { STATUS_LT } from "@/lib/admin-shared";
import {
  GraduationCap,
  Building2,
  Users,
  ClipboardList,
  Activity,
  Shield,
  ListTodo,
  MessageSquare,
  TrendingUp,
  Zap,
  AlarmClock,
  PlayCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

const STATUS_ICON: Record<string, typeof AlarmClock> = {
  pending: AlarmClock,
  approved: PlayCircle,
  completed: CheckCircle2,
  confirmed: CheckCircle2,
  declined: XCircle,
};

function AdminOverview() {
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [openTasks, setOpenTasks] = useState(0);
  const [msgs24, setMsgs24] = useState(0);
  const [schools, setSchools] = useState(0);

  useEffect(() => {
    (async () => {
      const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const [p, r, t, m, s] = await Promise.all([
        supabase.from("profiles").select("id, role, full_name, organization_name, email, hours_earned, hours_needed"),
        supabase.from("reservations").select("id, status, hours_to_earn, reservation_date, organization_id, student_id, created_at").order("created_at", { ascending: false }),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("is_open", true),
        supabase.from("messages").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
        supabase.from("schools").select("id", { count: "exact", head: true }),
      ]);
      setProfiles((p.data as AdminProfile[]) ?? []);
      setReservations((r.data as AdminReservation[]) ?? []);
      setOpenTasks(t.count ?? 0);
      setMsgs24(m.count ?? 0);
      setSchools(s.count ?? 0);
    })();
  }, []);

  const students = profiles.filter((p) => p.role === "student").length;
  const orgs = profiles.filter((p) => p.role === "organization").length;
  const sadmins = profiles.filter((p) => p.role === "school_admin").length;
  const done = reservations.filter((r) => r.status === "completed" || r.status === "confirmed").length;
  const hoursTotal = profiles.reduce((a, p) => a + Number(p.hours_earned ?? 0), 0);

  const cards = [
    { icon: GraduationCap, label: "Mokiniai", value: students },
    { icon: Building2, label: "Organizacijos", value: orgs },
    { icon: Users, label: "Mokyklos admin.", value: sadmins },
    { icon: GraduationCap, label: "Mokyklos", value: schools },
    { icon: ClipboardList, label: "Rezervacijos", value: reservations.length },
    { icon: Activity, label: "Užbaigtos", value: done },
    { icon: Shield, label: "Iš viso valandų", value: hoursTotal },
    { icon: ListTodo, label: "Atviros užduotys", value: openTasks },
    { icon: MessageSquare, label: "Žinutės (24 val.)", value: msgs24 },
  ];

  const orgMap: Record<string, AdminProfile> = {};
  profiles.filter((p) => p.role === "organization").forEach((p) => (orgMap[p.id] = p));
  const orgAgg = Object.values(orgMap)
    .map((o) => {
      const rs = reservations.filter((r) => r.organization_id === o.id);
      const d = rs.filter((r) => r.status === "completed" || r.status === "confirmed");
      return { org: o, total: rs.length, hours: d.reduce((a, r) => a + Number(r.hours_to_earn), 0), completed: d.length };
    })
    .sort((a, b) => b.hours - a.hours);

  return (
    <div className="space-y-6">
      <header>
        <p className="hidden text-xs font-semibold uppercase tracking-[0.22em] text-primary lg:block">
          Sistemos savininko sritis
        </p>
        <h1 className="mt-1 hidden font-display text-3xl font-bold tracking-tight lg:block">Apžvalga</h1>
        <p className="mt-1 text-sm text-muted-foreground">Realaus laiko platformos duomenys.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <motion.div
            key={c.label}
            whileHover={{ y: -3 }}
            className="rounded-2xl border border-border bg-card/70 p-5 shadow-md backdrop-blur"
          >
            <div className="flex items-center justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                <c.icon className="h-5 w-5" />
              </div>
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <p className="mt-4 font-display text-3xl font-bold tabular-nums">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card/70 p-5 shadow-md backdrop-blur">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold">
            <Zap className="h-4 w-4 text-primary" /> Būsenų suvestinė
          </h3>
          <div className="mt-4 space-y-2">
            {["pending", "approved", "completed", "declined"].map((k) => {
              const n = reservations.filter((r) => r.status === k || (k === "completed" && r.status === "confirmed")).length;
              const pct = reservations.length ? Math.round((n / reservations.length) * 100) : 0;
              const Icon = STATUS_ICON[k];
              return (
                <div key={k}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Icon className="h-3.5 w-3.5" /> {STATUS_LT[k]}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {n} · {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-accent">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full bg-gradient-primary"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/70 p-5 shadow-md backdrop-blur">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Top 5 organizacijos</h3>
            <Link
              to="/admin/organizations"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Visos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="mt-4 space-y-2">
            {orgAgg.slice(0, 5).map((r, i) => (
              <li key={r.org.id} className="flex items-center gap-3 rounded-xl bg-background/60 p-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {r.org.organization_name ?? r.org.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.completed} užbaigtos · {r.total} iš viso
                  </p>
                </div>
                <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success">
                  {r.hours} val.
                </span>
              </li>
            ))}
            {orgAgg.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">Nėra duomenų.</p>
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
