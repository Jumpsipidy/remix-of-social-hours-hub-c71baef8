import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AdminProfile, AdminReservation } from "@/lib/admin-shared";
import { Search, Building2 } from "lucide-react";

export const Route = createFileRoute("/admin/organizations")({
  component: OrganizationsPage,
});

function OrganizationsPage() {
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const [p, r] = await Promise.all([
        supabase.from("profiles").select("id, role, full_name, organization_name, email, hours_earned, hours_needed").eq("role", "organization"),
        supabase.from("reservations").select("id, status, hours_to_earn, reservation_date, organization_id, student_id, created_at"),
      ]);
      setProfiles((p.data as AdminProfile[]) ?? []);
      setReservations((r.data as AdminReservation[]) ?? []);
    })();
  }, []);

  const rows = useMemo(() => {
    return profiles
      .map((o) => {
        const rs = reservations.filter((r) => r.organization_id === o.id);
        const d = rs.filter((r) => r.status === "completed" || r.status === "confirmed");
        return {
          org: o,
          total: rs.length,
          pending: rs.filter((r) => r.status === "pending").length,
          completed: d.length,
          hours: d.reduce((a, r) => a + Number(r.hours_to_earn), 0),
        };
      })
      .filter((r) =>
        !q || (r.org.organization_name ?? r.org.full_name ?? "").toLowerCase().includes(q.toLowerCase()),
      )
      .sort((a, b) => b.hours - a.hours);
  }, [profiles, reservations, q]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Organizacijų reitingas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Realaus laiko rezervacijų ir valandų statistika kiekvienai organizacijai.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 backdrop-blur">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ieškoti organizacijos…"
            className="h-10 w-56 bg-transparent text-sm outline-none"
          />
        </div>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card/70 shadow-md backdrop-blur">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Organizacija</th>
              <th className="hidden px-4 py-3 md:table-cell">El. paštas</th>
              <th className="px-4 py-3 text-right">Rezervacijos</th>
              <th className="px-4 py-3 text-right">Laukia</th>
              <th className="px-4 py-3 text-right">Užbaigta</th>
              <th className="px-4 py-3 text-right">Valandos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.org.id} className="border-b border-border/60 transition hover:bg-accent/30">
                <td className="px-4 py-3 font-medium">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {r.org.organization_name ?? r.org.full_name}
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{r.org.email}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.total}</td>
                <td className="px-4 py-3 text-right tabular-nums text-warning-foreground">{r.pending}</td>
                <td className="px-4 py-3 text-right tabular-nums text-success">{r.completed}</td>
                <td className="px-4 py-3 text-right font-bold tabular-nums">{r.hours}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  Nieko nerasta.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
