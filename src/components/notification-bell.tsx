import { useEffect, useRef, useState } from "react";
import { Bell, MessageSquare, CheckCircle2, XCircle, PlayCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";


type Notification = {
  id: string;
  kind: "message" | "reservation";
  title: string;
  body: string;
  at: string;
  status?: string;
};

const STORAGE_KEY = "sv_notifs_v1";

export function NotificationBell() {
  const { user, profile, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Persist
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { items: Notification[]; unread: number };
        setItems(parsed.items ?? []);
        setUnread(parsed.unread ?? 0);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, unread })); } catch {}
  }, [items, unread]);

  const push = (n: Omit<Notification, "id" | "at">) => {
    setItems((prev) => [{ id: crypto.randomUUID(), at: new Date().toISOString(), ...n }, ...prev].slice(0, 30));
    setUnread((u) => u + 1);
    // Animated popup toast
    toast(n.title, {
      description: n.body,
      icon: n.kind === "message" ? "💬" : n.status === "completed" ? "✅" : n.status === "declined" ? "❌" : "🔔",
      duration: 5000,
    });
  };

  // Expose global push for debug testing
  useEffect(() => {
    (window as any).__pushNotification = (n: Partial<Notification>) =>
      push({
        kind: (n.kind as any) ?? "message",
        title: n.title ?? "🔔 Test pranešimas",
        body: n.body ?? "Šis pranešimas iš debug panelės",
        status: n.status,
      });
    return () => { delete (window as any).__pushNotification; };
  }, []);


  useEffect(() => {
    if (!user || !isAuthenticated) return;
    const uid = user.id;

    // Messages channel: notify on messages in rooms where user is a member
    const chMsg = supabase
      .channel(`notif-msg-${uid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const m = payload.new as { chat_room_id: string; sender_id: string | null; content: string };
        if (!m || m.sender_id === uid) return;
        // Check membership
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
        });
      })
      .subscribe();

    // Reservations channel
    const filterField = profile?.role === "organization" ? "organization_id" : "student_id";
    const chRes = supabase
      .channel(`notif-res-${uid}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reservations", filter: `${filterField}=eq.${uid}` },
        (payload) => {
          const r = payload.new as { status: string; reservation_date: string };
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
          });
        },
      )
      .subscribe();

    // Admin: new bug reports
    let chBugs: ReturnType<typeof supabase.channel> | null = null;
    if (profile?.role === "admin") {
      chBugs = supabase
        .channel(`notif-bugs-${uid}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "bug_reports" }, (payload) => {
          const b = payload.new as { message: string; severity?: string };
          push({
            kind: "message",
            title: `🐛 Naujas bug report${b.severity ? ` (${b.severity})` : ""}`,
            body: b.message.length > 100 ? b.message.slice(0, 100) + "…" : b.message,
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

  // Close on outside click
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
    if (n.kind === "message") return MessageSquare;
    if (n.status === "completed" || n.status === "confirmed") return CheckCircle2;
    if (n.status === "declined") return XCircle;
    if (n.status === "approved") return PlayCircle;
    return Clock;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((o) => !o); if (!open) setUnread(0); }}
        aria-label="Pranešimai"
        className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-card transition hover:bg-accent"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-border bg-background/95 shadow-elegant backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-bold">Pranešimai</p>
              {items.length > 0 && (
                <button
                  onClick={() => { setItems([]); setUnread(0); }}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Išvalyti
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 && (
                <div className="p-8 text-center text-xs text-muted-foreground">Kol kas nėra pranešimų</div>
              )}
              {items.map((n) => {
                const Icon = iconFor(n);
                return (
                  <div key={n.id} className="flex items-start gap-3 border-b border-border/60 p-3 last:border-b-0">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{n.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{n.body}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                        {new Date(n.at).toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
