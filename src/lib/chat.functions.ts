import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Email the other conversation members about a new message. Throttled: a
 * recipient gets at most one email per room per 30 minutes. Respects
 * email_preferences.new_message.
 */
export const notifyNewMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v) => z.object({ roomId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isMember } = await (supabaseAdmin.rpc as any)("is_chat_room_member", { _room_id: data.roomId, _user_id: context.userId });
    if (!isMember) return { skipped: "forbidden" };
    const { data: room } = await supabaseAdmin.from("chat_rooms").select("student_id, organization_id, school_admin_id").eq("id", data.roomId).maybeSingle();
    if (!room) return { skipped: "no_room" };
    const { data: recent } = await supabaseAdmin.from("messages").select("sender_id, created_at")
      .eq("chat_room_id", data.roomId).eq("sender_id", context.userId)
      .gte("created_at", new Date(Date.now() - 30 * 60_000).toISOString()).limit(3);
    if ((recent?.length ?? 0) > 1) return { skipped: "throttled" };

    const ids = [room.student_id, room.organization_id, room.school_admin_id].filter((x): x is string => !!x && x !== context.userId);
    if (!ids.length) return { sent: 0 };
    const [{ data: people }, { data: prefs }, { data: me }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, full_name").in("id", ids),
      supabaseAdmin.from("email_preferences").select("user_id, new_message").in("user_id", ids),
      supabaseAdmin.from("profiles").select("full_name, organization_name").eq("id", context.userId).maybeSingle(),
    ]);
    const sender = (me as any)?.organization_name || me?.full_name || "Naudotojas";
    const { sendResendEmail } = await import("./email.functions");
    const { APP_URL } = await import("./email-templates/_shell");
    let sent = 0;
    for (const p of people ?? []) {
      if (!p.email) continue;
      if (prefs?.find((x) => x.user_id === p.id)?.new_message === false) continue;
      const link = `${APP_URL}/chat?room=${data.roomId}`;
      const { renderShell } = await import("./email-templates/_shell");
      const html = renderShell({ title: "Nauja žinutė", preview: `${sender} parašė tau žinutę`, accent: "indigo", eyebrow: "Nauja žinutė", medallionEmoji: "💬", heading: "Tau parašė žinutę", bodyHtml: `<b>${escapeHtml(sender)}</b> parašė tau žinutę Socialinėse Valandose. Atsakyk, kol pokalbis aktualus — žinutės ištrinamos po 12 dienų.`, ctaLabel: "Atidaryti pokalbį", ctaHref: link });
      try { await sendResendEmail(p.email, `💬 Nauja žinutė nuo ${sender}`, html, { text: `${sender} parašė tau žinutę: ${link}`, tag: "new-message" }); sent++; }
      catch (e) { console.error("[chat] email failed", e); }
    }
    return { sent };
  });

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
