import { DmInbox } from "@/components/dm-inbox";
import { useTypingIndicator } from "@/hooks/use-typing";
import { TypingDots, LinkifiedText } from "@/components/typing-dots";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, Search, ArrowLeft, Building2, GraduationCap, User as UserIcon, Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { PageShell } from "@/components/layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { notifyNewMessage } from "@/lib/chat.functions";

type Search = { room?: string; org?: string };

export const Route = createFileRoute("/_authenticated/chat")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    room: typeof s.room === "string" ? s.room : undefined,
    org: typeof s.org === "string" ? s.org : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Pokalbiai — Socialinės Valandos" },
      { name: "description", content: "Pokalbiai tarp mokinių, organizacijų ir mokyklos administratorių." },
      { property: "og:title", content: "Pokalbiai — Socialinės Valandos" },
      { property: "og:description", content: "Rezervacijų pokalbiai su organizacijomis ir mokykla." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChatPage,
});

type Conv = {
  room_id: string; reservation_id: string | null; student_id: string | null; organization_id: string; school_admin_id: string | null;
  student_name: string | null; organization_name: string | null; school_admin_name: string | null;
  reservation_date: string | null; last_message: string | null; last_at: string; unread: number;
};
type Msg = { id: string; chat_room_id: string; sender_id: string | null; content: string; created_at: string };

