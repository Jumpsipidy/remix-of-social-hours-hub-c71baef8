import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, CalendarCheck, CheckCircle2, Clock, Gift, MessageSquare, UserPlus, Users, XCircle, Bug } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { notifications, notificationTarget, OPEN_NOTIFICATIONS_EVENT, type Notif, type NotifKind } from "@/lib/notifications";

const STATUS_TITLE: Record<string, string> = {
  approved: "Rezervacija patvirtinta",
  completed: "Veikla užbaigta",
  confirmed: "Valandos patvirtintos",
  declined: "Rezervacija atmesta",
  cancelled: "Rezervacija atšaukta",
};

const short = (s: string, n = 110) => (s.length > n ? `${s.slice(0, n)}…` : s);
const fmtDate = (d: string) => {
  const t = Date.parse(d);
  return Number.isNaN(t) ? d : new Date(t).toLocaleDateString("lt-LT", { month: "long", day: "numeric" });
};

export function notifIcon(n: Pick<Notif, "kind" | "status">) {
  if (n.kind === "bug") return Bug;
  if (n.kind === "message" || n.kind === "dm") return MessageSquare;
  if (n.kind === "friend") return UserPlus;
  if (n.kind === "group") return Users;
  if (n.kind === "hours") return Gift;
  if (n.status === "completed" || n.status === "confirmed") return CheckCircle2;
  if (n.status === "declined" || n.status === "cancelled") return XCircle;
  if (n.status === "approved") return CalendarCheck;
  return Clock;
}

function tone(n: Pick<Notif, "kind" | "status">) {
  if (n.kind === "hours" || n.status === "completed" || n.status === "confirmed") return "success";
  if (n.status === "declined" || n.status === "cancelled") return "danger";
  if (n.kind === "friend" || n.kind === "group") return "accent";
  return "primary";
}

/**
 * Listens for everything that matters to the signed-in person (messages, friend
 * requests, group invites, reservation changes, awarded hours), adds it to the
 * bell and shows a popup. On sign-in it also catches up on what happened while
 * the person was away. Mounted once for the whole site.
 */
