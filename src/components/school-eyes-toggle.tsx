import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const KEY = "sv_school_eyes_v1";

export function applySchoolEyes(on: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (on) {
    root.classList.add("school-eyes");
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  } else {
    root.classList.remove("school-eyes");
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  }
}

export function useSchoolEyes() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    let initial = false;
    try {
      initial = localStorage.getItem(KEY) === "1";
    } catch {}
    setOn(initial);
    applySchoolEyes(initial);
  }, []);

  const toggle = useCallback(() => {
    setOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(KEY, next ? "1" : "0");
      } catch {}
      applySchoolEyes(next);
      return next;
    });
  }, []);

  return { on, toggle };
}

export function SchoolEyesToggle({ className = "" }: { className?: string }) {
  const { on, toggle } = useSchoolEyes();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      title={on ? "Išjungti Mokyklos akis" : "Įjungti Mokyklos akis (šviesus, ryškus režimas)"}
      className={`inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-card/50 px-3 py-2 text-xs font-bold tracking-tight text-muted-foreground transition-all hover:text-foreground active:scale-95 sm:px-4 sm:text-sm ${className}`}
    >
      {on ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      <span className="hidden sm:inline">Mokyklos akys</span>
    </button>
  );
}
