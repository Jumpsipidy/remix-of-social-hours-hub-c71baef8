import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "../components/layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ReservationDialog, type ReservationSubmit, type ReserveTarget } from "@/components/reservation-dialog";
import { CustomReservationDialog } from "@/components/custom-reservation-dialog";
import { InviteFriendsDialog } from "@/components/invite-friends-dialog";
import { userError } from "@/lib/user-error";
import { inviteFriendsToReservation } from "@/lib/friends";
import { TaskDetailDialog } from "@/components/task-detail-dialog";
import { CITIES, cityOf } from "@/lib/cities";
import { startReservationChat } from "@/lib/reservation-chat";
import { TasksSkeleton } from "@/components/skeleton-loader";
import { Search, MapPin, Calendar, Clock, Sparkles, Building2, Filter, X, CalendarHeart, Tag as TagIcon, Navigation, ArrowUpRight, ChevronDown } from "lucide-react";
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
      { name: "twitter:card", content: "summary_large_image" },
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
  const [filtersOpen, setFiltersOpen] = useState(false);
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
        flexibleTime: !task.start_time || !task.end_time,
        plannedHours: Number(task.available_hours),
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
      start_time: details.start_time || null,
      end_time: details.end_time || null,
      hours_to_earn: details.hours,
      status: "pending",
      note: details.note || null,
      location: active.task.location ?? null,
      city: cityOf(active.task),
      address: active.task.address ?? null,
      latitude: active.task.latitude ?? null,
      longitude: active.task.longitude ?? null,
    } as any).select("id").single();
    if (error) { toast.error(userError(error, "Nepavyko išsiųsti rezervacijos.")); throw new Error("Rezervacija neišsiųsta"); }
    toast.success(`Rezervacija išsiųsta: ${active.target.name}`, {
      description: `${details.date} · ${details.hours} val. · laukia organizacijos patvirtinimo`,
      duration: 8000,
      action: { label: "Peržiūrėti", onClick: () => { window.location.href = "/student#mano-rezervacijos"; } },
    });
    if (inserted?.id) void startReservationChat({ reservationId: inserted.id as string, studentId: user.id, organizationId: active.task.organization_id, message: details.note || `Sveiki! Noriu prisijungti prie „${active.task.title}“ ${details.date}.` });
    logActivity("reservation.created", { entityType: "reservation", entityId: inserted?.id as string | undefined, meta: { hours: details.hours, org: active.target.name } });
    if (inserted?.id && details.friendIds.length) {
      try {
        await inviteFriendsToReservation(inserted.id as string, user.id, details.friendIds);
        toast.success(`Pakviesta draugų: ${details.friendIds.length}`, { description: "Kai jie priims kvietimą, kiekvienas gaus savo įsiregistravimo kodą." });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Nepavyko pakviesti draugų");
      }
    }
    if (inserted?.id && !details.friendIds.length) setInvite({ id: inserted.id, label: active.task.title });
    setActive(null);
  };

  const toggleTag = (t: string) =>
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const clearFilters = () => { setQ(""); setTown(""); setCat(""); setOrgFilter(""); setSelectedTags([]); };

  return (
    <PageShell>
      <div className="tasks-page tasks-workspace relative">
        <section className="border-b border-border bg-card/40">
          <div className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6 sm:pt-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-xs font-semibold text-primary">SAVANORYSTĖ ŠALIA TAVĘS</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Atrask savo veiklą<span className="text-primary">.</span></h1><p className="mt-3 text-sm text-muted-foreground">{loadingTasks ? "Veiklos, kurios kuria pokytį." : `${tasks.length} atvirų veiklų · ${allOrgs.length} organizacijų`}</p></div>
              <Button variant="outline" className="h-10" onClick={() => {
                if (!user) { toast.error("Prisijunk, kad galėtum rezervuoti"); navigate({ to: "/login" }); return; }
                if (profile && profile.role !== "student") { toast.error("Tik moksleiviai gali rezervuoti"); return; }
                setCustomOpen(true);
              }}><Sparkles />Savo rezervacija</Button>
            </div>
            <div className="task-search mt-6 flex items-center gap-3 rounded-lg border border-input bg-background px-4 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
              <Search className="h-5 w-5 shrink-0 text-primary" />
              <input aria-label="Ieškoti užduoties ar organizacijos" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Gyvūnų prieglauda, biblioteka, organizacija…" className="h-14 w-full min-w-0 bg-transparent text-base outline-none placeholder:text-muted-foreground" />
              {q && <Button variant="ghost" size="icon" onClick={() => setQ("")} aria-label="Išvalyti paiešką"><X /></Button>}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div role="tablist" aria-label="Veiklų vaizdas" className="flex max-w-full gap-1 rounded-lg bg-muted/70 p-1">
                {([{id:"tasks",label:"Veiklos",icon:TagIcon},{id:"map",label:"Žemėlapis",icon:Navigation},{id:"orgs",label:"Organizacijos",icon:Building2}] as const).map((t) => <Button key={t.id} role="tab" aria-selected={tab === t.id} variant={tab === t.id ? "outline" : "ghost"} onClick={() => setTab(t.id)} className={`h-10 px-3 text-xs sm:text-sm ${tab === t.id ? "border-border text-foreground" : "text-muted-foreground"}`}><t.icon className="h-4 w-4" />{t.label}</Button>)}
              </div>
              {(tab === "tasks" || tab === "map") && <Button variant={filtersOpen ? "secondary" : "ghost"} onClick={() => setFiltersOpen(!filtersOpen)} aria-expanded={filtersOpen} className="h-10"><Filter />Filtrai{(town || cat || orgFilter || selectedTags.length > 0) && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}<ChevronDown className={`transition-transform ${filtersOpen ? "rotate-180" : ""}`} /></Button>}
            </div>
            {(tab === "tasks" || tab === "map") && <div className="mt-4 flex flex-wrap gap-2" aria-label="Miestų pasirinkimas"><Button variant={town === "" ? "secondary" : "ghost"} size="sm" onClick={() => setTown("")}>Visi miestai</Button>{towns.map((t) => <Button key={t} variant={town === t ? "secondary" : "ghost"} size="sm" onClick={() => setTown(t)}><MapPin className="h-3.5 w-3.5" />{t}</Button>)}</div>}
            {filtersOpen && tab !== "orgs" && <div className="task-filters demo-swap mt-5 border-t border-border pt-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-semibold text-muted-foreground">Miestas<select aria-label="Miestas" value={town} onChange={(e) => setTown(e.target.value)} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"><option value="">Visi miestai</option>{towns.map((t)=><option key={t} value={t}>{t}</option>)}</select></label>
                <label className="text-xs font-semibold text-muted-foreground">Organizacija<select aria-label="Organizacija" value={orgFilter} onChange={(e)=>setOrgFilter(e.target.value)} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"><option value="">Visos organizacijos</option>{orgOptions.map((o)=><option key={o.id} value={o.id}>{o.organization_name ?? o.full_name}</option>)}</select></label>
                <label className="text-xs font-semibold text-muted-foreground">Kategorija<select aria-label="Kategorija" value={cat} onChange={(e)=>setCat(e.target.value)} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"><option value="">Visos kategorijos</option>{Object.entries(CATEGORY_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">{availableTags.map((t)=><Button key={t} variant={selectedTags.includes(t) ? "secondary" : "ghost"} size="sm" onClick={()=>toggleTag(t)}>#{t}</Button>)}</div>
            </div>}
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="mb-5 flex items-center justify-between gap-3"><p className="text-sm font-semibold">{tab === "orgs" ? "Organizacijos" : tab === "map" ? "Veiklų žemėlapis" : "Artimiausios veiklos"}{!loadingTasks && <span className="ml-2 font-normal text-muted-foreground">{tab === "orgs" ? filteredOrgs.length : filteredTasks.length}</span>}</p>{(q || town || cat || orgFilter || selectedTags.length > 0) && <Button variant="ghost" size="sm" onClick={clearFilters}><X />Išvalyti filtrus</Button>}</div>
          {tab === "map" ? <InteractiveTasksMap tasks={filteredTasks} organizations={allOrgs} onSelectTask={(t: Task) => setDetail(t)} onSelectOrg={(org) => navigate({ to: `/org/${org.id}` })} /> : loadingTasks ? <TasksSkeleton count={6} /> : tab === "tasks" ? <>
            {filteredTasks.length === 0 && <div className="py-16 text-center"><Search className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-4 text-lg font-semibold">Atitinkančių veiklų nerasta</h2><p className="mt-2 text-sm text-muted-foreground">Pabandyk kitą paiešką arba miestą.</p><Button variant="outline" onClick={clearFilters} className="mt-5">Išvalyti filtrus</Button></div>}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTasks.map((t) => <article key={t.id} className="task-result group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-5 py-4"><span className="flex items-center gap-2 text-xs font-semibold text-primary">{t.is_event ? <CalendarHeart className="h-4 w-4" /> : <TagIcon className="h-4 w-4" />}{CATEGORY_LABELS[guessCategory(t)]}</span><span className="font-mono text-sm font-bold text-success">{Number(t.available_hours)} val.</span></div>
                <div className="flex flex-1 flex-col p-5"><p className="truncate text-xs text-muted-foreground">{t.is_event ? t.event_host_name || "Vienkartinis renginys" : orgName(t.organization_id)}</p><h2 className="mt-2 text-lg font-semibold leading-snug"><Button variant="link" onClick={() => setDetail(t)} className="h-auto w-full justify-start whitespace-normal p-0 text-left text-lg font-semibold text-foreground hover:text-primary">{t.title}</Button></h2>{t.description && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{t.description}</p>}
                  <div className="mt-5 space-y-2 text-xs text-muted-foreground"><p className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 shrink-0" />{t.task_date}{t.start_time ? ` · ${t.start_time.slice(0,5)}${t.end_time ? `–${t.end_time.slice(0,5)}` : ""}` : ""}</p>{(t.location || cityOf(t)) && <p className="flex items-start gap-2"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="break-words">{t.location || cityOf(t)}</span></p>}</div>
                  {t.tags && <div className="mt-3 flex flex-wrap gap-1">{t.tags.slice(0,3).map((tg)=><Button key={tg} variant="ghost" size="sm" onClick={()=>toggleTag(tg)} className="h-7 px-1 text-xs text-primary">#{tg}</Button>)}</div>}
                  <div className="mt-auto flex items-center gap-3 pt-6"><Button onClick={()=>handleReserve(t)} className="h-10 flex-1">Rezervuoti<ArrowUpRight /></Button><Button variant="outline" size="icon" className="h-10 w-10" onClick={()=>setDetail(t)} aria-label={`Peržiūrėti: ${t.title}`} title="Peržiūrėti veiklą"><Search /></Button></div>
                </div>
              </article>)}
            </div>
          </> : <>
            {filteredOrgs.length === 0 && <div className="py-16 text-center"><Building2 className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-4 text-lg font-semibold">Nerasta organizacijų</h2><p className="mt-2 text-sm text-muted-foreground">Pabandyk kitokią paiešką.</p></div>}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filteredOrgs.map((o) => <article key={o.id} className="task-result flex min-w-0 flex-col rounded-lg border border-border bg-card p-5"><div className="flex items-center gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-xl font-bold text-primary">{(o.organization_name ?? o.full_name ?? "?").slice(0,1)}</span><h2 className="min-w-0 break-words text-lg font-semibold">{o.organization_name ?? o.full_name}</h2></div><p className="mt-5 text-sm text-muted-foreground">{tasks.filter((t)=>t.organization_id === o.id).length} atvirų veiklų</p><Button variant="outline" onClick={()=>{setTab("tasks");setQ(o.organization_name ?? o.full_name ?? "");}} className="mt-6 w-full">Peržiūrėti veiklas<ArrowUpRight /></Button></article>)}</div>
          </>}
        </section>
      </div>

      <ReservationDialog target={active?.target ?? null} inviterId={user?.id ?? null} onClose={() => setActive(null)} onConfirm={confirm} />
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
