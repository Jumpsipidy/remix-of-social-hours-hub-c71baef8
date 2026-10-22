import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { withLoadingDeadline } from "@/lib/loading-control";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Client navigation only; protected reads/actions remain authorized by RLS
    // and server middleware. Avoid a duplicate network getUser on every link.
    const { data, error } = await withLoadingDeadline(supabase.auth.getSession());
    if (error || !data.session?.user) throw redirect({ to: "/login" });
    return { user: data.session.user };
  },
  component: () => <Outlet />,
});
