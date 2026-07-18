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
    if (role === "organization") return { to: "/organization", hash };
    if (role === "school_admin") return { to: "/school", hash };
    if (role === "admin") return { to: "/admin/messages", hash };
    return { to: "/student", hash };
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
      // Use router navigate so nav + state stay consistent, then apply hash.
      navigate({ to, hash: hash.startsWith("#") ? hash.slice(1) : hash }).catch(() => {
        window.location.href = `${to}${hash}`;
      });
    },
    [navigate, profile?.role],
  );

  const push = (n: Omit<Notification, "id" | "at" | "read">) => {
    const id = crypto.randomUUID();
    const hash = n.hash ?? `#notif/${id.slice(0, 8)}`;
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

    const filterField = profile?.role === "organization" ? "organization_id" : "student_id";
    const chRes = supabase
      .channel(`notif-res-${uid}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reservations", filter: `${filterField}=eq.${uid}` },
        (payload) => {
          const r = payload.new as { id: string; status: string; reservation_date: string };
          const oldR = payload.old as { status: string };
          if (!r || r.status === oldR?.status) return;
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
      )
      .subscribe();

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

  const markAllRead = () => setItems((prev) => prev.map((x) => ({ ...x, read: true })));

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "Visi" },
    { key: "message", label: "Žinutės" },
    { key: "reservation", label: "Rezervacijos" },
    ...(profile?.role === "admin" ? [{ key: "bug" as FilterKey, label: "Bug" }] : []),
  ];

  return (
    <div className="relative" ref={ref}>
      {/* Bell button with spinning conic ring when unread */}
      <button
        onClick={() => { setOpen((o) => !o); if (!open) markAllRead(); }}
        aria-label="Pranešimai"
        className="group relative grid h-10 w-10 place-items-center rounded-full"
      >
        {unread > 0 && (
          <span
            className="pointer-events-none absolute inset-0 rounded-full opacity-70 blur-sm"
            style={{
              background: "conic-gradient(from 0deg, hsl(var(--primary)), transparent 40%, hsl(var(--primary)) 80%, transparent)",
              animation: "spin 3s linear infinite",
            }}
          />
        )}
        <span className="absolute inset-[2px] rounded-full border border-border bg-card transition group-hover:bg-accent" />
        {unread > 0 && (
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-primary/50"
            animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <motion.span
          animate={unread > 0 ? { rotate: [0, -12, 12, -8, 8, 0] } : { rotate: 0 }}
          transition={{ duration: 1.4, repeat: unread > 0 ? Infinity : 0, repeatDelay: 2.5 }}
          className="relative z-10"
        >
          <Bell className="h-4 w-4" />
        </motion.span>
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-0.5 -top-0.5 z-10 grid h-5 min-w-[20px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground shadow-lg shadow-destructive/40"
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="absolute right-0 top-12 z-50 w-[22rem] overflow-hidden rounded-2xl border border-border/60 bg-background/95 shadow-elegant backdrop-blur-xl"
          >
            {/* animated gradient top strip */}
            <div className="relative h-1 w-full overflow-hidden">
              <motion.div
                className="absolute inset-0"
                style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)" }}
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
              />
            </div>

            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold tracking-tight">Pranešimai</p>
              </div>
              {items.length > 0 && (
                <button
                  onClick={() => setItems([])}
                  className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground transition hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" /> Išvalyti
                </button>
              )}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 overflow-x-auto border-b border-border/60 px-2 py-2">
              {filters.map((f) => {
                const count = f.key === "all" ? items.length : items.filter((n) => n.kind === f.key).length;
                const active = filter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`relative rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                      active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="notif-tab"
                        className="absolute inset-0 rounded-lg bg-primary"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative flex items-center gap-1">
                      {f.label}
                      <span className={`rounded px-1 text-[9px] ${active ? "bg-primary-foreground/20" : "bg-accent"}`}>{count}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filtered.length === 0 && (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-accent">
                    <Bell className="h-4 w-4 opacity-50" />
                  </div>
                  Kol kas nėra pranešimų
                </div>
              )}

              {(["today", "earlier"] as const).map((g) => {
                const list = groups[g];
                if (list.length === 0) return null;
                return (
                  <div key={g}>
                    <div className="sticky top-0 z-10 border-b border-border/40 bg-background/80 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground backdrop-blur">
                      {g === "today" ? "Šiandien" : "Anksčiau"}
                    </div>
                    <AnimatePresence initial={false}>
                      {list.map((n, i) => {
                        const Icon = iconFor(n);
                        return (
                          <motion.button
                            key={n.id}
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            transition={{ delay: i * 0.02 }}
                            onClick={() => openNotif(n)}
                            className="group flex w-full items-start gap-3 border-b border-border/40 p-3 text-left transition last:border-b-0 hover:bg-accent/50"
                          >
                            <div className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-xl transition ${
                              n.read ? "bg-accent text-muted-foreground" : "bg-primary/15 text-primary"
                            }`}>
                              <Icon className="h-4 w-4" />
                              {!n.read && (
                                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{n.title}</p>
                              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                              <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground/70">
                                <span>
                                  {new Date(n.at).toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                {n.hash && (
                                  <span className="flex items-center gap-0.5 rounded bg-accent px-1.5 py-0.5 font-mono text-[9px] text-foreground/70 transition group-hover:text-primary">
                                    <LinkIcon className="h-2.5 w-2.5" />
                                    {n.hash}
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border/60 px-4 py-2 text-center text-[10px] text-muted-foreground">
              Spausk pranešimą — nueis tiesiai į turinį <span className="font-mono text-primary">#deep-link</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
