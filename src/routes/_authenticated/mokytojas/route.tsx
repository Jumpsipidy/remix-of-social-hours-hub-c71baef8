import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { TeacherShell } from "@/components/teacher/teacher-shell";

export const Route = createFileRoute("/_authenticated/mokytojas")({
  component: TeacherLayout,
});

function TeacherLayout() {
  const { profile, loading } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-muted/30">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!profile || (profile.role !== "school_admin" && profile.role !== "admin")) {
    return <Navigate to="/" />;
  }
  return (
    <TeacherShell>
      <Outlet />
    </TeacherShell>
  );
}
