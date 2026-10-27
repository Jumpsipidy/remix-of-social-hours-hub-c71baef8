import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { CalendarCheck, GraduationCap, Home, LayoutDashboard, LogOut, Menu, MessageCircle, Sparkles, Users, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
    <div className="flex items-center gap-2.5 px-1">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <GraduationCap className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-extrabold tracking-tight">Auklėtojo sritis</span>
        <span className="block text-[11px] font-medium text-muted-foreground">Socialinės Valandos</span>
      </span>
    </div>
  );
}

export function TeacherShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const firstName = (profile?.full_name ?? "").trim().split(/\s+/)[0] || "auklėtoja";

  const handleSignOut = async () => {
    if (leaving) return;
    setLeaving(true);
    try { localStorage.removeItem("sv_last_role_v1"); localStorage.removeItem("sv_last_role_uid_v1"); } catch {}
    await signOut();
    navigate({ to: "/" });
  };

  const isActive = (to: string, exact: boolean) => (exact ? pathname === to : pathname.startsWith(to));

  const navLinks = (
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
    </nav>
  );

  const profileChip = (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">
            {initials(profile?.full_name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{profile?.full_name ?? "Auklėtojas"}</span>
            <span className="block truncate text-xs text-muted-foreground">{profile?.email ?? ""}</span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-56 p-2">
        <p className="px-2 py-1.5 text-xs text-muted-foreground">Prisijungta kaip auklėtojas</p>
        <Button variant="ghost" className="w-full justify-start gap-2 text-destructive hover:text-destructive" onClick={handleSignOut} disabled={leaving}>
          <LogOut className="h-4 w-4" /> {leaving ? "Atsijungiama…" : "Atsijungti"}
        </Button>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="min-h-dvh bg-muted/30 text-foreground">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-border bg-card px-3 py-2 lg:hidden">
        <Button variant="ghost" size="icon" aria-label="Meniu" onClick={() => setMenuOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <GraduationCap className="h-5 w-5 text-primary" />
        <span className="text-sm font-bold">Auklėtojo sritis</span>
      </div>

      {/* Mobile drawer */}
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
            {navLinks}
            <div className="mt-auto">{profileChip}</div>
          </aside>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-7xl">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-card p-4 lg:flex">
          <Brand />
          <div className="mt-5 rounded-2xl bg-primary/8 p-4">
            <p className="text-xs text-muted-foreground">Labas,</p>
            <p className="truncate text-lg font-bold">{firstName}</p>
          </div>
          {navLinks}
          <div className="mt-auto">{profileChip}</div>
        </aside>

        <main className="min-w-0 flex-1 px-3 py-4 sm:px-6 sm:py-5 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
