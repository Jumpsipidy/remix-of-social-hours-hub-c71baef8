import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { checkInDiagnostics, type DiagItem } from "@/lib/checkin-diagnostics.functions";
import { AlertTriangle, Check, X, Database } from "lucide-react";

/**
 * Shows a clear Lithuanian banner when the DB is missing check-in / streak objects.
 * Renders nothing when everything is in place.
 */
export function CheckinSetupBanner() {
  const run = useServerFn(checkInDiagnostics);
  const [items, setItems] = useState<DiagItem[] | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    run()
      .then((r) => {
        if (!alive || r.ok) return;
        setItems(r.items);
        setHint(r.hint);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [run]);

  if (!items) return null;

  return (
    <div className="mb-5 rounded-3xl border border-destructive/40 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="flex-1">
          <p className="font-semibold text-destructive">Duomenų bazė dar neparuošta</p>
          <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
          <button
            onClick={() => setOpen((o) => !o)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1.5 text-xs font-semibold hover:bg-foreground/20"
          >
            <Database className="h-3 w-3" />
            {open ? "Slėpti patikrą" : "Rodyti ko trūksta"}
          </button>
          {open && (
            <ul className="mt-3 space-y-1.5">
              {items.map((i) => (
                <li key={i.key} className="flex items-center gap-2 text-xs">
                  {i.ok ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <X className="h-3.5 w-3.5 text-destructive" />}
                  <span className={i.ok ? "text-muted-foreground" : "font-semibold text-foreground"}>{i.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
