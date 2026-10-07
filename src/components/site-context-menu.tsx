import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Copy, Home, Link2, ListChecks, MessageSquare, RotateCw, Sun } from "lucide-react";
import { toast } from "sonner";

type Pos = { x: number; y: number; selection: string; link: string | null };

/** Svetainės dešiniojo pelės klavišo meniu. Laukuose, nuotraukose ir su Shift lieka naršyklės meniu. */
export function SiteContextMenu() {
  const [pos, setPos] = useState<Pos | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    const onCtx = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.shiftKey || !t) return;
      if (t.closest("input, textarea, select, [contenteditable='true'], img, video, canvas, .leaflet-container, [data-native-menu]")) return;
      if (window.matchMedia("(pointer: coarse)").matches) return;
      e.preventDefault();
      const a = t.closest("a") as HTMLAnchorElement | null;
      const w = 232, h = 330;
      setPos({
        x: Math.min(e.clientX, window.innerWidth - w - 8),
        y: Math.min(e.clientY, window.innerHeight - h - 8),
        selection: window.getSelection()?.toString().trim() ?? "",
        link: a?.href ?? null,
      });
    };
    const close = () => setPos(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("contextmenu", onCtx);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("contextmenu", onCtx);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!pos) return;
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setPos(null); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [pos]);

  if (!pos) return null;

  const copy = async (text: string, msg: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(msg); } catch { toast.error("Nepavyko nukopijuoti"); }
  };
  const run = (fn: () => void) => () => { setPos(null); fn(); };
  const toggleTheme = () => document.querySelector<HTMLButtonElement>("[data-theme-toggle]")?.click()
    ?? toast.message("Temą pakeisk viršutiniame meniu");

  const items: Array<{ icon: typeof Copy; label: string; on: () => void; hint?: string } | "sep"> = [
    { icon: ArrowLeft, label: "Atgal", on: () => router.history.back() },
    { icon: ArrowRight, label: "Pirmyn", on: () => router.history.forward() },
    { icon: RotateCw, label: "Perkrauti", on: () => window.location.reload() },
    "sep",
    ...(pos.selection ? [{ icon: Copy, label: "Kopijuoti tekstą", on: () => copy(pos.selection, "Tekstas nukopijuotas") }] : []),
    ...(pos.link ? [{ icon: Link2, label: "Kopijuoti nuorodą", on: () => copy(pos.link!, "Nuoroda nukopijuota") }] : []),
    { icon: Link2, label: "Kopijuoti puslapio adresą", on: () => copy(window.location.href, "Adresas nukopijuotas") },
    "sep",
    { icon: Home, label: "Pradžia", on: () => navigate({ to: "/" }) },
    { icon: ListChecks, label: "Užduotys", on: () => navigate({ to: "/tasks" }) },
    { icon: MessageSquare, label: "Pokalbiai", on: () => navigate({ to: "/chat" }) },
    { icon: Sun, label: "Keisti temą", on: toggleTheme },
  ];

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Svetainės meniu"
      className="site-ctx fixed z-[100] w-[232px] rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
      style={{ left: pos.x, top: pos.y }}
    >
      {items.map((it, i) =>
        it === "sep" ? (
          <div key={i} className="my-1 h-px bg-border" />
        ) : (
          <button
            key={i}
            role="menuitem"
            onClick={run(it.on)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm outline-none transition hover:bg-primary/10 focus-visible:bg-primary/10"
          >
            <it.icon className="h-4 w-4 text-muted-foreground" /> {it.label}
          </button>
        ),
      )}
      <p className="px-2.5 pb-1 pt-1.5 text-[10px] text-muted-foreground">Shift + dešinys klavišas — naršyklės meniu</p>
    </div>
  );
}
