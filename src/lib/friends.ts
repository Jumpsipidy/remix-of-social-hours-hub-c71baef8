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

/** Fetch profiles for a set of user ids (non-sensitive columns only — no login email). */
export async function fetchFriendProfiles(ids: string[]): Promise<Record<string, FriendProfile>> {
  if (!ids.length) return {};
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, class_year, hours_earned, school_id, public_email")
    .in("id", ids);
  const map: Record<string, FriendProfile> = {};
  (data as Array<Omit<FriendProfile, "email"> & { public_email: string | null }> | null)?.forEach((p) => {
    map[p.id] = { ...p, email: p.public_email ?? null };
  });
  return map;
}

/** Students at my school (excluding me). Uses SECURITY DEFINER RPC that returns only non-sensitive columns. */
export async function searchClassmates(_myId: string, mySchoolId: string, q: string): Promise<FriendProfile[]> {
  if (!mySchoolId) return [];
  const { data, error } = await supabase.rpc("search_classmates" as never, { _q: q.trim() } as never);
  if (error) throw error;
  return ((data as Array<{ id: string; full_name: string | null; class_year: string | null; hours_earned: number | null; school_id: string | null; public_email: string | null }> | null) ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    class_year: p.class_year,
    hours_earned: p.hours_earned,
    school_id: p.school_id,
    email: p.public_email, // expose only opt-in public_email, never login email
  }));
}

export async function sendFriendRequest(fromId: string, toId: string) {
  // A previous request (either direction) would hit the unique constraint, so reuse it.
  const { data: existing } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .or(`and(requester_id.eq.${fromId},addressee_id.eq.${toId}),and(requester_id.eq.${toId},addressee_id.eq.${fromId})`);
  const rows = (existing as { id: string; requester_id: string; addressee_id: string; status: string }[] | null) ?? [];
  if (rows.some((r) => r.status === "accepted")) return;
  const incoming = rows.find((r) => r.requester_id === toId && r.status === "pending");
  if (incoming) { await respondToRequest(incoming.id, true); return; }
  if (rows.some((r) => r.requester_id === fromId && r.status === "pending")) return;
  for (const r of rows) {
    const { error } = await supabase.from("friendships").delete().eq("id", r.id);
    if (error) throw error;
  }
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

export type InviteResult = { invited: number; skipped: number; spots_left: number | null };

/** Server-checked invite: friendship, free spots, duplicates and re-inviting someone who declined earlier. */
export async function inviteFriendsToReservation(
  reservationId: string,
  _inviterId: string,
  friendIds: string[],
): Promise<InviteResult> {
  if (!friendIds.length) return { invited: 0, skipped: 0, spots_left: null };
  const { data, error } = await supabase.rpc("invite_friends_to_reservation" as never, { _reservation_id: reservationId, _friend_ids: friendIds } as never);
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as InviteResult | undefined;
  const result = row ?? { invited: 0, skipped: 0, spots_left: null };
  logActivity("group.invited", { entityType: "reservation", entityId: reservationId, meta: { count: result.invited } });
  return result;
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
  logActivity(accept ? "group.invite_accepted" : "group.invite_declined", { entityType: "reservation_participant", entityId: rowId });
}

/** A group member leaves a visit they accepted earlier (only before scanning in). */
export async function leaveReservation(reservationId: string, userId: string) {
  const { error } = await supabase
    .from("reservation_participants")
    .update({ status: "declined" } as any)
    .eq("reservation_id", reservationId)
    .eq("student_id", userId)
    .is("checked_in_at", null);
  if (error) throw error;
  logActivity("group.left", { entityType: "reservation", entityId: reservationId });
}

export async function listParticipants(reservationId: string): Promise<ParticipantRow[]> {
  const { data, error } = await supabase
    .from("reservation_participants")
    .select("*")
    .eq("reservation_id", reservationId);
  if (error) throw error;
  return (data as ParticipantRow[]) ?? [];
}

export type GroupInvite = {
  participant_id: string;
  reservation_id: string;
  inviter_name: string;
  org_name: string;
  task_title: string | null;
  reservation_date: string;
  start_time: string | null;
  end_time: string | null;
  hours_to_earn: number;
  going: number;
};

/** Pending group invites with inviter, organization and activity details (server-scoped to the caller). */
export async function listMyGroupInvites(): Promise<GroupInvite[]> {
  const { data, error } = await supabase.rpc("list_my_group_invites" as never);
  if (error) throw error;
  return (data as GroupInvite[] | null) ?? [];
}

export type GroupMemberRow = {
  reservation_id: string;
  member_id: string;
  full_name: string | null;
  class_year: string | null;
  status: "owner" | "pending" | "accepted";
  is_owner: boolean;
  checked_in: boolean;
};

/** Group members for the given reservations; only groups the caller belongs to (or runs) are returned. */
export async function getReservationGroups(ids: string[]): Promise<Record<string, GroupMemberRow[]>> {
  const map: Record<string, GroupMemberRow[]> = {};
  if (!ids.length) return map;
  const { data, error } = await supabase.rpc("get_reservation_groups" as never, { _ids: ids } as never);
  if (error) throw error;
  ((data as GroupMemberRow[] | null) ?? []).forEach((m) => { (map[m.reservation_id] ??= []).push(m); });
  Object.values(map).forEach((list) => list.sort((a, b) => Number(b.is_owner) - Number(a.is_owner)));
  return map;
}
