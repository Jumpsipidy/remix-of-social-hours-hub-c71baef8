import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ListChecks, QrCode, Bell, MessageCircle, User, LayoutDashboard, Building2, School } from "lucide-react";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { motion } from "framer-motion";

type TabItem = {
  to: string;
  label: string;
  short: string;
  icon: typeof Home;
  match?: (path: string) => boolean;
};

const PUBLIC_TABS: TabItem[] = [
  { to: "/", label: "Pradžia", short: "Pradžia", icon: Home, match: (p) => p === "/" },
  { to: "/tasks", label: "Užduotys", short: "Užduotys", icon: ListChecks },
  { to: "/login", label: "Prisijungti", short: "Prisijungti", icon: User },
];

const TABS_BY_ROLE: Record<AppRole, TabItem[]> = {
  student: [
    { to: "/student", label: "Pradžia", short: "Pradžia", icon: Home },
    { to: "/tasks", label: "Užduotys", short: "Užduotys", icon: ListChecks },
    { to: "/checkin", label: "QR kodas", short: "QR", icon: QrCode },
    { to: "/chat", label: "Pokalbiai", short: "Pokalbiai", icon: MessageCircle },
  ],
  organization: [
    { to: "/organization", label: "Pultas", short: "Pultas", icon: LayoutDashboard },
    { to: "/tasks", label: "Užduotys", short: "Užduotys", icon: ListChecks },
    { to: "/organization/scan", label: "Skenuoti", short: "QR", icon: QrCode },
    { to: "/chat", label: "Pokalbiai", short: "Pokalbiai", icon: MessageCircle },
  ],
  school_admin: [
    { to: "/school", label: "Mokykla", short: "Mokykla", icon: School },
    { to: "/tasks", label: "Užduotys", short: "Užduotys", icon: ListChecks },
    { to: "/chat", label: "Pokalbiai", short: "Pokalbiai", icon: MessageCircle },
  ],
  admin: [
    { to: "/admin", label: "Admin", short: "Admin", icon: LayoutDashboard },
    { to: "/admin/errors", label: "Klaidos", short: "Klaidos", icon: Bell },
    { to: "/admin/analytics", label: "Analitika", short: "Analitika", icon: LayoutDashboard, match: (p) => p.startsWith("/admin/analytics") },
    { to: "/", label: "Svetainė", short: "Svetainė", icon: Home, match: (p) => p === "/" },
  ],
};

export function MobileTabBar() {
  const { isAuthenticated, profile } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Hide bar on auth flows / admin subpages where sidebar dominates
  if (
    pathname.startsWith("/auth") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/update-password" ||
    pathname === "/verify-email" ||
    pathname.startsWith("/verify/")
  ) {
    return null;
  }

  const tabs = isAuthenticated && profile?.role ? TABS_BY_ROLE[profile.role] : PUBLIC_TABS;

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 32 }}
      className="fixed inset-x-0 bottom-0 z-40 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Pagrindinė navigacija"
    >
      <div className="mx-3 mb-3 overflow-hidden rounded-[24px] border border-white/10 bg-black/60 shadow-2xl backdrop-blur-2xl">
        <div className="grid grid-cols-4 gap-1 p-1.5">
          {tabs.slice(0, 4).map((t) => {
            const active = t.match ? t.match(pathname) : pathname === t.to;
            const Icon = t.icon;
            return (
              <Link
                key={`${t.to}-${t.label}`}
                to={t.to}
                className="group relative flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-[18px] transition-all active:scale-95 touch-manipulation"
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 z-0 bg-white/[0.08]"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                
                <div className="relative z-10 flex flex-col items-center gap-1">
                  <Icon
                    className={`h-5 w-5 transition-transform duration-300 ${
                      active ? "scale-110 text-white" : "text-white/40 group-hover:text-white/60"
                    }`}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  <span
                    className={`text-[10px] font-bold tracking-tight transition-colors duration-300 ${
                      active ? "text-white" : "text-white/40"
                    }`}
                  >
                    {t.short}
                  </span>
                </div>

                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute bottom-1.5 h-1 w-1 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}
