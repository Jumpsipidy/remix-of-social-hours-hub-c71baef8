import { AuthShell } from "@/components/auth-shell";

/** Same frame, brand and switch as the form, with genuine pending placeholders. */
export function AuthSkeleton({ mode = "login" }: { mode?: "login" | "register" }) {
  return <AuthShell mode={mode} loading />;
}
