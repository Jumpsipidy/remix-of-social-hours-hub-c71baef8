import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "../components/layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ReservationDialog, type ReservationSubmit, type ReserveTarget } from "@/components/reservation-dialog";
import { CustomReservationDialog } from "@/components/custom-reservation-dialog";
import { InviteFriendsDialog } from "@/components/invite-friends-dialog";
import { TaskDetailDialog } from "@/components/task-detail-dialog";
import { CITIES, cityOf } from "@/lib/cities";
import { startReservationChat } from "@/lib/reservation-chat";
import { TasksSkeleton } from "@/components/skeleton-loader";
import { Search, MapPin, Calendar, Clock, Sparkles, Building2, Filter, X, CalendarHeart, Tag as TagIcon, Navigation } from "lucide-react";
import { toast } from "sonner";
import { TAG_PRESETS } from "@/components/tags-input";
import { logActivity } from "@/lib/activity-log";
import { listOrganizations } from "@/lib/orgs.functions";
import { InteractiveTasksMap } from "@/components/interactive-tasks-map";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Savanorystės užduotys ir organizacijos — Socialinės Valandos" },
      { name: "description", content: "Raskite geriausias savanorystės galimybes Lietuvos moksleiviams. Filtruokite užduotis pagal kategoriją, miestą ir valandas. Pradėkite rinkti socialines valandas dabar." },
      { property: "og:title", content: "Savanorystės užduotys ir organizacijos" },
      { property: "og:description", content: "Atviros savanorystės užduotys moksleiviams — filtruok, rezervuok ir rink socialines valandas patikimose organizacijose." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://socialinesvalandos.dev/tasks" },
      { property: "og:image", content: "https://socialinesvalandos.dev/og-cover.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://socialinesvalandos.dev/og-cover.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://socialinesvalandos.dev/tasks" }],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ task: typeof s.task === "string" ? s.task : undefined }) as { task?: string },
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
  is_event?: boolean;
  event_host_name?: string | null;
  created_by?: string | null;
  tags?: string[] | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
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

