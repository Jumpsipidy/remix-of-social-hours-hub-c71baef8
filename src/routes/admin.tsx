import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PageShell } from "../components/layout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Users, Building2, GraduationCap, ClipboardList, Activity } from "lucide-react";

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
};

function AdminDashboard() {
  const { user, profile, loading } = useAuth();
  const [stats, setStats] = useState<Stats>({ students: 0, organizations: 0, school_admins: 0, reservations: 0, completed: 0, hours_total: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!user || profile?.role !== "admin") return;
    (async () => {
      const [pRes, rRes] = await Promise.all([
        supabase.from("profiles").select("role, hours_earned"),
        supabase.from("reservations").select("id, status, hours_to_earn, reservation_date, organization_id").order("reservation_date", { ascending: false }).limit(10),
      ]);
      const profs = (pRes.data as { role: string; hours_earned: number }[]) ?? [];
      const s: Stats = {
        students: profs.filter((p) => p.role === "student").length,
        organizations: profs.filter((p) => p.role === "organization").length,
        school_admins: profs.filter((p) => p.role === "school_admin").length,
        reservations: 0,
        completed: 0,
        hours_total: profs.reduce((a, p) => a + Number(p.hours_earned ?? 0), 0),
      };
      const { data: allRes } = await supabase.from("reservations").select("id, status");
      const all = (allRes as { status: string }[]) ?? [];
      s.reservations = all.length;
      s.completed = all.filter((r) => r.status === "completed" || r.status === "confirmed").length;
      setStats(s);
      setRecent(rRes.data ?? []);
    })();
  }, [user, profile]);

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
    { icon: GraduationCap, label: "Mokiniai", value: stats.students },
    { icon: Building2, label: "Organizacijos", value: stats.organizations },
    { icon: Users, label: "Mokyklos administratoriai", value: stats.school_admins },
    { icon: ClipboardList, label: "Rezervacijos", value: stats.reservations },
    { icon: Activity, label: "Užbaigtos", value: stats.completed },
    { icon: Shield, label: "Visos surinktos valandos", value: stats.hours_total },
  ];

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Sistemos savininko sritis</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">Super Admin skydas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Bendra platformos apžvalga ir realaus laiko statistika.</p>
      </section>

      <section className="mx-auto mt-8 grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        {cards.map((c) => (
          <motion.div key={c.label} whileHover={{ y: -3 }} className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md backdrop-blur">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
              <c.icon className="h-5 w-5" />
            </div>
            <p className="mt-5 font-display text-3xl font-bold">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </motion.div>
        ))}
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 pb-16 sm:px-6">
        <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md backdrop-blur">
          <h2 className="font-display text-lg font-bold">Naujausios rezervacijos</h2>
          <div className="mt-4 divide-y divide-border">
            {recent.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Kol kas nėra rezervacijų.</p>}
            {recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-semibold">Rezervacija · {r.reservation_date}</p>
                  <p className="text-xs text-muted-foreground">{Number(r.hours_to_earn)} val.</p>
                </div>
                <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold">{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
