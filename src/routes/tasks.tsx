import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "../components/layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ReservationDialog, type ReservationSubmit, type ReserveTarget } from "@/components/reservation-dialog";
import { CustomReservationDialog } from "@/components/custom-reservation-dialog";
import { Search, MapPin, Calendar, Clock, Sparkles, Building2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Užduotys — Socialinės Valandos" },
      { name: "description", content: "Realios organizacijų užduotys, kurioms reikia tavo pagalbos." },
    ],
  }),
  component: TasksPage,
});

type Task = {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  task_date: string;
  start_time: string | null;
  end_time: string | null;
  available_hours: number;
  location: string;
  spots_total: number;
  is_open: boolean;
};

type OrgProfile = { id: string; full_name: string | null; organization_name: string | null };

function TasksPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [orgs, setOrgs] = useState<Record<string, OrgProfile>>({});
  const [q, setQ] = useState("");
  const [active, setActive] = useState<{ task: Task; target: ReserveTarget } | null>(null);
  const [customOpen, setCustomOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("is_open", true)
        .order("task_date", { ascending: true });
      const list = (data as Task[]) ?? [];
      setTasks(list);
      const ids = Array.from(new Set(list.map((t) => t.organization_id)));
      if (ids.length) {
        const { data: ps } = await supabase
          .from("profiles")
          .select("id, full_name, organization_name")
          .in("id", ids);
        const map: Record<string, OrgProfile> = {};
        (ps as OrgProfile[] | null)?.forEach((p) => (map[p.id] = p));
        setOrgs(map);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!q) return tasks;
    const t = q.toLowerCase();
    return tasks.filter((x) =>
      x.title.toLowerCase().includes(t) ||
      x.description.toLowerCase().includes(t) ||
      x.location.toLowerCase().includes(t) ||
      (orgs[x.organization_id]?.organization_name ?? "").toLowerCase().includes(t),
    );
  }, [q, tasks, orgs]);

  const orgName = (id: string) => orgs[id]?.organization_name ?? orgs[id]?.full_name ?? "Organizacija";

  const handleReserve = (task: Task) => {
    if (!user) {
      toast.error("Prisijunk, kad galėtum rezervuoti");
      navigate({ to: "/login" });
      return;
    }
    if (profile && profile.role !== "student") {
      toast.error("Tik moksleiviai gali rezervuoti");
      return;
    }
    setActive({
      task,
      target: {
        id: task.organization_id,
        name: orgName(task.organization_id),
        emoji: "🤝",
        town: task.location,
        category: task.title,
        presetDate: task.task_date,
        presetStart: task.start_time?.slice(0, 5),
        presetEnd: task.end_time?.slice(0, 5),
      },
    });
  };

  const confirm = async (details: ReservationSubmit) => {
    if (!active || !user) return;
    const { error } = await supabase.from("reservations").insert({
      student_id: user.id,
      organization_id: active.task.organization_id,
      task_id: active.task.id,
      reservation_date: details.date,
      start_time: details.start_time,
      end_time: details.end_time,
      hours_to_earn: details.hours,
      status: "pending",
      note: details.note || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Užklausa išsiųsta: ${active.target.name}`);
    setActive(null);
  };

  return (
    <PageShell>
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-mesh opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Atviros užduotys</span>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Pasirink, kur padėsi</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {tasks.length} realių užduočių, paskelbtų organizacijų. Užrezervuok laiką ir kaupk socialines valandas.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex flex-1 min-w-[260px] items-center gap-3 rounded-2xl border border-border bg-card/80 px-4 py-2 backdrop-blur">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ieškoti pagal pavadinimą, vietą ar organizaciją..."
                className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button
              onClick={() => {
                if (!user) { toast.error("Prisijunk, kad galėtum rezervuoti"); navigate({ to: "/login" }); return; }
                if (profile && profile.role !== "student") { toast.error("Tik moksleiviai gali rezervuoti"); return; }
                setCustomOpen(true);
              }}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
            >
              <Sparkles className="h-4 w-4" /> Pasiūlyk savo rezervaciją
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {filtered.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border p-16 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-lg font-semibold">Kol kas nėra atvirų užduočių</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Organizacijos netrukus paskelbs naujų galimybių. Tuo tarpu apžiūrėk{" "}
              <Link to="/organizations" className="font-semibold text-primary hover:underline">organizacijų katalogą</Link>.
            </p>
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((t, i) => (
              <motion.article
                key={t.id}
                layout
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                whileHover={{ y: -4 }}
                className="group flex flex-col rounded-3xl border border-border bg-gradient-card p-6 shadow-md transition hover:shadow-xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold">
                    <Building2 className="h-3 w-3" /> {orgName(t.organization_id)}
                  </div>
                  <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
                    {Number(t.available_hours)} val.
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold leading-tight">{t.title}</h3>
                {t.description && (
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{t.description}</p>
                )}
                <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                  <p className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {t.task_date}</p>
                  {t.start_time && t.end_time && (
                    <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {t.start_time.slice(0, 5)}–{t.end_time.slice(0, 5)}</p>
                  )}
                  {t.location && <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {t.location}</p>}
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleReserve(t)}
                  className="mt-5 w-full rounded-full bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
                >
                  Rezervuoti
                </motion.button>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      </section>

      <ReservationDialog target={active?.target ?? null} onClose={() => setActive(null)} onConfirm={confirm} />
      <CustomReservationDialog open={customOpen} onClose={() => setCustomOpen(false)} />
    </PageShell>
  );
}
