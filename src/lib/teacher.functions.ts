import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchAdminProfile } from "./school-data.server";

async function requireTeacher(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const me = await fetchAdminProfile(supabaseAdmin as never, userId);
  if (!me || (me.role !== "school_admin" && me.role !== "admin")) {
    throw new Error("Prieiga tik mokyklos administratoriams.");
  }
  return { supabaseAdmin, me };
}

export const teacherCreateReservations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    studentIds: string[]; organizationId?: string | null; taskId?: string | null;
    date: string; start: string; end: string; hours: number; kind: string; note?: string;
  }) => {
    if (!Array.isArray(input?.studentIds) || input.studentIds.length === 0) throw new Error("Pasirink bent vieną mokinį.");
    if (!input.date || !input.start || !input.end) throw new Error("Užpildyk datą ir laiką.");
    return {
      studentIds: input.studentIds.map(String).slice(0, 200),
      organizationId: input.organizationId ? String(input.organizationId) : null,
      taskId: input.taskId ? String(input.taskId) : null,
      date: String(input.date), start: String(input.start), end: String(input.end),
      hours: Math.max(0, Math.min(8, Math.round(Number(input.hours) || 0))),
      kind: ["volunteer", "consultation", "event", "other"].includes(input.kind) ? input.kind : "volunteer",
      note: String(input.note ?? "").slice(0, 1000),
    };
  })
  .handler(async ({ context, data }) => {
    const { error, data: created } = await context.supabase.rpc("school_create_reservations", {
      _student_ids: data.studentIds,
      _organization_id: data.organizationId,
      _task_id: data.taskId,
      _date: data.date,
      _start: data.start,
      _end: data.end,
      _hours: data.hours,
      _kind: data.kind,
      _note: data.note,
    });
    if (error) throw new Error(error.message);
    return { created: Number(created ?? 0) };
  });

export const teacherUpdateReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; date: string; start: string; end: string; hours: number; kind: string; note?: string }) => {
    if (!input?.id) throw new Error("Rezervacija nenurodyta.");
    return {
      id: String(input.id),
      date: String(input.date), start: String(input.start), end: String(input.end),
      hours: Math.max(0, Math.min(8, Math.round(Number(input.hours) || 0))),
      kind: ["volunteer", "consultation", "event", "other"].includes(input.kind) ? input.kind : "volunteer",
      note: String(input.note ?? "").slice(0, 1000),
    };
  })
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await requireTeacher(context.userId);
    const { error } = await supabaseAdmin.rpc("school_update_reservation", {
      _caller: context.userId,
      _reservation_id: data.id,
      _date: data.date,
      _start: data.start,
      _end: data.end,
      _hours: data.hours,
      _kind: data.kind,
      _note: data.note,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const teacherDeleteReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Rezervacija nenurodyta.");
    return { id: String(input.id) };
  })
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await requireTeacher(context.userId);
    const { error } = await supabaseAdmin.rpc("school_delete_reservation", {
      _caller: context.userId,
      _reservation_id: data.id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Išsiunčia mokiniams asmeninę žinutę su kvietimu (rodoma /chat kaip auklėtojo žinutė). */
export const teacherSendInvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { studentIds: string[]; message: string }) => {
    if (!Array.isArray(input?.studentIds) || input.studentIds.length === 0) throw new Error("Pasirink bent vieną mokinį.");
    if (!input.message?.trim()) throw new Error("Žinutė tuščia.");
    return { studentIds: input.studentIds.map(String).slice(0, 200), message: input.message.trim().slice(0, 2000) };
  })
  .handler(async ({ context, data }) => {
    await requireTeacher(context.userId);
    let sent = 0;
    for (const sid of data.studentIds) {
      // open_dm_room pats patikrina, ar auklėtojas gali rašyti šiam mokiniui.
      const { data: roomId, error: roomErr } = await context.supabase.rpc("open_dm_room", { _other: sid });
      if (roomErr || !roomId) continue;
      const { error: msgErr } = await context.supabase.from("dm_messages").insert({
        room_id: roomId,
        sender_id: context.userId,
        content: data.message,
      });
      if (!msgErr) sent += 1;
    }
    return { sent, total: data.studentIds.length };
  });
