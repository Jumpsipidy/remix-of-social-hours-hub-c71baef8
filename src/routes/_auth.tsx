import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth-shell";

/** Login and register share this frame, so switching never remounts the blue panel. */
export const Route = createFileRoute("/_auth")({
  component: () => (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  ),
});
