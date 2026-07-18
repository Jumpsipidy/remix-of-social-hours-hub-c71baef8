import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "../components/layout";
import { useAuth } from "@/hooks/use-auth";
import {
  Shield,
  LayoutDashboard,
  Building2,
  Activity,
  UserPlus,
  Users,
  GraduationCap,
  MessageSquare,
  Bug,
  Wrench,
  Menu,
  X,
  CalendarClock,
  Trophy,
  BarChart3,
  Lock,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Sistemos administracija — Socialinės Valandos" }] }),
  component: AdminLayout,
});

type NavItem = { to: string; label: string; icon: typeof Shield; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/admin", label: "Apžvalga", icon: LayoutDashboard, exact: true },
  { to: "/admin/analytics", label: "Analitika", icon: BarChart3 },
  { to: "/admin/reservations", label: "Rezervacijos", icon: CalendarClock },
  { to: "/admin/leaderboard", label: "Reitingas", icon: Trophy },
  { to: "/admin/organizations", label: "Organizacijos", icon: Building2 },
  { to: "/admin/activity", label: "Aktyvumas", icon: Activity },
  { to: "/admin/accounts", label: "Kurti paskyras", icon: UserPlus },
  { to: "/admin/manage", label: "Valdyti paskyras", icon: Users },
  { to: "/admin/schools", label: "Mokyklos & kodai", icon: GraduationCap },
  { to: "/admin/messages", label: "Žinučių auditas", icon: MessageSquare },
  { to: "/admin/bugs", label: "Bug pranešimai", icon: Bug },
  { to: "/admin/tools", label: "Įrankiai", icon: Wrench },
];

function AdminLayout() {
  const { user, profile, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  if (loading) {
    return (
      <PageShell>
        <div className="p-20 text-center text-muted-foreground">Kraunama…</div>
      </PageShell>
    );
  }
  if (!user || profile?.role !== "admin") {
    return (
      <PageShell>
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Reikia sistemos administratoriaus teisių</h1>
          <p className="mt-2 text-sm text-muted-foreground">Prisijunk su Super Admin paskyra.</p>
          <Link
            to="/login"
            className="mt-6 inline-flex rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Prisijungti
          </Link>
        </div>
      </PageShell>
    );
  }

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to || pathname === `${to}/` : pathname === to || pathname.startsWith(`${to}/`);

  const NavList = ({ onClick }: { onClick?: () => void }) => (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = isActive(item.to, item.exact);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClick}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-3 sm:px-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-4 lg:hidden">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
              Super Admin
            </p>
            <h1 className="mt-1 truncate font-display text-xl font-bold tracking-tight">Valdymo skydas</h1>
          </div>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card/70 backdrop-blur"
            aria-label="Meniu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="mb-4 rounded-2xl border border-border bg-card/80 p-3 shadow-md backdrop-blur lg:hidden">
            <NavList onClick={() => setMobileOpen(false)} />
          </div>
        )}

        <div className="grid gap-6 pb-16 lg:grid-cols-[240px_minmax(0,1fr)] lg:py-10">
          <aside className="sticky top-24 hidden h-fit rounded-2xl border border-border bg-card/70 p-4 shadow-md backdrop-blur lg:block">
            <div className="mb-4 flex items-center gap-2 px-1">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
                <Shield className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                  Super Admin
                </p>
                <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
              </div>
            </div>
            <NavList />
          </aside>

          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
