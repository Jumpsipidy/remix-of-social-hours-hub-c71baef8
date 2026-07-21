import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AdminProfile, AdminReservation } from "@/lib/admin-shared";
import { STATUS_LT, STATUS_TONE } from "@/lib/admin-shared";
import { AlarmClock, PlayCircle, CheckCircle2, XCircle, Activity, CalendarClock, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { AdminAurora, SectionHeader, SaaSKpi, SaaSPanel, LivePill } from "@/components/admin/admin-ui";

export const Route = createFileRoute("/admin/activity")({ component: ActivityPage });

const ICON: Record<string, typeof AlarmClock> = {
  pending: AlarmClock, approved: PlayCircle, completed: CheckCircle2, confirmed: CheckCircle2, declined: XCircle,
};

function ActivityPage() {
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "completed" | "declined">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("id, role, full_name, organization_name, email, hours_earned, hours_needed"),
        supabase.from("reservations").select("id, status, hours_to_earn, reservation_date, organization_id, student_id, created_at").order("created_at", { ascending: false }).limit(200),
      ]);
      setProfiles((p.data as AdminProfile[]) ?? []);
      setReservations((r.data as AdminReservation[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const map = useMemo(() => {
    const m: Record<string, AdminProfile> = {};
    profiles.forEach((p) => (m[p.id] = p));
    return m;
  }, [profiles]);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, completed: 0, declined: 0 };
    reservations.forEach((r) => {
      if (r.status === "pending") c.pending++;
      else if (r.status === "approved") c.approved++;
      else if (r.status === "completed" || r.status === "confirmed") c.completed++;
      else if (r.status === "declined") c.declined++;
    });
    return c;
  }, [reservations]);

  const shown = reservations.filter((r) => {
    if (filter === "all") return true;
    if (filter === "completed") return r.status === "completed" || r.status === "confirmed";
    return r.status === filter;
  });

  return (
    <div className="space-y-6">
      <AdminAurora />
      <SectionHeader
        eyebrow="Aktyvumas"
        title="Aktyvumo istorija"
        description="Paskutinės 200 rezervacijų iš visos platformos."
        icon={Activity}
        action={<LivePill />}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <SaaSKpi icon={AlarmClock} label="Laukia" value={counts.pending} accent="warn" />
        <SaaSKpi icon={Zap} label="Vykdoma" value={counts.approved} accent="info" />
        <SaaSKpi icon={CheckCircle2} label="Baigta" value={counts.completed} accent="success" />
        <SaaSKpi icon={XCircle} label="Atmesta" value={counts.declined} accent="warn" />
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {(["all", "pending", "approved", "completed", "declined"] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${
              filter === k ? "bg-gradient-primary text-primary-foreground shadow-glow" : "border border-border bg-card/60 text-muted-foreground hover:text-foreground"
            }`}>
            {k === "all" ? "Visos" : STATUS_LT[k]}
          </button>
        ))}
      </div>

      <SaaSPanel padded={false}>
        <div className="divide-y divide-border/60">
          {loading && <p className="py-16 text-center text-sm text-muted-foreground">Kraunama…</p>}
          {!loading && shown.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
              <CalendarClock className="h-8 w-8 opacity-40" />
              Kol kas nėra rezervacijų.
            </div>
          )}
          {shown.map((r, i) => {
            const Icon = ICON[r.status] ?? AlarmClock;
            const tone = STATUS_TONE[r.status] ?? "";
            const orgN = map[r.organization_id]?.organization_name ?? map[r.organization_id]?.full_name ?? "—";
            const stN = map[r.student_id]?.full_name ?? "Mokinys";
            return (
              <motion.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 15) * 0.015 }} className="flex items-center gap-3 px-4 py-3 text-sm transition hover:bg-accent/20">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{stN} <span className="text-muted-foreground">→</span> {orgN}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.reservation_date} · {Number(r.hours_to_earn)} val. · {new Date(r.created_at).toLocaleString("lt-LT")}
                  </p>
                </div>
                <span className={`hidden shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex ${tone}`}>
                  {STATUS_LT[r.status] ?? r.status}
                </span>
              </motion.div>
            );
          })}
        </div>
      </SaaSPanel>
    </div>
  );
}
