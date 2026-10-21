import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Moon, Sun, Heart, ArrowRight, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { readThemePreference, saveThemePreference, readAccentPreference, saveAccentPreference, resetThemePreference, normalizeAccent, THEME_CHOICE_DONE_EVENT, type SiteTheme } from "@/lib/theme-preference";

const ThemeContext = createContext<{ theme: SiteTheme; choose: (theme: SiteTheme) => void; openSettings: () => void }>({
  theme: "dark", choose: () => {}, openSettings: () => {},
});
let transitionTimer: ReturnType<typeof setTimeout> | undefined;

export function applyTheme(theme: SiteTheme, animate = true) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  clearTimeout(transitionTimer);
  if (animate) {
    root.classList.add("sv-theme-changing");
    // Establish the old colours before changing tokens so both directions interpolate.
    void root.offsetWidth;
  }
  root.classList.toggle("school-eyes", theme === "light");
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  if (animate) transitionTimer = setTimeout(() => root.classList.remove("sv-theme-changing"), 650);
}

export function useSiteTheme() { return useContext(ThemeContext); }

function ThemeExample({ mode }: { mode: SiteTheme }) {
  return <div aria-hidden="true" className={`theme-example ${mode === "light" ? "theme-sample-light" : "dark"} aspect-video w-full overflow-hidden rounded-lg border border-border bg-card p-2 text-foreground`}>
    <div className="flex h-full gap-2 rounded-md border border-border bg-background p-2">
      <div className="flex w-3 shrink-0 flex-col gap-1.5"><Heart className="size-3 text-primary" fill="currentColor" /><span className="h-2 rounded-sm bg-muted" /><span className="h-2 rounded-sm bg-muted" /></div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between"><span className="theme-mini-skeleton h-1 w-8 rounded-full bg-muted" />{mode === "light" ? <Sun className="size-2.5 text-muted-foreground" /> : <Moon className="size-2.5 text-muted-foreground" />}</div>
        <div className="flex items-baseline gap-1"><span className="text-sm font-semibold leading-none">12</span><span className="text-[8px] text-muted-foreground">/ 20 val.</span></div>
        <div className="h-1 w-full rounded-full bg-muted"><div className="theme-progress h-full w-3/5 rounded-full bg-primary" /></div>
        <div className="theme-mini-skeleton mt-auto h-2 w-3/4 rounded-sm bg-muted" />
      </div>
    </div>
  </div>;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<SiteTheme>("dark");
  const [accessBlocked, setAccessBlocked] = useState(false);
  useEffect(() => { const update = (event: Event) => setAccessBlocked(Boolean((event as CustomEvent<boolean>).detail)); window.addEventListener("sv:access-blocked", update); return () => window.removeEventListener("sv:access-blocked", update); }, []);
  const [ask, setAsk] = useState(false);
  const [accent, setAccent] = useState(0);
  const animatedAccent = useRef(0);
  useEffect(() => {
    try {
      const preference = readThemePreference(localStorage);
      const savedAccent = readAccentPreference(localStorage);
      setTheme(preference.theme);
      setAccent(savedAccent);
      animatedAccent.current = savedAccent;
      document.documentElement.style.setProperty("--theme-tuning", String(savedAccent));
      applyTheme(preference.theme, false);
      setAsk(preference.ask);
    } catch { applyTheme("dark", false); }
  }, []);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animate = (now: number) => {
      const delta = Math.min(now - last, 50);
      last = now;
      const remaining = accent - animatedAccent.current;
      animatedAccent.current = reduce || Math.abs(remaining) < 0.05 ? accent : animatedAccent.current + remaining * (1 - Math.exp(-delta / 220));
      document.documentElement.style.setProperty("--theme-tuning", String(animatedAccent.current));
      if (animatedAccent.current !== accent) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [accent]);

  function choose(next: SiteTheme) {
    try { saveThemePreference(localStorage, next); } catch {}
    setTheme(next);
    applyTheme(next);
  }
  function finish() {
    // Read the theme actually on screen so a stale state value can never overwrite the saved choice.
    const shown: SiteTheme = document.documentElement.classList.contains("school-eyes") ? "light" : "dark";
    try { saveThemePreference(localStorage, shown); saveAccentPreference(localStorage, accent); } catch {}
    setTheme(shown);
    setAsk(false);
    window.dispatchEvent(new Event(THEME_CHOICE_DONE_EVENT));
  }
  function tune(value: number) {
    const next = normalizeAccent(value);
    setAccent(next);
    try { saveAccentPreference(localStorage, next); } catch {}
  }
  function reset() {
    try { resetThemePreference(localStorage); } catch {}
    setTheme("dark");
    setAccent(0);
    applyTheme("dark");
  }

  return (
    <ThemeContext.Provider value={{ theme, choose, openSettings: () => setAsk(true) }}>
      {children}
      <Dialog open={ask && !accessBlocked} onOpenChange={(open) => { if (!open) finish(); }}>
        <DialogContent className="theme-welcome z-[10001] w-[calc(100%-2rem)] max-w-lg gap-0 rounded-lg border-border bg-background p-5 text-foreground sm:p-8" aria-describedby="theme-choice-description">
          <div className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground"><Heart className="size-5 text-primary" /> Socialinės Valandos</div>
          <DialogTitle className="text-2xl font-bold leading-tight sm:text-3xl">Tavo erdvė. Tavo spalvos.</DialogTitle>
          <DialogDescription id="theme-choice-description" className="mb-6 mt-2">Kuri tema tau patinka?</DialogDescription>
          <div className="mb-6 grid grid-cols-2 gap-4">
            {(["dark", "light"] as const).map((mode) => <Button key={mode} variant="ghost" onClick={() => choose(mode)} aria-pressed={theme === mode} aria-label={mode === "dark" ? "Tamsi" : "Šviesi"} className="theme-option group h-auto min-w-0 flex-col gap-3 whitespace-normal p-0 hover:bg-transparent">
              <div className={`w-full rounded-xl border-2 p-1.5 transition-all duration-300 ${theme === mode ? "border-primary ring-4 ring-primary/10" : "border-transparent"}`}><ThemeExample mode={mode} /></div>
              <span className={`flex items-center gap-2 text-sm ${theme === mode ? "text-foreground" : "text-muted-foreground"}`}>{mode === "dark" ? "Tamsi" : "Šviesi"}<ArrowRight className="size-4" /></span>
            </Button>)}
          </div>
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between gap-2"><label htmlFor="theme-accent" className="text-xs font-medium text-muted-foreground">Akcento spalva</label><Button size="sm" variant="ghost" onClick={() => tune(0)} className="h-7 gap-1 px-1 text-xs text-muted-foreground"><RotateCcw className="size-3" />Numatytasis</Button></div>
            <div className="relative"><input id="theme-accent" aria-label="Akcento spalva" type="range" min={-100} max={100} step={1} value={accent} onChange={(event) => tune(Number(event.target.value))} className="theme-accent-slider block h-6 w-full cursor-pointer" /><span aria-hidden className="pointer-events-none absolute left-1/2 top-8 h-1.5 w-px bg-muted-foreground/60" /></div>
          </div>
          <Button variant="ghost" onClick={reset} className="mb-3 h-9 justify-start px-0 text-xs text-muted-foreground"><RotateCcw /> Atkurti temos nustatymus</Button>
          <div className="flex items-center justify-between border-t border-border pt-5"><Button variant="ghost" onClick={finish} className="text-muted-foreground">Praleisti</Button><Button onClick={finish} className="theme-continue rounded-full px-6">Išsaugoti <Check /></Button></div>
        </DialogContent>
      </Dialog>
    </ThemeContext.Provider>
  );
}
