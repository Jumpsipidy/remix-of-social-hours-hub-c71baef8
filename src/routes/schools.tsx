import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy/typo path — the school admin dashboard lives at /school. */
export const Route = createFileRoute("/schools")({
  beforeLoad: () => {
    throw redirect({ to: "/school" });
  },
});
