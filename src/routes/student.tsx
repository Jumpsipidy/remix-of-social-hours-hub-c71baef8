import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PageShell } from "../components/layout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { organizations } from "@/lib/mock-data";
import { Clock, Target, CalendarCheck, Building2, TrendingUp, MessageSquare, CheckCircle2, AlarmClock, XCircle } from "lucide-react";
import { ChatDialog, type ChatReservation } from "@/components/chat-dialog";

export const Route = createFileRoute("/student")({
  head: () => ({
    meta: [
      { title: "Mokinio sritis — Socialinės Valandos" },
      { name: "description", content: "Stebėk sukauptas valandas, suplanuotus vizitus ir savanorystės progresą." },
    ],
  }),
  component: StudentDashboard,
});

type Reservation = {
  id: string;
  student_id: string;
  organization_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  hours_to_earn: number;
  status: "pending" | "confirmed" | "declined";
};

const orgName = (id: string) => organizations.find((o) => o.id === id)?.name ?? "Organizacija";
const orgEmoji = (id: string) => organizations.find((o) => o.id === id)?.emoji ?? "🤝";

function StudentDashboard() {
  const { user, profile, loading } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [chatRes, setChatRes] = useState<ChatReservation | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("reservations")
      .select("*")
      .eq("student_id", user.id)
      .order("reservation_date", { ascending: false })
      .then(({ data }) => setReservations((data as Reservation[]) ?? []));
  }, [user]);

  if (loading) return <PageShell><div className="p-20 text-center text-muted-foreground">Kraunama…</div></PageShell>;
  if (!user || !profile) {
    return (
      <PageShell>
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <h1 className="text-2xl font-bold">Prisijunk, kad pamatytum savo progresą</h1>
          <Link to="/login" className="mt-6 inline-flex rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">Prisijungti</Link>
        </div>
      </PageShell>
    );
  }

  const completed = Number(profile.hours_earned ?? 0);
  const required = Number(profile.hours_needed ?? 0);
  const progress = required ? Math.min(100, Math.round((completed / required) * 100)) : 0;
  const remaining = Math.max(0, required - completed);
  const upcoming = reservations.filter((r) => r.status !== "declined");

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Mokinio sritis</p>
            <h1 className="mt-1 truncate text-3xl font-bold tracking-tight sm:text-4xl">Sveika, {profile.full_name ?? "moksleivi"} 👋</h1>
            <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>
          </div>
          <Link to="/tasks" className="shrink-0 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">+ Naršyti užduotis</Link>
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Clock, label: "Užbaigtos valandos", value: `${completed}`, sub: `iš ${required} reikalingų` },
            { icon: Target, label: "Liko valandų", value: `${remaining}`, sub: `${progress}% iki tikslo` },
            { icon: CalendarCheck, label: "Aktyvios rezervacijos", value: upcoming.length, sub: "" },
            { icon: Building2, label: "Skirtingų organizacijų", value: new Set(reservations.map((r) => r.organization_id)).size, sub: "" },
          ].map((s) => (
            <div key={s.label} className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
              <div className="flex items-center justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
                  <s.icon className="h-5 w-5" />
                </div>
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
              <p className="mt-5 font-display text-3xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              {s.sub && <p className="text-xs text-muted-foreground/80">{s.sub}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
        <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Progresas iki tikslo</h2>
              <p className="text-xs text-muted-foreground">{completed} iš {required} val.</p>
            </div>
            <span className="font-display text-2xl font-bold">{progress}%</span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-accent">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8 }} className="h-full bg-gradient-primary" />
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-7xl px-4 pb-16 sm:px-6">
        <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
          <h2 className="text-lg font-bold">Mano rezervacijos</h2>
          <p className="text-xs text-muted-foreground">Bendrauk su organizacija ar mokyklos administratoriumi saugiame 3-šalių pokalbyje.</p>
          <div className="mt-5 space-y-3">
            {reservations.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Dar nėra rezervacijų. <Link to="/organizations" className="font-semibold text-primary hover:underline">Pasirink organizaciją</Link>
              </div>
            )}
            {reservations.map((r) => {
              const tone = r.status === "confirmed" ? "bg-success/15 text-success" : r.status === "declined" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning-foreground";
              const Icon = r.status === "confirmed" ? CheckCircle2 : r.status === "declined" ? XCircle : AlarmClock;
              return (
                <div key={r.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-background/60 p-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent text-xl">{orgEmoji(r.organization_id)}</div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{orgName(r.organization_id)}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.reservation_date} · {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)} · {Number(r.hours_to_earn)} val.</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
                      <Icon className="h-3 w-3" /> {r.status === "confirmed" ? "Patvirtinta" : r.status === "declined" ? "Atmesta" : "Laukia"}
                    </span>
                    <button
                      onClick={() => setChatRes({ id: r.id, student_id: r.student_id, organization_id: r.organization_id, organization_name: orgName(r.organization_id) })}
                      className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition hover:opacity-90"
                    >
                      <MessageSquare className="h-3 w-3" /> Pokalbis
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <ChatDialog reservation={chatRes} onClose={() => setChatRes(null)} />
    </PageShell>
  );
}
