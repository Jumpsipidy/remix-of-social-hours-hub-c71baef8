import { supabase } from "@/integrations/supabase/client";

/** Find or create the reservation's chat room and post the opening message. */
export async function startReservationChat(opts: { reservationId: string; studentId: string; organizationId: string; message?: string }) {
  try {
    const { data: roomId, error } = await supabase.rpc("open_reservation_chat", { _reservation: opts.reservationId });
    if (error || !roomId) return null;
    const room = { id: roomId };
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
