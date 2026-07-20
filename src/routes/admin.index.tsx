import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import type { AdminProfile, AdminReservation } from "@/lib/admin-shared";
import { STATUS_LT } from "@/lib/admin-shared";
import { SaaSKpi, SaaSPanel, SectionHeader, LivePill, Sparkline } from "@/components/admin/admin-ui";
import {
  GraduationCap,
  Building2,
  Users,
  ClipboardList,
  Activity,
  Shield,
  ListTodo,
  MessageSquare,
  AlarmClock,
  PlayCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Zap,
  Sparkles,
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
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const [p, r, t, m, s] = await Promise.all([
        supabase.from("profiles").select("id, role, full_name, organization_name, email, hours_earned, hours_needed, created_at"),
        supabase.from("reservations").select("id, status, hours_to_earn, reservation_date, organization_id, student_id, created_at").order("created_at", { ascending: false }),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("is_open", true),
        supabase.from("messages").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
        supabase.from("schools").select("id", { count: "exact", head: true }),
      ]);
      if (cancelled) return;
      setProfiles((p.data as AdminProfile[]) ?? []);
      setReservations((r.data as AdminReservation[]) ?? []);
      setOpenTasks(t.count ?? 0);
      setMsgs24(m.count ?? 0);
      setSchools(s.count ?? 0);
    })();
    return () => { cancelled = true; };
  }, [tick]);

  // real-time refresh triggers
  useEffect(() => {
    const ch = supabase
      .channel("admin-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, () => setTick((v) => v + 1))
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => setTick((v) => v + 1))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const students = profiles.filter((p) => p.role === "student").length;
  const orgs = profiles.filter((p) => p.role === "organization").length;
  const sadmins = profiles.filter((p) => p.role === "school_admin").length;
  const done = reservations.filter((r) => r.status === "completed" || r.status === "confirmed").length;
  const hoursTotal = profiles.reduce((a, p) => a + Number(p.hours_earned ?? 0), 0);

  // 14-day sparkline series (reservations, profiles, hours-per-day)
  const series = useMemo(() => {
    const days = 14;
    const buckets = Array.from({ length: days }, () => ({ res: 0, prof: 0, hrs: 0, msg: 0 }));
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const startMs = now.getTime() - (days - 1) * 86400000;
    for (const r of reservations) {
      const t = new Date(r.created_at ?? Date.now()).getTime();
      const idx = Math.floor((t - startMs) / 86400000);
      if (idx >= 0 && idx < days) {
        buckets[idx].res += 1;
        if (r.status === "completed" || r.status === "confirmed") buckets[idx].hrs += Number(r.hours_to_earn ?? 0);
      }
    }
    for (const p of profiles) {
      const t = new Date((p as unknown as { created_at?: string }).created_at ?? Date.now()).getTime();
      const idx = Math.floor((t - startMs) / 86400000);
      if (idx >= 0 && idx < days) buckets[idx].prof += 1;
    }
    return {
      res: buckets.map((b) => b.res),
      prof: buckets.map((b) => b.prof),
      hrs: buckets.map((b) => b.hrs),
    };
  }, [reservations, profiles]);

  const trend = (arr: number[]) => {
    const half = Math.floor(arr.length / 2);
    const a = arr.slice(0, half).reduce((s, v) => s + v, 0);
    const b = arr.slice(half).reduce((s, v) => s + v, 0);
    if (a === 0 && b === 0) return 0;
    if (a === 0) return 100;
    return Math.round(((b - a) / a) * 100);
  };

  const cards = [
    { icon: GraduationCap, label: "Mokiniai", value: students, spark: series.prof, accent: "primary" as const, trend: trend(series.prof) },
    { icon: Building2, label: "Organizacijos", value: orgs, accent: "info" as const },
    { icon: Users, label: "Mokyklos administr.", value: sadmins, accent: "info" as const },
    { icon: GraduationCap, label: "Mokyklos", value: schools, accent: "info" as const },
    { icon: ClipboardList, label: "Rezervacijos", value: reservations.length, spark: series.res, accent: "primary" as const, trend: trend(series.res) },
    { icon: Activity, label: "Užbaigtos", value: done, accent: "success" as const },
    { icon: Shield, label: "Iš viso valandų", value: hoursTotal, spark: series.hrs, accent: "success" as const, trend: trend(series.hrs) },
    { icon: ListTodo, label: "Atviros užduotys", value: openTasks, accent: "warn" as const },
    { icon: MessageSquare, label: "Žinutės (24 val.)", value: msgs24, accent: "info" as const },
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

  // recent activity stream
  const recent = reservations.slice(0, 6);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Sistemos savininko sritis"
        title="Apžvalga"
        description="Realaus laiko platformos duomenys."
        icon={Sparkles}
        action={<LivePill />}
      />

      <section className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <SaaSKpi
              icon={c.icon}
              label={c.label}
              value={c.value}
              accent={c.accent}
              spark={"spark" in c ? c.spark : undefined}
              trend={"trend" in c ? { value: c.trend! } : null}
            />
          </motion.div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <SaaSPanel className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold">
              <Zap className="h-4 w-4 text-primary" /> Būsenų suvestinė
            </h3>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {reservations.length} viso
            </span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {["pending", "approved", "completed", "declined"].map((k) => {
              const n = reservations.filter((r) => r.status === k || (k === "completed" && r.status === "confirmed")).length;
              const pct = reservations.length ? Math.round((n / reservations.length) * 100) : 0;
              const Icon = STATUS_ICON[k];
              return (
                <div key={k} className="rounded-xl border border-border/60 bg-background/40 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Icon className="h-3.5 w-3.5" /> {STATUS_LT[k]}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {n} · {pct}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-accent">
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
          <div className="mt-5">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Rezervacijos • 14 d.
              </p>
              <p className="text-[10px] tabular-nums text-muted-foreground">
                Σ {series.res.reduce((s, v) => s + v, 0)}
              </p>
            </div>
            <Sparkline values={series.res} className="h-16" />
          </div>
        </SaaSPanel>

        <SaaSPanel>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Top organizacijos</h3>
            <Link
              to="/admin/organizations"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Visos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="mt-4 space-y-2">
            {orgAgg.slice(0, 5).map((r, i) => (
              <li key={r.org.id} className="flex items-center gap-3 rounded-xl bg-background/50 p-3 transition hover:bg-background/80">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground shadow-glow">
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
                <span className="shrink-0 rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold tabular-nums text-success">
                  {r.hours} val.
                </span>
              </li>
            ))}
            {orgAgg.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">Nėra duomenų.</p>
            )}
          </ul>
        </SaaSPanel>
      </section>

      <SaaSPanel>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold">
            <Activity className="h-4 w-4 text-primary" /> Paskutiniai įvykiai
          </h3>
          <Link to="/admin/reservations" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            Peržiūrėti visas <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-border/60">
          {recent.map((r) => {
            const Icon = STATUS_ICON[r.status] ?? AlarmClock;
            return (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/50">
                  <Icon className="h-4 w-4 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {STATUS_LT[r.status] ?? r.status} — {r.hours_to_earn} val.
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(r.created_at ?? Date.now()).toLocaleString("lt-LT")}
                  </p>
                </div>
              </li>
            );
          })}
          {recent.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">Kol kas tuščia.</p>
          )}
        </ul>
      </SaaSPanel>
    </div>
  );
}
