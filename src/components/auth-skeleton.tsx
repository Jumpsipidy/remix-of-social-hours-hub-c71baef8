import { AuthLoadingContent } from "@/components/auth-loading-content";

/** Pending view rendered inside the persistent auth frame; mirrors the form geometry. */
export function AuthSkeleton({ mode = "login" }: { mode?: "login" | "register" }) {
  return <AuthLoadingContent mode={mode} />;
}
