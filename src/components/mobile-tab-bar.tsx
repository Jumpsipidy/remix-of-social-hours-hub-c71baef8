import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ListChecks, QrCode, Bell, User, LayoutDashboard, Building2, School } from "lucide-react";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { motion } from "framer-motion";

type TabItem = {
  to: string;
  label: string;
  icon: typeof Home;
  match?: (path: string) => boolean;
};

const PUBLIC_TABS: TabItem[] = [
  { to: "/", label: "Pradžia", icon: Home, match: (p) => p === "/" },
  { to: "/tasks", label: "Užduotys", icon: ListChecks },
  { to: "/login", label: "Prisijungti", icon: User },
];

const TABS_BY_ROLE: Record<AppRole, TabItem[]> = {
  student: [
    { to: "/student", label: "Pradžia", icon: Home },
    { to: "/tasks", label: "Užduotys", icon: ListChecks },
    { to: "/checkin", label: "QR", icon: QrCode },
    { to: "/student", label: "Skelbimai", icon: Bell, match: (p) => p.startsWith("/student") },
  ],
  organization: [
    { to: "/organization", label: "Pultas", icon: LayoutDashboard },
    { to: "/tasks", label: "Užduotys", icon: ListChecks },
    { to: "/organization/scan", label: "Skanuoti", icon: QrCode },
    { to: "/organization", label: "Org", icon: Building2, match: (p) => p.startsWith("/organization") },
  ],
  school_admin: [
    { to: "/school", label: "Mokykla", icon: School },
    { to: "/tasks", label: "Užduotys", icon: ListChecks },
    { to: "/school", label: "Auditas", icon: LayoutDashboard, match: (p) => p.startsWith("/school") },
  ],
  admin: [
    { to: "/admin", label: "Admin", icon: LayoutDashboard },
    { to: "/admin/errors", label: "Klaidos", icon: Bell },
    { to: "/admin/analytics", label: "Analitika", icon: LayoutDashboard, match: (p) => p.startsWith("/admin/analytics") },
    { to: "/", label: "Svetainė", icon: Home, match: (p) => p === "/" },
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
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="fixed inset-x-0 bottom-0 z-40 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Pagrindinė navigacija"
    >
      <div className="mx-2 mb-2 rounded-2xl border border-border/70 bg-background/85 shadow-2xl backdrop-blur-xl">
        <div className="grid grid-cols-4 gap-0.5 px-1 py-1">
          {tabs.slice(0, 4).map((t) => {
            const active = t.match ? t.match(pathname) : pathname === t.to;
            const Icon = t.icon;
            return (
              <Link
                key={`${t.to}-${t.label}`}
                to={t.to}
                className="relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition active:scale-95"
              >
                {active && (
                  <motion.span
                    layoutId="tab-active"
                    className="absolute inset-0 rounded-xl bg-gradient-primary/15 border border-primary/30"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                <Icon
                  className={`relative h-5 w-5 shrink-0 transition ${active ? "text-primary" : "text-muted-foreground"}`}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span
                  className={`relative truncate leading-none ${active ? "text-primary" : "text-muted-foreground"}`}
                >
                  {t.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}
