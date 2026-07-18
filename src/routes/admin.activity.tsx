import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AdminProfile, AdminReservation } from "@/lib/admin-shared";
import { STATUS_LT, STATUS_TONE } from "@/lib/admin-shared";
import { AlarmClock, PlayCircle, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/admin/activity")({
  component: ActivityPage,
});

const ICON: Record<string, typeof AlarmClock> = {
  pending: AlarmClock,
  approved: PlayCircle,
  completed: CheckCircle2,
  confirmed: CheckCircle2,
  declined: XCircle,
};

function ActivityPage() {
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "completed" | "declined">("all");

  useEffect(() => {
    (async () => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("id, role, full_name, organization_name, email, hours_earned, hours_needed"),
        supabase.from("reservations").select("id, status, hours_to_earn, reservation_date, organization_id, student_id, created_at").order("created_at", { ascending: false }).limit(200),
      ]);
      setProfiles((p.data as AdminProfile[]) ?? []);
      setReservations((r.data as AdminReservation[]) ?? []);
    })();
  }, []);

  const map = useMemo(() => {
    const m: Record<string, AdminProfile> = {};
    profiles.forEach((p) => (m[p.id] = p));
    return m;
  }, [profiles]);

  const shown = reservations.filter((r) => {
    if (filter === "all") return true;
    if (filter === "completed") return r.status === "completed" || r.status === "confirmed";
    return r.status === filter;
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">Aktyvumo istorija</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paskutinės 200 rezervacijų iš visos platformos.
        </p>
      </header>

      <div className="inline-flex rounded-full border border-border bg-card/70 p-1 backdrop-blur">
        {(["all", "pending", "approved", "completed", "declined"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${
              filter === k
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {k === "all" ? "Visos" : STATUS_LT[k]}
          </button>
        ))}
      </div>

      <div className="divide-y divide-border rounded-2xl border border-border bg-card/70 shadow-md backdrop-blur">
        {shown.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">Kol kas nėra rezervacijų.</p>
        )}
        {shown.map((r) => {
          const Icon = ICON[r.status] ?? AlarmClock;
          const tone = STATUS_TONE[r.status] ?? "";
          const orgN = map[r.organization_id]?.organization_name ?? map[r.organization_id]?.full_name ?? "—";
          const stN = map[r.student_id]?.full_name ?? "Mokinys";
          return (
            <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {stN} → {orgN}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.reservation_date} · {Number(r.hours_to_earn)} val. · sukurta{" "}
                  {new Date(r.created_at).toLocaleString("lt-LT")}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
                <Icon className="h-3 w-3" /> {STATUS_LT[r.status] ?? r.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
