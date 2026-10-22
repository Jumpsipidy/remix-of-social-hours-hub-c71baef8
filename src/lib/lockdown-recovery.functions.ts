import { createServerFn } from "@tanstack/react-start";

// Compatibility endpoint only. Quiet browser telemetry is not proof of safety.
// Durable scheduled health checks own technical recovery; manual/security
// lockdowns can only be cleared through the authenticated administrator flow.
export const tryLockdownAutoRecovery = createServerFn({ method: "POST" }).handler(async () => ({
  ok: true,
  skipped: "scheduled-health-only" as const,
}));