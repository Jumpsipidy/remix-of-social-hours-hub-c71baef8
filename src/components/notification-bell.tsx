import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Bell, MessageSquare, CheckCircle2, XCircle, PlayCircle, Clock, Sparkles, Bug, Trash2, Link as LinkIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

// Map a notification to the correct route (based on user role) + hash.
function routeForNotif(
  n: { kind: string; hash?: string; status?: string },
  role?: string | null,
): { to: string; hash: string } {
  const hash = n.hash ?? "";
  // Bug reports → admin bugs page
  if (n.kind === "bug") return { to: "/admin/bugs", hash };
  // Messages → role-specific dashboard (each dashboard listens for #chat/<id>)
  if (n.kind === "message") {
    if (role === "admin") return { to: "/admin/messages", hash };
    return { to: "/chat", hash: "" };
  }
  // Reservations → role dashboard
  if (n.kind === "reservation") {
    if (role === "organization") return { to: "/organization", hash };
    if (role === "school_admin") return { to: "/school", hash };
    if (role === "admin") return { to: "/admin/reservations", hash };
    return { to: "/student", hash };
  }
  // Generic debug/test notif → home
  return { to: "/", hash };
}

type Notification = {
  id: string;
  kind: "message" | "reservation" | "bug";
  title: string;
  body: string;
  at: string;
  status?: string;
  hash?: string; // deep-link hash e.g. "#notif/abc" or "#chats"
  read?: boolean;
};

const STORAGE_KEY = "sv_notifs_v2";
type FilterKey = "all" | "message" | "reservation" | "bug";

