import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Moon, Sun, Heart, Menu, X } from "lucide-react";

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefers;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  return (
    <button
      onClick={toggle}
      aria-label="Keisti temą"
      className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card transition hover:bg-accent"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const links = [
    { to: "/", label: "Pradžia" },
    { to: "/organizations", label: "Organizacijos" },
    { to: "/student", label: "Mokinio sritis" },
    { to: "/organization", label: "Organizacijos sritis" },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Heart className="h-4 w-4 text-primary-foreground" fill="currentColor" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">
            Socialinės<span className="text-gradient"> Valandos</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
              activeProps={{ className: "rounded-full px-4 py-2 text-sm font-medium bg-accent text-accent-foreground" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
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
          <button
            className="grid h-10 w-10 place-items-center rounded-full border border-border md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Meniu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              <Link to="/login" onClick={() => setOpen(false)} className="flex-1 rounded-full border border-border px-4 py-2 text-center text-sm font-medium">Prisijungti</Link>
              <Link to="/register" onClick={() => setOpen(false)} className="flex-1 rounded-full bg-gradient-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground">Registruotis</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
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
            <li><Link to="/organizations" className="hover:text-foreground">Organizacijos</Link></li>
            <li><Link to="/student" className="hover:text-foreground">Mokinio sritis</Link></li>
            <li><Link to="/organization" className="hover:text-foreground">Organizacijos sritis</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Paskyra</h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/login" className="hover:text-foreground">Prisijungti</Link></li>
            <li><Link to="/register" className="hover:text-foreground">Registruotis</Link></li>
            <li><a href="#" className="hover:text-foreground">Pagalba</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <span>© 2026 Socialinės Valandos. Visos teisės saugomos.</span>
          <span>Sukurta su 💜 Lietuvos moksleiviams</span>
        </div>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
