import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import { SchoolClaimPanel } from "@/components/school-claim-panel";
import { schoolSnapshotQuery, useSchoolData } from "@/components/teacher/use-school-data";

export const Route = createFileRoute("/_authenticated/mokytojas")({
  // Duomenys pradedami krauti iš karto – visi vaikiniai puslapiai dalijasi talpykla.
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(schoolSnapshotQuery);
  },
  component: TeacherLayout,
});

function TeacherLayout() {
  const { profile, loading } = useAuth();
  const { data, refresh } = useSchoolData();
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
  // Paskyra be priskirtos mokyklos: rodome mokyklos priskyrimo vedlį vietoj tuščio skydelio.
  if (data?.scope.unscoped) {
    return (
      <TeacherShell>
        <div className="mx-auto max-w-2xl pt-6">
          <SchoolClaimPanel onClaimed={() => void refresh()} />
        </div>
      </TeacherShell>
    );
  }
  return (
    <TeacherShell>
      <Outlet />
    </TeacherShell>
  );
}
