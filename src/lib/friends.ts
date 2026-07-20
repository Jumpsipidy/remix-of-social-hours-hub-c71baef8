import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activity-log";

export type FriendshipStatus = "pending" | "accepted" | "declined" | "blocked";

export type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
};

export type FriendProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  class_year: string | null;
  hours_earned: number | null;
  school_id: string | null;
};

/** All friendships involving me (any status). */
export async function listMyFriendships(userId: string): Promise<FriendshipRow[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as FriendshipRow[]) ?? [];
}

/** Fetch profiles for a set of user ids. */
export async function fetchFriendProfiles(ids: string[]): Promise<Record<string, FriendProfile>> {
  if (!ids.length) return {};
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, class_year, hours_earned, school_id")
    .in("id", ids);
  const map: Record<string, FriendProfile> = {};
  (data as FriendProfile[] | null)?.forEach((p) => (map[p.id] = p));
  return map;
}

/** Students at my school (excluding me). Simple prefix search. */
export async function searchClassmates(myId: string, mySchoolId: string, q: string): Promise<FriendProfile[]> {
  if (!mySchoolId) return [];
  const query = supabase
    .from("profiles")
    .select("id, full_name, email, class_year, hours_earned, school_id")
    .eq("school_id", mySchoolId)
    .eq("role", "student")
    .neq("id", myId)
    .limit(20);
  const term = q.trim();
  if (term) query.ilike("full_name", `%${term}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data as FriendProfile[]) ?? [];
}

export async function sendFriendRequest(fromId: string, toId: string) {
  const { error } = await supabase.from("friendships").insert({
    requester_id: fromId,
    addressee_id: toId,
    status: "pending",
  } as any);
  if (error) throw error;
  logActivity("friend.request_sent", { entityType: "profile", entityId: toId });
}

export async function respondToRequest(rowId: string, accept: boolean) {
  const { error } = await supabase
    .from("friendships")
    .update({ status: accept ? "accepted" : "declined" } as any)
    .eq("id", rowId);
  if (error) throw error;
  logActivity(accept ? "friend.request_accepted" : "friend.request_declined", { entityType: "friendship", entityId: rowId });
}

export async function unfriend(rowId: string) {
  const { error } = await supabase.from("friendships").delete().eq("id", rowId);
  if (error) throw error;
  logActivity("friend.unfriended", { entityType: "friendship", entityId: rowId });
}

// ============ Group reservations ============

export type ParticipantRow = {
  id: string;
  reservation_id: string;
  student_id: string;
  invited_by: string | null;
  status: "pending" | "accepted" | "declined" | "removed";
  hours_awarded: number;
  created_at: string;
};

export async function inviteFriendsToReservation(
  reservationId: string,
  inviterId: string,
  friendIds: string[],
) {
  if (!friendIds.length) return;
  const rows = friendIds.map((sid) => ({
    reservation_id: reservationId,
    student_id: sid,
    invited_by: inviterId,
    status: "pending" as const,
  }));
  const { error } = await supabase.from("reservation_participants").insert(rows as any);
  if (error) throw error;
}

export async function listMyInvites(userId: string): Promise<ParticipantRow[]> {
  const { data, error } = await supabase
    .from("reservation_participants")
    .select("*")
    .eq("student_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ParticipantRow[]) ?? [];
}

export async function respondToInvite(rowId: string, accept: boolean) {
  const { error } = await supabase
    .from("reservation_participants")
    .update({ status: accept ? "accepted" : "declined" } as any)
    .eq("id", rowId);
  if (error) throw error;
}

export async function listParticipants(reservationId: string): Promise<ParticipantRow[]> {
  const { data, error } = await supabase
    .from("reservation_participants")
    .select("*")
    .eq("reservation_id", reservationId);
  if (error) throw error;
  return (data as ParticipantRow[]) ?? [];
}
