import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SendInput = z.object({
  userIds: z.array(z.string().uuid()).optional(),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(400),
  url: z.string().max(300).optional(),
  tag: z.string().max(60).optional(),
});

/**
 * Send push to specific users. Admin-only.
 * If userIds is omitted, sends to caller (used for the "send test" button).
 */
export const sendPushToUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => SendInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let recipients: string[];
    if (!data.userIds || data.userIds.length === 0) {
      recipients = [userId];
    } else {
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (!isAdmin) throw new Error("Forbidden");
      recipients = data.userIds;
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendWebPush } = await import("@/lib/webpush.server");

    const { data: subs, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth_key")
      .in("user_id", recipients);
    if (error) throw new Error(error.message);

    const payload = {
      title: data.title,
      body: data.body,
      url: data.url || "/",
      tag: data.tag || `sv-${Date.now()}`,
    };

    const results = await Promise.all(
      (subs || []).map((s) =>
        (async () => {
          const r = await sendWebPush(
            { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth_key },
            payload,
          );
          if (r.status === 404 || r.status === 410) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("id", s.id);
          } else if (r.ok) {
            await supabaseAdmin
              .from("push_subscriptions")
              .update({ last_used_at: new Date().toISOString() })
              .eq("id", s.id);
          }
          return r;
        })(),
      ),
    );

    const sent = results.filter((r) => r.ok).length;
    const failed = results.length - sent;
    return { total: results.length, sent, failed };
  });
