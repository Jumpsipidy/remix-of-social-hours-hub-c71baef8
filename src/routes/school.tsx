import { createFileRoute, Navigate } from "@tanstack/react-router";

// Senoji mokyklos administravimo vieta perkelta į atskirą auklėtojo sritį.
export const Route = createFileRoute("/school")({
  head: () => ({
    meta: [
      { title: "Auklėtojo sritis — Socialinės Valandos" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <Navigate to="/mokytojas" replace />,
});
