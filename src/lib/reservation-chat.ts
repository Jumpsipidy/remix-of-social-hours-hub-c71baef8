import { supabase } from "@/integrations/supabase/client";

/** Find or create the reservation's chat room and post the opening message. */
export async function startReservationChat(opts: { reservationId: string; studentId: string; organizationId: string; message?: string }) {
  try {
    let { data: room } = await supabase.from("chat_rooms").select("id").eq("reservation_id", opts.reservationId).maybeSingle();
    if (!room) {
      const res = await supabase.from("chat_rooms")
        .insert({ reservation_id: opts.reservationId, student_id: opts.studentId, organization_id: opts.organizationId })
        .select("id").single();
      room = res.data;
    }
    if (room && opts.message?.trim()) {
      const { data: auth } = await supabase.auth.getUser();
      await supabase.from("messages").insert({ chat_room_id: room.id, sender_id: auth.user?.id ?? null, content: opts.message.trim().slice(0, 2000) });
    }
    return room?.id ?? null;
  } catch (e) {
    console.warn("[reservation-chat]", e);
    return null;
  }
}
