import { Moon, Sun } from "lucide-react";
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

  return (
    <Button
      variant="outline"
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Įjungti tamsią temą" : "Įjungti šviesią temą"}
      title={on ? "Tamsi tema" : "Mokyklos akys · šviesi tema"}
      className={`h-11 shrink-0 border-border bg-card px-3 text-muted-foreground hover:text-foreground ${className}`}
    >
      {on ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span className="hidden sm:inline">{on ? "Tamsi tema" : "Mokyklos akys"}</span>
    </Button>
  );
}
