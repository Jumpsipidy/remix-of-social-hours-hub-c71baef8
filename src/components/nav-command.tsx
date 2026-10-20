import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Search, Home, ListTodo, ShieldCheck, History, FileCheck2, MessageCircle, LayoutDashboard, Sparkles } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";

type Item = { to: string; label: string };

const PAGES: (Item & { icon: typeof Home })[] = [
  { to: "/", label: "Pradžia", icon: Home },
  { to: "/tasks", label: "Užduotys ir organizacijos", icon: ListTodo },
  { to: "/verify", label: "Patikrinti pažymėjimą", icon: FileCheck2 },
  { to: "/securityguard", label: "SV Guard apsauga", icon: ShieldCheck },
  { to: "/versijos", label: "Kas naujo", icon: History },
];

/** Quick-jump palette (Ctrl/⌘ + K or "/"), with a couple of hidden extras. */
export function NavCommand({ extra }: { extra: Item[] }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if ((e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string) => { setOpen(false); void navigate({ to }); };
  const secret = (fn: () => void) => { setOpen(false); fn(); };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="hidden h-9 items-center gap-2 rounded-xl border border-border bg-background/70 px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground lg:inline-flex">
        <Search className="h-4 w-4" /> Ieškoti…
        <kbd className="ml-3 rounded-md border border-border bg-muted px-1.5 font-mono text-[10px]">Ctrl K</kbd>
      </button>
      <button type="button" onClick={() => setOpen(true)} aria-label="Ieškoti" className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden">
        <Search className="h-4 w-4" />
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Kur nori eiti? Pvz. užduotys, pažymėjimas…" />
        <CommandList>
          <CommandEmpty>Nieko nerasta.</CommandEmpty>
          <CommandGroup heading="Puslapiai">
            {PAGES.map((p) => (
              <CommandItem key={p.to} value={p.label} onSelect={() => go(p.to)}><p.icon /> {p.label}</CommandItem>
            ))}
          </CommandGroup>
          {extra.length > 0 && (
            <CommandGroup heading="Tavo paskyra">
              {extra.map((p) => (
                <CommandItem key={p.to} value={p.label} onSelect={() => go(p.to)}>
                  {p.to === "/chat" ? <MessageCircle /> : <LayoutDashboard />} {p.label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandSeparator />
          <CommandGroup heading="Paslaptys">
            <CommandItem value="vakarelis party sventė" onSelect={() => secret(() => {
              document.documentElement.classList.add("sv-party");
              window.setTimeout(() => document.documentElement.classList.remove("sv-party"), 2600);
              toast.success("🎉 Radai slaptą šventę!");
            })}><Sparkles /> Šventės režimas</CommandItem>
            <CommandItem value="kiek valandu reikia 20" onSelect={() => secret(() => toast("Dažniausiai 20 valandų — bet tikslų skaičių nustato tavo klasės kodas."))}>
              <Sparkles /> Kiek valandų man reikia?
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
