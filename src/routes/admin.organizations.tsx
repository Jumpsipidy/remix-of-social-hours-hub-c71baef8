import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AdminProfile, AdminReservation } from "@/lib/admin-shared";
import { Search, Building2, Trophy, Clock, CheckCircle2, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { AdminAurora, SectionHeader, SaaSKpi, SaaSPanel, LivePill } from "@/components/admin/admin-ui";

export const Route = createFileRoute("/admin/organizations")({ component: OrganizationsPage });

function OrganizationsPage() {
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("id, role, full_name, organization_name, email, hours_earned, hours_needed").eq("role", "organization"),
        supabase.from("reservations").select("id, status, hours_to_earn, reservation_date, organization_id, student_id, created_at"),
      ]);
      setProfiles((p.data as AdminProfile[]) ?? []);
      setReservations((r.data as AdminReservation[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const rows = useMemo(() => {
    return profiles.map((o) => {
      const rs = reservations.filter((r) => r.organization_id === o.id);
      const d = rs.filter((r) => r.status === "completed" || r.status === "confirmed");
      return {
        org: o,
        total: rs.length,
        pending: rs.filter((r) => r.status === "pending").length,
        completed: d.length,
        hours: d.reduce((a, r) => a + Number(r.hours_to_earn), 0),
      };
    }).filter((r) => !q || (r.org.organization_name ?? r.org.full_name ?? "").toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.hours - a.hours);
  }, [profiles, reservations, q]);

  const totals = useMemo(() => ({
    orgs: profiles.length,
    reservations: reservations.length,
    completed: reservations.filter((r) => r.status === "completed" || r.status === "confirmed").length,
    hours: reservations.filter((r) => r.status === "completed" || r.status === "confirmed").reduce((a, r) => a + Number(r.hours_to_earn), 0),
  }), [profiles, reservations]);

  return (
    <div className="space-y-6">
      <AdminAurora />
      <SectionHeader
        eyebrow="Organizacijos"
        title="Organizacijų reitingas"
        description="Realaus laiko rezervacijų ir valandų statistika kiekvienai organizacijai."
        icon={Building2}
        action={<LivePill />}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <SaaSKpi icon={Building2} label="Organizacijų" value={totals.orgs} accent="primary" />
        <SaaSKpi icon={Clock} label="Rezervacijos" value={totals.reservations} accent="info" />
        <SaaSKpi icon={CheckCircle2} label="Užbaigtos" value={totals.completed} accent="success" />
        <SaaSKpi icon={Flame} label="Suteikta valandų" value={totals.hours} accent="warn" />
      </div>

      <SaaSPanel padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 p-3">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-background/60 px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ieškoti organizacijos…" className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </div>
          <span className="text-[11px] text-muted-foreground">{rows.length} rezultatai</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Organizacija</th>
                <th className="hidden px-4 py-3 md:table-cell">El. paštas</th>
                <th className="px-4 py-3 text-right">Rez.</th>
                <th className="px-4 py-3 text-right">Laukia</th>
                <th className="px-4 py-3 text-right">Baigta</th>
                <th className="px-4 py-3 text-right">Val.</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">Kraunama…</td></tr>}
              {!loading && rows.map((r, i) => (
                <motion.tr key={r.org.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 15) * 0.015 }} className="border-b border-border/40 last:border-0 hover:bg-accent/20">
                  <td className="px-4 py-3">
                    {i < 3 ? <span className="text-lg">{["🥇", "🥈", "🥉"][i]}</span> : <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <span className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{r.org.organization_name ?? r.org.full_name}</span>
                    </span>
                  </td>
                  <td className="hidden max-w-[220px] truncate px-4 py-3 text-muted-foreground md:table-cell">{r.org.email}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.total}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber-500">{r.pending}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-500">{r.completed}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{r.hours}</td>
                </motion.tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  <Trophy className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  Nieko nerasta.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </SaaSPanel>
    </div>
  );
}
