import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  { to: "/admin/audit", label: "Auditas (log)", icon: Activity },
  { to: "/admin/accounts", label: "Kurti paskyras", icon: UserPlus },
  { to: "/admin/manage", label: "Valdyti paskyras", icon: Users },
  { to: "/admin/schools", label: "Mokyklos & kodai", icon: GraduationCap },
  { to: "/admin/messages", label: "Žinučių auditas", icon: MessageSquare },
  { to: "/admin/bugs", label: "Bug pranešimai", icon: Bug },
  { to: "/admin/lockdown", label: "🔒 Lockdown", icon: Lock },
  { to: "/admin/tools", label: "Įrankiai", icon: Wrench },
];

function AdminLayout() {
  const { user, profile, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  // Lock body scroll while mobile sheet is open (must run before any early return)
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);


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

  const NavList = ({ onClick, compact = false }: { onClick?: () => void; compact?: boolean }) => (
    <nav className={`flex flex-col ${compact ? "gap-1" : "gap-1"}`}>
      {NAV.map((item) => {
        const active = isActive(item.to, item.exact);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClick}
            resetScroll={false}
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
            onClick={() => setMobileOpen(true)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card/70 backdrop-blur"
            aria-label="Meniu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm lg:hidden"
              />
              <motion.aside
                key="sheet"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 260, damping: 30 }}
                className="fixed left-0 top-0 z-[81] flex h-full w-[86%] max-w-[320px] flex-col border-r border-border bg-card p-4 shadow-2xl lg:hidden"
              >
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Super Admin</p>
                      <p className="truncate text-[11px] text-muted-foreground">{profile.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label="Uždaryti meniu"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex-1 overflow-y-auto pr-1">
                  <NavList onClick={() => setMobileOpen(false)} compact />
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

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