function ChatPage() {
  const { user, profile } = useAuth();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const notify = useServerFn(notifyNewMessage);
  const [convs, setConvs] = useState<Conv[] | null>(null);
  const [filter, setFilter] = useState("");
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const activeId = search.room ?? null;

  const loadConvs = useCallback(async () => {
    const { data, error } = await (supabase.rpc as any)("list_my_conversations");
    if (error) { toast.error("Nepavyko įkelti pokalbių"); setConvs([]); return; }
    setConvs((data as Conv[]) ?? []);
  }, []);

  useEffect(() => { void loadConvs(); }, [loadConvs]);

  // ?org=<id> → open/create a direct conversation (students only).
  useEffect(() => {
    if (!search.org || !user) return;
    (async () => {
      const { data, error } = await (supabase.rpc as any)("open_org_chat", { _org: search.org });
      if (error) { toast.error(error.message); navigate({ to: "/chat", search: {}, replace: true }); return; }
      await loadConvs();
      navigate({ to: "/chat", search: { room: data as string }, replace: true });
    })();
  }, [search.org, user]);

  // Load messages for active room + mark read.
  useEffect(() => {
    if (!activeId || !user) { setMsgs(null); return; }
    let alive = true;
    setMsgs(null);
    supabase.from("messages").select("*").eq("chat_room_id", activeId).order("created_at", { ascending: true }).limit(500)
      .then(({ data }) => { if (alive) setMsgs((data as Msg[]) ?? []); });
    void (supabase.from as any)("chat_reads").upsert({ room_id: activeId, user_id: user.id, last_read_at: new Date().toISOString() });
    setConvs((c) => c?.map((x) => (x.room_id === activeId ? { ...x, unread: 0 } : x)) ?? c);
    return () => { alive = false; };
  }, [activeId, user]);

  // Realtime: new messages anywhere I can see.
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`chat-page-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => {
        const m = p.new as Msg;
        if (m.chat_room_id === activeId) {
          setMsgs((prev) => (prev && !prev.some((x) => x.id === m.id) ? [...prev, m] : prev));
          void (supabase.from as any)("chat_reads").upsert({ room_id: m.chat_room_id, user_id: user.id, last_read_at: new Date().toISOString() });
        }
        setConvs((c) => {
          if (!c) return c;
          const found = c.find((x) => x.room_id === m.chat_room_id);
          if (!found) { void loadConvs(); return c; }
          const upd = { ...found, last_message: m.content, last_at: m.created_at, unread: m.chat_room_id === activeId || m.sender_id === user.id ? 0 : found.unread + 1 };
          return [upd, ...c.filter((x) => x.room_id !== m.chat_room_id)];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, activeId, loadConvs]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs?.length]);

  const active = convs?.find((c) => c.room_id === activeId) ?? null;
  const titleFor = (c: Conv) => {
    const schoolOnly = !c.student_id;
    if (profile?.role === "organization") return schoolOnly ? (c.school_admin_name ?? "Mokyklos administracija") : (c.student_name ?? "Mokinys");
    if (profile?.role === "student") return c.organization_name ?? "Organizacija";
    return schoolOnly ? (c.organization_name ?? "Organizacija") : `${c.student_name ?? "Mokinys"} ↔ ${c.organization_name ?? "Organizacija"}`;
  };
  const shown = useMemo(() => (convs ?? []).filter((c) => titleFor(c).toLowerCase().includes(filter.toLowerCase())), [convs, filter, profile?.role]);
  const totalUnread = (convs ?? []).reduce((a, c) => a + c.unread, 0);

  const nameOf = (id: string | null) => {
    if (!id) return "Sistema";
    if (id === user?.id) return "Tu";
    if (!active) return "";
    if (id === active.organization_id) return active.organization_name ?? "Organizacija";
    if (id === active.school_admin_id) return active.school_admin_name ?? "Mokykla";
    if (id === active.student_id) return active.student_name ?? "Mokinys";
    return "Mokyklos administratorius";
  };

  // Role badge for every sender.
  const roleOf = (id: string | null): { label: string; cls: string } | null => {
    if (!id || !active) return null;
    if (id === active.organization_id) return { label: "Organizacija", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300" };
    if (id === active.school_admin_id) return { label: "Mokyklos admin.", cls: "bg-violet-500/15 text-violet-600 dark:text-violet-300" };
    if (id === active.student_id) return { label: "Mokinys", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-300" };
    return { label: "Mokyklos admin.", cls: "bg-violet-500/15 text-violet-600 dark:text-violet-300" };
  };

  const { othersTyping, notifyTyping, notifyStop } = useTypingIndicator(activeId ? `room-${activeId}` : null, user?.id);
  const [picker, setPicker] = useState(false);
  const [contacts, setContacts] = useState<{ id: string; name: string; role: string; class_year: string | null; org_id: string | null; org_name: string | null }[] | null>(null);
  const [classF, setClassF] = useState<string | null>(null);
  const [contactQ, setContactQ] = useState("");
  async function openPicker() {
    setPicker(true);
    if (contacts) return;
    const { data, error } = await (supabase.rpc as any)("list_chat_contacts");
    if (error) { toast.error("Nepavyko įkelti kontaktų"); setContacts([]); return; }
    setContacts((data as any[]) ?? []);
  }
  async function startWith(id: string, orgId?: string | null) {
    const { data, error } = orgId
      ? await (supabase.rpc as any)("open_school_student_chat", { _student: id, _org: orgId })
      : await (supabase.rpc as any)("open_chat_with", { _other: id });
    if (error) { toast.error(error.message); return; }
    setPicker(false);
    await loadConvs();
    navigate({ to: "/chat", search: { room: data as string } });
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !activeId || !user || sending) return;
    setSending(true);
    const { data, error } = await supabase.from("messages").insert({ chat_room_id: activeId, sender_id: user.id, content }).select("*").single();
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setText("");
    notifyStop();
    setMsgs((p) => (p && data && !p.some((x) => x.id === (data as Msg).id) ? [...p, data as Msg] : p));
    notify({ data: { roomId: activeId } }).catch(() => {});
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {user && <div className="mb-5"><DmInbox me={user.id} showTeachers={profile?.role === "student"} /></div>}
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Pokalbiai</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Žinutės saugomos 12 dienų{totalUnread ? ` · ${totalUnread} neperskaitytų` : ""}
            </p>
          </div>
          <button type="button" onClick={openPicker} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition active:scale-95">
            <MessageCircle className="h-4 w-4" /> Naujas pokalbis
          </button>
        </div>
        <AnimatePresence>
          {picker && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 sm:items-center sm:p-4" onClick={() => setPicker(false)}>
              <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} transition={{ duration: 0.2 }} onClick={(e) => e.stopPropagation()} className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-t-3xl border border-border bg-card sm:rounded-3xl">
                <div className="border-b border-border p-4">
                  <h2 className="font-display text-lg font-bold">Kam rašyti?</h2>
                  <input autoFocus value={contactQ} onChange={(e) => setContactQ(e.target.value)} placeholder="Ieškoti…" className="mt-3 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div className="max-h-[55vh] overflow-y-auto p-2">
                  {(() => {
                    if (contacts === null) return <div className="space-y-2 p-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>;
                    const classes = Array.from(new Set(contacts.map((c) => c.class_year).filter(Boolean))) as string[];
                    const list = contacts.filter((c) => (c.name + " " + (c.org_name ?? "")).toLowerCase().includes(contactQ.toLowerCase()) && (!classF || c.class_year === classF));
                    const groups: [string, typeof list][] = [
                      ["Organizacijos", list.filter((c) => c.role === "organization")],
                      ["Mokyklos administracija", list.filter((c) => c.role === "school_admin")],
                      [profile?.role === "school_admin" ? "Mano mokiniai organizacijose" : "Mokiniai", list.filter((c) => c.role === "student")],
                    ];
                    return (
                      <>
                        {classes.length > 0 && (
                          <div className="flex gap-1.5 overflow-x-auto px-2 pb-2">
                            <button type="button" onClick={() => setClassF(null)} className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${!classF ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>Visos klasės</button>
                            {classes.sort().map((k) => (
                              <button key={k} type="button" onClick={() => setClassF(k)} className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${classF === k ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{k}</button>
                            ))}
                          </div>
                        )}
                        {list.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Kontaktų nerasta.</p>}
                        {groups.filter(([, g]) => g.length).map(([label, g]) => (
                          <div key={label} className="mb-2">
                            <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                            {g.map((c) => (
                              <button key={c.id + (c.org_id ?? "")} type="button" onClick={() => startWith(c.id, c.org_id)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-muted active:scale-[0.99]">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">{c.role === "organization" ? <Building2 className="h-4 w-4" /> : c.role === "school_admin" ? <ShieldCheck className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold">{c.name}</span>
                                  <span className="block truncate text-xs text-muted-foreground">
                                    {c.role === "student" ? `${c.class_year ? c.class_year + " klasė" : "Mokinys"}${c.org_name ? " · " + c.org_name : ""}` : c.role === "organization" ? "Organizacija" : "Mokyklos administracija"}
                                  </span>
                                </span>
                                {c.class_year && <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">{c.class_year}</span>}
                              </button>
                            ))}
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid h-[calc(100dvh-14rem)] min-h-[420px] md:h-[70vh] overflow-hidden rounded-3xl border border-border bg-card md:grid-cols-[320px_1fr]">
          {/* List */}
          <aside className={`flex min-h-0 flex-col border-r border-border ${activeId ? "hidden md:flex" : "flex"}`}>
            <div className="border-b border-border p-3">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Ieškoti pokalbio…" className="h-10 w-full bg-transparent text-sm outline-none" />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {convs === null ? (
                <div className="space-y-3 p-3">{Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-1/2" /></div></div>
                ))}</div>
              ) : shown.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <MessageCircle className="mx-auto mb-2 h-8 w-8" />
                  Žinutės saugomos 12 dienų, po to ištrinamos automatiškai.<br />
                  Pokalbių dar nėra. Jie atsiras, kai rezervuosi užduotį arba parašysi organizacijai.
                </div>
              ) : shown.map((c) => {
                const Icon = profile?.role === "student" ? Building2 : c.student_id === c.school_admin_id ? GraduationCap : UserIcon;
                return (
                  <button key={c.room_id} onClick={() => navigate({ to: "/chat", search: { room: c.room_id } })}
                    className={`flex w-full items-center gap-3 border-b border-border/50 px-4 py-3 text-left transition hover:bg-accent/50 ${c.room_id === activeId ? "bg-accent" : ""}`}>
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary"><Icon className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{titleFor(c)}</p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{new Date(c.last_at).toLocaleDateString("lt-LT", { month: "2-digit", day: "2-digit" })}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-muted-foreground">{c.last_message ?? (c.reservation_date ? `Rezervacija ${c.reservation_date}` : "Naujas pokalbis")}</p>
                        {c.unread > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{c.unread}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Thread */}
          <section className={`min-h-0 flex-col ${activeId ? "flex" : "hidden md:flex"}`}>
            {!activeId ? (
              <div className="grid flex-1 place-items-center p-8 text-center text-muted-foreground">
                <div><MessageCircle className="mx-auto mb-3 h-10 w-10" /><p className="text-sm">Pasirink pokalbį kairėje.</p></div>
              </div>
            ) : (
              <>
                <header className="flex items-center gap-3 border-b border-border px-4 py-3">
                  <button className="md:hidden" onClick={() => navigate({ to: "/chat", search: {} })} aria-label="Atgal"><ArrowLeft className="h-5 w-5" /></button>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{active ? titleFor(active) : "Pokalbis"}</p>
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <ShieldCheck className="h-3 w-3" /> Mokyklos administracija gali matyti šį pokalbį
                      {active?.reservation_date ? ` · rezervacija ${active.reservation_date}` : ""}
                    </p>
                  </div>
                </header>
                <div className="flex items-center justify-center gap-1.5 border-b border-border bg-amber-500/10 px-3 py-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                  <Clock className="h-3 w-3 shrink-0" /> Žinutės automatiškai ištrinamos po 12 dienų.
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-background/40 p-4">
                  {msgs === null ? (
                    <div className="space-y-3">{[60, 40, 70, 50].map((w, i) => <Skeleton key={i} className={`h-10 rounded-2xl ${i % 2 ? "ml-auto" : ""}`} style={{ width: `${w}%` }} />)}</div>
                  ) : msgs.length === 0 ? (
                    <p className="pt-10 text-center text-sm text-muted-foreground">Parašyk pirmą žinutę 👋</p>
                  ) : (
                    <AnimatePresence initial={false}>
                      {msgs.map((m) => {
                        const mine = m.sender_id === user?.id;
                        return (
                          <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border bg-card"}`}>
                              {(() => { const r = roleOf(m.sender_id); return (
                                <p className={`mb-0.5 flex items-center gap-1.5 text-[10px] font-bold ${mine ? "justify-end opacity-80" : "opacity-80"}`}>
                                  <span>{mine ? "Tu" : nameOf(m.sender_id)}</span>
                                  {r && <span className={`rounded-full px-1.5 py-px text-[9px] font-bold ${mine ? "bg-primary-foreground/20 text-primary-foreground" : r.cls}`}>{r.label}</span>}
                                </p>); })()}
                              <LinkifiedText text={m.content} className="whitespace-pre-wrap break-words" />
                              <p className="mt-0.5 text-right text-[10px] opacity-60">{new Date(m.created_at).toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" })}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  )}
                  <TypingDots show={othersTyping} />
                  <div ref={endRef} />
                </div>
                <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
                  <input value={text} onChange={(e) => { setText(e.target.value.slice(0, 2000)); notifyTyping(); }} placeholder="Rašyk žinutę…" className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
                  <button disabled={!text.trim() || sending} className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground transition active:scale-90 disabled:opacity-50" aria-label="Siųsti">
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  );
}
