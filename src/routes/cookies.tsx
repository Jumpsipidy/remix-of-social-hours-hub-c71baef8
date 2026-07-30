import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy/marketing link target — the cookie policy lives inside the privacy page.
export const Route = createFileRoute("/cookies")({
  beforeLoad: () => {
    throw redirect({ to: "/privatumas" });
  },
});
