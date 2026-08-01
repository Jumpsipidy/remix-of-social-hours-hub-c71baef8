import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Menu, X, LogOut } from "lucide-react";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { NotificationBell } from "@/components/notification-bell";
import { BackgroundFX } from "@/components/background-fx";
import { OnboardingTour } from "@/components/onboarding-tour";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { AnimatePresence, motion } from "framer-motion";



const DASHBOARD_BY_ROLE: Record<AppRole, { to: string; label: string } | null> = {
  student: { to: "/student", label: "Mokinio sritis" },
  organization: { to: "/organization", label: "Organizacijos sritis" },
  school_admin: { to: "/school", label: "Mokyklos sritis" },
  admin: { to: "/admin", label: "Sistemos administracija" },
};

const ROLE_CACHE_KEY = "sv_last_role_v1";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  const [cachedRole, setCachedRole] = useState<AppRole | null>(null);

  // Cache last known role so the dashboard link stays stable across route
  // changes / hydration while useAuth is still refetching the profile.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ROLE_CACHE_KEY);
      if (raw) setCachedRole(raw as AppRole);
    } catch {}
  }, []);
  useEffect(() => {
    if (profile?.role) {
      try { localStorage.setItem(ROLE_CACHE_KEY, profile.role); } catch {}
      setCachedRole(profile.role);
    } else if (!isAuthenticated) {
      try { localStorage.removeItem(ROLE_CACHE_KEY); } catch {}
      setCachedRole(null);
    }
  }, [profile?.role, isAuthenticated]);

  const activeRole: AppRole | null = profile?.role ?? (isAuthenticated ? cachedRole : null);
  const links: { to: string; label: string }[] = [
    { to: "/", label: "Pradžia" },
    { to: "/tasks", label: "Užduotys ir organizacijos" },
  ];
  if (activeRole) {
    const dash = DASHBOARD_BY_ROLE[activeRole];
    if (dash) links.push(dash);
  }

  const handleSignOut = async () => {
    try { localStorage.removeItem(ROLE_CACHE_KEY); } catch {}
    setCachedRole(null);
    await signOut();
    setOpen(false);
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Heart className="h-4 w-4 text-primary-foreground" fill="currentColor" />
          </div>
          <span className="font-display truncate whitespace-nowrap text-base font-bold tracking-tight sm:text-lg">
            Socialinės<span className="text-gradient"> Valandos</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const tag =
              l.to === "/tasks" ? "tasks" :
              l.to === "/" ? "home" :
              "dashboard";
            return (
              <Link
                key={l.to}
                to={l.to}
                data-tour={tag}
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
                activeProps={{ className: "rounded-full px-4 py-2 text-sm font-medium bg-accent text-accent-foreground" }}
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <div data-tour="notifications" className="contents"><NotificationBell /></div>


          {isAuthenticated ? (
            <button
              onClick={handleSignOut}
              className="hidden items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground sm:inline-flex"
            >
              <LogOut className="h-4 w-4" /> Atsijungti
            </button>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground sm:inline-flex"
              >
                Prisijungti
              </Link>
              <Link
                to="/register"
                className="hidden rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 sm:inline-flex"
              >
                Registruotis
              </Link>
            </>
          )}
          <button
            className="grid h-11 w-11 place-items-center rounded-full border border-border/80 bg-background/60 backdrop-blur active:scale-95 transition md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Meniu"
            aria-expanded={open}
          >
            <motion.span key={open ? "x" : "m"} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.18 }}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </motion.span>
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 top-[64px] z-40 bg-background/70 backdrop-blur-sm md:hidden"
            />
            <motion.div
              key="drawer"
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="fixed inset-x-0 top-[64px] z-50 border-y border-border bg-background/95 backdrop-blur-xl shadow-2xl md:hidden"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
                {links.map((l, i) => (
                  <motion.div
                    key={l.to}
                    initial={{ x: -14, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.04 * i, duration: 0.25 }}
                  >
                    <Link
                      to={l.to}
                      onClick={() => setOpen(false)}
                      className="block rounded-xl px-4 py-3 text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground active:scale-[0.98] transition"
                    >
                      {l.label}
                    </Link>
                  </motion.div>
                ))}
                <div className="mt-3 flex gap-2">
                  {isAuthenticated ? (
                    <button onClick={handleSignOut} className="flex-1 rounded-full border border-border px-4 py-3 text-center text-sm font-medium active:scale-95 transition">Atsijungti</button>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setOpen(false)} className="flex-1 rounded-full border border-border px-4 py-3 text-center text-sm font-medium active:scale-95 transition">Prisijungti</Link>
                      <Link to="/register" onClick={() => setOpen(false)} className="flex-1 rounded-full bg-gradient-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground active:scale-95 transition">Registruotis</Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

export function Footer() {
  const { isAuthenticated, profile } = useAuth();
  const dash = isAuthenticated && profile ? DASHBOARD_BY_ROLE[profile.role] : null;
  return (
    <footer className="mt-24 border-t border-border bg-card/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
              <Heart className="h-4 w-4 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-display text-lg font-bold">Socialinės Valandos</span>
          </div>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            Vieninga platforma Lietuvos mokyklų moksleiviams atlikti privalomas socialines valandas šalia patikimų organizacijų.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Platforma</h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/tasks" className="hover:text-foreground">Užduotys ir organizacijos</Link></li>
            <li><Link to="/socialiniu-valandu-lapas" className="hover:text-foreground">Socialinių valandų lapas</Link></li>
            <li><Link to="/blog/kas-yra-socialines-valandos" className="hover:text-foreground">Kas yra socialinės valandos?</Link></li>
            <li><Link to="/blog/kaip-surinkti-socialines-valandas" className="hover:text-foreground">Kaip surinkti valandas</Link></li>
            {dash && (
              <li><Link to={dash.to} className="hover:text-foreground">{dash.label}</Link></li>
            )}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Paskyra ir teisė</h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {!isAuthenticated && <li><Link to="/login" className="hover:text-foreground">Prisijungti</Link></li>}
            {!isAuthenticated && <li><Link to="/register" className="hover:text-foreground">Registruotis</Link></li>}
            <li><Link to="/terms" className="hover:text-foreground font-semibold text-foreground">📜 Naudojimosi taisyklės</Link></li>
            <li><Link to="/privacy" className="hover:text-foreground font-semibold text-foreground">🔐 Privatumas ir sauga</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <span>© 2026 Socialinės Valandos. Visos teisės saugomos.</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-foreground">🔐 Privatumas</Link>
            <Link to="/terms" className="hover:text-foreground font-semibold underline underline-offset-4">Teisės ir taisyklės →</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0">
      <BackgroundFX />
      <Navbar />
      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {children}
      </motion.main>
      <Footer />
      <OnboardingTour />
      <MobileTabBar />
    </div>
  );

}
