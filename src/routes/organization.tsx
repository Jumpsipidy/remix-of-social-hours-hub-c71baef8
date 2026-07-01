import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "../components/layout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Clock, CheckCircle2, Users, TrendingUp, Check, X, Inbox, MessageSquare, AlarmClock, XCircle, PlayCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { ChatDialog, type ChatReservation } from "@/components/chat-dialog";
import { CreateTaskPanel } from "@/components/create-task-panel";
import { VerifyCloseDialog } from "@/components/verify-close-dialog";

export const Route = createFileRoute("/organization")({
  head: () => ({
    meta: [
      { title: "Organizacijos sritis — Socialinės Valandos" },
      { name: "description", content: "Tvarkyk savanorystės užklausas ir stebėk savo organizacijos statistiką." },
    ],
  }),
  component: OrgDashboard,
});

type Reservation = {
  id: string;
  student_id: string;
  organization_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  hours_to_earn: number;
  status: "pending" | "approved" | "confirmed" | "completed" | "declined";
};

type StudentLite = { id: string; full_name: string | null; email: string | null; hours_earned: number };

async function ensureRoomAndNotify(reservation: Reservation, content: string, senderId: string) {
  const { data: existing } = await supabase
    .from("chat_rooms")
    .select("id")
    .eq("reservation_id", reservation.id)
    .maybeSingle();
  let roomId = existing?.id;
  if (!roomId) {
    const { data: created, error } = await supabase
      .from("chat_rooms")
      .insert({
        reservation_id: reservation.id,
        student_id: reservation.student_id,
        organization_id: reservation.organization_id,
      })
      .select("id")
      .maybeSingle();
    if (error || !created) return;
    roomId = created.id;
  }
  await supabase.from("messages").insert({ chat_room_id: roomId, sender_id: senderId, content });
}

