import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Moon, Sun, Heart, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { readThemePreference, saveThemePreference, type SiteTheme } from "@/lib/theme-preference";

const ThemeContext = createContext<{ theme: SiteTheme; choose: (theme: SiteTheme) => void }>({
  theme: "dark", choose: () => {},
});
let transitionTimer: ReturnType<typeof setTimeout> | undefined;

export function applyTheme(theme: SiteTheme, animate = true) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  clearTimeout(transitionTimer);
  if (animate) root.classList.add("sv-theme-changing");
  root.classList.toggle("school-eyes", theme === "light");
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  if (animate) transitionTimer = setTimeout(() => root.classList.remove("sv-theme-changing"), 420);
}

export function useSiteTheme() { return useContext(ThemeContext); }

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<SiteTheme>("dark");
  const [ask, setAsk] = useState(false);
  useEffect(() => {
    try {
      const preference = readThemePreference(localStorage);
      setTheme(preference.theme);
      applyTheme(preference.theme, false);
      setAsk(preference.ask);
    } catch { applyTheme("dark", false); }
  }, []);

  function choose(next: SiteTheme) {
    try { saveThemePreference(localStorage, next); } catch {}
    setTheme(next);
    applyTheme(next);
    setAsk(false);
  }

  return (
    <ThemeContext.Provider value={{ theme, choose }}>
      {children}
      <Dialog open={ask} onOpenChange={(open) => { if (!open) choose(theme); }}>
        <DialogContent className="theme-welcome dark w-[calc(100%-2rem)] max-w-lg rounded-lg border-border bg-background p-5 text-foreground sm:p-8" aria-describedby="theme-choice-description">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Heart className="size-4 text-primary" /> Socialinės Valandos</div>
          <DialogTitle className="mt-2 text-2xl leading-tight">Tavo erdvė. Tavo spalvos.</DialogTitle>
          <DialogDescription id="theme-choice-description">Kuri tema tau patinka?</DialogDescription>
          <div className="theme-demonstration relative mt-2 h-48 overflow-hidden rounded-lg border border-border" aria-hidden="true">
            {(["dark", "light"] as const).map((mode) => (
              <div key={mode} className={`theme-sample theme-sample-${mode} absolute inset-0 grid grid-cols-[44px_minmax(0,1fr)] bg-background text-foreground`}>
                <div className="flex flex-col items-center gap-5 border-r border-border bg-card py-5"><Heart className="size-5 text-primary" fill="currentColor" /><span className="size-4 rounded bg-primary/30" /><span className="size-4 rounded bg-muted" /><span className="size-4 rounded bg-muted" /></div>
                <div className="min-w-0 p-5"><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">Labas! 👋</span>{mode === "light" ? <Sun className="size-4 text-primary" /> : <Moon className="size-4 text-primary" />}</div><div className="mt-4 flex items-end gap-2"><span className="text-3xl font-bold">12</span><span className="pb-1 text-xs text-muted-foreground">/ 20 val.</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="theme-progress h-full w-3/5 rounded-full bg-primary" /></div><div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-border pt-3"><span className="truncate text-xs">Kitas apsilankymas</span><Check className="size-4 text-success" /></div></div>
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12 border-border bg-card" onClick={() => choose("dark")}><Moon /> Tamsi <ArrowRight /></Button>
            <Button className="h-12" onClick={() => choose("light")}><Sun /> Šviesi <ArrowRight /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </ThemeContext.Provider>
  );
}