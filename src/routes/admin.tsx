import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PageShell } from "../components/layout";
import { useAuth } from "@/hooks/use-auth";
import { AdminAurora } from "@/components/admin/admin-ui";
import { AdminMobileBoot } from "@/components/admin/mobile-boot";
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
  MoreHorizontal,
  AlertTriangle,
  ScanLine,
  Send,
  Gauge,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Sistemos administracija — Socialinės Valandos" }] }),
  component: AdminLayout,
});

type NavItem = { to: string; label: string; short?: string; icon: typeof Shield; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/admin", label: "Apžvalga", short: "Apžv.", icon: LayoutDashboard, exact: true },
  { to: "/admin/analytics", label: "Analitika", short: "Analitika", icon: BarChart3 },
  { to: "/admin/reservations", label: "Rezervacijos", short: "Rez.", icon: CalendarClock },
  { to: "/admin/leaderboard", label: "Reitingas", short: "Reit.", icon: Trophy },
  { to: "/admin/organizations", label: "Organizacijos", icon: Building2 },
  { to: "/admin/activity", label: "Aktyvumas", icon: Activity },
  { to: "/admin/audit", label: "Auditas (log)", icon: Activity },
  { to: "/admin/accounts", label: "Kurti paskyras", icon: UserPlus },
  { to: "/admin/manage", label: "Valdyti paskyras", icon: Users },
  { to: "/admin/schools", label: "Mokyklos & kodai", icon: GraduationCap },
  { to: "/admin/messages", label: "Žinučių auditas", icon: MessageSquare },
  { to: "/admin/bugs", label: "Bug pranešimai", icon: Bug },
  { to: "/admin/errors", label: "Klaidos (live)", icon: AlertTriangle },
  { to: "/admin/autofix", label: "⚡ Auto-Fix Feed", icon: Sparkles },
  { to: "/admin/notfound", label: "404 diagnostika", icon: AlertTriangle },
  { to: "/admin/performance", label: "Performance", icon: Gauge },
  { to: "/admin/lockdown", label: "🔒 Lockdown", icon: Lock },
  { to: "/admin/checkin", label: "QR įsiregistravimai", icon: ScanLine },
  { to: "/admin/emails", label: "El. laiškai", icon: Mail },
  { to: "/admin/push", label: "Push pranešimai", icon: Send },
  { to: "/admin/tools", label: "Įrankiai", icon: Wrench },
];

// primary bottom-nav items on mobile (5 max)
const MOBILE_PRIMARY = ["/admin", "/admin/analytics", "/admin/reservations", "/admin/leaderboard"];

function AdminLayout() {
  const { user, profile, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);

  // close mobile sheet on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

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

  const currentLabel = NAV.find((n) => isActive(n.to, n.exact))?.label ?? "Valdymo skydas";

  const NavList = ({ onClick, compact = false }: { onClick?: () => void; compact?: boolean }) => (
    <nav className="flex flex-col gap-1">
      {NAV.map((item, i) => {
        const active = isActive(item.to, item.exact);
        const Icon = item.icon;
        return (
          <motion.div
            key={item.to}
            initial={compact ? { opacity: 0, x: -12 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: compact ? i * 0.022 : 0, type: "spring", stiffness: 380, damping: 32 }}
          >
            <Link
              to={item.to}
              onClick={onClick}
              resetScroll={false}
              className={`group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium transition-colors will-change-transform ${
                active
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="admin-nav-active"
                  className="absolute inset-0 -z-10 rounded-xl bg-gradient-primary shadow-glow"
                  transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.6 }}
                />
              )}
              {!active && (
                <span className="pointer-events-none absolute inset-y-0 left-0 w-0.5 origin-center scale-y-0 rounded-r-full bg-primary/70 transition-transform duration-300 group-hover:scale-y-100" />
              )}
              <Icon className={`h-4 w-4 shrink-0 transition-transform duration-300 ${active ? "" : "group-hover:scale-110 group-hover:text-primary"}`} />
              <span className="truncate">{item.label}</span>
              {active && (
                <motion.span
                  layoutId="admin-nav-dot"
                  className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-foreground/90 shadow-[0_0_8px_hsl(var(--primary-foreground))]"
                />
              )}
            </Link>
          </motion.div>
        );
      })}
    </nav>
  );

  return (
    <PageShell>
      <AdminAurora />
      <AdminMobileBoot />
      <div className="mx-auto max-w-7xl px-3 sm:px-6">

        {/* Mobile top bar */}
        <div className="sticky top-14 z-40 -mx-3 flex items-center gap-3 border-b border-border/60 bg-background/85 px-3 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:hidden">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setMobileOpen(true)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card/80"
            aria-label="Meniu"
          >
            <Menu className="h-4 w-4" />
          </motion.button>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-primary">Super Admin</p>
            <motion.p
              key={currentLabel}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="truncate font-display text-base font-bold tracking-tight"
            >
              {currentLabel}
            </motion.p>
          </div>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
            <Shield className="h-4 w-4" />
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm lg:hidden"
              />
              <motion.aside
                key="sheet"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 34, mass: 0.7 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragEnd={(_, info) => { if (info.offset.x < -80) setMobileOpen(false); }}
                className="fixed left-0 top-0 z-[81] flex h-full w-[86%] max-w-[320px] flex-col border-r border-border bg-card/95 p-4 shadow-2xl lg:hidden"
              >
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <motion.div
                      initial={{ rotate: -12, scale: 0.8 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow"
                    >
                      <Shield className="h-4 w-4" />
                    </motion.div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Super Admin</p>
                      <p className="truncate text-[11px] text-muted-foreground">{profile.email}</p>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setMobileOpen(false)}
                    className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label="Uždaryti meniu"
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                </div>
                <div className="mt-3 flex-1 overflow-y-auto overscroll-contain pr-1">
                  <NavList onClick={() => setMobileOpen(false)} compact />
                </div>
                <p className="mt-3 border-t border-border pt-2 text-center text-[10px] text-muted-foreground">
                  Perbrauk kairėn kad uždarytum
                </p>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <div className="grid gap-6 pb-28 pt-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:py-10 lg:pb-16">
          <aside className="sticky top-24 hidden h-fit overflow-hidden rounded-2xl border border-border bg-card/70 p-4 shadow-md backdrop-blur-xl lg:block">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="mb-4 flex items-center gap-2 px-1">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
                <Shield className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Super Admin</p>
                <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
              </div>
            </div>
            <NavList />
          </aside>

          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile bottom nav */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
          aria-label="Admin greitas meniu"
        >
          <div className="mx-auto grid max-w-7xl grid-cols-5 gap-1 px-2 py-1.5">
            {MOBILE_PRIMARY.map((to) => {
              const item = NAV.find((n) => n.to === to)!;
              const active = isActive(item.to, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={to}
                  to={to}
                  resetScroll={false}
                  className={`relative flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-semibold transition-colors ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="admin-mobile-active"
                      className="absolute inset-x-2 top-1 h-8 rounded-lg bg-gradient-primary shadow-glow"
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    />
                  )}
                  <span className={`relative z-10 grid h-8 w-8 place-items-center ${active ? "text-primary-foreground" : ""}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="relative z-10 truncate">{item.short ?? item.label}</span>
                </Link>
              );
            })}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileOpen(true)}
              className="flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-semibold text-muted-foreground"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card/70">
                <MoreHorizontal className="h-4 w-4" />
              </span>
              <span>Daugiau</span>
            </motion.button>
          </div>
        </nav>
      </div>
    </PageShell>
  );
}