export function NotificationBell() {
  const { user, profile, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const ref = useRef<HTMLDivElement>(null);

  const unread = useMemo(() => items.filter((n) => !n.read).length, [items]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { items: Notification[] };
        setItems(parsed.items ?? []);
      }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ items })); } catch { /* ignore */ }
  }, [items]);

  const goTo = useCallback(
    (n: { kind: string; hash?: string; status?: string }) => {
      const { to, hash } = routeForNotif(n, profile?.role);
      // Only forward hashes that point to real anchors on the target page.
      // Anything like "#notif/<random>" is a placeholder — drop it so we don't
      // land the user on a valid page with a dead hash.
      const meaningful =
        hash && /^#(chat|reservation|bug)\//.test(hash) ? hash : "";
      const hashArg = meaningful.startsWith("#") ? meaningful.slice(1) : meaningful;
      navigate({ to, hash: hashArg || undefined }).catch(() => {
        window.location.href = `${to}${meaningful}`;
      });
    },
    [navigate, profile?.role],
  );

  const push = (n: Omit<Notification, "id" | "at" | "read">) => {
    const id = crypto.randomUUID();
    // Only accept explicit deep-link hashes (#chat/…, #reservation/…, #bug/…).
    // Don't invent a "#notif/<random>" hash — those go nowhere.
    const hash = n.hash;
    const record = { id, at: new Date().toISOString(), read: false, hash, ...n };
    setItems((prev) => [record, ...prev].slice(0, 40));
    toast(n.title, {
      description: n.body,
      icon: n.kind === "message" ? "💬" : n.kind === "bug" ? "🐛" : n.status === "completed" ? "✅" : n.status === "declined" ? "❌" : "🔔",
      duration: 5000,
      action: {
        label: "Peržiūrėti",
        onClick: () => goTo(record),
      },
    });
  };

  useEffect(() => {
    (window as unknown as { __pushNotification?: (n: Partial<Notification>) => void }).__pushNotification = (n) =>
      push({
        kind: (n.kind as Notification["kind"]) ?? "message",
        title: n.title ?? "🔔 Test pranešimas",
        body: n.body ?? "Šis pranešimas iš debug panelės",
        status: n.status,
        hash: n.hash,
      });
    return () => { delete (window as unknown as { __pushNotification?: unknown }).__pushNotification; };
  }, []);

  useEffect(() => {
    if (!user || !isAuthenticated) return;
    const uid = user.id;

    const chMsg = supabase
      .channel(`notif-msg-${uid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const m = payload.new as { chat_room_id: string; sender_id: string | null; content: string };
        if (!m || m.sender_id === uid) return;
        const { data: room } = await supabase
          .from("chat_rooms")
          .select("id, student_id, organization_id, school_admin_id")
          .eq("id", m.chat_room_id)
          .maybeSingle();
        if (!room) return;
        const isMember = room.student_id === uid || room.organization_id === uid || room.school_admin_id === uid;
        if (!isMember) return;
        push({
          kind: "message",
          title: "Gavote naują žinutę",
          body: m.content.length > 100 ? m.content.slice(0, 100) + "…" : m.content,
          hash: `#chat/${m.chat_room_id}`,
        });
      })
      .subscribe();

    const isOwner = profile?.role === "organization" || profile?.role === "school_admin";
    const filterField = isOwner ? "organization_id" : "student_id";
    const chRes = supabase
      .channel(`notif-res-${uid}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reservations", filter: `${filterField}=eq.${uid}` },
        (payload) => {
          const r = payload.new as { id: string; status: string; reservation_date: string };
          const oldR = payload.old as { status: string };
          if (!r || r.status === oldR?.status) return;
          if (isOwner) return; // owner made the change themselves
          const map: Record<string, string> = {
            pending: "Laukia patvirtinimo",
            approved: "Rezervacija patvirtinta — vykdoma",
            completed: "Rezervacija užbaigta ✔",
            declined: "Rezervacija atmesta",
            confirmed: "Rezervacija patvirtinta",
          };
          push({
            kind: "reservation",
            title: map[r.status] ?? "Rezervacijos būsena pasikeitė",
            body: `${r.reservation_date}`,
            status: r.status,
            hash: `#reservation/${r.id}`,
          });
        },
      );
    if (isOwner) {
      chRes.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reservations", filter: `organization_id=eq.${uid}` },
        (payload) => {
          const r = payload.new as { id: string; reservation_date: string };
          push({
            kind: "reservation",
            title: "Nauja mokinio registracija",
            body: `${r.reservation_date} · laukia tavo patvirtinimo`,
            status: "pending",
            hash: `#reservation/${r.id}`,
          });
          toast.info("Nauja mokinio registracija — patvirtink ją");
        },
      );
    }
    chRes.subscribe();

    let chBugs: ReturnType<typeof supabase.channel> | null = null;
    if (profile?.role === "admin") {
      chBugs = supabase
        .channel(`notif-bugs-${uid}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "bug_reports" }, (payload) => {
          const b = payload.new as { id: string; message: string; severity?: string };
          push({
            kind: "bug",
            title: `Naujas bug report${b.severity ? ` (${b.severity})` : ""}`,
            body: b.message.length > 100 ? b.message.slice(0, 100) + "…" : b.message,
            hash: `#bug/${b.id}`,
          });
        })
        .subscribe();
    }

    return () => {
      supabase.removeChannel(chMsg);
      supabase.removeChannel(chRes);
      if (chBugs) supabase.removeChannel(chBugs);
    };
  }, [user, isAuthenticated, profile?.role]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!isAuthenticated) return null;

  const iconFor = (n: Notification) => {
    if (n.kind === "bug") return Bug;
    if (n.kind === "message") return MessageSquare;
    if (n.status === "completed" || n.status === "confirmed") return CheckCircle2;
    if (n.status === "declined") return XCircle;
    if (n.status === "approved") return PlayCircle;
    return Clock;
  };

  const filtered = filter === "all" ? items : items.filter((n) => n.kind === filter);
  const now = Date.now();
  const groups = {
    today: filtered.filter((n) => now - new Date(n.at).getTime() < 24 * 3600 * 1000),
    earlier: filtered.filter((n) => now - new Date(n.at).getTime() >= 24 * 3600 * 1000),
  };

  const openNotif = (n: Notification) => {
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    goTo(n);
    setOpen(false);
  };

  // Atidarius sąrašą, pranešimai laikomi perskaitytais uždarant — nereikia spausti „Skaityti visus“.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) { wasOpen.current = true; return; }
    if (wasOpen.current) {
      wasOpen.current = false;
      setItems((prev) => (prev.some((x) => !x.read) ? prev.map((x) => ({ ...x, read: true })) : prev));
    }
  }, [open]);
  const markAllRead = () => setItems((prev) => prev.map((x) => ({ ...x, read: true })));

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "Visi" },
    { key: "message", label: "Žinutės" },
    { key: "reservation", label: "Rezervacijos" },
    ...(profile?.role === "admin" ? [{ key: "bug" as FilterKey, label: "Bug" }] : []),
  ];

  const ago = (iso: string) => {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return "ką tik";
    if (m < 60) return `prieš ${m} min.`;
    const h = Math.round(m / 60);
    if (h < 24) return `prieš ${h} val.`;
    return new Date(iso).toLocaleDateString("lt-LT", { month: "short", day: "numeric" });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `Pranešimai, ${unread} nauji` : "Pranešimai"}
        className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-card transition hover:bg-accent active:scale-95"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold tabular-nums text-destructive-foreground ring-2 ring-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="fixed left-2 right-2 top-16 z-50 overflow-hidden rounded-2xl border border-border bg-popover shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[24rem]"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-bold">Pranešimai</p>
                <p className="text-xs text-muted-foreground">{unread ? `${unread} neperskaityti` : "Viskas perskaityta"}</p>
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button onClick={markAllRead} className="rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-accent">
                    <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />Skaityti visus
                  </button>
                )}
                {items.length > 0 && (
                  <button onClick={() => setItems([])} aria-label="Išvalyti" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2">
              {filters.map((f) => {
                const count = f.key === "all" ? items.length : items.filter((n) => n.kind === f.key).length;
                const active = filter === f.key;
                return (
                  <button key={f.key} onClick={() => setFilter(f.key)}
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                    {f.label} <span className="tabular-nums opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="max-h-[60vh] overflow-y-auto overscroll-contain sm:max-h-96">
              {filtered.length === 0 && (
                <div className="px-6 py-10 text-center">
                  <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-muted"><Bell className="h-5 w-5 text-muted-foreground" /></div>
                  <p className="text-sm font-semibold">Naujienų nėra</p>
                  <p className="mt-1 text-xs text-muted-foreground">Čia matysi žinutes ir rezervacijų atnaujinimus.</p>
                </div>
              )}
              {(["today", "earlier"] as const).map((g) => {
                const list = groups[g];
                if (list.length === 0) return null;
                return (
                  <div key={g}>
                    <div className="sticky top-0 z-10 bg-popover px-4 py-1.5 text-xs font-semibold text-muted-foreground">
                      {g === "today" ? "Šiandien" : "Anksčiau"}
                    </div>
                    {list.map((n) => {
                      const Icon = iconFor(n);
                      return (
                        <div key={n.id} className={`group relative flex items-start gap-3 px-4 py-3 transition hover:bg-accent/60 ${n.read ? "" : "bg-primary/[0.04]"}`}>
                          {!n.read && <span className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary" />}
                          <button onClick={() => openNotif(n)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${n.read ? "bg-muted text-muted-foreground" : "bg-primary/12 text-primary"}`}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline justify-between gap-2">
                                <span className={`truncate text-sm ${n.read ? "font-medium" : "font-semibold"}`}>{n.title}</span>
                                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{ago(n.at)}</span>
                              </span>
                              <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>
                            </span>
                          </button>
                          <button onClick={() => setItems((all) => all.filter((x) => x.id !== n.id))} aria-label="Pašalinti"
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground opacity-100 hover:bg-background hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100">
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <button onClick={() => { setOpen(false); navigate({ to: "/chat" }); }}
              className="flex w-full items-center justify-center gap-2 border-t border-border px-4 py-3 text-sm font-semibold text-primary hover:bg-accent">
              <MessageSquare className="h-4 w-4" /> Atidaryti pokalbius
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
