import { supabase } from "@/integrations/supabase/client";

export type DmMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

/** Open or create the DM room with a friend. Returns room id. */
export async function openDmRoom(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc("open_dm_room", { _other: otherUserId });
  if (error) throw error;
  return data as string;
}

export async function listDmMessages(roomId: string): Promise<DmMessage[]> {
  const { data, error } = await supabase
    .from("dm_messages")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as DmMessage[]) ?? [];
}

export async function sendDmMessage(roomId: string, senderId: string, content: string) {
  const trimmed = content.trim();
  if (!trimmed) return;
  const { error } = await supabase
    .from("dm_messages")
    .insert({ room_id: roomId, sender_id: senderId, content: trimmed.slice(0, 2000) });
  if (error) throw error;
}

export function subscribeDmMessages(roomId: string, onInsert: (m: DmMessage) => void) {
  const channel = supabase
    .channel(`dm:${roomId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "dm_messages", filter: `room_id=eq.${roomId}` },
      (payload) => onInsert(payload.new as DmMessage),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
