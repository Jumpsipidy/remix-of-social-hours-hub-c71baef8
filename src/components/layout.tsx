import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Menu, LogOut, Home, ListTodo, MessageCircle, LayoutDashboard, History } from "lucide-react";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { NotificationBell } from "@/components/notification-bell";
import { SchoolEyesToggle } from "@/components/school-eyes-toggle";
import { BackgroundFX } from "@/components/background-fx";
import { OnboardingTour } from "@/components/onboarding-tour";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AnimatePresence, motion } from "framer-motion";
import { Magnetic } from "@/components/motion-kit";



export const DASHBOARD_BY_ROLE: Record<AppRole, { to: string; label: string } | null> = {
  student: { to: "/student", label: "Mokinio sritis" },
  organization: { to: "/organization", label: "Organizacijos sritis" },
  school_admin: { to: "/school", label: "Mokyklos sritis" },
  admin: { to: "/admin", label: "Sistemos administracija" },
};

const ROLE_CACHE_KEY = "sv_last_role_v1";
const ROLE_CACHE_UID_KEY = "sv_last_role_uid_v1";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [easterEgg, setEasterEgg] = useState(false);
  const { isAuthenticated, profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string, exact: boolean) => 
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  const [cachedRole, setCachedRole] = useState<AppRole | null>(null);

  // Cache last known role so the dashboard link stays stable across route
  // changes / hydration while useAuth is still refetching the profile.
  // SECURITY: the cache is bound to the user id it was written for. Without
  // that binding a previously signed-in admin left "admin" in localStorage and
  // the next (student) account briefly saw the "Sistemos administracija" link.
  useEffect(() => {
    if (!user?.id) { setCachedRole(null); return; }
    try {
      const raw = localStorage.getItem(ROLE_CACHE_KEY);
      const uid = localStorage.getItem(ROLE_CACHE_UID_KEY);
      if (raw && uid === user.id) setCachedRole(raw as AppRole);
      else {
        localStorage.removeItem(ROLE_CACHE_KEY);
        localStorage.removeItem(ROLE_CACHE_UID_KEY);
        setCachedRole(null);
      }
    } catch {}
  }, [user?.id]);
  useEffect(() => {
    if (profile?.role && user?.id) {
      try {
        localStorage.setItem(ROLE_CACHE_KEY, profile.role);
        localStorage.setItem(ROLE_CACHE_UID_KEY, user.id);
      } catch {}
      setCachedRole(profile.role);
    } else if (!isAuthenticated) {
      try {
        localStorage.removeItem(ROLE_CACHE_KEY);
        localStorage.removeItem(ROLE_CACHE_UID_KEY);
      } catch {}
      setCachedRole(null);
    }
  }, [profile?.role, isAuthenticated, user?.id]);

  const activeRole: AppRole | null = profile?.role ?? (isAuthenticated ? cachedRole : null);
  const links: { to: string; label: string }[] = [
    { to: "/", label: "Pradžia" },
    { to: "/tasks", label: "Užduotys ir organizacijos" },
  ];
  if (activeRole) {
    const dash = DASHBOARD_BY_ROLE[activeRole];
    if (dash) links.push(dash);
    if (activeRole !== "admin") links.push({ to: "/chat", label: "Pokalbiai" });
  }

  const handleSignOut = async () => {
    try { localStorage.removeItem(ROLE_CACHE_KEY); } catch {}
    setCachedRole(null);
    await signOut();
    setOpen(false);
    navigate({ to: "/" });
  };

  // We no longer hide the top bar globally in /admin. 
  // It provides essential navigation and account state.
  // const isAdminSection = pathname.startsWith("/admin");
  // if (isAdminSection) return null;

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl group/header">
      {/* Animated gradient top border */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-primary opacity-30" />
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-3 sm:px-6 md:flex md:justify-between md:gap-6 md:py-4 lg:py-5">
        <Link 
          to="/" 
          className="group flex min-w-0 items-center gap-3 active:scale-95 transition-transform"
        >
          <motion.div 
            onClick={() => {
              const next = clickCount + 1;
              if (next >= 4) {
                setClickCount(0);
                setEasterEgg(true);
                setTimeout(() => setEasterEgg(false), 2000);
              } else {
                setClickCount(next);
              }
            }}
            animate={easterEgg ? {
              rotateY: [0, 360, 720],
              rotateX: [0, -20, 20, -20, 0],
              scale: [1, 1.3, 1],
              transition: { duration: 1.2, ease: "easeInOut" }
            } : {
              scale: clickCount > 0 ? 1 + clickCount * 0.05 : 1,
              rotateY: 0,
              rotateX: 0
            }}
            whileHover={{ 
              scale: 1.1 
            }}
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-primary shadow-glow ring-1 ring-white/10 group-hover:shadow-primary/40 transition-shadow cursor-pointer"
            style={{ transformStyle: "preserve-3d" }}
          >
            <Heart className="h-5 w-5 text-primary-foreground" fill="currentColor" />
            <div className="absolute -inset-1 -z-10 rounded-2xl bg-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            {/* Easter Egg Particles */}
            <AnimatePresence>
              {(easterEgg || clickCount > 0) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute -inset-8 pointer-events-none"
                >
                  {[...Array(easterEgg ? 12 : clickCount * 2)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute h-1.5 w-1.5 bg-primary rounded-full"
                      animate={{
                        y: [-10, -60],
                        x: [0, (Math.random() - 0.5) * 80],
                        opacity: [0, 1, 0],
                        scale: [0, 1.5, 0],
                        rotate: [0, 180]
                      }}
                      transition={{
                        duration: easterEgg ? 1.5 : 0.8,
                        delay: i * 0.05
                      }}
                      style={{ left: "50%", top: "50%" }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          <span className="font-display truncate whitespace-nowrap text-sm font-extrabold sm:text-xl lg:text-2xl">
            Socialinės<span className="text-gradient"> Valandos</span>
            <div 
              className="absolute -right-6 -top-1 px-1.5 py-0.5 rounded-full bg-primary/20 text-[8px] font-black tracking-widest text-primary border border-primary/20"
            >
              BETA
            </div>
          </span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {links.map((l) => {
            const active = isActive(l.to, l.to === "/");
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`relative px-5 py-2.5 text-sm font-bold tracking-tight transition-all active:scale-95 group/nav ${
                  active 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="relative z-10">{l.label}</span>
                {!active && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 -z-0 bg-white/5 rounded-full blur-sm"
                  />
                )}
                {active && (
                  <motion.div 
                    layoutId="nav-glow"
                    className="absolute inset-x-2 -bottom-1 h-[2px] rounded-full bg-gradient-primary shadow-[0_0_8px_hsl(var(--primary))]"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <SchoolEyesToggle />
           <div className="shrink-0">
            <NotificationBell />
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSignOut}
                className="hidden items-center gap-2 rounded-2xl border border-border/60 bg-card/50 px-5 py-2.5 text-sm font-bold text-muted-foreground hover:bg-accent hover:text-foreground active:scale-95 transition-all sm:inline-flex"
              >
                <LogOut className="h-4 w-4" /> Atsijungti
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="hidden rounded-2xl px-5 py-2.5 text-sm font-bold text-muted-foreground hover:bg-white/5 hover:text-foreground active:scale-95 transition-all sm:inline-flex"
              >
                Prisijungti
              </Link>
              <Magnetic strength={10}>
                <Link
                  to="/register"
                  className="group/btn relative hidden items-center justify-center overflow-hidden rounded-2xl bg-gradient-primary px-6 py-2.5 text-sm font-extrabold text-primary-foreground shadow-glow active:scale-95 transition-all sm:inline-flex"
                >
                  <span className="relative z-10">Registruotis</span>
                  <motion.div 
                    className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity"
                    initial={false}
                  />
                  <div className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                </Link>
              </Magnetic>
            </div>
          )}
          <Button
            variant="outline" size="icon"
            className="h-11 w-11 shrink-0 md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Meniu"
            aria-expanded={open}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="mobile-sidebar flex w-[min(86vw,340px)] flex-col overflow-y-auto border-border bg-background px-4 pb-safe pt-12">
          <SheetTitle className="text-left">Socialinės Valandos</SheetTitle>
          <SheetDescription className="text-left">{profile?.full_name ?? "Tavo savanorystės erdvė"}</SheetDescription>
          <nav aria-label="Šoninis meniu" className="mt-5 flex flex-1 flex-col gap-2">
            {links.map((link) => {
              const Icon = link.to === "/" ? Home : link.to === "/tasks" ? ListTodo : link.to === "/chat" ? MessageCircle : LayoutDashboard;
              const active = isActive(link.to, link.to === "/");
              return <Button key={link.to} variant={active ? "secondary" : "ghost"} asChild className="h-auto min-h-12 justify-start whitespace-normal px-3 py-3 text-left"><Link to={link.to} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}><Icon /><span className="min-w-0">{link.label}</span></Link></Button>;
            })}
            <Button variant="ghost" asChild className="h-12 justify-start"><Link to="/versijos" onClick={() => setOpen(false)}><History /> Kas naujo</Link></Button>
          </nav>
          <div className="mt-6 space-y-4 border-t border-border pt-4">
            <SchoolEyesToggle className="w-full justify-start [&_span]:inline" />
            {isAuthenticated ? <Button variant="outline" className="h-12 w-full" onClick={handleSignOut}><LogOut /> Atsijungti</Button> : <div className="grid grid-cols-2 gap-2"><Button variant="outline" asChild><Link to="/login" onClick={() => setOpen(false)}>Prisijungti</Link></Button><Button asChild><Link to="/register" onClick={() => setOpen(false)}>Registruotis</Link></Button></div>}
          </div>
        </SheetContent>
      </Sheet>
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
            <li><Link to="/savanoryste-seduvoje" className="hover:text-foreground">Savanorystė Šeduvoje</Link></li>
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
            <li><Link to="/saugumas" className="hover:text-foreground">🛡️ Kaip saugome mokinių duomenis</Link></li>
            <li><Link to="/versijos" className="hover:text-foreground">🚀 Versijų istorija</Link></li>
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDashboard = pathname !== "/" && (
    pathname.startsWith("/student") || 
    pathname.startsWith("/organization") || 
    pathname.startsWith("/school") || 
    pathname.startsWith("/admin")
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden pt-[72px] pb-safe md:pb-0 selection:bg-primary/30 selection:text-primary-foreground">
      <BackgroundFX isDashboard={isDashboard} />
      <Navbar />
      <main>
        {children}
      </main>
      <Footer />
      <OnboardingTour />
    </div>
  );

}
