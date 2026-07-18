import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Clock, ShieldCheck, MessageCircleOff, Bot, GraduationCap, Building2, User as UserIcon, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ChangeReservationDialog } from "./change-reservation-dialog";

export type ChatReservation = {
  id: string;
  student_id: string;
  organization_id: string;
  organization_name?: string;
  // When true, this "reservation" is actually a direct school-admin ↔ organization channel
  // (no real reservation row). The dialog will create/lookup a chat_room with reservation_id NULL.
  direct?: boolean;
};

type Msg = {
  id: string;
  chat_room_id: string;
  sender_id: string | null;
  content: string;
  created_at: string;
};

type ReservationDetails = {
  id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  hours_to_earn: number;
} | null;

export function ChatDialog({ reservation, onClose }: { reservation: ChatReservation | null; onClose: () => void }) {
  const { user, profile } = useAuth();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<{ student_id: string; organization_id: string; school_admin_id: string | null } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [resDetails, setResDetails] = useState<ReservationDetails>(null);
  const [changeOpen, setChangeOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!reservation || !user) return;
    let cancelled = false;
    setLoading(true);
    setResDetails(null);
    (async () => {
      // Look up / create room
      let r: { id: string; student_id: string; organization_id: string; school_admin_id: string | null } | null = null;

      if (reservation.direct) {
        // school admin ↔ organization direct chat (reservation_id NULL)
        const { data: existing } = await supabase
          .from("chat_rooms")
          .select("id, student_id, organization_id, school_admin_id")
          .is("reservation_id", null)
          .eq("school_admin_id", user.id)
          .eq("organization_id", reservation.organization_id)
          .maybeSingle();
        r = existing ?? null;
        if (!r) {
          const { data: created, error } = await supabase
            .from("chat_rooms")
            .insert({
              reservation_id: null,
              student_id: user.id, // constraint requires NOT NULL; reuse admin's own id
              organization_id: reservation.organization_id,
              school_admin_id: user.id,
            })
            .select("id, student_id, organization_id, school_admin_id")
            .maybeSingle();
          if (error) { toast.error("Nepavyko atverti pokalbio: " + error.message); setLoading(false); return; }
          r = created;
        }
      } else {
        const { data: existing } = await supabase
          .from("chat_rooms")
          .select("id, student_id, organization_id, school_admin_id")
          .eq("reservation_id", reservation.id)
          .maybeSingle();
        r = existing ?? null;
        if (!r) {
          const { data: created, error } = await supabase
            .from("chat_rooms")
            .insert({
              reservation_id: reservation.id,
              student_id: reservation.student_id,
              organization_id: reservation.organization_id,
              school_admin_id: profile?.role === "school_admin" ? user.id : null,
            })
            .select("id, student_id, organization_id, school_admin_id")
            .maybeSingle();
          if (error) { toast.error("Nepavyko atverti pokalbio: " + error.message); setLoading(false); return; }
          r = created;
        } else if (profile?.role === "school_admin" && !r.school_admin_id) {
          const { data: upd } = await supabase
            .from("chat_rooms")
            .update({ school_admin_id: user.id })
            .eq("id", r.id)
            .select("id, student_id, organization_id, school_admin_id")
            .maybeSingle();
          if (upd) r = upd;
        }

        // Fetch reservation details for organization to change
        const { data: rd } = await supabase
          .from("reservations")
          .select("id, reservation_date, start_time, end_time, hours_to_earn")
          .eq("id", reservation.id)
          .maybeSingle();
        if (!cancelled && rd) setResDetails(rd as ReservationDetails);
      }

      if (cancelled || !r) return;
      setRoomId(r.id);
      setRoom({ student_id: r.student_id, organization_id: r.organization_id, school_admin_id: r.school_admin_id });

      const { data: msgs } = await supabase
        .from("messages").select("*").eq("chat_room_id", r.id).order("created_at", { ascending: true });
      if (!cancelled) {
        setMessages((msgs as Msg[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reservation, user, profile]);

  useEffect(() => {
    if (!roomId) return;
    const ch = supabase
      .channel(`chat-${roomId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `chat_room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => {
            const m = payload.new as Msg;
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        },
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roomId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    if (!text.trim() || !roomId || !user) return;
    const content = text.trim();
    setText("");
    const { error } = await supabase.from("messages").insert({ chat_room_id: roomId, sender_id: user.id, content });
    if (error) { toast.error(error.message); setText(content); }
  };

  const roleOf = (senderId: string | null): "system" | "student" | "organization" | "school_admin" | "unknown" => {
    if (!senderId) return "system";
    if (reservation?.direct) {
      if (senderId === room?.school_admin_id) return "school_admin";
      if (senderId === room?.organization_id) return "organization";
      return "unknown";
    }
    if (room?.student_id === senderId) return "student";
    if (room?.organization_id === senderId) return "organization";
    if (room?.school_admin_id === senderId) return "school_admin";
    return "unknown";
  };

  const handleReservationSaved = async (upd: { reservation_date: string; start_time: string; end_time: string; hours_to_earn: number }) => {
    if (!resDetails || !roomId || !user) return;
    setResDetails({ ...resDetails, ...upd });
    setChangeOpen(false);
    const label = profile?.organization_name ?? profile?.full_name ?? "Organizacija";
    await supabase.from("messages").insert({
      chat_room_id: roomId,
      sender_id: null,
      content: `🤖 Sistema: ${label} pakeitė užduoties laiką į ${upd.reservation_date}, ${upd.start_time.slice(0,5)}–${upd.end_time.slice(0,5)}. Tikitės uždirbti ${upd.hours_to_earn} val.`,
    });
    toast.success("Užsakymas atnaujintas");
  };

  if (!reservation) return null;
  const canChange = profile?.role === "organization" && !reservation.direct && resDetails;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 grid place-items-end bg-foreground/40 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="flex h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-background shadow-elegant sm:h-[80vh] sm:max-w-2xl sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-border bg-gradient-card p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {reservation.direct ? "Tiesioginis kanalas su organizacija" : "Saugus 3-šalių pokalbis"}
                </p>
                <h3 className="mt-1 truncate font-display text-xl font-bold">{reservation.organization_name ?? "Pokalbis"}</h3>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {!reservation.direct && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary"><GraduationCap className="h-3 w-3" /> Mokinys</span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-warning-foreground"><Building2 className="h-3 w-3" /> Organizacija</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${room?.school_admin_id ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                    <ShieldCheck className="h-3 w-3" /> Mokyklos administratorius {room?.school_admin_id ? "· prisijungęs" : "· nepritrauktas"}
                  </span>
                </div>
              </div>
              <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-background hover:bg-accent" aria-label="Uždaryti">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground/80">
              <Clock className="h-4 w-4 shrink-0 text-primary" />
              <span>🔒 <b>Privatumo užraktas:</b> šio kambario žinutės automatiškai trinamos po 12 dienų atminčiai taupyti.</span>
            </div>
            {canChange && (
              <button
                onClick={() => setChangeOpen(true)}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
              >
                <CalendarClock className="h-3.5 w-3.5" /> Pakeisti užsakymo laiką
              </button>
            )}
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-background p-5">
            {loading && <div className="grid h-full place-items-center text-sm text-muted-foreground">Kraunama…</div>}
            {!loading && messages.length === 0 && (
              <div className="grid h-full place-items-center text-center">
                <div className="max-w-sm">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent">
                    <MessageCircleOff className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="mt-4 font-semibold">Dar nėra žinučių</p>
                  <p className="mt-1 text-sm text-muted-foreground">Pradėk pokalbį — pasitark dėl laiko, paklausk apie užduotis ar pateik įrodymus.</p>
                </div>
              </div>
            )}
            {!loading && messages.map((m) => {
              const r = roleOf(m.sender_id);
              const mine = m.sender_id === user?.id;
              if (r === "system") {
                return (
                  <div key={m.id} className="mx-auto flex max-w-md items-start gap-2 rounded-2xl border border-border bg-accent/40 p-3 text-xs text-foreground">
                    <Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{m.content}</span>
                  </div>
                );
              }
              const palette =
                r === "student" ? "bg-primary text-primary-foreground"
                : r === "organization" ? "bg-warning/20 text-foreground"
                : r === "school_admin" ? "bg-success/20 text-foreground"
                : "bg-muted text-foreground";
              const Icon = r === "student" ? GraduationCap : r === "organization" ? Building2 : r === "school_admin" ? ShieldCheck : UserIcon;
              const label = r === "student" ? "Mokinys" : r === "organization" ? "Organizacija" : r === "school_admin" ? "Mokyklos adm." : "Dalyvis";
              return (
                <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${palette}`}>
                    <div className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider opacity-80">
                      <Icon className="h-3 w-3" /> {label}
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    <p className="mt-1 text-[10px] opacity-70">{new Date(m.created_at).toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="border-t border-border bg-card/60 p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
            <div className="mb-2 flex items-start gap-2 rounded-2xl border border-warning/30 bg-warning/10 px-3 py-2 text-[11px] leading-relaxed text-foreground/80">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-foreground" />
              <span>
                <b>Pranešimas:</b> sutinkate, kad šį pokalbį gali aktyviai stebėti įgalioti mokyklos administratoriai kokybės užtikrinimo tikslais. Visos šio kambario žinutės automatiškai ir negrįžtamai sunaikinamos po 12 dienų, kad būtų sumažintas duomenų kiekis.
              </span>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(); }}
              className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/30">
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Parašyk žinutę…"
                className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
              <motion.button whileTap={{ scale: 0.95 }} type="submit" disabled={!text.trim()}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-50">
                <Send className="h-3.5 w-3.5" /> Siųsti
              </motion.button>
            </form>
          </div>
        </motion.div>
      </motion.div>
      <ChangeReservationDialog
        open={changeOpen}
        reservation={resDetails}
        onClose={() => setChangeOpen(false)}
        onSaved={handleReservationSaved}
      />
    </AnimatePresence>
  );
}
