import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CalendarCheck, CircleHelp, GraduationCap, Home, LayoutDashboard, LogOut,
  Menu, MessageCircle, Sparkles, Users, X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TeacherTour } from "@/components/teacher/teacher-tour";
import { tourCompleted } from "@/lib/teacher-tour";

const NAV = [
  { to: "/mokytojas", label: "Apžvalga", icon: LayoutDashboard, exact: true },
  { to: "/mokytojas/mokiniai", label: "Mokiniai", icon: Users, exact: false },
  { to: "/mokytojas/rezervacijos", label: "Rezervacijos", icon: CalendarCheck, exact: false },
  { to: "/mokytojas/pokalbiai", label: "Pokalbiai", icon: MessageCircle, exact: false },
] as const;

const LINKS = [
  { to: "/tasks", label: "Visos veiklos", icon: Sparkles },
  { to: "/", label: "Grįžti į svetainę", icon: Home },
] as const;

function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "A") + (parts[1]?.[0] ?? "");
}

function Brand() {
  return (
    <Link to="/mokytojas" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <GraduationCap className="h-5 w-5" />
      </span>
      <span className="hidden min-w-0 sm:block">
        <span className="block truncate text-sm font-extrabold tracking-tight">Auklėtojo sritis</span>
        <span className="block text-[11px] font-medium text-muted-foreground">Socialinės Valandos</span>
      </span>
    </Link>
  );
}

export function TeacherShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  // Pirmą kartą atsidarius apžvalgą — pasiūlome vedlį (įsimenama naršyklėje).
  useEffect(() => {
    if (pathname === "/mokytojas" && !tourCompleted()) {
      const t = window.setTimeout(() => setTourOpen(true), 1200);
      return () => window.clearTimeout(t);
    }
  }, [pathname]);

  const handleSignOut = async () => {
    if (leaving) return;
    setLeaving(true);
    try { localStorage.removeItem("sv_last_role_v1"); localStorage.removeItem("sv_last_role_uid_v1"); } catch {}
    await signOut();
    navigate({ to: "/" });
  };

  const restartTour = () => {
    setMenuOpen(false);
    if (pathname !== "/mokytojas") navigate({ to: "/mokytojas" });
    window.setTimeout(() => setTourOpen(true), 400);
  };

  const isActive = (to: string, exact: boolean) => (exact ? pathname === to : pathname.startsWith(to));

  const drawerNav = (
    <nav className="mt-6 flex flex-col gap-0.5">
      <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Valdymas</p>
      {NAV.map((item) => {
        const active = isActive(item.to, item.exact);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setMenuOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
      <p className="px-3 pb-1.5 pt-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Nuorodos</p>
      {LINKS.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setMenuOpen(false)}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </Link>
      ))}
      <button
        type="button"
        onClick={restartTour}
        className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <CircleHelp className="h-4 w-4 shrink-0" />
        Sąsajos vedlys
      </button>
    </nav>
  );

  const profileChip = (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Profilio meniu"
          className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary transition hover:bg-primary/25"
        >
          {initials(profile?.full_name)}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-semibold">{profile?.full_name ?? "Auklėtojas"}</p>
          <p className="truncate text-xs text-muted-foreground">{profile?.email ?? ""}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive"
          onClick={handleSignOut}
          disabled={leaving}
        >
          <LogOut className="h-4 w-4" /> {leaving ? "Atsijungiama…" : "Atsijungti"}
        </Button>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="min-h-dvh bg-muted/30 text-foreground">
      {/* Viršutinė komandinė juosta */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-3 sm:px-5">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Meniu"
            className="lg:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Brand />

          {/* Centrinė navigacija (desktop) */}
          <nav
            data-tour="nav"
            className="mx-auto hidden items-center gap-1 rounded-full border border-border bg-muted/60 p-1 lg:flex"
          >
            {NAV.map((item) => {
              const active = isActive(item.to, item.exact);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all ${
                    active
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <Button variant="ghost" size="icon" aria-label="Sąsajos vedlys" onClick={restartTour}>
              <CircleHelp className="h-4.5 w-4.5" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Nuorodos">
                  <Sparkles className="h-4.5 w-4.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-52 p-2">
                {LINKS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </PopoverContent>
            </Popover>
            {profileChip}
          </div>
        </div>
      </header>

      {/* Mobilioji šoninė skydas */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <Brand />
              <Button variant="ghost" size="icon" aria-label="Uždaryti" onClick={() => setMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            {drawerNav}
            <div className="mt-auto border-t border-border pt-3">
              <p className="truncate px-3 text-sm font-semibold">{profile?.full_name ?? "Auklėtojas"}</p>
              <p className="truncate px-3 text-xs text-muted-foreground">{profile?.email ?? ""}</p>
              <Button
                variant="ghost"
                className="mt-2 w-full justify-start gap-2 text-destructive hover:text-destructive"
                onClick={handleSignOut}
                disabled={leaving}
              >
                <LogOut className="h-4 w-4" /> {leaving ? "Atsijungiama…" : "Atsijungti"}
              </Button>
            </div>
          </aside>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-5 sm:py-6">{children}</main>

      <TeacherTour open={tourOpen} onDone={() => setTourOpen(false)} />
    </div>
  );
}
