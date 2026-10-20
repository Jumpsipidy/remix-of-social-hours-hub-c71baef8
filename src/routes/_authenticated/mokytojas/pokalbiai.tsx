import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Bell, Building2, CalendarCheck, Clock, GraduationCap,
  MessageCircle, Search, ShieldCheck, Sparkles, User as UserIcon, Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSchoolData } from "@/components/teacher/use-school-data";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MessageComposer } from "@/components/message-composer";
import { MessageThreadSkeleton } from "@/components/skeleton-loader";
import { TypingDots, LinkifiedText } from "@/components/typing-dots";
import { useTypingIndicator } from "@/hooks/use-typing";
import { notifyNewMessage } from "@/lib/chat.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_authenticated/mokytojas/pokalbiai")({
  validateSearch: (s: Record<string, unknown>): { room?: string } => ({
    room: typeof s.room === "string" ? s.room : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Pokalbiai — Auklėtojo sritis" },
      { name: "description", content: "Auklėtojo pokalbiai su mokiniais ir organizacijomis, su greitaisiais veiksmais." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Pokalbiai — Auklėtojo sritis" },
      { property: "og:description", content: "Pokalbiai su priskirtų klasių mokiniais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeacherChatPage,
});

type Conv = {
  room_id: string; reservation_id: string | null; student_id: string | null; organization_id: string; school_admin_id: string | null;
  student_name: string | null; organization_name: string | null; school_admin_name: string | null;
  reservation_date: string | null; last_message: string | null; last_at: string; unread: number;
};
type Msg = { id: string; chat_room_id: string; sender_id: string | null; content: string; created_at: string };

/** Greitieji šablonai – vienu paspaudimu įrašomi į žinutę. */
const TEMPLATES = [
  { icon: Bell, label: "Priminimas apie valandas", text: "Labas! Primenu, kad iki termino pabaigos reikia surinkti visas privalomas socialines valandas. Jei reikia pagalbos – parašyk man. 🙂" },
  { icon: CalendarCheck, label: "Rezervacijos patvirtinimas", text: "Labas! Tavo rezervacija peržiūrėta ir patvirtinta. Nepamiršk atvykti laiku ir pasirūpinti QR patvirtinimu. ✅" },
  { icon: Sparkles, label: "Paskatinimas", text: "Labas! Matau tavo progresą – puikiai sekasi! Taip toliau, liko visai nedaug. 💪" },
] as const;

function TeacherChatPage() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const notify = useServerFn(notifyNewMessage);
  const { data: school } = useSchoolData();
  const [convs, setConvs] = useState<Conv[] | null>(null);
  const [filter, setFilter] = useState("");
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [messageError, setMessageError] = useState(false);
  const [reload, setReload] = useState(0);
  const messageScroll = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const sendLock = useRef(false);
  const activeId = search.room ?? null;

  const loadConvs = useCallback(async () => {
    const { data, error } = await (supabase.rpc as any)("list_my_conversations");
    if (error) { toast.error("Nepavyko įkelti pokalbių"); setConvs([]); return; }
    setConvs((data as Conv[]) ?? []);
  }, []);

  useEffect(() => { void loadConvs(); }, [loadConvs]);

  useEffect(() => {
    if (!activeId || !user) { setMsgs(null); return; }
    let alive = true;
    setMsgs(null);
    setMessageError(false);
    setText("");
    followLatest.current = true;
    supabase.from("messages").select("*").eq("chat_room_id", activeId).order("created_at", { ascending: true }).limit(500)
      .then(({ data, error }) => { if (alive) { setMessageError(!!error); setMsgs((data as Msg[]) ?? []); } });
    void (supabase.from as any)("chat_reads").upsert({ room_id: activeId, user_id: user.id, last_read_at: new Date().toISOString() });
    setConvs((c) => c?.map((x) => (x.room_id === activeId ? { ...x, unread: 0 } : x)) ?? c);
    return () => { alive = false; };
  }, [activeId, user, reload]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`teacher-chat-${user.id}`)
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

  useEffect(() => {
    if (followLatest.current) messageScroll.current?.scrollTo({ top: messageScroll.current.scrollHeight, behavior: "auto" });
  }, [msgs?.length]);

  const active = convs?.find((c) => c.room_id === activeId) ?? null;
  const titleFor = (c: Conv) => {
    const schoolOnly = !c.student_id;
    return schoolOnly ? (c.organization_name ?? "Organizacija") : `${c.student_name ?? "Mokinys"} ↔ ${c.organization_name ?? "Organizacija"}`;
  };
  const shown = useMemo(() => (convs ?? []).filter((c) => titleFor(c).toLowerCase().includes(filter.toLowerCase())), [convs, filter]);
  const totalUnread = (convs ?? []).reduce((a, c) => a + c.unread, 0);

  const nameOf = (id: string | null) => {
    if (!id) return "Sistema";
    if (id === user?.id) return "Tu";
    if (!active) return "";
    if (id === active.organization_id) return active.organization_name ?? "Organizacija";
    if (id === active.school_admin_id) return active.school_admin_name ?? "Mokykla";
    if (id === active.student_id) return active.student_name ?? "Mokinys";
    return "Dalyvis";
  };
  const roleOf = (id: string | null): { label: string; cls: string } | null => {
    if (!id || !active) return null;
    if (id === active.organization_id) return { label: "Organizacija", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300" };
    if (id === active.school_admin_id) return { label: "Auklėtojas", cls: "bg-violet-500/15 text-violet-600 dark:text-violet-300" };
    if (id === active.student_id) return { label: "Mokinys", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-300" };
    return null;
  };

  const { othersTyping, notifyTyping, notifyStop } = useTypingIndicator(activeId ? `room-${activeId}` : null, user?.id);

  // „Rašyti mokiniui" – tik priskirtų klasių mokiniai iš mokyklos momentinės kopijos.
  const [picker, setPicker] = useState(false);
  const [studentQ, setStudentQ] = useState("");
  const students = school?.students ?? [];
  const shownStudents = useMemo(
    () => students.filter((s) => (s.full_name ?? "").toLowerCase().includes(studentQ.toLowerCase())),
    [students, studentQ],
  );
  async function startWith(studentId: string) {
    const { data, error } = await (supabase.rpc as any)("open_chat_with", { _other: studentId });
    if (error) { toast.error(error.message); return; }
    setPicker(false);
    await loadConvs();
    navigate({ to: "/mokytojas/pokalbiai", search: { room: data as string } });
  }

  async function send() {
    const content = text.trim();
    if (!content || !activeId || !user || sendLock.current) return;
    sendLock.current = true;
    setSending(true);
    const { data, error } = await supabase.from("messages").insert({ chat_room_id: activeId, sender_id: user.id, content }).select("*").single();
    sendLock.current = false;
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setText((current) => (current.trim() === content ? "" : current));
    followLatest.current = true;
    notifyStop();
    setMsgs((p) => (p && data && !p.some((x) => x.id === (data as Msg).id) ? [...p, data as Msg] : p));
    notify({ data: { roomId: activeId } }).catch(() => {});
  }

  return (
    <div className="space-y-4">
      <div className={`${activeId ? "hidden md:block" : ""}`}>
        <h1 className="text-xl font-bold sm:text-2xl">Pokalbiai</h1>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> Žinutės saugomos 12 dienų{totalUnread ? ` · ${totalUnread} neperskaitytų` : ""}
        </p>
      </div>

      {/* Greitieji veiksmai auklėtojui */}
      <div className={`flex flex-wrap gap-2 ${activeId ? "hidden md:flex" : ""}`}>
        <Button type="button" size="sm" onClick={() => { setPicker(true); setStudentQ(""); }}>
          <Users className="h-4 w-4" /> Rašyti mokiniui
        </Button>
        <Button type="button" size="sm" variant="outline" asChild>
          <Link to="/mokytojas/rezervacijos"><CalendarCheck className="h-4 w-4" /> Kviesti klasę į rezervaciją</Link>
        </Button>
        {TEMPLATES.map((t) => (
          <Button
            key={t.label}
            type="button"
            size="sm"
            variant="outline"
            disabled={!activeId}
            title={activeId ? t.label : "Pirmiausia pasirink pokalbį"}
            onClick={() => setText((cur) => (cur.trim() ? `${cur.trimEnd()}\n${t.text}` : t.text))}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </Button>
        ))}
      </div>

      <Dialog open={picker} onOpenChange={setPicker}>
        <DialogContent className="max-w-md gap-0 p-0">
          <div className="border-b border-border p-4">
            <DialogHeader><DialogTitle>Rašyti mokiniui</DialogTitle><DialogDescription>Tik tavo priskirtų klasių mokiniai.</DialogDescription></DialogHeader>
            <input aria-label="Ieškoti mokinio" value={studentQ} onChange={(e) => setStudentQ(e.target.value)} placeholder="Ieškoti pagal vardą…" className="mt-3 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="max-h-[55vh] overflow-y-auto p-2">
            {!school ? (
              <div className="space-y-2 p-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
            ) : shownStudents.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Mokinių nerasta.</p>
            ) : shownStudents.map((s) => (
              <button key={s.id} type="button" onClick={() => void startWith(s.id)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-muted">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted"><GraduationCap className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{s.full_name ?? "Mokinys"}</span>
                  <span className="block truncate text-xs text-muted-foreground">{s.class_year ?? "—"}{s.class_letter ?? ""} klasė · {s.hours_earned}/{s.hours_needed} val.</span>
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid h-[calc(100dvh-16rem)] min-h-[320px] overflow-hidden rounded-2xl border border-border bg-card md:h-[68vh] md:grid-cols-[300px_minmax(0,1fr)]">
        <aside className={`flex min-h-0 flex-col border-r border-border ${activeId ? "hidden md:flex" : "flex"}`}>
          <div className="border-b border-border p-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input aria-label="Ieškoti pokalbio" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Ieškoti pokalbio…" className="h-10 w-full bg-transparent text-sm outline-none" />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {convs === null ? (
              <div className="space-y-3 p-3">{Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-1/2" /></div></div>
              ))}</div>
            ) : shown.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <MessageCircle className="mx-auto mb-2 h-8 w-8" />
                Pokalbių dar nėra. Parašyk mokiniui mygtuku „Rašyti mokiniui".
              </div>
            ) : shown.map((c) => {
              const Icon = !c.student_id ? Building2 : c.student_id === c.school_admin_id ? GraduationCap : UserIcon;
              return (
                <Button variant="ghost" key={c.room_id} onClick={() => navigate({ to: "/mokytojas/pokalbiai", search: { room: c.room_id } })}
                  className={`h-auto min-h-16 w-full justify-start gap-3 whitespace-normal rounded-none border-b border-border/50 px-3 py-3 text-left transition hover:bg-accent/50 ${c.room_id === activeId ? "bg-accent" : ""}`}>
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
                </Button>
              );
            })}
          </div>
        </aside>

        <section aria-label="Pokalbio žinutės" className={`min-h-0 min-w-0 flex-col ${activeId ? "flex" : "hidden md:flex"}`}>
          {!activeId ? (
            <div className="grid flex-1 place-items-center p-8 text-center text-muted-foreground">
              <div><MessageCircle className="mx-auto mb-3 h-10 w-10" /><p className="text-sm">Pasirink pokalbį kairėje arba parašyk mokiniui.</p></div>
            </div>
          ) : (
            <>
              <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
                <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 md:hidden" onClick={() => navigate({ to: "/mokytojas/pokalbiai", search: {} })} aria-label="Atgal į pokalbius"><ArrowLeft /></Button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{active ? titleFor(active) : "Pokalbis"}</p>
                  <p className="flex items-start gap-1 text-xs text-muted-foreground">
                    <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" /><span>Mokyklos administracija gali matyti šį pokalbį{active?.reservation_date ? ` · ${active.reservation_date}` : ""}</span>
                  </p>
                </div>
              </header>
              <div ref={messageScroll} role="log" aria-label="Žinutės" aria-live="polite" aria-relevant="additions" aria-busy={msgs === null} onScroll={() => { const node = messageScroll.current; if (node) followLatest.current = node.scrollHeight - node.scrollTop - node.clientHeight < 100; }} className="min-h-0 min-w-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-background/40 p-3 sm:p-4">
                {msgs === null ? (
                  <MessageThreadSkeleton />
                ) : messageError ? (
                  <div role="alert" className="p-4 text-center"><p className="text-sm">Nepavyko įkelti žinučių.</p><Button variant="outline" className="mt-3" onClick={() => setReload((n) => n + 1)}>Bandyti dar kartą</Button></div>
                ) : msgs.length === 0 ? (
                  <p className="pt-10 text-center text-sm text-muted-foreground">Parašyk pirmą žinutę 👋 Šablonai – viršuje.</p>
                ) : (
                  <AnimatePresence initial={false}>
                    {msgs.map((m) => {
                      const mine = m.sender_id === user?.id;
                      return (
                        <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div className={`min-w-0 max-w-[88%] rounded-lg px-3.5 py-2 text-sm sm:max-w-[78%] ${mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border bg-card"}`}>
                            {(() => { const r = roleOf(m.sender_id); return (
                              <p className={`mb-0.5 flex items-center gap-1.5 text-[10px] font-bold ${mine ? "justify-end opacity-80" : "opacity-80"}`}>
                                <span>{mine ? "Tu" : nameOf(m.sender_id)}</span>
                                {r && <span className={`rounded-full px-1.5 py-px text-[9px] font-bold ${mine ? "bg-primary-foreground/20 text-primary-foreground" : r.cls}`}>{r.label}</span>}
                              </p>); })()}
                            <LinkifiedText text={m.content} className="whitespace-pre-wrap [overflow-wrap:anywhere]" />
                            <p className="mt-0.5 text-right text-[10px] opacity-60">{new Date(m.created_at).toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
                <TypingDots show={othersTyping} />
              </div>
              <MessageComposer value={text} onChange={(value) => { setText(value); notifyTyping(); }} onSend={() => { void send(); }} sending={sending} disabled={msgs === null || messageError} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
