import { Moon, Sun, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyTheme, useSiteTheme } from "@/components/theme-provider";

export function applySchoolEyes(on: boolean) {
  applyTheme(on ? "light" : "dark");
}

export function useSchoolEyes() {
  const { theme, choose } = useSiteTheme();
  return { on: theme === "light", toggle: () => choose(theme === "light" ? "dark" : "light") };
}

export function SchoolEyesToggle({ className = "" }: { className?: string }) {
  const { on, toggle } = useSchoolEyes();
  const { openSettings } = useSiteTheme();

  return (
    <div className={`flex shrink-0 items-center gap-1 ${className}`}>
    <Button
      variant="outline"
      type="button"
      onClick={toggle}
      data-theme-toggle=""
      aria-pressed={on}
      aria-label={on ? "Įjungti tamsią temą" : "Įjungti šviesią temą"}
      title={on ? "Tamsi tema" : "Mokyklos akys · šviesi tema"}
      className="h-11 shrink-0 border-border bg-card px-3 text-muted-foreground hover:text-foreground"
    >
      {on ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span className="hidden sm:inline">{on ? "Tamsi tema" : "Mokyklos akys"}</span>
    </Button>
    <Button variant="ghost" className="h-11 shrink-0 px-3 text-muted-foreground" onClick={openSettings} aria-label="Temos nustatymai" title="Temos nustatymai"><Settings2 /><span className="hidden lg:inline">Nustatymai</span></Button>
    </div>
  );
}