const TASK_COLUMNS = "id, organization_id, title, description, task_date, start_time, end_time, available_hours, location, spots_total, is_open, is_event, event_host_name, created_by, city, address, latitude, longitude";

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
  const [tab, setTab] = useState<"tasks" | "orgs" | "map">("tasks");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [orgs, setOrgs] = useState<Record<string, OrgProfile>>({});
  const [allOrgs, setAllOrgs] = useState<OrgProfile[]>([]);
  const [q, setQ] = useState("");
  const [town, setTown] = useState<string>("");
  const [cat, setCat] = useState<string>("");
  const [orgFilter, setOrgFilter] = useState<string>("");
  const [detail, setDetail] = useState<Task | null>(null);
  const { task: linkedTask } = Route.useSearch();
  const [linkedOpened, setLinkedOpened] = useState(false);
  useEffect(() => {
    if (!linkedTask || linkedOpened || !tasks.length) return;
    const t = tasks.find((x) => x.id === linkedTask);
    if (t) { setDetail(t); setLinkedOpened(true); }
  }, [linkedTask, linkedOpened, tasks]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [active, setActive] = useState<{ task: Task; target: ReserveTarget } | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [invite, setInvite] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    (async () => {
     try {
      const [{ data: tData }, { data: oData }] = await Promise.all([
        supabase.from("tasks").select(TASK_COLUMNS).eq("is_open", true).gte("task_date", new Date().toISOString().slice(0, 10)).order("task_date", { ascending: true }),
        supabase.from("profiles").select("id, full_name, organization_name, email").eq("role", "organization"),
      ]);
      const list = (tData as Task[]) ?? [];
      setTasks(list);
      setLoadingTasks(false);
      let orgList = (oData as OrgProfile[]) ?? [];
      // RLS can hide organization profiles, which showed a generic „Organizacija"
      // label instead of the real name. Fall back to the public directory.
      const missing = list.some((t) => !orgList.find((o) => o.id === t.organization_id));
      if (orgList.length === 0 || missing) {
        try {
          const dir = await listOrganizations();
          const byId = new Map(orgList.map((o) => [o.id, o]));
          dir.forEach((o) => { if (!byId.has(o.id)) byId.set(o.id, o as OrgProfile); });
          orgList = Array.from(byId.values());
        } catch { /* not signed in or directory unavailable */ }
      }
      setAllOrgs(orgList);
      const map: Record<string, OrgProfile> = {};
      orgList.forEach((p) => (map[p.id] = p));
      setOrgs(map);
     } finally { setLoadingTasks(false); }
    })();
  }, []);

  const towns = CITIES as readonly string[];
  const orgOptions = useMemo(() => {
    const ids = new Set(tasks.filter((t) => !town || cityOf(t) === town).map((t) => t.organization_id));
    return allOrgs.filter((o) => ids.has(o.id)).sort((a, b) => (a.organization_name ?? a.full_name ?? "").localeCompare(b.organization_name ?? b.full_name ?? "", "lt"));
  }, [tasks, allOrgs, town]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => (t.tags ?? []).forEach((x) => set.add(x)));
    // Merge presets so filters are always useful even before orgs tag their tasks
    TAG_PRESETS.forEach((p) => set.add(p));
    return Array.from(set);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((x) => {
      const org = orgs[x.organization_id];
      const orgName = org?.organization_name ?? org?.full_name ?? "";
      const tagsStr = (x.tags ?? []).join(" ");
      const text = `${x.title} ${x.description} ${x.location} ${orgName} ${tagsStr}`.toLowerCase();
      if (q && !text.includes(q.toLowerCase())) return false;
      if (town && cityOf(x) !== town) return false;
      if (orgFilter && x.organization_id !== orgFilter) return false;
      if (cat && guessCategory(x).toLowerCase() !== cat.toLowerCase()) return false;
      if (selectedTags.length) {
        const xt = x.tags ?? [];
        const ok = selectedTags.every((s) => xt.includes(s));
        if (!ok) return false;
      }
      return true;
    });
  }, [q, town, cat, orgFilter, selectedTags, tasks, orgs]);

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
        tags: task.tags ?? [],
        address: task.address ?? null,
        latitude: task.latitude ?? null,
        longitude: task.longitude ?? null,
      },
    });
  };

  const confirm = async (details: ReservationSubmit) => {
    if (!active || !user) return;
    const { data: inserted, error } = await supabase.from("reservations").insert({
      student_id: user.id,
      organization_id: active.task.organization_id,
      task_id: active.task.id,
      reservation_date: details.date,
      start_time: details.start_time,
      end_time: details.end_time,
      hours_to_earn: details.hours,
      status: "pending",
      note: details.note || null,
      location: active.task.location ?? null,
      city: cityOf(active.task),
      address: active.task.address ?? null,
      latitude: active.task.latitude ?? null,
      longitude: active.task.longitude ?? null,
    } as any).select("id").single();
    if (error) { toast.error(error.message); return; }
    toast.success(`Rezervacija išsiųsta: ${active.target.name}`, {
      description: `${details.date} · ${details.hours} val. · laukia organizacijos patvirtinimo`,
      duration: 8000,
      action: { label: "Peržiūrėti", onClick: () => { window.location.href = "/student#mano-rezervacijos"; } },
    });
    if (inserted?.id) void startReservationChat({ reservationId: inserted.id as string, studentId: user.id, organizationId: active.task.organization_id, message: details.note || `Sveiki! Noriu prisijungti prie „${active.task.title}“ ${details.date}.` });
    logActivity("reservation.created", { entityType: "reservation", entityId: inserted?.id as string | undefined, meta: { hours: details.hours, org: active.target.name } });
    const label = `${active.target.name} · ${details.date} · ${details.hours} val.`;
    setActive(null);
    if (inserted?.id) setInvite({ id: inserted.id as string, label });
  };

  const toggleTag = (t: string) =>
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const clearFilters = () => { setQ(""); setTown(""); setCat(""); setOrgFilter(""); setSelectedTags([]); };

  return (
    <PageShell>
      <div className="tasks-page relative">
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-mesh opacity-40" aria-hidden />
          <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-14">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Atraskite galimybes</span>
          <h1 className="mt-2 font-display text-2xl font-bold sm:text-5xl">Užduotys ir organizacijos</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {loadingTasks ? "Kraunamos užduotys…" : `${tasks.length} atvirų užduočių iš ${allOrgs.length} organizacijų.`} Filtruok pagal miestą, kategoriją arba raktinius žodžius.
          </p>

          <div className="mt-6 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="inline-flex rounded-full border border-border bg-card/70 p-1 backdrop-blur">
              {[
                { id: "tasks", label: "Užduotys", icon: TagIcon },
                { id: "map", label: "Žemėlapis", icon: Navigation },
                { id: "orgs", label: "Organizacijos", icon: Building2 }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as any)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-2 text-sm font-bold tracking-tight transition-all active:scale-95 ${
                    tab === t.id 
                      ? "bg-gradient-primary text-primary-foreground shadow-glow" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <t.icon className={`h-3.5 w-3.5 ${tab === t.id ? "text-white" : "text-muted-foreground"}`} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="task-filters mt-4 grid grid-cols-2 items-center gap-2 sm:mt-6 sm:flex sm:flex-wrap sm:gap-3">
            <div className="col-span-2 flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-border bg-card/80 px-4 py-2 backdrop-blur">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input aria-label="Ieškoti užduoties ar organizacijos" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder={tab === "tasks" ? "Paieška: pavadinimas, vieta, organizacija…" : "Ieškoti organizacijos…"}
                className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            </div>
            {(tab === "tasks" || tab === "map") && (
              <>
                <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card/80 px-2 py-1.5 sm:px-3 sm:py-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <select aria-label="Miestas" value={town} onChange={(e) => setTown(e.target.value)}
                    className="h-11 min-w-0 w-full rounded-md bg-card text-foreground pr-2 text-sm outline-none focus:ring-1 focus:ring-primary">
                    <option value="" className="bg-card text-foreground">Visi miestai</option>
                    {towns.map((t) => <option key={t} value={t} className="bg-card text-foreground">{t}</option>)}
                  </select>
                </div>
                <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card/80 px-2 py-1.5 sm:px-3 sm:py-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <select value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} aria-label="Organizacija"
                    className="h-11 min-w-0 w-full sm:max-w-[200px] rounded-md bg-card text-foreground pr-2 text-sm outline-none focus:ring-1 focus:ring-primary">
                    <option value="" className="bg-card text-foreground">Visos organizacijos ({orgOptions.length})</option>
                    {orgOptions.map((o) => <option key={o.id} value={o.id} className="bg-card text-foreground">{o.organization_name ?? o.full_name}</option>)}
                  </select>
                </div>
                <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-card/80 px-2 py-1.5 sm:px-3 sm:py-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select aria-label="Kategorija" value={cat} onChange={(e) => setCat(e.target.value)}
                    className="h-11 min-w-0 w-full rounded-md bg-card text-foreground pr-2 text-sm outline-none focus:ring-1 focus:ring-primary">
                    <option value="" className="bg-card text-foreground">Visos kategorijos</option>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k} className="bg-card text-foreground">{v}</option>)}
                  </select>
                </div>
              </>
            )}
            {(q || town || cat || orgFilter || selectedTags.length > 0) && (
              <button onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent">
                <X className="h-3 w-3" /> Išvalyti
              </button>
            )}
            <button onClick={() => {
                if (!user) { toast.error("Prisijunk, kad galėtum rezervuoti"); navigate({ to: "/login" }); return; }
                if (profile && profile.role !== "student") { toast.error("Tik moksleiviai gali rezervuoti"); return; }
                setCustomOpen(true);
              }}
              className="col-span-2 inline-flex min-w-0 items-center justify-center gap-2 rounded-lg bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow">
              <Sparkles className="h-4 w-4" /> Pasiūlyk savo rezervaciją
            </button>
          </div>

          {tab === "tasks" && (
            <div className="mt-5">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <TagIcon className="h-3.5 w-3.5" /> Žymos
                {selectedTags.length > 0 && (
                  <button onClick={() => setSelectedTags([])} className="ml-1 inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] normal-case tracking-normal text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" /> Nuimti visas
                  </button>
                )}
              </div>
              <div className="mt-2 -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {availableTags.map((t) => {
                  const on = selectedTags.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleTag(t)}
                      className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        on
                          ? "border-transparent bg-gradient-primary text-primary-foreground shadow-glow"
                          : "border-border bg-card/70 text-muted-foreground hover:border-primary/40 hover:text-primary"
                      }`}
                    >
                      #{t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        </section>


      <section className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-10">
        {tab === "map" ? (
          <InteractiveTasksMap 
            tasks={filteredTasks} 
            organizations={allOrgs}
            onSelectTask={(t: Task) => setDetail(t)}
            onSelectOrg={(org) => navigate({ to: `/org/${org.id}` })}
          />
        ) : tab === "tasks" && loadingTasks ? (
          <TasksSkeleton count={6} />
        ) : tab === "tasks" ? (
          <>
            {filteredTasks.length === 0 && (
              <div className="rounded-3xl border border-dashed border-border p-16 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-lg font-semibold">Kol kas nėra atitinkamų užduočių</p>
                <p className="mt-1 text-sm text-muted-foreground">Pabandyk pakeisti filtrus arba pasiūlyk savo rezervaciją.</p>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filteredTasks.map((t, i) => (
                  <motion.div key={t.id} layout
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.3, delay: (i % 6) * 0.03 }}
                  >
                      <article onClick={() => setDetail(t)} className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-gradient-card/85 p-4 shadow-md sm:rounded-3xl sm:p-6 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elegant">
                        <motion.div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-primary opacity-10 blur-2xl transition-opacity group-hover:opacity-30" />
                        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                          <div className={`inline-flex min-w-0 items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold ${t.is_event ? "bg-primary/15 text-primary" : "bg-accent"}`}>
                            {t.is_event ? <CalendarHeart className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                            <span className="min-w-0 break-words">{t.is_event ? (t.event_host_name || "Vienkartinis renginys") : orgName(t.organization_id)}</span>
                          </div>
                          <span className="shrink-0 rounded-lg bg-success/15 px-2 py-1 text-xs font-semibold text-success">
                            {Number(t.available_hours)} val.
                          </span>
                        </div>
                        <h2 className="relative mt-2.5 font-display text-base font-bold leading-tight sm:mt-4 sm:text-lg"><Button variant="ghost" type="button" className="h-auto w-full min-w-0 justify-start whitespace-normal p-0 text-left text-inherit font-inherit [overflow-wrap:anywhere]" onClick={(event) => { event.stopPropagation(); setDetail(t); }}>{t.title}</Button></h2>
                        <span className="relative mt-1 inline-block w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                          {CATEGORY_LABELS[guessCategory(t)]}
                        </span>
                        {t.description && (
                          <p className="relative mt-1.5 line-clamp-2 text-[13px] text-muted-foreground sm:mt-2 sm:line-clamp-3 sm:text-sm">{t.description}</p>
                        )}
                        <div className="relative mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground sm:mt-4 sm:block sm:space-y-1.5">
                          <p className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {t.task_date}{cityOf(t) ? ` · ${cityOf(t)}` : ""}</p>
                          {t.start_time && t.end_time && (
                            <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {t.start_time.slice(0, 5)}–{t.end_time.slice(0, 5)}</p>
                          )}
                          {t.location && <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {t.location}</p>}
                        </div>
                        {t.tags && t.tags.length > 0 && (
                          <div className="relative mt-3 hidden flex-wrap gap-1 sm:flex">
                            {t.tags.slice(0, 5).map((tg) => (
                              <button
                                key={tg}
                                onClick={(e) => { e.stopPropagation(); toggleTag(tg); }}
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
                                  selectedTags.includes(tg)
                                    ? "bg-gradient-primary text-primary-foreground"
                                    : "bg-primary/10 text-primary hover:bg-primary/20"
                                }`}
                              >
                                #{tg}
                              </button>
                            ))}
                          </div>
                        )}
                        <motion.button whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
                          onClick={(e) => { e.stopPropagation(); handleReserve(t); }}
                          className="relative mt-3 w-full rounded-lg bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
                          Rezervuoti
                        </motion.button>
                      </article>
                  </motion.div>
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
                  <motion.div key={o.id}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (i % 6) * 0.04 }}
                  >
                      <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-gradient-card/85 p-6 shadow-md backdrop-blur-xl transition hover:shadow-elegant">
                        <motion.div aria-hidden className="pointer-events-none absolute -left-16 -bottom-16 h-40 w-40 rounded-full bg-gradient-accent opacity-10 blur-2xl transition-opacity group-hover:opacity-30" />
                        <div className="relative flex items-center gap-3">
                          <motion.div whileHover={{ rotate: [0, -8, 8, 0], scale: 1.08 }} transition={{ duration: 0.5 }} className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-lg text-primary-foreground shadow-glow">
                            {(o.organization_name ?? o.full_name ?? "?").slice(0, 1)}
                          </motion.div>
                          <div className="min-w-0">
                            <h2 className="truncate font-display text-lg font-bold">{o.organization_name ?? o.full_name}</h2>
                            <p className="truncate text-xs text-muted-foreground">{o.email}</p>
                          </div>
                        </div>
                        <div className="relative mt-4 flex items-center gap-2 text-xs">
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                            {orgTaskCount} atvirų užduočių
                          </span>
                        </div>
                        <motion.button whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
                          onClick={() => { setTab("tasks"); setQ(o.organization_name ?? o.full_name ?? ""); }}
                          className="relative mt-5 w-full rounded-full border border-border bg-background/60 px-4 py-2.5 text-sm font-semibold backdrop-blur transition hover:border-primary/40 hover:bg-accent"
                        >
                          Peržiūrėti užduotis
                        </motion.button>
                      </article>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
        </section>
      </div>

      <ReservationDialog target={active?.target ?? null} onClose={() => setActive(null)} onConfirm={confirm} />
      <TaskDetailDialog
        task={detail}
        orgName={detail ? (detail.is_event ? (detail.event_host_name || orgName(detail.organization_id)) : orgName(detail.organization_id)) : ""}
        onClose={() => setDetail(null)}
        onReserve={(t) => { setDetail(null); handleReserve(t as Task); }}
      />
      <CustomReservationDialog open={customOpen} onClose={() => setCustomOpen(false)} />
      <InviteFriendsDialog
        open={!!invite}
        reservationId={invite?.id ?? null}
        inviterId={user?.id ?? ""}
        reservationLabel={invite?.label}
        onClose={() => setInvite(null)}
      />
    </PageShell>
  );
}
