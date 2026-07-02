import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "../components/layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ReservationDialog, type ReservationSubmit, type ReserveTarget } from "@/components/reservation-dialog";
import { CustomReservationDialog } from "@/components/custom-reservation-dialog";
import { TiltCard } from "@/components/tilt-card";
import { Search, MapPin, Calendar, Clock, Sparkles, Building2, Filter, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Užduotys ir organizacijos — Socialinės Valandos" },
      { name: "description", content: "Realios organizacijų užduotys ir profiliai." },
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
  category?: string | null;
  spots_total: number;
  is_open: boolean;
};

type OrgProfile = { id: string; full_name: string | null; organization_name: string | null; email: string | null };

const CATEGORY_LABELS: Record<string, string> = {
  aplinkosauga: "Aplinkosauga",
  socialine_parama: "Socialinė parama",
  kultura: "Kultūra",
  sportas: "Sportas",
  gyvunai: "Gyvūnai",
  svietimas: "Švietimas",
};

function guessCategory(t: Task): string {
  const text = `${t.title} ${t.description}`.toLowerCase();
  if (/gyv[uū]n|prieglaud|katė|šuo/.test(text)) return "gyvunai";
  if (/aplink|parkas|šiukšl|medž|sod/.test(text)) return "aplinkosauga";
  if (/kult[uū]r|muziej|festivalis|teatr/.test(text)) return "kultura";
  if (/sport|treniruot|varžyb/.test(text)) return "sportas";
  if (/švie|mokykl|pamok|vaikų/.test(text)) return "svietimas";
  return "socialine_parama";
}

function TasksPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"tasks" | "orgs">("tasks");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [orgs, setOrgs] = useState<Record<string, OrgProfile>>({});
  const [allOrgs, setAllOrgs] = useState<OrgProfile[]>([]);
  const [q, setQ] = useState("");
  const [town, setTown] = useState<string>("");
  const [cat, setCat] = useState<string>("");
  const [active, setActive] = useState<{ task: Task; target: ReserveTarget } | null>(null);
  const [customOpen, setCustomOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: tData }, { data: oData }] = await Promise.all([
        supabase.from("tasks").select("*").eq("is_open", true).order("task_date", { ascending: true }),
        supabase.from("profiles").select("id, full_name, organization_name, email").eq("role", "organization"),
      ]);
      const list = (tData as Task[]) ?? [];
      setTasks(list);
      const orgList = (oData as OrgProfile[]) ?? [];
      setAllOrgs(orgList);
      const map: Record<string, OrgProfile> = {};
      orgList.forEach((p) => (map[p.id] = p));
      setOrgs(map);
    })();
  }, []);

  const towns = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => { if (t.location) set.add(t.location.split(",")[0].trim()); });
    return Array.from(set).sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((x) => {
      const org = orgs[x.organization_id];
      const orgName = org?.organization_name ?? org?.full_name ?? "";
      const text = `${x.title} ${x.description} ${x.location} ${orgName}`.toLowerCase();
      if (q && !text.includes(q.toLowerCase())) return false;
      if (town && !x.location?.toLowerCase().includes(town.toLowerCase())) return false;
      if (cat && guessCategory(x) !== cat) return false;
      return true;
    });
  }, [q, town, cat, tasks, orgs]);

  const filteredOrgs = useMemo(() => {
    if (!q) return allOrgs;
    const t = q.toLowerCase();
    return allOrgs.filter((o) =>
      (o.organization_name ?? o.full_name ?? "").toLowerCase().includes(t) ||
      (o.email ?? "").toLowerCase().includes(t),
    );
  }, [q, allOrgs]);

  const orgName = (id: string) => orgs[id]?.organization_name ?? orgs[id]?.full_name ?? "Organizacija";

  const handleReserve = (task: Task) => {
    if (!user) { toast.error("Prisijunk, kad galėtum rezervuoti"); navigate({ to: "/login" }); return; }
    if (profile && profile.role !== "student") { toast.error("Tik moksleiviai gali rezervuoti"); return; }
    setActive({
      task,
      target: {
        id: task.organization_id,
        name: orgName(task.organization_id),
        emoji: "🤝",
        town: task.location,
        category: CATEGORY_LABELS[guessCategory(task)] ?? task.title,
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

  const clearFilters = () => { setQ(""); setTown(""); setCat(""); };

  return (
    <PageShell>
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-mesh opacity-60" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Atraskite galimybes</span>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">Užduotys ir organizacijos</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {tasks.length} atvirų užduočių iš {allOrgs.length} organizacijų. Filtruok pagal miestą, kategoriją arba raktinius žodžius.
          </p>

          <div className="mt-6 inline-flex rounded-full border border-border bg-card/70 p-1 backdrop-blur">
            <button
              onClick={() => setTab("tasks")}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === "tasks" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}
            >Užduotys</button>
            <button
              onClick={() => setTab("orgs")}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${tab === "orgs" ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}
            >Organizacijos</button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex flex-1 min-w-[240px] items-center gap-3 rounded-2xl border border-border bg-card/80 px-4 py-2 backdrop-blur">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder={tab === "tasks" ? "Paieška: pavadinimas, vieta, organizacija…" : "Ieškoti organizacijos…"}
                className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            </div>
            {tab === "tasks" && (
              <>
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-card/80 px-3 py-2 backdrop-blur">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <select value={town} onChange={(e) => setTown(e.target.value)}
                    className="h-9 bg-transparent pr-2 text-sm outline-none">
                    <option value="">Visi miestai</option>
                    {towns.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-card/80 px-3 py-2 backdrop-blur">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select value={cat} onChange={(e) => setCat(e.target.value)}
                    className="h-9 bg-transparent pr-2 text-sm outline-none">
                    <option value="">Visos kategorijos</option>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </>
            )}
            {(q || town || cat) && (
              <button onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent">
                <X className="h-3 w-3" /> Išvalyti
              </button>
            )}
            <button onClick={() => {
                if (!user) { toast.error("Prisijunk, kad galėtum rezervuoti"); navigate({ to: "/login" }); return; }
                if (profile && profile.role !== "student") { toast.error("Tik moksleiviai gali rezervuoti"); return; }
                setCustomOpen(true);
              }}
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow">
              <Sparkles className="h-4 w-4" /> Pasiūlyk savo rezervaciją
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {tab === "tasks" ? (
          <>
            {filteredTasks.length === 0 && (
              <div className="rounded-3xl border border-dashed border-border p-16 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-lg font-semibold">Kol kas nėra atitinkamų užduočių</p>
                <p className="mt-1 text-sm text-muted-foreground">Pabandyk pakeisti filtrus arba pasiūlyk savo rezervaciją.</p>
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filteredTasks.map((t, i) => (
                  <motion.article key={t.id} layout
                    initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3, delay: i * 0.03 }}
                    whileHover={{ y: -4 }}
                    className="group flex flex-col rounded-3xl border border-border bg-gradient-card p-6 shadow-md backdrop-blur transition hover:shadow-xl"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold">
                        <Building2 className="h-3 w-3" /> {orgName(t.organization_id)}
                      </div>
                      <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
                        {Number(t.available_hours)} val.
                      </span>
                    </div>
                    <h3 className="mt-4 font-display text-lg font-bold leading-tight">{t.title}</h3>
                    <span className="mt-1 inline-block w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      {CATEGORY_LABELS[guessCategory(t)]}
                    </span>
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
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => handleReserve(t)}
                      className="mt-5 w-full rounded-full bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
                      Rezervuoti
                    </motion.button>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <>
            {filteredOrgs.length === 0 && (
              <div className="rounded-3xl border border-dashed border-border p-16 text-center">
                <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-lg font-semibold">Nerasta organizacijų</p>
                <p className="mt-1 text-sm text-muted-foreground">Pabandyk kitokią paiešką.</p>
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredOrgs.map((o, i) => {
                const orgTaskCount = tasks.filter((t) => t.organization_id === o.id).length;
                return (
                  <motion.article key={o.id}
                    initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    whileHover={{ y: -4 }}
                    className="flex flex-col rounded-3xl border border-border bg-gradient-card p-6 shadow-md backdrop-blur transition hover:shadow-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-lg text-primary-foreground shadow-glow">
                        {(o.organization_name ?? o.full_name ?? "?").slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-lg font-bold">{o.organization_name ?? o.full_name}</h3>
                        <p className="truncate text-xs text-muted-foreground">{o.email}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                        {orgTaskCount} atvirų užduočių
                      </span>
                    </div>
                    <button
                      onClick={() => { setTab("tasks"); setQ(o.organization_name ?? o.full_name ?? ""); }}
                      className="mt-5 w-full rounded-full border border-border bg-background px-4 py-2.5 text-sm font-semibold transition hover:border-primary/40 hover:bg-accent"
                    >
                      Peržiūrėti užduotis
                    </button>
                  </motion.article>
                );
              })}
            </div>
          </>
        )}
      </section>

      <ReservationDialog target={active?.target ?? null} onClose={() => setActive(null)} onConfirm={confirm} />
      <CustomReservationDialog open={customOpen} onClose={() => setCustomOpen(false)} />
    </PageShell>
  );
}
