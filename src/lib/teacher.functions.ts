import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchAdminProfile } from "./school-data.server";
import { optionalReservationTimes } from "./reservation-time";

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
    if (!input.date) throw new Error("Pasirink datą.");
    return {
      studentIds: input.studentIds.map(String).slice(0, 200),
      organizationId: input.organizationId ? String(input.organizationId) : null,
      taskId: input.taskId ? String(input.taskId) : null,
      date: String(input.date), ...optionalReservationTimes(input.start, input.end),
      hours: Math.max(0, Math.min(8, Math.round(Number(input.hours) || 0))),
      kind: ["volunteer", "consultation", "event", "other"].includes(input.kind) ? input.kind : "volunteer",
      note: String(input.note ?? "").slice(0, 1000),
    };
  })
  .handler(async ({ context, data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error, data: created } = await (context.supabase.rpc as any)("school_create_reservations", {
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
      date: String(input.date), ...optionalReservationTimes(input.start, input.end),
      hours: Math.max(0, Math.min(8, Math.round(Number(input.hours) || 0))),
      kind: ["volunteer", "consultation", "event", "other"].includes(input.kind) ? input.kind : "volunteer",
      note: String(input.note ?? "").slice(0, 1000),
    };
  })
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await requireTeacher(context.userId);
    // RPC argument metadata omits SQL's nullable time arguments.
    const { error } = await (supabaseAdmin.rpc as typeof context.supabase.rpc & ((name: "school_update_reservation", args: Record<string, unknown>) => ReturnType<typeof context.supabase.rpc>))("school_update_reservation", {
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
    return { studentIds: input.studentIds.map(String).slice(0, 200), message: input.message.trim().slice(0, 2400) };
  })
  .handler(async ({ context, data }) => {
    await requireTeacher(context.userId);
    let sent = 0;
    for (const sid of data.studentIds) {
      // open_chat_with pats patikrina, ar auklėtojas gali rašyti šiam mokiniui (priskirtos klasės).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: roomId, error: roomErr } = await (context.supabase.rpc as any)("open_chat_with", { _other: sid });
      if (roomErr || !roomId) continue;
      const { error: msgErr } = await context.supabase.from("messages").insert({
        chat_room_id: roomId as string,
        sender_id: context.userId,
        content: data.message,
      });
      if (!msgErr) sent += 1;
    }
    return { sent, total: data.studentIds.length };
  });

/** Auklėtojas paskelbia veiklą, kurią mato visi /tasks puslapyje. */
export const teacherPublishTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    title: string; description?: string; date: string; start: string; end: string;
    hours: number; city?: string; location?: string; spots: number;
  }) => {
    const title = String(input?.title ?? "").trim();
    if (title.length < 3) throw new Error("Įrašyk pavadinimą (bent 3 simboliai).");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.date))) throw new Error("Pasirink datą.");
    return {
      title: title.slice(0, 140), description: String(input.description ?? "").slice(0, 2000),
      date: String(input.date), ...optionalReservationTimes(input.start, input.end),
      hours: Math.max(0, Math.min(8, Math.round(Number(input.hours) || 0))),
      city: String(input.city ?? "").slice(0, 60) || null, location: String(input.location ?? "").slice(0, 200),
      spots: Math.max(1, Math.min(500, Math.round(Number(input.spots) || 1))),
    };
  })
  .handler(async ({ context, data }) => {
    const { supabaseAdmin, me } = await requireTeacher(context.userId);
    const host = (me as { full_name?: string | null }).full_name ?? "Mokykla";
    const row = {
      organization_id: context.userId, created_by: context.userId, title: data.title, description: data.description,
      task_date: data.date, start_time: data.start, end_time: data.end, available_hours: data.hours,
      city: data.city, location: data.location, spots_total: data.spots, is_open: true, is_event: true,
      event_host_name: `${host} (mokykla)`,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let payload: Record<string, unknown> = { ...row };
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await supabaseAdmin.from("tasks").insert(payload as any).select("id").single();
      if (!res.error) return { id: res.data.id as string };
      const missing = /Could not find the '([^']+)' column/.exec(res.error.message)?.[1];
      if (!missing || !(missing in payload)) throw new Error("Nepavyko paskelbti veiklos.");
      delete payload[missing];
    }
    throw new Error("Nepavyko paskelbti veiklos.");
  });
