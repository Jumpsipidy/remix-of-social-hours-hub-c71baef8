import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const sentryServerTestError = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Tik administratoriai");
    const Sentry = await import("@sentry/tanstackstart-react");
    const eventId = Sentry.captureException(
      new Error(`Sentry testinė klaida (serveris) ${new Date().toISOString()}`),
      { tags: { sv_test: "true", side: "server" } },
    );
    await Sentry.flush(3000);
    return { eventId };
  });
