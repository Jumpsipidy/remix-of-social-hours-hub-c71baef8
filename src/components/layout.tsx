import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Menu, LogOut, Home, ListTodo, MessageCircle, LayoutDashboard, History, QrCode, ChevronDown, UserRound, ShieldCheck, Settings2 } from "lucide-react";
import { useSiteTheme } from "@/components/theme-provider";
import { useVisualViewport } from "@/hooks/use-visual-viewport";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { NotificationBell } from "@/components/notification-bell";
import { SchoolEyesToggle } from "@/components/school-eyes-toggle";
import { BackgroundFX } from "@/components/background-fx";
import { OnboardingTour } from "@/components/onboarding-tour";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { NavCommand } from "@/components/nav-command";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";



export const DASHBOARD_BY_ROLE: Record<AppRole, { to: string; label: string } | null> = {
  student: { to: "/student", label: "Mokinio sritis" },
  organization: { to: "/organization", label: "Organizacijos sritis" },
  school_admin: { to: "/mokytojas", label: "Auklėtojo sritis" },
  admin: { to: "/admin", label: "Sistemos administracija" },
};

const ROLE_CACHE_KEY = "sv_last_role_v1";
const ROLE_CACHE_UID_KEY = "sv_last_role_uid_v1";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { openSettings } = useSiteTheme();
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
    if (activeRole !== "admin") links.push({ to: activeRole === "school_admin" ? "/mokytojas/pokalbiai" : "/chat", label: "Pokalbiai" });
    if (activeRole === "student") links.push({ to: "/checkin", label: "Mano QR kodas" });
    if (activeRole === "organization") links.push({ to: "/organization/scan", label: "Skenuoti QR kodą" });
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

  const [scrolled, setScrolled] = useState(false);
  const [egg, setEgg] = useState(false);
  const [taps, setTaps] = useState(0);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  // Secret: tap the logo 5 times quickly.
  const onLogo = () => {
    const n = taps + 1;
    setTaps(n);
    window.setTimeout(() => setTaps(0), 1500);
    if (n >= 5) { setTaps(0); setEgg(true); toast("💙 Ačiū, kad padedi bendruomenei!"); window.setTimeout(() => setEgg(false), 700); }
  };

  return (
    <header className={`site-navbar nav-redesign sticky top-0 z-50 border-b bg-background/95 ${scrolled ? "is-scrolled border-border shadow-sm" : "border-border/60"}`}>
      <div className="nav-inner mx-auto flex h-[72px] max-w-7xl min-w-0 items-center gap-3 px-4 sm:px-6">
        <Link to="/" onClick={onLogo} className="nav-brand group flex shrink-0 items-center gap-2.5" aria-label="Socialinės Valandos — pradžia">
          <span className={`nav-logo grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground ${egg ? "logo-celebrate" : ""}`}>
            <Heart className="h-5 w-5" fill="currentColor" />
          </span>
          <span className="brand-wordmark hidden leading-none sm:block"><span className="brand-word">Socialinės</span><span className="brand-word brand-word-accent">Valandos</span><span className="sr-only"> socialinesvalandos.dev</span></span>
        </Link>
        <nav aria-label="Pagrindinis meniu" className="ml-4 hidden min-w-0 items-center gap-1 lg:flex">
          {links.filter((l) => l.to === "/" || l.to === "/tasks" || l.to === DASHBOARD_BY_ROLE[activeRole ?? "student"]?.to).map((l) => {
            const active = isActive(l.to, l.to === "/");
            return <Button key={l.to} asChild variant="ghost" className={`nav-link relative h-11 px-3 text-sm ${active ? "text-primary" : "text-muted-foreground"}`}><Link to={l.to} aria-current={active ? "page" : undefined}>{l.to === "/tasks" ? "Veiklos" : l.label}</Link></Button>;
          })}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <NavCommand extra={links.filter((l) => l.to !== "/" && l.to !== "/tasks")} />
          <SchoolEyesToggle compact />
          <Button variant="ghost" size="icon" className="nav-settings h-10 w-10" onClick={openSettings} aria-label="Nustatymai" title="Nustatymai"><Settings2 /></Button>
          <NotificationBell />
          {isAuthenticated ? <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="secondary" className="hidden h-10 gap-2 px-2.5 sm:inline-flex" aria-label="Paskyros meniu"><UserRound /><span className="hidden max-w-24 truncate xl:inline">{profile?.full_name?.split(" ")[0] ?? "Paskyra"}</span><ChevronDown className="h-3 w-3" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={12} className="w-64 p-2">
              <DropdownMenuLabel className="truncate">{profile?.full_name ?? "Tavo paskyra"}</DropdownMenuLabel><DropdownMenuSeparator />
              {links.filter((l) => l.to !== "/" && l.to !== "/tasks").map((l) => <DropdownMenuItem key={l.to} asChild className="min-h-10"><Link to={l.to}>{l.to.includes("chat") || l.to.includes("pokalbiai") ? <MessageCircle /> : l.to.includes("checkin") || l.to.includes("scan") ? <QrCode /> : <LayoutDashboard />}{l.label}</Link></DropdownMenuItem>)}
              <DropdownMenuSeparator /><DropdownMenuItem onSelect={() => void handleSignOut()} className="min-h-10"><LogOut />Atsijungti</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> : <div className="hidden items-center gap-1 sm:flex"><Button variant="ghost" size="sm" asChild><Link to="/login">Prisijungti</Link></Button><Button size="sm" asChild className="h-10"><Link to="/register">Registruotis</Link></Button></div>}
          <Button variant="ghost" size="icon" className="h-10 w-10 lg:hidden" onClick={() => setOpen(!open)} aria-label="Meniu" aria-expanded={open}><Menu /></Button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="mobile-sidebar flex w-[min(86vw,340px)] flex-col overflow-y-auto border-border bg-background px-4 pb-safe pt-12">
          <SheetTitle className="text-left">Socialinės Valandos</SheetTitle>
          <SheetDescription className="text-left">{profile?.full_name ?? "Tavo savanorystės erdvė"}</SheetDescription>
          <nav aria-label="Šoninis meniu" className="mt-5 flex flex-1 flex-col gap-2">
            {links.map((link) => {
              const Icon = link.to === "/" ? Home : link.to === "/tasks" ? ListTodo : link.to === "/chat" ? MessageCircle : link.to === "/checkin" || link.to === "/organization/scan" ? QrCode : LayoutDashboard;
              const active = isActive(link.to, link.to === "/");
              return <Button key={link.to} variant={active ? "secondary" : "ghost"} asChild className="h-auto min-h-12 justify-start whitespace-normal px-3 py-3 text-left"><Link to={link.to} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}><Icon /><span className="min-w-0">{link.label}</span></Link></Button>;
            })}
            <Button variant="ghost" asChild className="h-12 justify-start"><Link to="/securityguard" onClick={() => setOpen(false)}><ShieldCheck /> SV Guard</Link></Button>
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
            <li><Link to="/securityguard" className="hover:text-foreground">🤖 SV Guard — apsauga nuo botų</Link></li>
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
  useVisualViewport();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isFocused = pathname === "/chat" || pathname === "/checkin" || pathname === "/organization/scan";
  const isDashboard = pathname !== "/" && (
    pathname.startsWith("/student") || 
    pathname.startsWith("/organization") || 
    pathname.startsWith("/school") || 
    pathname.startsWith("/admin")
  );

  return (
    <div className="page-shell relative min-h-screen pb-safe md:pb-0 selection:bg-primary/30 selection:text-primary-foreground" data-page={pathname}>
      <a href="#page-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-background focus:p-3 focus:text-foreground">Pereiti prie turinio</a>
      <BackgroundFX isDashboard={isDashboard} />
      <Navbar />
      <main id="page-content" tabIndex={-1} className="min-w-0">
        {children}
      </main>
      {!isFocused && <Footer />}
      <OnboardingTour />
    </div>
  );

}
