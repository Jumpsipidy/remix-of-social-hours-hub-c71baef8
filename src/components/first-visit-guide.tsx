import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, UserPlus, Search, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const KEY = "sv_first_visit_guide_v1";

/** Small, dismissible 3-step guide for signed-out first-time visitors. */
export function FirstVisitGuide() {
  const { isAuthenticated, loading } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading || isAuthenticated) return;
    if (/^\/(login|register|admin|auth|invite|verify|checkin)/.test(window.location.pathname)) return;
    try { if (localStorage.getItem(KEY) === "1") return; } catch { return; }
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [loading, isAuthenticated]);

  if (!open) return null;
  const close = () => { setOpen(false); try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ } };

  const steps = [
    { to: "/blog/kas-yra-socialines-valandos", icon: BookOpen, t: "Sužinok, kas tai", d: "Kas yra socialinės valandos ir kiek jų reikia" },
    { to: "/tasks", icon: Search, t: "Rask užduotį", d: "Savanorystė šalia tavęs, žemėlapyje" },
    { to: "/register", icon: UserPlus, t: "Susikurk paskyrą", d: "Užtrunka apie minutę, valandos skaičiuojasi pačios" },
  ] as const;

  return (
    <aside
      role="dialog"
      aria-label="Pirmą kartą čia?"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-lg sm:left-auto sm:right-4 sm:mx-0"
      style={{ animation: "report-enter 220ms ease-out" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Pirmą kartą čia?</p>
          <p className="text-xs text-muted-foreground">Trys žingsniai iki pirmųjų valandų.</p>
        </div>
        <button onClick={close} aria-label="Uždaryti" className="grid h-9 w-9 place-items-center rounded-full hover:bg-accent">
          <X className="h-4 w-4" />
        </button>
      </div>
      <ol className="mt-3 space-y-1.5">
        {steps.map((s, i) => (
          <li key={s.to}>
            <Link to={s.to} onClick={close} className="flex min-h-11 items-center gap-3 rounded-xl px-2 py-2 hover:bg-accent">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium"><s.icon className="h-3.5 w-3.5" />{s.t}</span>
                <span className="block text-xs text-muted-foreground">{s.d}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}