function OrgDashboard() {
  const { user, profile, loading } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [students, setStudents] = useState<Record<string, StudentLite>>({});
  const [chatRes, setChatRes] = useState<ChatReservation | null>(null);
  const [verifyRes, setVerifyRes] = useState<Reservation | null>(null);

  const refresh = async (uid: string) => {
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .eq("organization_id", uid)
      .order("created_at", { ascending: false });
    const rs = (data as Reservation[]) ?? [];
    setReservations(rs);
    const ids = Array.from(new Set(rs.map((r) => r.student_id)));
    if (ids.length) {
      const { data: ps } = await supabase
        .from("profiles")
        .select("id, full_name, email, hours_earned")
        .in("id", ids);
      const map: Record<string, StudentLite> = {};
      (ps as StudentLite[] | null)?.forEach((p) => (map[p.id] = p));
      setStudents(map);
    }
  };

  useEffect(() => {
    if (user) refresh(user.id);
  }, [user]);

  if (loading) return <PageShell><div className="p-20 text-center text-muted-foreground">Kraunama…</div></PageShell>;
  if (!user || profile?.role !== "organization") {
    return (
      <PageShell>
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <h1 className="text-2xl font-bold">Reikalingos organizacijos teisės</h1>
          <Link to="/login" className="mt-6 inline-flex rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">Prisijungti</Link>
        </div>
      </PageShell>
    );
  }

  const pending = reservations.filter((r) => r.status === "pending");
  const approved = reservations.filter((r) => r.status === "approved");
  const completed = reservations.filter((r) => r.status === "completed" || r.status === "confirmed");
  const hoursDelivered = completed.reduce((a, r) => a + Number(r.hours_to_earn), 0);

  const orgLabel = profile.organization_name ?? profile.full_name ?? "Organizacija";

  const approveInitial = async (r: Reservation) => {
    const { error } = await supabase.from("reservations").update({ status: "approved" }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    await ensureRoomAndNotify(
      r,
      `🤖 Sistema: ${orgLabel} PATVIRTINO užklausą. Statusas: ON WORK / IN PROGRESS. Valandos bus įskaitytos tik po galutinio uždarymo.`,
      user.id,
    );
    toast.success("Užklausa patvirtinta — mokinys pradeda darbą");
    refresh(user.id);
  };

  const decline = async (r: Reservation) => {
    const { error } = await supabase.from("reservations").update({ status: "declined" }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    await ensureRoomAndNotify(r, `🤖 Sistema: ${orgLabel} ATMETĖ šią rezervaciją.`, user.id);
    toast.success("Atmesta — žinutė nusiųsta į pokalbį");
    refresh(user.id);
  };

  const finalizeCompleted = async (r: Reservation) => {
    const { error } = await supabase.from("reservations").update({ status: "completed" }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    const { data: stu } = await supabase.from("profiles").select("hours_earned").eq("id", r.student_id).maybeSingle();
    const next = Number(stu?.hours_earned ?? 0) + Number(r.hours_to_earn);
    await supabase.from("profiles").update({ hours_earned: next }).eq("id", r.student_id);
    await ensureRoomAndNotify(
      r,
      `🤖 Sistema: ${orgLabel} teisiškai patvirtino darbo užbaigimą. ${Number(r.hours_to_earn)} val. įskaityta į mokinio profilį ir išsiųsta mokyklos taryboms.`,
      user.id,
    );
    toast.success(`Užduotis uždaryta · ${Number(r.hours_to_earn)} val. įskaityta`);
    setVerifyRes(null);
    refresh(user.id);
  };


  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Organizacijos sritis</p>
            <h1 className="mt-1 truncate text-3xl font-bold tracking-tight sm:text-4xl">{profile.organization_name ?? profile.full_name ?? "Organizacija"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>
          </div>
          <span className="shrink-0 rounded-full bg-success/15 px-3 py-1.5 text-xs font-semibold text-success">● Online</span>
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Inbox, label: "Laukia patvirtinimo", value: pending.length },
            { icon: PlayCircle, label: "Vykdomos (On Work)", value: approved.length },
            { icon: Clock, label: "Suteikta valandų", value: hoursDelivered },
            { icon: Users, label: "Skirtingų savanorių", value: new Set(reservations.map((r) => r.student_id)).size },
          ].map((s) => (
            <div key={s.label} className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md">
              <div className="flex items-center justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
                  <s.icon className="h-5 w-5" />
                </div>
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
              <p className="mt-5 font-display text-3xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
        <CreateTaskPanel organizationId={user.id} />
      </section>

      <section className="mx-auto mt-6 grid max-w-7xl gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-5">
        <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md lg:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Laukiančios užklausos</h2>
              <p className="text-xs text-muted-foreground">Patvirtinimas / atmetimas automatiškai nusiunčia sistemos žinutę į pokalbį.</p>
            </div>
            <span className="rounded-full bg-warning/20 px-3 py-1 text-xs font-semibold text-warning-foreground">{pending.length} naujos</span>
          </div>
          <div className="mt-6 space-y-3">
            {pending.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Visos užklausos apdorotos 🎉</div>
            )}
            {pending.map((r) => {
              const s = students[r.student_id];
              return (
                <div key={r.id} className="rounded-2xl border border-border bg-background/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
                        {(s?.full_name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{s?.full_name ?? "Mokinys"}</p>
                        <p className="truncate text-xs text-muted-foreground">{r.reservation_date} · {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)} · {Number(r.hours_to_earn)} val.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setChatRes({ id: r.id, student_id: r.student_id, organization_id: r.organization_id })}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                    >
                      <MessageSquare className="h-3 w-3" /> Pokalbis
                    </button>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => approveInitial(r)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                    >
                      <Check className="h-4 w-4" /> Approve · Start work
                    </button>
                    <button
                      onClick={() => decline(r)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-4 w-4" /> Atmesti
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* On Work list */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary">On Work · In Progress</h3>
                <p className="text-xs text-muted-foreground">Patvirtinta — laukiama darbo užbaigimo. Valandos dar NĖRA įskaitytos.</p>
              </div>
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">{approved.length}</span>
            </div>
            <div className="mt-3 space-y-3">
              {approved.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">Nėra vykdomų užduočių.</div>
              )}
              {approved.map((r) => {
                const s = students[r.student_id];
                return (
                  <div key={r.id} className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
                          {(s?.full_name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{s?.full_name ?? "Mokinys"}</p>
                          <p className="truncate text-xs text-muted-foreground">{r.reservation_date} · {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)} · {Number(r.hours_to_earn)} val.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setChatRes({ id: r.id, student_id: r.student_id, organization_id: r.organization_id })}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent"
                      >
                        <MessageSquare className="h-3 w-3" /> Pokalbis
                      </button>
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={() => setVerifyRes(r)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
                      >
                        <ShieldCheck className="h-4 w-4" /> Verify & Close Task
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        <div className="rounded-3xl border border-border bg-gradient-card p-6 shadow-md lg:col-span-2">
          <h2 className="text-lg font-bold">Istorija</h2>
          <p className="text-xs text-muted-foreground">Patvirtintos ir atmestos rezervacijos</p>
          <div className="mt-5 space-y-2">
            {reservations.filter((r) => r.status !== "pending" && r.status !== "approved").length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">Dar tuščia.</div>
            )}
            {reservations.filter((r) => r.status !== "pending" && r.status !== "approved").map((r) => {
              const s = students[r.student_id];
              const isDone = r.status === "completed" || r.status === "confirmed";
              const Icon = isDone ? CheckCircle2 : r.status === "declined" ? XCircle : AlarmClock;
              const tone = isDone ? "text-success" : "text-destructive";
              return (
                <div key={r.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-background/60 p-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold">
                    {(s?.full_name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s?.full_name ?? "Mokinys"}</p>
                    <p className="text-xs text-muted-foreground">{r.reservation_date} · {Number(r.hours_to_earn)} val.</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icon className={`h-4 w-4 ${tone}`} />
                    <button
                      onClick={() => setChatRes({ id: r.id, student_id: r.student_id, organization_id: r.organization_id })}
                      className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground"
                      title="Pokalbis"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <ChatDialog reservation={chatRes} onClose={() => setChatRes(null)} />
      <VerifyCloseDialog
        open={!!verifyRes}
        hours={Number(verifyRes?.hours_to_earn ?? 0)}
        studentName={verifyRes ? (students[verifyRes.student_id]?.full_name ?? "Mokinys") : ""}
        onCancel={() => setVerifyRes(null)}
        onConfirm={async () => { if (verifyRes) await finalizeCompleted(verifyRes); }}
      />
    </PageShell>
  );
}