export function NotificationCenter() {
  const { user, profile, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const role = profile?.role ?? null;
  const uid = isAuthenticated && user ? user.id : null;

  useEffect(() => { notifications.useUser(uid); }, [uid]);

  useEffect(() => {
    if (!uid || !role) return;
    let alive = true;

    const open = (n: Notif) => {
      notifications.markRead(n.id);
      const hash = n.hash?.replace(/^#/, "");
      navigate({ to: n.to, hash: hash || undefined }).catch(() => { window.location.href = n.to; });
    };

    const show = (rec: Notif) => {
      const Icon = notifIcon(rec);
      const t = tone(rec);
      // Don't pop up chat messages while the person is already reading chats.
      const inChat = (rec.kind === "message" || rec.kind === "dm") && /chat|pokalbiai|messages/.test(pathRef.current);
      if (typeof document !== "undefined" && document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          const sys = new Notification(rec.title, { body: rec.body, icon: "/favicon.png", tag: rec.key });
          sys.onclick = () => { window.focus(); open(rec); sys.close(); };
        } catch { /* some browsers only allow this from a service worker */ }
      }
      if (inChat) return;
      toast(rec.title, {
        id: rec.key,
        description: rec.body,
        className: `sv-notif sv-notif-${t}${rec.important ? " sv-notif-important" : ""}`,
        icon: <span className={`sv-notif-icon sv-notif-icon-${t}`}><Icon className="h-4 w-4" /></span>,
        duration: rec.important ? 10000 : 6000,
        action: { label: "Atidaryti", onClick: () => open(rec) },
      });
    };

    const push = (n: Omit<Notif, "id" | "read" | "at" | "to"> & { at?: string; to?: string }, popup = true) => {
      if (!alive) return null;
      const rec = notifications.add({ ...n, to: n.to ?? notificationTarget(n.kind as NotifKind, role) });
      if (rec && popup) show(rec);
      if (rec) notifications.markSynced(uid);
      return rec;
    };

    const nameOf = async (id: string | null | undefined): Promise<string | null> => {
      if (!id) return null;
      const { data } = await supabase.from("profiles").select("full_name, organization_name").eq("id", id).maybeSingle();
      const p = data as { full_name: string | null; organization_name: string | null } | null;
      return p?.organization_name || p?.full_name || null;
    };

    const isStudent = role === "student";
    const isOwner = role === "organization" || role === "school_admin";

    // ---------- Catch up on what happened while away ----------
    const catchUp = async () => {
      const since = notifications.since(uid);
      const startedAt = new Date().toISOString();
      let added = 0;
      const quiet = (n: Parameters<typeof push>[0]) => { if (push(n, false)) added++; };
      const tasks: Promise<unknown>[] = [];

      if (isStudent) {
        tasks.push((async () => {
          const { data } = await supabase.from("friendships").select("id, requester_id, created_at")
            .eq("addressee_id", uid).eq("status", "pending").order("created_at", { ascending: false }).limit(10);
          for (const f of (data ?? []) as { id: string; requester_id: string; created_at: string }[]) {
            const who = await nameOf(f.requester_id);
            quiet({ key: `fr:${f.id}:pending`, kind: "friend", title: "Naujas draugo kvietimas", body: who ? `${who} nori būti tavo draugu` : "Kažkas nori būti tavo draugu", at: f.created_at, hash: "#draugai", important: true });
          }
        })());
        tasks.push((async () => {
          const { data } = await supabase.rpc("list_my_group_invites" as never);
          for (const g of ((data ?? []) as { participant_id: string; inviter_name: string; task_title: string | null; org_name: string; reservation_date: string }[])) {
            quiet({ key: `inv:${g.participant_id}`, kind: "group", title: "Kvietimas į grupę", body: `${g.inviter_name} kviečia: ${g.task_title ?? g.org_name} · ${fmtDate(g.reservation_date)}`, important: true });
          }
        })());
        tasks.push((async () => {
          const { data } = await supabase.from("reservations").select("id, status, reservation_date, hours_to_earn, updated_at")
            .eq("student_id", uid).gt("updated_at", since).in("status", ["approved", "completed", "confirmed", "declined"]).order("updated_at", { ascending: false }).limit(15);
          for (const r of (data ?? []) as { id: string; status: string; reservation_date: string; hours_to_earn: number; updated_at: string }[]) {
            const done = r.status === "completed" || r.status === "confirmed";
            quiet({ key: `res:${r.id}:${r.status}`, kind: done && r.hours_to_earn > 0 ? "hours" : "reservation", status: r.status, title: done && r.hours_to_earn > 0 ? `Gavai ${r.hours_to_earn} val.` : STATUS_TITLE[r.status] ?? "Rezervacija pasikeitė", body: `${fmtDate(r.reservation_date)}`, at: r.updated_at, hash: "#mano-rezervacijos", important: done });
          }
        })());
        tasks.push((async () => {
          const { data } = await supabase.from("reservation_participants").select("id, hours_awarded, updated_at")
            .eq("student_id", uid).gt("hours_awarded", 0).gt("updated_at", since).limit(10);
          for (const p of (data ?? []) as { id: string; hours_awarded: number; updated_at: string }[]) {
            quiet({ key: `hrs:${p.id}`, kind: "hours", title: `Gavai ${p.hours_awarded} val.`, body: "Grupinė veikla užbaigta — valandos jau tavo paskyroje", at: p.updated_at, hash: "#mano-rezervacijos", important: true });
          }
        })());
        tasks.push((async () => {
          const { data } = await supabase.from("dm_messages").select("id, room_id, content, created_at, sender_id")
            .neq("sender_id", uid).gt("created_at", since).order("created_at", { ascending: false }).limit(20);
          const byRoom = new Map<string, { id: string; content: string; created_at: string; count: number }>();
          for (const m of (data ?? []) as { id: string; room_id: string; content: string; created_at: string }[]) {
            const cur = byRoom.get(m.room_id);
            if (cur) cur.count++; else byRoom.set(m.room_id, { id: m.id, content: m.content, created_at: m.created_at, count: 1 });
          }
          byRoom.forEach((m) => quiet({ key: `dm:${m.id}`, kind: "dm", title: m.count > 1 ? `${m.count} naujos draugo žinutės` : "Nauja draugo žinutė", body: short(m.content), at: m.created_at }));
        })());
      }

      if (isOwner) {
        tasks.push((async () => {
          const { data } = await supabase.from("reservations").select("id, reservation_date, created_at")
            .eq("organization_id", uid).eq("status", "pending").gt("created_at", since).order("created_at", { ascending: false }).limit(15);
          for (const r of (data ?? []) as { id: string; reservation_date: string; created_at: string }[]) {
            quiet({ key: `res:${r.id}:new`, kind: "reservation", status: "pending", title: "Nauja mokinio registracija", body: `${fmtDate(r.reservation_date)} · laukia tavo patvirtinimo`, at: r.created_at, important: true });
          }
        })());
      }

      if (role !== "admin") {
        tasks.push((async () => {
          const { data } = await supabase.from("messages").select("id, chat_room_id, content, created_at, sender_id")
            .neq("sender_id", uid).gt("created_at", since).order("created_at", { ascending: false }).limit(30);
          const byRoom = new Map<string, { id: string; content: string; created_at: string; count: number }>();
          for (const m of (data ?? []) as { id: string; chat_room_id: string; content: string; created_at: string }[]) {
            const cur = byRoom.get(m.chat_room_id);
            if (cur) cur.count++; else byRoom.set(m.chat_room_id, { id: m.id, content: m.content, created_at: m.created_at, count: 1 });
          }
          byRoom.forEach((m, room) => quiet({ key: `msg:${m.id}`, kind: "message", title: m.count > 1 ? `${m.count} naujos žinutės` : "Nauja žinutė", body: short(m.content), at: m.created_at, hash: `#chat/${room}` }));
        })());
      }

      await Promise.allSettled(tasks);
      if (!alive) return;
      notifications.markSynced(uid, startedAt);
      if (added > 0) {
        toast(added === 1 ? "Kol nebuvai — 1 naujas pranešimas" : `Kol nebuvai — ${added} nauji pranešimai`, {
          id: "sv-catch-up",
          className: "sv-notif sv-notif-primary sv-notif-important",
          icon: <span className="sv-notif-icon sv-notif-icon-primary"><Bell className="h-4 w-4" /></span>,
          description: "Peržiūrėk juos varpelyje",
          duration: 9000,
          action: { label: "Rodyti", onClick: () => window.dispatchEvent(new Event(OPEN_NOTIFICATIONS_EVENT)) },
        });
      }
    };
    const catchUpTimer = window.setTimeout(() => { void catchUp(); }, 900);

    // ---------- Live updates ----------
    const channels: ReturnType<typeof supabase.channel>[] = [];

    if (role !== "admin") {
      channels.push(supabase.channel(`sv-notif-msg-${uid}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
          const m = payload.new as { id: string; chat_room_id: string; sender_id: string | null; content: string };
          if (!m || m.sender_id === uid) return;
          const { data: room } = await supabase.from("chat_rooms").select("student_id, organization_id, school_admin_id").eq("id", m.chat_room_id).maybeSingle();
          const r = room as { student_id: string | null; organization_id: string | null; school_admin_id: string | null } | null;
          if (!r || ![r.student_id, r.organization_id, r.school_admin_id].includes(uid)) return;
          const who = await nameOf(m.sender_id);
          push({ key: `msg:${m.id}`, kind: "message", title: who ? `${who} parašė` : "Nauja žinutė", body: short(m.content), hash: `#chat/${m.chat_room_id}` });
        })
        .subscribe());
    } else {
      channels.push(supabase.channel(`sv-notif-bugs-${uid}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "bug_reports" }, (payload) => {
          const b = payload.new as { id: string; message: string; severity?: string };
          push({ key: `bug:${b.id}`, kind: "bug", title: `Naujas klaidos pranešimas${b.severity ? ` (${b.severity})` : ""}`, body: short(b.message ?? ""), hash: `#bug/${b.id}` });
        })
        .subscribe());
    }

    if (isStudent) {
      channels.push(supabase.channel(`sv-notif-social-${uid}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages" }, async (payload) => {
          const m = payload.new as { id: string; sender_id: string; content: string };
          if (!m || m.sender_id === uid) return;
          const who = await nameOf(m.sender_id);
          push({ key: `dm:${m.id}`, kind: "dm", title: who ? `${who} parašė` : "Nauja draugo žinutė", body: short(m.content) });
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "friendships", filter: `addressee_id=eq.${uid}` }, async (payload) => {
          const f = payload.new as { id: string; requester_id: string; status: string } | null;
          if (!f?.id || f.status !== "pending") return;
          const who = await nameOf(f.requester_id);
          push({ key: `fr:${f.id}:pending`, kind: "friend", title: "Naujas draugo kvietimas", body: who ? `${who} nori būti tavo draugu` : "Kažkas nori būti tavo draugu", hash: "#draugai", important: true });
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "friendships", filter: `requester_id=eq.${uid}` }, async (payload) => {
          const f = payload.new as { id: string; addressee_id: string; status: string };
          if (f?.status !== "accepted") return;
          const who = await nameOf(f.addressee_id);
          push({ key: `fr:${f.id}:accepted`, kind: "friend", title: "Draugo kvietimas priimtas", body: who ? `${who} dabar tavo draugas` : "Turi naują draugą", hash: "#draugai" });
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "reservation_participants", filter: `student_id=eq.${uid}` }, async (payload) => {
          const p = payload.new as { id: string; status: string; hours_awarded: number; invited_by: string | null } | null;
          const old = payload.old as { status?: string; hours_awarded?: number } | null;
          if (!p?.id) return;
          if (p.status === "pending" && old?.status !== "pending") {
            const who = await nameOf(p.invited_by);
            push({ key: `inv:${p.id}`, kind: "group", title: "Kvietimas į grupę", body: who ? `${who} kviečia prisijungti prie veiklos` : "Tave pakvietė į grupinę veiklą", hash: "#mano-rezervacijos", important: true });
          }
          if ((p.hours_awarded ?? 0) > 0 && (old?.hours_awarded ?? 0) === 0) {
            push({ key: `hrs:${p.id}`, kind: "hours", title: `Gavai ${p.hours_awarded} val.`, body: "Grupinė veikla užbaigta — valandos jau tavo paskyroje", hash: "#mano-rezervacijos", important: true });
          }
        })
        .subscribe());
    }

    const field = isOwner ? "organization_id" : "student_id";
    const resCh = supabase.channel(`sv-notif-res-${uid}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "reservations", filter: `${field}=eq.${uid}` }, (payload) => {
        const r = payload.new as { id: string; status: string; reservation_date: string; hours_to_earn: number };
        const old = payload.old as { status?: string };
        if (!r || isOwner || r.status === old?.status) return;
        const done = r.status === "completed" || r.status === "confirmed";
        const withHours = done && r.hours_to_earn > 0;
        push({ key: `res:${r.id}:${r.status}`, kind: withHours ? "hours" : "reservation", status: r.status, title: withHours ? `Gavai ${r.hours_to_earn} val.` : STATUS_TITLE[r.status] ?? "Rezervacija pasikeitė", body: withHours ? `Veikla ${fmtDate(r.reservation_date)} užbaigta — valandos jau tavo paskyroje` : fmtDate(r.reservation_date), hash: "#mano-rezervacijos", important: done || r.status === "approved" });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reservations", filter: `${field}=eq.${uid}` }, (payload) => {
        const r = payload.new as { id: string; reservation_date: string; source?: string; status: string };
        if (isOwner && role === "organization") {
          push({ key: `res:${r.id}:new`, kind: "reservation", status: "pending", title: "Nauja mokinio registracija", body: `${fmtDate(r.reservation_date)} · laukia tavo patvirtinimo`, important: true });
        } else if (isStudent && r.source === "school") {
          push({ key: `res:${r.id}:school`, kind: "reservation", status: "approved", title: "Auklėtojas priskyrė veiklą", body: fmtDate(r.reservation_date), hash: "#mano-rezervacijos", important: true });
        }
      })
      .subscribe();
    channels.push(resCh);

    return () => {
      alive = false;
      window.clearTimeout(catchUpTimer);
      channels.forEach((c) => { void supabase.removeChannel(c); });
    };
  }, [uid, role, navigate]);

  return null;
}
