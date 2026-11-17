import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Bell, BellRing, CheckCircle2, MessageSquare, Trash2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { notifications, notificationTarget, OPEN_NOTIFICATIONS_EVENT, type Notif, type NotifKind } from "@/lib/notifications";
import { notifIcon } from "@/components/notification-center";

type FilterKey = "all" | "message" | "reservation" | "social" | "bug";

const inFilter = (n: Notif, f: FilterKey) => {
  if (f === "all") return true;
  if (f === "message") return n.kind === "message" || n.kind === "dm";
  if (f === "reservation") return n.kind === "reservation" || n.kind === "hours";
  if (f === "social") return n.kind === "friend" || n.kind === "group";
  return n.kind === "bug";
};

/** The bell shows what NotificationCenter collected; it never listens to the database itself. */
export function NotificationBell() {
  const { profile, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { items } = useSyncExternalStore(notifications.subscribe, notifications.getSnapshot, notifications.getServerSnapshot);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("unsupported");
  const ref = useRef<HTMLDivElement>(null);
  const unread = useMemo(() => items.filter((n) => !n.read).length, [items]);

  useEffect(() => {
    if (typeof Notification !== "undefined") setPerm(Notification.permission);
    const openIt = () => setOpen(true);
    window.addEventListener(OPEN_NOTIFICATIONS_EVENT, openIt);
    return () => window.removeEventListener(OPEN_NOTIFICATIONS_EVENT, openIt);
  }, []);

  // Debug hook used by the developer test panel.
  useEffect(() => {
    const w = window as unknown as { __pushNotification?: (n: Partial<Notif>) => void };
    w.__pushNotification = (n) => {
      const kind = (n.kind as NotifKind) ?? "message";
      const rec = notifications.add({ key: `test:${crypto.randomUUID()}`, kind, title: n.title ?? "Bandomasis pranešimas", body: n.body ?? "Šis pranešimas iš testavimo skydelio", status: n.status, hash: n.hash, to: notificationTarget(kind, profile?.role) });
      if (rec) toast(rec.title, { description: rec.body });
    };
    return () => { delete w.__pushNotification; };
  }, [profile?.role]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  // Opening the list counts as reading it once it closes.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) { wasOpen.current = true; return; }
    if (wasOpen.current) { wasOpen.current = false; notifications.markAllRead(); }
  }, [open]);

  if (!isAuthenticated) return null;

  const filtered = items.filter((n) => inFilter(n, filter));
  const now = Date.now();
  const groups = {
    today: filtered.filter((n) => now - new Date(n.at).getTime() < 24 * 3600 * 1000),
    earlier: filtered.filter((n) => now - new Date(n.at).getTime() >= 24 * 3600 * 1000),
  };

  const openNotif = (n: Notif) => {
    notifications.markRead(n.id);
    setOpen(false);
    const hash = n.hash?.replace(/^#/, "");
    navigate({ to: n.to, hash: hash || undefined }).catch(() => { window.location.href = n.to; });
  };

  const askPermission = async () => {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPerm(p);
    if (p === "granted") toast.success("Pranešimai įjungti — matysi juos net kai svetainė kitame skirtuke");
  };

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "Visi" },
    { key: "message", label: "Žinutės" },
    { key: "reservation", label: "Veiklos" },
    ...(profile?.role === "student" ? [{ key: "social" as FilterKey, label: "Draugai" }] : []),
    ...(profile?.role === "admin" ? [{ key: "bug" as FilterKey, label: "Klaidos" }] : []),
  ];

  const ago = (iso: string) => {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return "ką tik";
    if (m < 60) return `prieš ${m} min.`;
    const h = Math.round(m / 60);
    if (h < 24) return `prieš ${h} val.`;
    return new Date(iso).toLocaleDateString("lt-LT", { month: "short", day: "numeric" });
  };

  const chatPath = profile?.role === "school_admin" ? "/mokytojas/pokalbiai" : profile?.role === "admin" ? "/admin/messages" : "/chat";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `Pranešimai, ${unread} nauji` : "Pranešimai"}
        aria-expanded={open}
        className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-card transition hover:bg-accent active:scale-95"
      >
        {unread > 0 ? <BellRing className="sv-bell-ring h-4 w-4 text-primary" /> : <Bell className="h-4 w-4" />}
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-[20px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold tabular-nums text-destructive-foreground ring-2 ring-background">
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
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="fixed left-2 right-2 top-16 z-50 overflow-hidden rounded-2xl border border-border bg-popover shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[24rem]"
            role="dialog"
            aria-label="Pranešimai"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-bold">Pranešimai</p>
                <p className="text-xs text-muted-foreground">{unread ? `${unread} neperskaityti` : "Viskas perskaityta"}</p>
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button onClick={() => notifications.markAllRead()} className="rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-accent">
                    <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />Skaityti visus
                  </button>
                )}
                {items.length > 0 && (
                  <button onClick={() => notifications.clear()} aria-label="Išvalyti" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {perm === "default" && (
              <button onClick={askPermission} className="flex w-full items-center gap-3 border-b border-border bg-primary/5 px-4 py-2.5 text-left text-xs hover:bg-primary/10">
                <BellRing className="h-4 w-4 shrink-0 text-primary" />
                <span><span className="font-semibold">Įjungti pranešimus naršyklėje</span><span className="block text-muted-foreground">Kad nepraleistum kvietimų, kai svetainė kitame skirtuke</span></span>
              </button>
            )}

            <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2">
              {filters.map((f) => {
                const count = items.filter((n) => inFilter(n, f.key)).length;
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
                  <p className="mt-1 text-xs text-muted-foreground">Čia matysi žinutes, kvietimus, patvirtinimus ir gautas valandas.</p>
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
                      const Icon = notifIcon(n);
                      return (
                        <div key={n.id} className={`group relative flex items-start gap-3 px-4 py-3 transition hover:bg-accent/60 ${n.read ? "" : "bg-primary/[0.05]"}`}>
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
                          <button onClick={() => notifications.remove(n.id)} aria-label="Pašalinti"
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

            <button onClick={() => { setOpen(false); navigate({ to: chatPath }); }}
              className="flex w-full items-center justify-center gap-2 border-t border-border px-4 py-3 text-sm font-semibold text-primary hover:bg-accent">
              <MessageSquare className="h-4 w-4" /> Atidaryti pokalbius
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
