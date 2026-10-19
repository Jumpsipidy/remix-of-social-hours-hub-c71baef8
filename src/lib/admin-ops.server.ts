// Server-only implementations of destructive Super Admin operations.
// Only reachable through runLicensedAdminAction after a licence-confirmed ticket.
type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

export async function deleteAccountOp(sb: Admin, id: string) {
  const { data: profile } = await sb.from("profiles").select("role, email").eq("id", id).maybeSingle();
  const p = profile as { role?: string; email?: string | null } | null;
  if (p?.role === "organization") {
    const { data: tasks } = await sb.from("tasks").select("id").eq("organization_id", id);
    const taskIds = (tasks ?? []).map((t) => t.id);
    if (taskIds.length) {
      await sb.from("reservations").delete().in("task_id", taskIds);
      await sb.from("tasks").delete().in("id", taskIds);
    }
  }
  await sb.from("messages").delete().eq("sender_id", id);
  await sb.from("chat_rooms").delete().or(`student_id.eq.${id},organization_id.eq.${id},school_admin_id.eq.${id}`);
  await sb.from("reservations").delete().or(`student_id.eq.${id},organization_id.eq.${id}`);
  await sb.from("tasks").delete().eq("organization_id", id);
  await sb.from("user_achievements").delete().eq("user_id", id);
  await sb.from("friendships").delete().or(`requester_id.eq.${id},addressee_id.eq.${id}`);
  await sb.from("dm_messages").delete().eq("sender_id", id);
  await sb.from("dm_rooms").delete().or(`user_a.eq.${id},user_b.eq.${id}`);
  await sb.from("certificates").delete().eq("student_id", id);
  try { await sb.from("bug_reports").delete().eq("reporter_user_id", id); } catch { /* best effort */ }
  if (p?.email) {
    try { await sb.from("organization_access_requests").delete().eq("contact_email", p.email); } catch { /* best effort */ }
  }
  await sb.from("profiles").delete().eq("id", id);
  const { error } = await sb.auth.admin.deleteUser(id);
  if (error && !/not.*found/i.test(error.message)) throw new Error(error.message);
  return { ok: true };
}
